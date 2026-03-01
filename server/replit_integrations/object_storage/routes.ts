import type { Express, Request, Response } from "express";
import express from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

function isReplitEnvironment(): boolean {
  return !!(process.env.PRIVATE_OBJECT_DIR && process.env.REPL_ID);
}

export function registerObjectStorageRoutes(app: Express): void {
  ensureUploadsDir();

  // POST /api/uploads/request-url
  // On Replit: returns a Google Cloud presigned URL
  // Locally: returns a local upload URL
  app.post("/api/uploads/request-url", async (req: Request, res: Response) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Missing required field: name" });
      }

      if (isReplitEnvironment()) {
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
        return res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
      }

      // Local fallback: generate a token the client will PUT to /api/uploads/local/:token
      const token = randomUUID();
      const uploadURL = `${req.protocol}://${req.get("host")}/api/uploads/local/${token}`;
      const objectPath = `/uploads/${token}`;

      res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // PUT /api/uploads/local/:token — receives raw binary body and saves to disk
  // express.raw() must come before the global JSON middleware consumes the body
  app.put("/api/uploads/local/:token", express.raw({ type: "*/*", limit: "500mb" }), (req: Request, res: Response) => {
    const token = String(req.params.token);
    if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
      return res.status(400).json({ error: "Invalid upload token" });
    }

    ensureUploadsDir();
    const filePath = path.join(LOCAL_UPLOADS_DIR, token);

    try {
      fs.writeFileSync(filePath, req.body as Buffer);
      res.status(200).send("OK");
    } catch (err) {
      console.error("Error saving upload:", err);
      res.status(500).json({ error: "Failed to save file" });
    }
  });

  // GET /objects/uploads/:token — serve locally uploaded files
  app.get("/objects/uploads/:token", (req: Request, res: Response) => {
    if (isReplitEnvironment()) {
      // Let the Replit handler below handle it
      return;
    }
    const token = String(req.params.token);
    const filePath = path.join(LOCAL_UPLOADS_DIR, token);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Object not found" });
    }
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "private, max-age=3600");
    fs.createReadStream(filePath).pipe(res);
  });

  // Replit object storage serving (only active when env vars present)
  app.use("/objects", async (req: Request, res: Response, next) => {
    if (req.method !== "GET") return next();
    if (!isReplitEnvironment()) return next();
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.originalUrl);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

