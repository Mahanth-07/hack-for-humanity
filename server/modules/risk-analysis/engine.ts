export type Region =
  | "intersection"
  | "forest"
  | "riverbank"
  | "roadway"
  | "facility"
  | "other";

export type Detection = {
  cameraId: string;
  ts: number;
  label: string;
  confidence: number;
  bbox?: { x: number; y: number; w: number; h: number };
  trackId?: string;
  region?: Region;
};

export type ModelWindow = {
  cameraId: string;
  startTs: number;
  endTs: number;
  detections: Detection[];
};

export type RecentHistory = {
  priorWindows: ModelWindow[];
};

export type Severity = "low" | "medium" | "high" | "severe";
export type ThreatLevel = "low" | "moderate" | "high" | "severe";
type Category = "fire" | "environmental" | "roadway" | "security" | "other" | "unknown";

export type RiskFactor = {
  key: string;
  weight: number;
  detail: string;
};

export type Assessment = {
  riskScore: number;
  severity: Severity;
  threatLevel: ThreatLevel;
  priorityScore: number;
  factors: RiskFactor[];
  recommendedActions: string[];
  analysis: string;
  escalationScore: number;
  dominantCategory: Category;
  referenceTsMs: number;
  assessmentTsMs: number;
};

export type AssessmentWithIncidentMeta = {
  incidentId: number;
  assessmentTsMs: number;
  riskScore: number;
  severity: Severity;
  threatLevel: ThreatLevel;
  priorityScore: number;
  factors: RiskFactor[];
  recommendedActions: string[];
  analysis?: string;
};

export type RankedAssessment = AssessmentWithIncidentMeta & {
  rank: number;
  rankWithinSeverity: number;
};

