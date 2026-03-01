import { Router, Request, Response } from "express";
  import { db } from "../db";
  import { moduleHealth } from "@shared/schema";
  import { eq } from "drizzle-orm";

  const router = Router();

  // Get all module health statuses
  router.get("/", async (req: Request, res: Response) => {
    try {
      const statuses = await db.select().from(moduleHealth);
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching module health:", error);
      res.status(500).json({ error: "Failed to fetch module health" });
    }
  });

  // Get specific module health
  router.get("/:moduleName", async (req: Request, res: Response) => {
    try {
      const { moduleName } = req.params;
      const [status] = await db
        .select()
        .from(moduleHealth)
        .where(eq(moduleHealth.moduleName, moduleName))
        .limit(1);

      if (!status) {
        return res.status(404).json({ error: "Module not found" });
      }

      res.json(status);
    } catch (error) {
      console.error("Error fetching module health:", error);
      res.status(500).json({ error: "Failed to fetch module health" });
    }
  });

  // Update module health (heartbeat)
  router.post("/heartbeat/:moduleName", async (req: Request, res: Response) => {
    try {
      const { moduleName } = req.params;
      const { status = "healthy", metrics, errorCount = 0 } = req.body;

      // Check if module exists
      const [existing] = await db
        .select()
        .from(moduleHealth)
        .where(eq(moduleHealth.moduleName, moduleName))
        .limit(1);

      let updated;
      if (existing) {
        [updated] = await db
          .update(moduleHealth)
          .set({
            status,
            lastHeartbeat: new Date(),
            metrics: metrics || existing.metrics,
            errorCount: errorCount || existing.errorCount,
            updatedAt: new Date(),
          })
          .where(eq(moduleHealth.moduleName, moduleName))
          .returning();
      } else {
        [updated] = await db
          .insert(moduleHealth)
          .values({
            moduleName,
            status,
            lastHeartbeat: new Date(),
            metrics: metrics || null,
            errorCount,
          })
          .returning();
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating module health:", error);
      res.status(500).json({ error: "Failed to update module health" });
    }
  });

  // Check module health status (determines if degraded/down based on heartbeat)
  router.get("/check/:moduleName", async (req: Request, res: Response) => {
    try {
      const { moduleName } = req.params;
      const [module] = await db
        .select()
        .from(moduleHealth)
        .where(eq(moduleHealth.moduleName, moduleName))
        .limit(1);

      if (!module) {
        return res.json({ 
          moduleName, 
          status: "unknown", 
          message: "Module not registered" 
        });
      }

      const now = new Date();
      const lastHeartbeat = new Date(module.lastHeartbeat);
      const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
      const minutesSince = Math.floor(timeSinceHeartbeat / 1000 / 60);

      let computedStatus = "healthy";
      if (minutesSince > 10) {
        computedStatus = "down";
      } else if (minutesSince > 5) {
        computedStatus = "degraded";
      } else if (module.errorCount > 10) {
        computedStatus = "degraded";
      }

      // Update if status changed
      if (computedStatus !== module.status) {
        await db
          .update(moduleHealth)
          .set({ status: computedStatus, updatedAt: new Date() })
          .where(eq(moduleHealth.moduleName, moduleName));
      }

      res.json({
        ...module,
        status: computedStatus,
        minutesSinceHeartbeat: minutesSince,
      });
    } catch (error) {
      console.error("Error checking module health:", error);
      res.status(500).json({ error: "Failed to check module health" });
    }
  });

  // Initialize all modules (for first run)
  router.post("/initialize", async (req: Request, res: Response) => {
    try {
      const modules = [
        "robocaller",
        "risk_analysis",
        "camera_processing",
        "contact_management",
      ];

      const initialized = [];
      for (const moduleName of modules) {
        const [existing] = await db
          .select()
          .from(moduleHealth)
          .where(eq(moduleHealth.moduleName, moduleName))
          .limit(1);

        if (!existing) {
          const [created] = await db
            .insert(moduleHealth)
            .values({
              moduleName,
              status: "healthy",
              lastHeartbeat: new Date(),
              errorCount: 0,
            })
            .returning();
          initialized.push(created);
        }
      }

      res.json({ 
        message: `Initialized ${initialized.length} modules`,
        modules: initialized 
      });
    } catch (error) {
      console.error("Error initializing modules:", error);
      res.status(500).json({ error: "Failed to initialize modules" });
    }
  });

  export default router;
  