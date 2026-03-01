import type { Express } from "express";
  import { createServer, type Server } from "http";
  import incidentsRouter from "./routes/incidents";
  import moduleHealthRouter from "./routes/module-health";
  import robocallerRouter from "./modules/robocaller/routes";
  import riskAnalysisRouter from "./modules/risk-analysis/routes";
  import cameraProcessingRouter from "./modules/camera-processing/routes";
  import contactManagementRouter from "./modules/contact-management/routes";
  import { registerObjectStorageRoutes } from "./replit_integrations/object_storage/routes";
import "./modules/robocall-watcher";

  export async function registerRoutes(
    httpServer: Server,
    app: Express
  ): Promise<Server> {
    // Object storage for file uploads (MP4, images)
    registerObjectStorageRoutes(app);

    // Core incident management
    app.use("/api/incidents", incidentsRouter);
    
    // Module health monitoring
    app.use("/api/health", moduleHealthRouter);
    
    // Module-specific routes (4 isolated workspaces)
    app.use("/api/modules/robocaller", robocallerRouter);
    app.use("/api/modules/risk-analysis", riskAnalysisRouter);
    app.use("/api/modules/camera-processing", cameraProcessingRouter);
    app.use("/api/modules/contact-management", contactManagementRouter);

    // Initialize module health on startup
    setTimeout(async () => {
      try {
        await fetch("http://localhost:" + (process.env.PORT || "5000") + "/api/health/initialize", {
          method: "POST",
        });
        console.log("✅ Module health initialized");
      } catch (error) {
        console.log("Module health will be initialized on first access");
      }
    }, 2000);

    return httpServer;
  }
  