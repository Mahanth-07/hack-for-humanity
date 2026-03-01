import { Router, Request, Response } from "express";
  import { db } from "../../db";
  import { robocalls, incidents } from "@shared/schema";
  import { eq, desc, sql } from "drizzle-orm";
  import { openai } from "../../replit_integrations/audio/client";
  import { triggerRobocall } from "./trigger";

  const router = Router();

  // Get all robocalls
  router.get("/", async (req: Request, res: Response) => {
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

  // Create new robocall
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { incidentId, contactId, message } = req.body;

      if (!contactId || !message) {
        return res.status(400).json({ error: "Contact ID and message are required" });
      }

      // Generate AI voice message
      const audioResponse = await openai.audio.speech.create({
        model: "gpt-audio",
        voice: "alloy",
        input: message,
      });

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

  // Initiate robocall for incident (called by the Alert button in the dashboard)
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

      // Derive detection type from incident title ("Fire Detected — Camera 1" → "fire")
      const title = incident.title ?? "";
      const detectionType = title.includes(" Detected")
        ? title.split(" Detected")[0].toLowerCase().trim()
        : "anomaly";

      // Fire-and-forget — spawns robocaller.py, does not block
      triggerRobocall(incidentId, {
        detectionType,
        confidence: 0,
        sceneContext: "",
        humanLifePresent: false,
        inanimateObjects: "",
        description: incident.description,
        severity: incident.severity,
        location: incident.location ?? "Unknown",
        cameraName: "",
      });

      res.json({ message: `Robocall triggered for incident #${incidentId}` });
    } catch (error) {
      console.error("Error initiating robocall:", error);
      res.status(500).json({ error: "Failed to initiate robocall" });
    }
  });

  // Update robocall status
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

      res.json(updated);
    } catch (error) {
      console.error("Error updating robocall:", error);
      res.status(500).json({ error: "Failed to update robocall" });
    }
  });

  export default router;
  