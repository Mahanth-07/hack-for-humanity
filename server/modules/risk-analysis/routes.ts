import { Router, Request, Response } from "express";
import { db } from "../../db";
import { incidents, riskAssessments, cameraDetections } from "@shared/schema";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  assessRisk,
  rankAssessments,
  Detection,
  ModelWindow,
  RecentHistory,
  Region,
  RiskFactor,
  Severity,
  ThreatLevel,
} from "./engine";
import { defaultRiskConfig } from "./config";
import { broadcast } from "../../index";

const router = Router();

type DbAssessment = typeof riskAssessments.$inferSelect;
type DbIncident = typeof incidents.$inferSelect;
type DbDetection = typeof cameraDetections.$inferSelect;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isSeverity(value: unknown): value is Severity {
  return value === "low" || value === "medium" || value === "high" || value === "severe";
}

function isThreatLevel(value: unknown): value is ThreatLevel {
  return value === "low" || value === "moderate" || value === "high" || value === "severe";
}

function mapSeverityFromScore(score: number): Severity {
  if (score <= defaultRiskConfig.severityThresholds.lowMax) return "low";
  if (score <= defaultRiskConfig.severityThresholds.mediumMax) return "medium";
  if (score <= defaultRiskConfig.severityThresholds.highMax) return "high";
  return "severe";
}

function mapThreatFromScore(score: number): ThreatLevel {
  if (score <= defaultRiskConfig.threatThresholds.lowMax) return "low";
  if (score <= defaultRiskConfig.threatThresholds.moderateMax) return "moderate";
  if (score <= defaultRiskConfig.threatThresholds.highMax) return "high";
  return "severe";
}

function parseBbox(input: unknown): Detection["bbox"] | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const w = Number(raw.w ?? raw.width);
  const h = Number(raw.h ?? raw.height);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return undefined;
  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    w: clamp(w, 0, 1),
    h: clamp(h, 0, 1),
  };
}

function toRegion(value: unknown): Region | undefined {
  if (
    value === "intersection" ||
    value === "forest" ||
    value === "riverbank" ||
    value === "roadway" ||
    value === "facility" ||
    value === "other"
  ) {
    return value;
  }
  return undefined;
}

function inferRegionFromText(...parts: Array<string | null | undefined>): Region {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (text.includes("forest") || text.includes("wildland") || text.includes("brush")) return "forest";
  if (text.includes("river") || text.includes("stream") || text.includes("bank")) return "riverbank";
  if (text.includes("intersection") || text.includes("crossroad")) return "intersection";
  if (text.includes("road") || text.includes("highway") || text.includes("street") || text.includes("freeway")) {
    return "roadway";
  }
  if (text.includes("plant") || text.includes("facility") || text.includes("warehouse") || text.includes("building")) {
    return "facility";
  }
  return "other";
}

function incidentSeverityToSeedLabel(severity: string): string {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "active_fire";
  if (normalized === "high") return "collision";
  if (normalized === "medium") return "intrusion";
  return "trash";
}

function inferLabelsFromIncident(incident: DbIncident): string[] {
  const source = `${incident.title} ${incident.description}`.toLowerCase();
  const labels = new Set<string>();
  if (source.includes("smoke")) labels.add("smoke");
  if (source.includes("flame") || source.includes("fire")) labels.add("flame");
  if (source.includes("collision") || source.includes("crash")) labels.add("collision");
  if (source.includes("oil") || source.includes("sheen")) labels.add("oil_sheen");
  if (source.includes("spill") || source.includes("runoff")) labels.add("chemical_spill");
  if (source.includes("intrusion") || source.includes("intruder")) labels.add("intrusion");
  if (source.includes("person") || source.includes("pedestrian")) labels.add("person");
  if (source.includes("vehicle") || source.includes("car") || source.includes("truck")) labels.add("vehicle");
  if (labels.size === 0) labels.add(incidentSeverityToSeedLabel(incident.severity));
  return Array.from(labels);
}

