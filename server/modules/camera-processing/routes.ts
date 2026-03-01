import { Router, Request, Response } from "express";
import { db } from "../../db";
import { cameraFeeds, cameraDetections, incidents, riskAssessments } from "@shared/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { openai } from "../../replit_integrations/audio/client";
import { broadcast } from "../../index";
import { assessRisk, rankAssessments, Detection, ModelWindow, RiskFactor } from "../risk-analysis/engine";
import { defaultRiskConfig } from "../risk-analysis/config";

const router = Router();

// Get all camera feeds
router.get("/feeds", async (req: Request, res: Response) => {
  try {
    const feeds = await db
      .select()
      .from(cameraFeeds)
      .orderBy(cameraFeeds.name);
    res.json(feeds);
  } catch (error) {
    console.error("Error fetching camera feeds:", error);
    res.status(500).json({ error: "Failed to fetch camera feeds" });
  }
});

// Create camera feed
router.post("/feeds", async (req: Request, res: Response) => {
  try {
    const { name, location, streamUrl, metadata } = req.body;

    if (!name || !location) {
      return res.status(400).json({ error: "Name and location are required" });
    }

    const [feed] = await db
      .insert(cameraFeeds)
      .values({
        name,
        location,
        streamUrl: streamUrl || null,
        isActive: true,
        metadata: metadata || null,
      })
      .returning();

    res.json(feed);
  } catch (error) {
    console.error("Error creating camera feed:", error);
    res.status(500).json({ error: "Failed to create camera feed" });
  }
});

// Toggle camera feed status
router.patch("/feeds/:id/toggle", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    const [feed] = await db
      .select()
      .from(cameraFeeds)
      .where(eq(cameraFeeds.id, id))
      .limit(1);

    if (!feed) {
      return res.status(404).json({ error: "Camera feed not found" });
    }

    const [updated] = await db
      .update(cameraFeeds)
      .set({ isActive: !feed.isActive })
      .where(eq(cameraFeeds.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error toggling camera feed:", error);
    res.status(500).json({ error: "Failed to toggle camera feed" });
  }
});

// Get all detections
router.get("/detections", async (req: Request, res: Response) => {
  try {
    const detections = await db
      .select()
      .from(cameraDetections)
      .orderBy(desc(cameraDetections.createdAt))
      .limit(100);
    res.json(detections);
  } catch (error) {
    console.error("Error fetching detections:", error);
    res.status(500).json({ error: "Failed to fetch detections" });
  }
});

// Get detections for specific camera
router.get("/detections/camera/:cameraId", async (req: Request, res: Response) => {
  try {
    const cameraId = parseInt(req.params.cameraId as string);
    const detections = await db
      .select()
      .from(cameraDetections)
      .where(eq(cameraDetections.cameraFeedId, cameraId))
      .orderBy(desc(cameraDetections.createdAt))
      .limit(50);
    res.json(detections);
  } catch (error) {
    console.error("Error fetching camera detections:", error);
    res.status(500).json({ error: "Failed to fetch camera detections" });
  }
});

