import test from "node:test";
import assert from "node:assert/strict";
import { assessRisk, rankAssessments, ModelWindow, RecentHistory, Detection } from "./engine";
import { defaultRiskConfig } from "./config";

function makeWindow(
  ts: number,
  detections: Array<Partial<Detection> & Pick<Detection, "label" | "confidence">>,
): ModelWindow {
  return {
    cameraId: "cam-1",
    startTs: ts - 10_000,
    endTs: ts,
    detections: detections.map((d, index) => ({
      cameraId: "cam-1",
      ts,
      label: d.label,
      confidence: d.confidence,
      bbox: d.bbox,
      trackId: d.trackId ?? `t-${index}`,
      region: d.region ?? "other",
    })),
  };
}

function config(referenceTsMs: number) {
  return { ...defaultRiskConfig, referenceTsMs };
}

test("1) Forest smoke building increases risk and reaches at least high", () => {
  const t1 = 1_000_000;
  const w1 = makeWindow(t1, [
    { label: "smoke", confidence: 0.55, region: "forest", trackId: "s1", bbox: { x: 0.2, y: 0.2, w: 0.1, h: 0.1 } },
  ]);
  const w2 = makeWindow(t1 + 10_000, [
    { label: "smoke", confidence: 0.65, region: "forest", trackId: "s1", bbox: { x: 0.2, y: 0.2, w: 0.16, h: 0.16 } },
    { label: "smoke", confidence: 0.7, region: "forest", trackId: "s2", bbox: { x: 0.25, y: 0.2, w: 0.12, h: 0.12 } },
  ]);
  const w3 = makeWindow(t1 + 20_000, [
    { label: "smoke", confidence: 0.78, region: "forest", trackId: "s1", bbox: { x: 0.2, y: 0.2, w: 0.2, h: 0.2 } },
    { label: "smoke", confidence: 0.76, region: "forest", trackId: "s2", bbox: { x: 0.24, y: 0.21, w: 0.18, h: 0.18 } },
    { label: "smoke", confidence: 0.74, region: "forest", trackId: "s3", bbox: { x: 0.28, y: 0.22, w: 0.14, h: 0.14 } },
  ]);

  const a1 = assessRisk(w1, { priorWindows: [] }, config(w1.endTs));
  const a2 = assessRisk(w2, { priorWindows: [w1] }, config(w2.endTs));
  const a3 = assessRisk(w3, { priorWindows: [w1, w2] }, config(w3.endTs));

  assert.ok(a2.riskScore > a1.riskScore);
  assert.ok(a3.riskScore > a2.riskScore);
  assert.ok(a3.severity === "high" || a3.severity === "severe");
  assert.ok(a3.factors.some((f) => f.key.startsWith("persistence:smoke")));
  assert.ok(a3.factors.some((f) => f.key.startsWith("trend:smoke_")));
  assert.ok(a3.factors.some((f) => f.key === "region:forest_multiplier"));
});

test("2) Smoke + flame same forest window is severe", () => {
  const window = makeWindow(2_000_000, [
    { label: "smoke", confidence: 0.9, region: "forest", bbox: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 } },
    { label: "flame", confidence: 0.88, region: "forest", bbox: { x: 0.14, y: 0.14, w: 0.26, h: 0.26 } },
  ]);
  const result = assessRisk(window, { priorWindows: [] }, config(window.endTs));
  assert.equal(result.severity, "severe");
  assert.ok(result.factors.some((f) => f.key === "compound:smoke_and_flame"));
});

test("3) Riverbank oil_sheen at 0.75 confidence is at least high", () => {
  const window = makeWindow(3_000_000, [{ label: "oil_sheen", confidence: 0.75, region: "riverbank" }]);
  const result = assessRisk(window, { priorWindows: [] }, config(window.endTs));
  assert.ok(result.severity === "high" || result.severity === "severe");
});

test("4) Roadway person_on_roadway near vehicle is at least high", () => {
  const window = makeWindow(4_000_000, [
    {
      label: "person_on_roadway",
      confidence: 0.8,
      region: "roadway",
      bbox: { x: 0.41, y: 0.42, w: 0.08, h: 0.08 },
    },
    {
      label: "vehicle",
      confidence: 0.84,
      region: "roadway",
      bbox: { x: 0.48, y: 0.42, w: 0.15, h: 0.15 },
    },
  ]);
  const result = assessRisk(window, { priorWindows: [] }, config(window.endTs));
  assert.ok(result.severity === "high" || result.severity === "severe");
  assert.ok(result.factors.some((f) => f.key === "compound:person_near_vehicle"));
});