function buildFallbackWindow(incident: DbIncident, referenceTsMs: number, region: Region): ModelWindow {
  const labels = inferLabelsFromIncident(incident);
  const severity = incident.severity.toLowerCase();
  const confidenceBySeverity: Record<string, number> = {
    critical: 0.9,
    high: 0.78,
    medium: 0.62,
    low: 0.42,
  };
  const confidence = confidenceBySeverity[severity] ?? 0.5;

  const detections: Detection[] = labels.map((label, idx) => ({
    cameraId: `incident-${incident.id}`,
    ts: referenceTsMs - (labels.length - idx - 1) * 250,
    label,
    confidence,
    region,
  }));

  return {
    cameraId: `incident-${incident.id}`,
    startTs: referenceTsMs - defaultRiskConfig.windowMs,
    endTs: referenceTsMs,
    detections,
  };
}

function parseIncidentDetectionPayload(incident: DbIncident, fallbackRegion: Region): Detection[] {
  const source = incident as unknown as Record<string, unknown>;
  const payload = source.detections ?? source.detectionPayload ?? source.modelDetections;
  if (!Array.isArray(payload)) return [];

  const parsed: Detection[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const label = String(raw.label ?? "unknown").toLowerCase();
    const confidenceRaw = Number(raw.confidence ?? 0);
    const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;
    const ts = Number(raw.ts);
    parsed.push({
      cameraId: String(raw.cameraId ?? `incident-${incident.id}`),
      ts: Number.isFinite(ts) ? ts : incident.createdAt.getTime(),
      label,
      confidence: clamp(confidence, 0, 1),
      bbox: parseBbox(raw.bbox),
      trackId: typeof raw.trackId === "string" ? raw.trackId : undefined,
      region: toRegion(raw.region) ?? fallbackRegion,
    });
  }
  return parsed;
}

function detectionFromRow(row: DbDetection, fallbackRegion: Region): Detection {
  const metadata = row.metadata as Record<string, unknown> | null;
  const confidenceRaw = Number(row.confidence ?? 0);
  const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;
  return {
    cameraId: String(row.cameraFeedId),
    ts: row.createdAt.getTime(),
    label: String(row.detectionType || "unknown").toLowerCase(),
    confidence: clamp(confidence, 0, 1),
    bbox: parseBbox(row.boundingBox),
    trackId: typeof metadata?.trackId === "string" ? metadata.trackId : undefined,
    region: toRegion(metadata?.region) ?? fallbackRegion,
  };
}

function buildWindowsFromDetections(
  detections: Detection[],
  fallbackTs: number,
  cameraId: string,
): ModelWindow[] {
  if (detections.length === 0) return [];
  const buckets = new Map<number, Detection[]>();
  for (const detection of detections) {
    const ts = Number.isFinite(detection.ts) ? detection.ts : fallbackTs;
    const start = Math.floor(ts / defaultRiskConfig.windowMs) * defaultRiskConfig.windowMs;
    const list = buckets.get(start) ?? [];
    list.push({ ...detection, ts });
    buckets.set(start, list);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([startTs, bucketDetections]) => ({
      cameraId,
      startTs,
      endTs: startTs + defaultRiskConfig.windowMs,
      detections: bucketDetections,
    }));
}

function assessmentToSyntheticHistoryWindow(
  assessment: DbAssessment,
  incidentId: number,
  fallbackRegion: Region,
): ModelWindow {
  const ts = assessment.createdAt.getTime();
  let label = "unknown";
  const severity = assessment.severity?.toLowerCase();
  if (severity === "severe") label = "active_fire";
  else if (severity === "high") label = "collision";
  else if (severity === "medium") label = "smoke";
  else label = "trash";

  return {
    cameraId: `incident-${incidentId}`,
    startTs: ts - defaultRiskConfig.windowMs,
    endTs: ts,
    detections: [
      {
        cameraId: `incident-${incidentId}`,
        ts,
        label,
        confidence: clamp((assessment.riskScore ?? 0) / 100, 0.1, 1),
        region: fallbackRegion,
      },
    ],
  };
}

function coerceFactors(input: unknown): RiskFactor[] {
  if (!Array.isArray(input)) return [];
  const normalized: RiskFactor[] = [];
  for (const item of input) {
    if (item && typeof item === "object") {
      const raw = item as Record<string, unknown>;
      const key = typeof raw.key === "string" ? raw.key : undefined;
      const weight = Number(raw.weight);
      const detail = typeof raw.detail === "string" ? raw.detail : "";
      if (key && Number.isFinite(weight)) {
        normalized.push({ key, weight, detail });
        continue;
      }
    }
    if (typeof item === "string") {
      normalized.push({ key: "legacy:text_factor", weight: 0, detail: item });
    }
  }
  return normalized;
}