// Process image with AI detection
router.post("/detect", async (req: Request, res: Response) => {
  try {
    const { cameraFeedId, imageUrl, imageData } = req.body;

    if (!cameraFeedId) {
      return res.status(400).json({ error: "Camera feed ID is required" });
    }

    if (!imageUrl && !imageData) {
      return res.status(400).json({ error: "imageUrl or imageData is required" });
    }

    const imageSource = imageUrl || `data:image/jpeg;base64,${imageData}`;

    // Use GPT-4o with vision for image analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an emergency response AI analyzing security camera footage frames for public safety threats. Your job is to catch emergencies early, even if partial — err on the side of reporting.
Detect ANY of the following, even if they occupy a small portion of the frame: fires, floods, vehicle crashes (car on sidewalk, collision, rollover), fights/assaults, weapons, chemical spills, gas leaks, structural collapse, drowning, medical emergencies, looting, arson, or environmental hazards.
Be sensitive — if you see a car mounting a curb, pedestrians being struck, smoke, flames, or any violent activity, report it. A small but clear emergency in one corner of the frame still counts.
Respond ONLY with valid JSON using these exact keys:
- detectionType: one of "fire", "flood", "crash", "fight", "weapon", "hazmat", "structural", "medical", "environmental", "anomaly", or "none"
- confidence: integer 0-100
- description: brief string describing what was detected (or "No threats detected" if none)
- urgency: one of "low", "medium", "high", "critical", or "none"
- humanLifePresent: boolean — true if any people are visible or likely present in the scene
- animalsPresent: boolean — true if any animals are visible in the scene
- inanimateObjects: string — brief comma-separated list of key objects visible (e.g. "vehicle, fire extinguisher, shelving")
- sceneContext: string — one sentence describing the environment/setting useful for first responders (e.g. "Multi-story parking garage with active fire on level 2 near stairwell exit")
If no threat is detected, return detectionType "none" and urgency "none". Still fill in humanLifePresent, animalsPresent, inanimateObjects, and sceneContext based on what is visible.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this security camera frame for any public safety hazards or emergencies."
            },
            {
              type: "image_url",
              image_url: {
                url: imageSource,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const aiDetection = JSON.parse(completion.choices[0].message.content || "{}");

    // Only store if something was detected
    if (aiDetection.detectionType && aiDetection.detectionType !== "none") {
      // Build enriched metadata from AI response
      const enrichedMetadata = {
        description: aiDetection.description,
        urgency: aiDetection.urgency,
        humanLifePresent: aiDetection.humanLifePresent ?? false,
        animalsPresent: aiDetection.animalsPresent ?? false,
        inanimateObjects: aiDetection.inanimateObjects || "",
        sceneContext: aiDetection.sceneContext || "",
      };

      const [detection] = await db
        .insert(cameraDetections)
        .values({
          cameraFeedId,
          detectionType: aiDetection.detectionType,
          confidence: aiDetection.confidence || 0,
          imageUrl: imageUrl || null,
          boundingBox: aiDetection.boundingBox || null,
          metadata: enrichedMetadata,
        })
        .returning();

      broadcast("detection_created", { detection });

      // Auto-create incident for medium-or-higher urgency detections
      if (aiDetection.urgency === "critical" || aiDetection.urgency === "high" || aiDetection.urgency === "medium") {
        const [camera] = await db
          .select()
          .from(cameraFeeds)
          .where(eq(cameraFeeds.id, cameraFeedId))
          .limit(1);

        if (camera) {
          // Update camera status to "incident"
          await db
            .update(cameraFeeds)
            .set({ status: "incident" })
            .where(eq(cameraFeeds.id, cameraFeedId));

          const label = aiDetection.detectionType.charAt(0).toUpperCase() + aiDetection.detectionType.slice(1);
          const newSeverity: string = aiDetection.urgency === "critical" ? "critical" : aiDetection.urgency === "high" ? "high" : "medium";

          // Check for an existing active incident from the same camera with the same detection type
          // created in the last 10 minutes — if found, link detection to it instead of creating a duplicate
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          const existingTitlePrefix = `${label} Detected — ${camera.name}`;
          const existingActiveIncidents = await db
            .select()
            .from(incidents)
            .where(eq(incidents.status, "active"))
            .orderBy(desc(incidents.createdAt));
          const duplicate = existingActiveIncidents.find(
            (inc) =>
              inc.title === existingTitlePrefix &&
              new Date(inc.createdAt) > tenMinutesAgo,
          );

          let incident: typeof incidents.$inferSelect;
          if (duplicate) {
            // Escalate severity if the new detection is higher, and append the video URL if provided
            const severityRank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
            const updateData: { severity?: string; videoUrl?: string } = {};

            if ((severityRank[newSeverity] ?? 0) > (severityRank[duplicate.severity] ?? 0)) {
              updateData.severity = newSeverity;
            }
            if (req.body.videoUrl && !duplicate.videoUrl) {
              updateData.videoUrl = req.body.videoUrl;
            }

            if (Object.keys(updateData).length > 0) {
              const [updated] = await db
                .update(incidents)
                .set(updateData)
                .where(eq(incidents.id, duplicate.id))
                .returning();
              incident = updated;
            } else {
              incident = duplicate;
            }
            await db
              .update(cameraDetections)
              .set({ incidentId: incident.id })
              .where(eq(cameraDetections.id, detection.id));
            broadcast("incident_created", { incident });
            broadcast("camera_status_changed", { cameraFeedId: camera.id, status: "incident" });
          } else {
            // Build enriched incident description for first responders
            const parts: string[] = [aiDetection.description || "Automated camera detection"];
            if (aiDetection.sceneContext) parts.push(aiDetection.sceneContext);
            if (aiDetection.humanLifePresent) parts.push("Human life present.");
            else parts.push("No human life detected.");
            if (aiDetection.animalsPresent) parts.push("Animals present.");
            if (aiDetection.inanimateObjects) parts.push(`Objects visible: ${aiDetection.inanimateObjects}.`);
            const enrichedDescription = parts.join(" ");

            const [newIncident] = await db
              .insert(incidents)
              .values({
                title: existingTitlePrefix,
                description: enrichedDescription,
                severity: newSeverity,
                status: "active",
                location: camera.location,
                videoUrl: req.body.videoUrl || camera.videoUrl,
              })
              .returning();
            incident = newIncident;

            broadcast("incident_created", { incident });
            broadcast("camera_status_changed", { cameraFeedId: camera.id, status: "incident" });

            // Link detection to incident
            await db
              .update(cameraDetections)
              .set({ incidentId: incident.id })
              .where(eq(cameraDetections.id, detection.id));
          } // end else (new incident)

          // Immediately score / re-score the incident and broadcast updated rankings
          try {
            const nowMs = Date.now();
            const engineDetection: Detection = {
              cameraId: String(cameraFeedId),
              ts: detection.createdAt.getTime(),
              label: String(detection.detectionType || "unknown").toLowerCase(),
              confidence: Math.min(1, Math.max(0, Number(detection.confidence ?? 0) > 1 ? Number(detection.confidence) / 100 : Number(detection.confidence ?? 0))),
              region: "other",
            };
            const window: ModelWindow = {
              cameraId: String(cameraFeedId),
              startTs: nowMs - defaultRiskConfig.windowMs,
              endTs: nowMs,
              detections: [engineDetection],
            };
            const result = assessRisk(window, { priorWindows: [] }, { ...defaultRiskConfig, referenceTsMs: nowMs });
            const [stored] = await db
              .insert(riskAssessments)
              .values({
                incidentId: incident.id,
                riskScore: result.riskScore,
                severity: result.severity,
                threatLevel: result.threatLevel,
                priorityScore: Math.round(result.priorityScore),
                analysis: result.analysis,
                recommendations: result.recommendedActions,
                factors: result.factors,
              })
              .returning();

            // Compute cross-incident rankings and broadcast
            const activeIncidents = await db.select({ id: incidents.id }).from(incidents).where(eq(incidents.status, "active"));
            const activeIds = activeIncidents.map((i) => i.id);
            if (activeIds.length > 0) {
              const allLatestRows = await db.select().from(riskAssessments).where(inArray(riskAssessments.incidentId, activeIds)).orderBy(desc(riskAssessments.createdAt));
              const latestByIncident = new Map<number, typeof allLatestRows[number]>();
              for (const row of allLatestRows) {
                if (!latestByIncident.has(row.incidentId)) latestByIncident.set(row.incidentId, row);
              }
              const ranked = rankAssessments(Array.from(latestByIncident.values()).map((row) => ({
                incidentId: row.incidentId,
                assessmentTsMs: row.createdAt.getTime(),
                riskScore: row.riskScore,
                severity: (row.severity as "low" | "medium" | "high" | "severe") ?? "low",
                threatLevel: (row.threatLevel as "low" | "moderate" | "high" | "severe") ?? "low",
                priorityScore: row.priorityScore ?? row.riskScore,
                factors: Array.isArray(row.factors) ? (row.factors as RiskFactor[]) : [],
                recommendedActions: Array.isArray(row.recommendations) ? (row.recommendations as string[]) : [],
                analysis: row.analysis ?? "",
              })));
              const rankInfo = ranked.find((r) => r.incidentId === incident.id);
              broadcast("risk_ranking_updated", {
                updatedIncidentId: incident.id,
                updatedAssessmentId: stored.id,
                rank: rankInfo?.rank ?? null,
                rankWithinSeverity: rankInfo?.rankWithinSeverity ?? null,
                top: ranked.slice(0, 5),
              });
            }
          } catch (riskErr) {
            console.error("Auto risk scoring failed for new incident:", riskErr);
          }

          return res.json({ detection, incident, autoCreated: true, cameraName: camera.name });
        }
      }

      res.json({ detection, autoCreated: false });
    } else {
      res.json({ detection: null, autoCreated: false, message: "No threats detected" });
    }
  } catch (error) {
    console.error("Error processing detection:", error);
    res.status(500).json({ error: "Failed to process detection" });
  }
});

// Update camera feed video URL (after MP4 upload). Pass null to clear the video.
router.patch("/feeds/:id/video", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { videoUrl } = req.body;

    // videoUrl may be a string (set) or explicitly null (clear)
    if (videoUrl === undefined) {
      return res.status(400).json({ error: "videoUrl is required (pass null to clear)" });
    }

    const [updated] = await db
      .update(cameraFeeds)
      .set({ videoUrl: videoUrl ?? null, status: "idle" })
      .where(eq(cameraFeeds.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Camera feed not found" });
    }

    // Backfill any active incidents for this camera that missed the video URL
    if (videoUrl) {
      const allActiveIncidents = await db.select().from(incidents).where(eq(incidents.status, "active"));
      const cameraIncidents = allActiveIncidents.filter(inc => inc.title.includes(`— ${updated.name}`));

      for (const inc of cameraIncidents) {
        if (!inc.videoUrl) {
          await db.update(incidents).set({ videoUrl }).where(eq(incidents.id, inc.id));
        }
      }
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating camera video:", error);
    res.status(500).json({ error: "Failed to update camera video" });
  }
});

// Update camera feed location
router.patch("/feeds/:id/location", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { location } = req.body;

    if (!location || typeof location !== "string" || !location.trim()) {
      return res.status(400).json({ error: "location is required" });
    }

    const [updated] = await db
      .update(cameraFeeds)
      .set({ location: location.trim() })
      .where(eq(cameraFeeds.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Camera feed not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating camera location:", error);
    res.status(500).json({ error: "Failed to update camera location" });
  }
});

// Update camera feed status
router.patch("/feeds/:id/status", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;

    const validStatuses = ["idle", "analyzing", "incident", "calling", "resolved"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Valid status required: " + validStatuses.join(", ") });
    }

    const [updated] = await db
      .update(cameraFeeds)
      .set({ status })
      .where(eq(cameraFeeds.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Camera feed not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating camera status:", error);
    res.status(500).json({ error: "Failed to update camera status" });
  }
});

// Disconnect camera feed: clear video, reset location, resolve linked incidents
router.post("/feeds/:id/disconnect", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    // Get the camera to find its current location
    const [camera] = await db
      .select()
      .from(cameraFeeds)
      .where(eq(cameraFeeds.id, id))
      .limit(1);

    if (!camera) {
      return res.status(404).json({ error: "Camera feed not found" });
    }

    // Clear video URL and reset status + location
    const [updated] = await db
      .update(cameraFeeds)
      .set({ videoUrl: null, status: "idle", location: "Unassigned" })
      .where(eq(cameraFeeds.id, id))
      .returning();

    // Resolve any active incidents that were created from this camera
    // Match by camera name in title (format: "X Detected — Camera N")
    const allActiveIncidents = await db
      .select()
      .from(incidents)
      .where(eq(incidents.status, "active"));

    const cameraIncidents = allActiveIncidents.filter(
      (inc) => inc.title.includes(`— ${camera.name}`) || inc.location === camera.location
    );

    if (cameraIncidents.length > 0) {
      await Promise.all(
        cameraIncidents.map((inc) =>
          db
            .update(incidents)
            .set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
            .where(eq(incidents.id, inc.id))
        )
      );
    }

    res.json({ updated, resolvedIncidents: cameraIncidents.length });
  } catch (error) {
    console.error("Error disconnecting camera feed:", error);
    res.status(500).json({ error: "Failed to disconnect camera feed" });
  }
});

// Simulate camera detection (for testing)
router.post("/simulate/:cameraId", async (req: Request, res: Response) => {
  try {
    const cameraId = parseInt(req.params.cameraId as string);
    const { detectionType = "anomaly", confidence = 85 } = req.body;

    const [detection] = await db
      .insert(cameraDetections)
      .values({
        cameraFeedId: cameraId,
        detectionType,
        confidence,
        metadata: { simulated: true, description: "Simulated detection for testing" },
      })
      .returning();

    res.json(detection);
  } catch (error) {
    console.error("Error simulating detection:", error);
    res.status(500).json({ error: "Failed to simulate detection" });
  }
});

export default router;

