import { Router, Request, Response } from "express";
  import { db } from "../../db";
  import { cameraFeeds, cameraDetections, incidents } from "@shared/schema";
  import { eq, desc } from "drizzle-orm";
  import { openai } from "../../replit_integrations/audio/client";

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
      const id = parseInt(req.params.id);

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
      const cameraId = parseInt(req.params.cameraId);
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

      // Use GPT-5.2 with vision for image analysis
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: "You are an emergency response AI analyzing security camera footage. Detect any emergencies, hazards, or unusual activities. Respond in JSON format with keys: detectionType (fire/person/vehicle/anomaly/none), confidence (0-100), description, boundingBox (if applicable), urgency (low/medium/high/critical)."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this camera image for any emergency situations or threats."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl || `data:image/jpeg;base64,${imageData}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const aiDetection = JSON.parse(completion.choices[0].message.content || "{}");

      // Only store if something was detected
      if (aiDetection.detectionType && aiDetection.detectionType !== "none") {
        const [detection] = await db
          .insert(cameraDetections)
          .values({
            cameraFeedId,
            detectionType: aiDetection.detectionType,
            confidence: aiDetection.confidence || 0,
            imageUrl: imageUrl || null,
            boundingBox: aiDetection.boundingBox || null,
            metadata: {
              description: aiDetection.description,
              urgency: aiDetection.urgency
            },
          })
          .returning();

        // Auto-create incident for high-urgency detections
        if (aiDetection.urgency === "critical" || aiDetection.urgency === "high") {
          const [camera] = await db
            .select()
            .from(cameraFeeds)
            .where(eq(cameraFeeds.id, cameraFeedId))
            .limit(1);

          if (camera) {
            const [incident] = await db
              .insert(incidents)
              .values({
                title: `Camera Detection: ${aiDetection.detectionType}`,
                description: aiDetection.description || "Automated camera detection",
                severity: aiDetection.urgency === "critical" ? "critical" : "high",
                status: "active",
                location: camera.location,
              })
              .returning();

            // Link detection to incident
            await db
              .update(cameraDetections)
              .set({ incidentId: incident.id })
              .where(eq(cameraDetections.id, detection.id));

            return res.json({ detection, incident, autoCreated: true });
          }
        }

        res.json({ detection, autoCreated: false });
      } else {
        res.json({ detection: null, message: "No threats detected" });
      }
    } catch (error) {
      console.error("Error processing detection:", error);
      res.status(500).json({ error: "Failed to process detection" });
    }
  });

  // Update camera feed video URL (after MP4 upload)
  router.patch("/feeds/:id/video", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { videoUrl } = req.body;

      if (!videoUrl) {
        return res.status(400).json({ error: "videoUrl is required" });
      }

      const [updated] = await db
        .update(cameraFeeds)
        .set({ videoUrl, status: "idle" })
        .where(eq(cameraFeeds.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Camera feed not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating camera video:", error);
      res.status(500).json({ error: "Failed to update camera video" });
    }
  });

  // Update camera feed status
  router.patch("/feeds/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
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

  // Simulate camera detection (for testing)
  router.post("/simulate/:cameraId", async (req: Request, res: Response) => {
    try {
      const cameraId = parseInt(req.params.cameraId);
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
  