function coerceRecommendations(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is string => typeof item === "string");
}

function normalizeStoredAssessment(assessment: DbAssessment) {
  const severity = isSeverity(assessment.severity)
    ? assessment.severity
    : mapSeverityFromScore(assessment.riskScore ?? 0);
  const threatLevel = isThreatLevel(assessment.threatLevel)
    ? assessment.threatLevel
    : mapThreatFromScore(assessment.riskScore ?? 0);
  const priorityScore =
    typeof assessment.priorityScore === "number"
      ? assessment.priorityScore
      : Math.round(
          clamp(
            (assessment.riskScore ?? 0) * defaultRiskConfig.priority.riskScoreWeight,
            defaultRiskConfig.priority.minScore,
            defaultRiskConfig.priority.maxScore,
          ),
        );

  return {
    ...assessment,
    severity,
    threatLevel,
    priorityScore,
    factors: coerceFactors(assessment.factors),
    recommendations: coerceRecommendations(assessment.recommendations),
  };
}

function shouldIncludeRanks(req: Request): boolean {
  const value = req.query.includeRanks;
  return value === "1" || value === "true";
}

function getCooldownSeconds(req: Request): number {
  const raw = req.query.cooldownSeconds;
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(value)) return 60 * 60;
  return clamp(Math.floor(value), 0, 24 * 60 * 60);
}

async function computeLatestRankings(incidentIds: number[]) {
  if (incidentIds.length === 0) return [];
  const all = await db
    .select()
    .from(riskAssessments)
    .where(inArray(riskAssessments.incidentId, incidentIds))
    .orderBy(desc(riskAssessments.createdAt));

  const latestByIncident = new Map<number, ReturnType<typeof normalizeStoredAssessment>>();
  for (const row of all) {
    if (!latestByIncident.has(row.incidentId)) {
      latestByIncident.set(row.incidentId, normalizeStoredAssessment(row));
    }
  }

  const ranked = rankAssessments(
    Array.from(latestByIncident.values()).map((row) => ({
      incidentId: row.incidentId,
      assessmentTsMs: row.createdAt.getTime(),
      riskScore: row.riskScore,
      severity: row.severity,
      threatLevel: row.threatLevel,
      priorityScore: row.priorityScore,
      factors: row.factors,
      recommendedActions: row.recommendations,
      analysis: row.analysis,
    })),
  );

  return ranked;
}

function buildCurrentAndHistory(
  incident: DbIncident,
  detectionRows: DbDetection[],
  recentAssessments: DbAssessment[],
  nowMs: number,
): { window: ModelWindow; history: RecentHistory } {
  const fallbackRegion = inferRegionFromText(incident.location, incident.title, incident.description);
  const incidentPayloadDetections = parseIncidentDetectionPayload(incident, fallbackRegion);
  const dbDetections = detectionRows.map((row) => detectionFromRow(row, fallbackRegion));
  const mergedDetections = [...incidentPayloadDetections, ...dbDetections];

  const windows = buildWindowsFromDetections(mergedDetections, nowMs, `incident-${incident.id}`);
  const currentWindow = windows[windows.length - 1] ?? buildFallbackWindow(incident, nowMs, fallbackRegion);

  const fromDetectionHistory = windows
    .slice(0, -1)
    .filter((window) => currentWindow.endTs - window.endTs <= defaultRiskConfig.historyWindowMs);

  const fromAssessmentHistory = recentAssessments
    .map((assessment) => assessmentToSyntheticHistoryWindow(assessment, incident.id, fallbackRegion))
    .filter((window) => currentWindow.endTs - window.endTs <= defaultRiskConfig.historyWindowMs);

  const priorWindows = [...fromDetectionHistory, ...fromAssessmentHistory]
    .sort((a, b) => a.endTs - b.endTs)
    .slice(-defaultRiskConfig.maxPriorWindows);

  return {
    window: currentWindow,
    history: { priorWindows },
  };
}

