import { Router, Request, Response } from "express";
import { db } from "../../db";
import { robocalls, incidents, cameraFeeds, cameraDetections } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { broadcast } from "../../index";
import { triggerRobocall, RobocallContext } from "./trigger";

const router = Router();

// Get all robocalls
router.get("/", async (_req: Request, res: Response) => {
  try {
    const allRobocalls = await db
      .select()
      .from(robocalls)
      .orderBy(desc(robocalls.createdAt));
    res.json(allRobocalls);
  } catch (error) {
    console.error("Error fetching robocalls:", error);
    res.status(500).json({ error: "Failed to fetch robocalls" });
  }
});

// Create a robocall record manually (no TTS — Python handles the actual call)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { incidentId, contactId, message } = req.body;

    if (!contactId || !message) {
      return res.status(400).json({ error: "Contact ID and message are required" });
    }

    const [newRobocall] = await db
      .insert(robocalls)
      .values({
        incidentId: incidentId || null,
        contactId,
        message,
        status: "pending",
        attempts: 0,
      })
      .returning();

    res.json(newRobocall);
  } catch (error) {
    console.error("Error creating robocall:", error);
    res.status(500).json({ error: "Failed to create robocall" });
  }
});

// Trigger ElevenLabs robocall for a specific incident
router.post("/incident/:incidentId", async (req: Request, res: Response) => {
  try {
    const incidentId = parseInt(req.params.incidentId as string);

    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    // Find the most recent camera detection linked to this incident for rich context
    const [latestDetection] = await db
      .select()
      .from(cameraDetections)
      .where(eq(cameraDetections.incidentId, incidentId))
      .orderBy(desc(cameraDetections.createdAt))
      .limit(1);

    // Look up the camera feed if we have a detection
    let camera: typeof cameraFeeds.$inferSelect | null = null;
    if (latestDetection) {
      const [found] = await db
        .select()
        .from(cameraFeeds)
        .where(eq(cameraFeeds.id, latestDetection.cameraFeedId))
        .limit(1);
      camera = found ?? null;
    }

    // Derive detection type from incident title ("Fire Detected — Camera 1" → "fire")
    const title = incident.title ?? "";
    const detectionType = latestDetection?.detectionType
      ?? (title.includes(" Detected") ? title.split(" Detected")[0].toLowerCase().trim() : "anomaly");

    const meta = (latestDetection?.metadata as Record<string, unknown>) ?? {};

    const context: RobocallContext = {
      detectionType,
      confidence: latestDetection?.confidence ?? 0,
      sceneContext: (meta.sceneContext as string) || "",
      humanLifePresent: (meta.humanLifePresent as boolean) ?? false,
      inanimateObjects: (meta.inanimateObjects as string) || "",
      description: (meta.description as string) || incident.description || "",
      severity: incident.severity,
      location: incident.location || "",
      cameraName: camera?.name || "",
    };

    // Set camera status to "calling" so the dashboard reflects active call
    if (camera) {
      await db
        .update(cameraFeeds)
        .set({ status: "calling" })
        .where(eq(cameraFeeds.id, camera.id));
      broadcast("camera_status_changed", { cameraFeedId: camera.id, status: "calling" });
    }

    triggerRobocall(incidentId, context).catch((err) =>
      console.error(`Manual robocall failed for incident ${incidentId}:`, err)
    );

    res.json({ triggered: true, incidentId, detectionType, cameraId: camera?.id ?? null });
  } catch (error) {
    console.error("Error triggering robocall:", error);
    res.status(500).json({ error: "Failed to trigger robocall" });
  }
});

// Update robocall status (called by dashboard or external webhook)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;

    const [updated] = await db
      .update(robocalls)
      .set({
        status,
        attempts: status === "calling" ? sql`${robocalls.attempts} + 1` : undefined,
        lastAttemptAt: status === "calling" ? new Date() : undefined,
        completedAt: status === "completed" ? new Date() : undefined,
      })
      .where(eq(robocalls.id, id))
      .returning();

    broadcast("robocall_updated", { robocall: updated });

    res.json(updated);
  } catch (error) {
    console.error("Error updating robocall:", error);
    res.status(500).json({ error: "Failed to update robocall" });
  }
});

export default router;
