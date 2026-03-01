import { Router, Request, Response } from "express";
import { db } from "../../db";
import { cameraFeeds } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

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

router.post("/feeds", async (req: Request, res: Response) => {
  try {
    const { name, location, coordinates, metadata } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: "Name and location are required" });
    }
    const [feed] = await db
      .insert(cameraFeeds)
      .values({ name, location, coordinates: coordinates || null, isActive: true, metadata: metadata || null })
      .returning();
    res.json(feed);
  } catch (error) {
    console.error("Error creating camera feed:", error);
    res.status(500).json({ error: "Failed to create camera feed" });
  }
});

router.patch("/feeds/:id/toggle", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [feed] = await db.select().from(cameraFeeds).where(eq(cameraFeeds.id, id)).limit(1);
    if (!feed) return res.status(404).json({ error: "Camera feed not found" });
    const [updated] = await db.update(cameraFeeds).set({ isActive: !feed.isActive }).where(eq(cameraFeeds.id, id)).returning();
    res.json(updated);
  } catch (error) {
    console.error("Error toggling camera feed:", error);
    res.status(500).json({ error: "Failed to toggle camera feed" });
  }
});

export default router;