// Get all risk assessments
router.get("/", async (_req: Request, res: Response) => {
  try {
    const assessments = await db
      .select()
      .from(riskAssessments)
      .orderBy(desc(riskAssessments.createdAt));
    res.json(assessments.map(normalizeStoredAssessment));
  } catch (error) {
    console.error("Error fetching risk assessments:", error);
    res.status(500).json({ error: "Failed to fetch risk assessments" });
  }
});

// Get risk assessment for specific incident
router.get("/incident/:incidentId", async (req: Request, res: Response) => {
  try {
    const incidentIdParam = Array.isArray(req.params.incidentId)
      ? req.params.incidentId[0]
      : req.params.incidentId;
    const id = parseInt(incidentIdParam, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid incidentId" });
    }
    const assessment = await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.incidentId, id))
      .orderBy(desc(riskAssessments.createdAt))
      .limit(1);

    res.json(assessment[0] ? normalizeStoredAssessment(assessment[0]) : null);
  } catch (error) {
    console.error("Error fetching risk assessment:", error);
    res.status(500).json({ error: "Failed to fetch risk assessment" });
  }
});

// Analyze a specific incident
router.post("/analyze/:incidentId", async (req: Request, res: Response) => {
  try {
    const incidentIdParam = Array.isArray(req.params.incidentId)
      ? req.params.incidentId[0]
      : req.params.incidentId;
    const incidentId = parseInt(incidentIdParam, 10);
    if (Number.isNaN(incidentId)) {
      return res.status(400).json({ error: "Invalid incidentId" });
    }
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const nowMs = Date.now();
    const historyCutoff = new Date(nowMs - defaultRiskConfig.historyWindowMs);

    const [detectionRows, recentAssessmentRows] = await Promise.all([
      db
        .select()
        .from(cameraDetections)
        .where(eq(cameraDetections.incidentId, incidentId))
        .orderBy(desc(cameraDetections.createdAt))
        .limit(500),
      db
        .select()
        .from(riskAssessments)
        .where(and(eq(riskAssessments.incidentId, incidentId), gte(riskAssessments.createdAt, historyCutoff)))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(30),
    ]);

    const { window, history } = buildCurrentAndHistory(incident, detectionRows, recentAssessmentRows, nowMs);

    const assessment = assessRisk(window, history, {
      ...defaultRiskConfig,
      referenceTsMs: nowMs,
    });

    const [stored] = await db
      .insert(riskAssessments)
      .values({
        incidentId,
        riskScore: assessment.riskScore,
        severity: assessment.severity,
        threatLevel: assessment.threatLevel,
        priorityScore: Math.round(assessment.priorityScore),
        analysis: assessment.analysis,
        recommendations: assessment.recommendedActions,
        factors: assessment.factors,
      })
      .returning();

    const normalized = normalizeStoredAssessment(stored);

    const active = await db
      .select({ id: incidents.id })
      .from(incidents)
      .where(eq(incidents.status, "active"));
    const ranked = await computeLatestRankings(active.map((item) => item.id));
    const rankInfo = ranked.find((item) => item.incidentId === incidentId);

    broadcast("risk_ranking_updated", {
      updatedIncidentId: incidentId,
      updatedAssessmentId: normalized.id,
      rank: rankInfo?.rank ?? null,
      rankWithinSeverity: rankInfo?.rankWithinSeverity ?? null,
      top: ranked.slice(0, 5),
    });

    if (!shouldIncludeRanks(req)) {
      return res.json(normalized);
    }

    return res.json({
      ...normalized,
      rank: rankInfo?.rank ?? null,
      rankWithinSeverity: rankInfo?.rankWithinSeverity ?? null,
    });
  } catch (error) {
    console.error("Error creating risk assessment:", error);
    res.status(500).json({ error: "Failed to create risk assessment" });
  }
});

