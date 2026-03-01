import { Router, Request, Response } from "express";
  import { db } from "../db";
  import { incidents } from "@shared/schema";
  import { eq, desc } from "drizzle-orm";

  const router = Router();

  // Get all incidents
  router.get("/", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      let query = db.select().from(incidents);
      
      if (status) {
        query = query.where(eq(incidents.status, status as string));
      }
      
      const allIncidents = await query.orderBy(desc(incidents.createdAt));
      res.json(allIncidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  // Get incident by ID
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [incident] = await db
        .select()
        .from(incidents)
        .where(eq(incidents.id, id))
        .limit(1);

      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      res.json(incident);
    } catch (error) {
      console.error("Error fetching incident:", error);
      res.status(500).json({ error: "Failed to fetch incident" });
    }
  });

  // Create new incident
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { title, description, severity, location, coordinates } = req.body;

      if (!title || !description || !severity) {
        return res.status(400).json({ error: "Title, description, and severity are required" });
      }

      const [incident] = await db
        .insert(incidents)
        .values({
          title,
          description,
          severity,
          status: "active",
          location: location || null,
          coordinates: coordinates || null,
        })
        .returning();

      res.json(incident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  // Update incident
  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { title, description, severity, status, location, coordinates } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (severity !== undefined) updateData.severity = severity;
      if (status !== undefined) updateData.status = status;
      if (location !== undefined) updateData.location = location;
      if (coordinates !== undefined) updateData.coordinates = coordinates;

      if (status === "resolved") {
        updateData.resolvedAt = new Date();
      }

      const [updated] = await db
        .update(incidents)
        .set(updateData)
        .where(eq(incidents.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Incident not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ error: "Failed to update incident" });
    }
  });

  // Delete incident
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const [deleted] = await db
        .delete(incidents)
        .where(eq(incidents.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Incident not found" });
      }

      res.json({ message: "Incident deleted successfully", incident: deleted });
    } catch (error) {
      console.error("Error deleting incident:", error);
      res.status(500).json({ error: "Failed to delete incident" });
    }
  });

  // Get incident statistics
  router.get("/stats/overview", async (req: Request, res: Response) => {
    try {
      const allIncidents = await db.select().from(incidents);
      
      const stats = {
        total: allIncidents.length,
        active: allIncidents.filter(i => i.status === "active").length,
        resolved: allIncidents.filter(i => i.status === "resolved").length,
        escalated: allIncidents.filter(i => i.status === "escalated").length,
        bySeverity: {
          low: allIncidents.filter(i => i.severity === "low").length,
          medium: allIncidents.filter(i => i.severity === "medium").length,
          high: allIncidents.filter(i => i.severity === "high").length,
          critical: allIncidents.filter(i => i.severity === "critical").length,
        }
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching incident stats:", error);
      res.status(500).json({ error: "Failed to fetch incident statistics" });
    }
  });

  export default router;
  