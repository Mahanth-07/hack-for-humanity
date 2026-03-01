import type { Express } from "express";
import { createServer, type Server } from "http";
import incidentsRouter from "./routes/incidents";
import cameraProcessingRouter from "./modules/camera-processing/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/api/incidents", incidentsRouter);
  app.use("/api/modules/camera-processing", cameraProcessingRouter);

  return httpServer;
}