// Batch analyze all active incidents
router.post("/analyze-all", async (_req: Request, res: Response) => {
  try {
    const activeIncidents = await db
      .select()
      .from(incidents)
      .where(eq(incidents.status, "active"));

    if (activeIncidents.length === 0) {
      return res.json({ message: "Analyzed 0 incidents", assessments: [] });
    }

    const nowMs = Date.now();
    const cooldownSeconds = getCooldownSeconds(_req);
    const cooldownCutoff = new Date(nowMs - cooldownSeconds * 1000);
    const historyCutoff = new Date(nowMs - Math.max(defaultRiskConfig.historyWindowMs, 60 * 60 * 1000));
    const incidentIds = activeIncidents.map((incident) => incident.id);

    const [assessmentRows, detectionRows] = await Promise.all([
      db
        .select()
        .from(riskAssessments)
        .where(
          and(
            inArray(riskAssessments.incidentId, incidentIds),
            gte(riskAssessments.createdAt, historyCutoff),
          ),
        )
        .orderBy(desc(riskAssessments.createdAt)),
      db
        .select()
        .from(cameraDetections)
        .where(and(inArray(cameraDetections.incidentId, incidentIds), gte(cameraDetections.createdAt, historyCutoff)))
        .orderBy(desc(cameraDetections.createdAt)),
    ]);

    const assessmentsByIncident = new Map<number, DbAssessment[]>();
    for (const row of assessmentRows) {
      const list = assessmentsByIncident.get(row.incidentId) ?? [];
      list.push(row);
      assessmentsByIncident.set(row.incidentId, list);
    }

    const detectionsByIncident = new Map<number, DbDetection[]>();
    for (const row of detectionRows) {
      if (!row.incidentId) continue;
      const list = detectionsByIncident.get(row.incidentId) ?? [];
      list.push(row);
      detectionsByIncident.set(row.incidentId, list);
    }

    const keepExisting: ReturnType<typeof normalizeStoredAssessment>[] = [];
    const insertValues: Array<typeof riskAssessments.$inferInsert> = [];

    for (const incident of activeIncidents) {
      const assessmentHistory = assessmentsByIncident.get(incident.id) ?? [];
      const latest = assessmentHistory[0];

      if (latest && latest.createdAt > cooldownCutoff) {
        keepExisting.push(normalizeStoredAssessment(latest));
        continue;
      }

      const rows = detectionsByIncident.get(incident.id) ?? [];
      const { window, history } = buildCurrentAndHistory(incident, rows, assessmentHistory, nowMs);
      const result = assessRisk(window, history, {
        ...defaultRiskConfig,
        referenceTsMs: nowMs,
      });

      insertValues.push({
        incidentId: incident.id,
        riskScore: result.riskScore,
        severity: result.severity,
        threatLevel: result.threatLevel,
        priorityScore: Math.round(result.priorityScore),
        analysis: result.analysis,
        recommendations: result.recommendedActions,
        factors: result.factors,
      });
    }

    const inserted =
      insertValues.length > 0
        ? await db.insert(riskAssessments).values(insertValues).returning()
        : [];

    const included = [...keepExisting, ...inserted.map(normalizeStoredAssessment)];

    const ranked = rankAssessments(
      included.map((item) => ({
        incidentId: item.incidentId,
        assessmentTsMs: item.createdAt.getTime(),
        riskScore: item.riskScore,
        severity: item.severity,
        threatLevel: item.threatLevel,
        priorityScore: item.priorityScore,
        factors: item.factors,
        recommendedActions: item.recommendations,
        analysis: item.analysis,
      })),
    );

    const rankedByIncident = new Map<number, (typeof ranked)[number]>();
    for (const item of ranked) {
      rankedByIncident.set(item.incidentId, item);
    }

    const assessments = included
      .map((item) => {
        const rankInfo = rankedByIncident.get(item.incidentId);
        return {
          ...item,
          rank: rankInfo?.rank ?? null,
          rankWithinSeverity: rankInfo?.rankWithinSeverity ?? null,
        };
      })
      .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));

    res.json({
      message: `Analyzed ${inserted.length} incidents`,
      assessments,
    });

    broadcast("risk_ranking_updated", {
      analyzedCount: inserted.length,
      incidentCount: assessments.length,
      cooldownSeconds,
      top: ranked.slice(0, 5),
    });
  } catch (error) {
    console.error("Error batch analyzing:", error);
    res.status(500).json({ error: "Failed to batch analyze incidents" });
  }
});

export default router;