export type RiskConfig = {
  referenceTsMs: number;
  windowMs: number;
  historyWindowMs: number;
  maxPriorWindows: number;
  minConfidence: number;
  fullConfidence: number;
  lowConfidenceScale: number;
  partialConfidenceScale: number;
  repetitionDecayExponent: number;
  unknownLabelWeight: number;
  minorLabels: string[];
  labelWeights: Record<string, number>;
  labelCategories: Record<string, Category>;
  categoryCaps: Record<Category, number>;
  persistence: {
    perOccurrenceWeight: number;
    perTrackWeight: number;
    maxPerLabel: number;
    maxTotal: number;
  };
  trend: {
    countIncreaseWeight: number;
    areaIncreaseWeight: number;
    smokeToFlameBonus: number;
    maxTotal: number;
  };
  regionMultipliers: Record<Region, Partial<Record<Category, number>>>;
  compound: {
    personVehicleNearBonus: number;
    personFireNearBonus: number;
    collisionSmokeBonus: number;
    smokeFlameBonus: number;
    oilSheenRiverbankBonus: number;
    proximityDistanceThreshold: number;
    iouThreshold: number;
    maxTotal: number;
  };
  severityThresholds: {
    lowMax: number;
    mediumMax: number;
    highMax: number;
  };
  threatThresholds: {
    lowMax: number;
    moderateMax: number;
    highMax: number;
  };
  priority: {
    riskScoreWeight: number;
    maxRecencyBonus: number;
    recencyHalfLifeMs: number;
    escalationWeight: number;
    maxEscalationBonus: number;
    contextBonusByCategory: Record<Category, number>;
    minScore: number;
    maxScore: number;
  };
  maxBoostTotal: number;
  topFactors: number;
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  severe: 4,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLabel(label: string): string {
  return (label || "unknown").toLowerCase().trim().replace(/\s+/g, "_");
}

function getCategory(label: string, config: RiskConfig): Category {
  const normalized = normalizeLabel(label);
  return config.labelCategories[normalized] ?? "unknown";
}

function confidenceScale(confidence: number, config: RiskConfig): number {
  const conf = clamp(Number.isFinite(confidence) ? confidence : 0, 0, 1);
  if (conf < config.minConfidence) {
    return config.lowConfidenceScale;
  }
  if (conf >= config.fullConfidence) {
    return 1;
  }
  const ratio = (conf - config.minConfidence) / (config.fullConfidence - config.minConfidence);
  return config.partialConfidenceScale + ratio * (1 - config.partialConfidenceScale);
}

function center(bbox: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
  return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function iou(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

function detectDominantRegion(window: ModelWindow): Region {
  const counts: Record<Region, number> = {
    intersection: 0,
    forest: 0,
    riverbank: 0,
    roadway: 0,
    facility: 0,
    other: 0,
  };
  for (const detection of window.detections) {
    counts[detection.region ?? "other"] += 1;
  }
  let best: Region = "other";
  let bestCount = -1;
  for (const [region, count] of Object.entries(counts) as Array<[Region, number]>) {
    if (count > bestCount) {
      best = region;
      bestCount = count;
    }
  }
  return best;
}

function mapSeverity(score: number, config: RiskConfig): Severity {
  if (score <= config.severityThresholds.lowMax) return "low";
  if (score <= config.severityThresholds.mediumMax) return "medium";
  if (score <= config.severityThresholds.highMax) return "high";
  return "severe";
}

function mapThreatLevel(score: number, config: RiskConfig): ThreatLevel {
  if (score <= config.threatThresholds.lowMax) return "low";
  if (score <= config.threatThresholds.moderateMax) return "moderate";
  if (score <= config.threatThresholds.highMax) return "high";
  return "severe";
}

function getLabelWeight(label: string, config: RiskConfig): number {
  const normalized = normalizeLabel(label);
  return config.labelWeights[normalized] ?? config.unknownLabelWeight;
}

function getDetectionsByLabel(window: ModelWindow): Record<string, Detection[]> {
  const byLabel: Record<string, Detection[]> = {};
  for (const detection of window.detections) {
    const label = normalizeLabel(detection.label);
    if (!byLabel[label]) {
      byLabel[label] = [];
    }
    byLabel[label].push(detection);
  }
  return byLabel;
}

function averageBboxArea(detections: Detection[]): number {
  const withBbox = detections.filter((d) => d.bbox);
  if (withBbox.length === 0) return 0;
  const total = withBbox.reduce((sum, d) => sum + ((d.bbox?.w ?? 0) * (d.bbox?.h ?? 0)), 0);
  return total / withBbox.length;
}

function hasLabel(window: ModelWindow, labels: string[]): boolean {
  const set = new Set(window.detections.map((d) => normalizeLabel(d.label)));
  return labels.some((label) => set.has(normalizeLabel(label)));
}

function anyNear(
  first: Detection[],
  second: Detection[],
  maxDistance: number,
  minIou: number,
): boolean {
  for (const a of first) {
    for (const b of second) {
      if (!a.bbox || !b.bbox) continue;
      const d = distance(center(a.bbox), center(b.bbox));
      if (d <= maxDistance) return true;
      if (iou(a.bbox, b.bbox) >= minIou) return true;
    }
  }
  return false;
}

function recommendedActions(severity: Severity, categories: Category[]): string[] {
  const actions = new Set<string>();
  if (severity === "severe" || severity === "high") {
    actions.add("Dispatch response team immediately");
    actions.add("Escalate to incident command");
    actions.add("Notify relevant authority now");
  } else if (severity === "medium") {
    actions.add("Monitor continuously");
    actions.add("Flag for operator review");
  } else {
    actions.add("Log event for baseline tracking");
  }

  if (categories.includes("environmental")) {
    actions.add("Notify environmental compliance or park ranger");
  }
  if (categories.includes("roadway")) {
    actions.add("Notify traffic operations and roadway dispatch");
  }
  if (categories.includes("security")) {
    actions.add("Notify onsite security staff");
  }
  if (categories.includes("fire")) {
    actions.add("Dispatch fire response resources");
  }
  return Array.from(actions);
}

function stableTopFactors(factors: RiskFactor[], topN: number): RiskFactor[] {
  return [...factors]
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight) || a.key.localeCompare(b.key))
    .slice(0, topN);
}

export function assessRisk(
  window: ModelWindow,
  history: RecentHistory,
  config: RiskConfig,
): Assessment {
  const currentDetections = window.detections.slice();
  const priorWindows = history.priorWindows.slice(-config.maxPriorWindows);
  const factors: RiskFactor[] = [];
  const eventWeights: Record<string, number> = {};
  const categoryTotals: Record<Category, number> = {
    fire: 0,
    environmental: 0,
    roadway: 0,
    security: 0,
    other: 0,
    unknown: 0,
  };
  let confidenceAdjustment = 0;
  let regionAdjustment = 0;

  const seenPerLabel: Record<string, number> = {};
  for (const detection of currentDetections) {
    const label = normalizeLabel(detection.label);
    const category = getCategory(label, config);
    const base = getLabelWeight(label, config);
    const confidence = confidenceScale(detection.confidence, config);
    const seenIndex = seenPerLabel[label] ?? 0;
    seenPerLabel[label] = seenIndex + 1;
    const repetitionScale = 1 / Math.pow(seenIndex + 1, config.repetitionDecayExponent);
    const region = detection.region ?? "other";
    const regionMultiplier = config.regionMultipliers[region]?.[category] ?? 1;

    const unconfidentContribution = base * repetitionScale * regionMultiplier;
    const contribution = unconfidentContribution * confidence;
    const categoryCap = config.categoryCaps[category];
    const previousCategoryValue = categoryTotals[category];
    categoryTotals[category] = clamp(previousCategoryValue + contribution, 0, categoryCap);
    const accepted = categoryTotals[category] - previousCategoryValue;
    eventWeights[label] = (eventWeights[label] ?? 0) + accepted;

    confidenceAdjustment += accepted - unconfidentContribution;
    regionAdjustment += unconfidentContribution - base * repetitionScale;
  }

  for (const [label, weight] of Object.entries(eventWeights)) {
    factors.push({
      key: `event:${label}`,
      weight,
      detail: `Event contribution for ${label}`,
    });
  }

  if (Math.abs(confidenceAdjustment) > 0.01) {
    factors.push({
      key: "confidence:scaled",
      weight: confidenceAdjustment,
      detail: "Confidence scaling adjustment applied",
    });
  }

  if (Math.abs(regionAdjustment) > 0.01) {
    const dominantRegion = detectDominantRegion(window);
    factors.push({
      key: `region:${dominantRegion}_multiplier`,
      weight: regionAdjustment,
      detail: `Region multiplier adjustment for ${dominantRegion}`,
    });
  }

  const byLabelCurrent = getDetectionsByLabel(window);
  let persistenceTotal = 0;
  for (const [label, detections] of Object.entries(byLabelCurrent)) {
    let priorCount = 0;
    let trackMatches = 0;
    const currentTracks = new Set(detections.map((d) => d.trackId).filter(Boolean));
    for (const prior of priorWindows) {
      for (const priorDetection of prior.detections) {
        if (normalizeLabel(priorDetection.label) === label) {
          priorCount += 1;
          if (priorDetection.trackId && currentTracks.has(priorDetection.trackId)) {
            trackMatches += 1;
          }
        }
      }
    }
    const raw =
      priorCount * config.persistence.perOccurrenceWeight +
      trackMatches * config.persistence.perTrackWeight;
    const bonus = clamp(raw, 0, config.persistence.maxPerLabel);
    if (bonus > 0) {
      persistenceTotal += bonus;
      factors.push({
        key: `persistence:${label}`,
        weight: bonus,
        detail: `${label} persisted across recent windows`,
      });
    }
  }
  persistenceTotal = clamp(persistenceTotal, 0, config.persistence.maxTotal);

  let trendTotal = 0;
  const countHistory = [...priorWindows, window];
  const labels = new Set<string>();
  for (const item of countHistory) {
    for (const d of item.detections) {
      labels.add(normalizeLabel(d.label));
    }
  }
  for (const label of Array.from(labels)) {
    const counts = countHistory.map(
      (item) => item.detections.filter((d) => normalizeLabel(d.label) === label).length,
    );
    if (counts.length >= 2) {
      const delta = counts[counts.length - 1] - counts[0];
      if (delta > 0) {
        const countBonus = delta * config.trend.countIncreaseWeight;
        trendTotal += countBonus;
        factors.push({
          key: `trend:${label}_increasing`,
          weight: countBonus,
          detail: `${label} count increased from ${counts[0]} to ${counts[counts.length - 1]}`,
        });
      }
    }

    const areas = countHistory.map((item) =>
      averageBboxArea(item.detections.filter((d) => normalizeLabel(d.label) === label)),
    );
    if (areas.length >= 2) {
      const areaDelta = areas[areas.length - 1] - areas[0];
      if (areaDelta > 0) {
        const areaBonus = areaDelta * config.trend.areaIncreaseWeight;
        trendTotal += areaBonus;
        factors.push({
          key: `trend:${label}_area_increasing`,
          weight: areaBonus,
          detail: `${label} average area increased`,
        });
      }
    }
  }

  const hadPriorSmoke = priorWindows.some((item) => hasLabel(item, ["smoke"]));
  const hasCurrentFlame = hasLabel(window, ["flame", "active_fire"]);
  if (hadPriorSmoke && hasCurrentFlame) {
    trendTotal += config.trend.smokeToFlameBonus;
    factors.push({
      key: "trend:smoke_to_flame",
      weight: config.trend.smokeToFlameBonus,
      detail: "Smoke progression to flame observed",
    });
  }
  trendTotal = clamp(trendTotal, 0, config.trend.maxTotal);

  const labelGroups = {
    person: currentDetections.filter((d) =>
      ["person", "person_on_roadway", "intruder"].includes(normalizeLabel(d.label)),
    ),
    vehicle: currentDetections.filter((d) =>
      ["vehicle", "car", "truck", "bus"].includes(normalizeLabel(d.label)),
    ),
    fire: currentDetections.filter((d) => ["smoke", "flame", "active_fire"].includes(normalizeLabel(d.label))),
    collision: currentDetections.filter((d) => normalizeLabel(d.label) === "collision"),
    smoke: currentDetections.filter((d) => normalizeLabel(d.label) === "smoke"),
    flame: currentDetections.filter((d) => ["flame", "active_fire"].includes(normalizeLabel(d.label))),
    oilSheen: currentDetections.filter((d) => normalizeLabel(d.label) === "oil_sheen"),
  };

  const dominantRegion = detectDominantRegion(window);
  let compoundTotal = 0;
  if (labelGroups.smoke.length > 0 && labelGroups.flame.length > 0) {
    compoundTotal += config.compound.smokeFlameBonus;
    factors.push({
      key: "compound:smoke_and_flame",
      weight: config.compound.smokeFlameBonus,
      detail: "Smoke and flame co-occur in current window",
    });
  }
  if (labelGroups.collision.length > 0 && labelGroups.smoke.length > 0) {
    compoundTotal += config.compound.collisionSmokeBonus;
    factors.push({
      key: "compound:collision_and_smoke",
      weight: config.compound.collisionSmokeBonus,
      detail: "Collision combined with smoke",
    });
  }
  if (labelGroups.oilSheen.length > 0 && dominantRegion === "riverbank") {
    compoundTotal += config.compound.oilSheenRiverbankBonus;
    factors.push({
      key: "compound:oil_sheen_riverbank",
      weight: config.compound.oilSheenRiverbankBonus,
      detail: "Oil sheen detected in riverbank region",
    });
  }
  if (
    (dominantRegion === "roadway" || dominantRegion === "intersection") &&
    anyNear(
      labelGroups.person,
      labelGroups.vehicle,
      config.compound.proximityDistanceThreshold,
      config.compound.iouThreshold,
    )
  ) {
    compoundTotal += config.compound.personVehicleNearBonus;
    factors.push({
      key: "compound:person_near_vehicle",
      weight: config.compound.personVehicleNearBonus,
      detail: "Person near vehicle in roadway context",
    });
  }
  if (
    anyNear(
      labelGroups.person,
      labelGroups.fire,
      config.compound.proximityDistanceThreshold,
      config.compound.iouThreshold,
    )
  ) {
    compoundTotal += config.compound.personFireNearBonus;
    factors.push({
      key: "compound:person_near_fire",
      weight: config.compound.personFireNearBonus,
      detail: "Person detected near smoke/fire",
    });
  }
  compoundTotal = clamp(compoundTotal, 0, config.compound.maxTotal);

  const baseFromCategories = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
  const boostTotal = clamp(
    persistenceTotal + trendTotal + compoundTotal,
    0,
    Math.min(config.maxBoostTotal, config.persistence.maxTotal + config.trend.maxTotal + config.compound.maxTotal),
  );
  const riskScore = clamp(Math.round(baseFromCategories + boostTotal), 0, 100);
  const severity = mapSeverity(riskScore, config);
  const threatLevel = mapThreatLevel(riskScore, config);

  const dominantCategory = (Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0]?.[0] ?? "unknown") as Category;

  const categoriesUsed = Object.entries(categoryTotals)
    .filter(([, value]) => value > 0)
    .map(([category]) => category as Category);

  const recencyAge = Math.max(0, config.referenceTsMs - window.endTs);
  const recencyBonus =
    config.priority.maxRecencyBonus * Math.exp(-recencyAge / Math.max(1, config.priority.recencyHalfLifeMs));
  const escalationScore = persistenceTotal + trendTotal + compoundTotal;
  const escalationBonus = clamp(
    escalationScore * config.priority.escalationWeight,
    0,
    config.priority.maxEscalationBonus,
  );
  const contextBonus = config.priority.contextBonusByCategory[dominantCategory] ?? 0;
  const priorityScore = clamp(
    Number(
      (
        riskScore * config.priority.riskScoreWeight +
        recencyBonus +
        escalationBonus +
        contextBonus
      ).toFixed(2),
    ),
    config.priority.minScore,
    config.priority.maxScore,
  );

  const topFactors = stableTopFactors(factors, config.topFactors);
  const actionList = recommendedActions(severity, categoriesUsed);
  const analysis = `Risk score ${riskScore} (${severity}) with ${threatLevel} threat level based on ${currentDetections.length} detections.`;

  return {
    riskScore,
    severity,
    threatLevel,
    priorityScore,
    factors: topFactors,
    recommendedActions: actionList,
    analysis,
    escalationScore,
    dominantCategory,
    referenceTsMs: config.referenceTsMs,
    assessmentTsMs: window.endTs,
  };
}

export function rankAssessments(items: Array<AssessmentWithIncidentMeta>): Array<RankedAssessment> {
  const sorted = [...items].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    if (SEVERITY_WEIGHT[b.severity] !== SEVERITY_WEIGHT[a.severity]) {
      return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
    }
    if (b.assessmentTsMs !== a.assessmentTsMs) return b.assessmentTsMs - a.assessmentTsMs;
    return a.incidentId - b.incidentId;
  });

  const perSeverity: Record<Severity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    severe: 0,
  };

  return sorted.map((item, index) => {
    perSeverity[item.severity] += 1;
    return {
      ...item,
      rank: index + 1,
      rankWithinSeverity: perSeverity[item.severity],
    };
  });
}