test("5) Collision high then collision + smoke becomes severe", () => {
  const t = 5_000_000;
  const w1 = makeWindow(t, [{ label: "collision", confidence: 0.82, region: "intersection" }]);
  const w2 = makeWindow(t + 10_000, [
    { label: "collision", confidence: 0.9, region: "intersection" },
    { label: "smoke", confidence: 0.76, region: "intersection" },
  ]);
  const a1 = assessRisk(w1, { priorWindows: [] }, config(w1.endTs));
  const a2 = assessRisk(w2, { priorWindows: [w1] }, config(w2.endTs));

  assert.ok(a1.severity === "high" || a1.severity === "severe");
  assert.equal(a2.severity, "severe");
  assert.ok(a2.factors.some((f) => f.key === "compound:collision_and_smoke"));
});

test("6) Low confidence smoke at 0.2 is low", () => {
  const w = makeWindow(6_000_000, [{ label: "smoke", confidence: 0.2, region: "forest" }]);
  const result = assessRisk(w, { priorWindows: [] }, config(w.endTs));
  assert.equal(result.severity, "low");
});

test("7) Many minor detections are capped to medium or below", () => {
  const detections = Array.from({ length: 25 }, (_, index) => ({
    label: "trash",
    confidence: 0.65,
    region: "other" as const,
    trackId: `trash-${index}`,
  }));
  const w = makeWindow(7_000_000, detections);
  const result = assessRisk(w, { priorWindows: [] }, config(w.endTs));
  assert.ok(result.riskScore <= defaultRiskConfig.severityThresholds.mediumMax);
  assert.ok(result.severity === "low" || result.severity === "medium");
});

test("8) Ranking within severity is deterministic and meaningful", () => {
  const ranked = rankAssessments([
    {
      incidentId: 10,
      assessmentTsMs: 10,
      riskScore: 68,
      severity: "high",
      threatLevel: "high",
      priorityScore: 130,
      factors: [],
      recommendedActions: [],
    },
    {
      incidentId: 11,
      assessmentTsMs: 11,
      riskScore: 66,
      severity: "high",
      threatLevel: "high",
      priorityScore: 120,
      factors: [],
      recommendedActions: [],
    },
    {
      incidentId: 12,
      assessmentTsMs: 12,
      riskScore: 98,
      severity: "severe",
      threatLevel: "severe",
      priorityScore: 200,
      factors: [],
      recommendedActions: [],
    },
    {
      incidentId: 13,
      assessmentTsMs: 13,
      riskScore: 76,
      severity: "severe",
      threatLevel: "severe",
      priorityScore: 170,
      factors: [],
      recommendedActions: [],
    },
  ]);

  const high = ranked.filter((item) => item.severity === "high");
  const severe = ranked.filter((item) => item.severity === "severe");
  assert.equal(high[0].incidentId, 10);
  assert.equal(high[0].rankWithinSeverity, 1);
  assert.equal(high[1].incidentId, 11);
  assert.equal(severe[0].incidentId, 12);
  assert.equal(severe[1].incidentId, 13);
});

test("9) Stable sorting uses timestamp then incidentId tie-break", () => {
  const ranked = rankAssessments([
    {
      incidentId: 22,
      assessmentTsMs: 100,
      riskScore: 80,
      severity: "severe",
      threatLevel: "severe",
      priorityScore: 180,
      factors: [],
      recommendedActions: [],
    },
    {
      incidentId: 21,
      assessmentTsMs: 100,
      riskScore: 80,
      severity: "severe",
      threatLevel: "severe",
      priorityScore: 180,
      factors: [],
      recommendedActions: [],
    },
    {
      incidentId: 20,
      assessmentTsMs: 101,
      riskScore: 80,
      severity: "severe",
      threatLevel: "severe",
      priorityScore: 180,
      factors: [],
      recommendedActions: [],
    },
  ]);

  assert.deepEqual(
    ranked.map((item) => item.incidentId),
    [20, 21, 22],
  );
});

test("Deterministic output for same input", () => {
  const w = makeWindow(8_000_000, [
    { label: "smoke", confidence: 0.7, region: "forest" },
    { label: "flame", confidence: 0.7, region: "forest" },
  ]);
  const history: RecentHistory = { priorWindows: [] };
  const first = assessRisk(w, history, config(w.endTs));
  const second = assessRisk(w, history, config(w.endTs));
  assert.deepEqual(first, second);
});

