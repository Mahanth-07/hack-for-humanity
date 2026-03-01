import express, { type Request, Response, NextFunction } from "express";
  import { registerRoutes } from "./routes";
  import { serveStatic } from "./static";
  import { createServer } from "http";
  import { WebSocketServer, WebSocket } from "ws";

  const app = express();
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Store connected clients
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws: WebSocket) => {
    log("WebSocket client connected", "websocket");
    clients.add(ws);

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        log(`WebSocket message received: ${data.type}`, "websocket");
      } catch (error) {
        log(`WebSocket error parsing message: ${error}`, "websocket");
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      log("WebSocket client disconnected", "websocket");
    });

    ws.on("error", (error) => {
      log(`WebSocket error: ${error}`, "websocket");
    });
  });

  // Broadcast function for sending updates to all connected clients
  export function broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    
    log(`Broadcast: ${event} to ${clients.size} clients`, "websocket");
  }

  declare module "http" {
    interface IncomingMessage {
      rawBody: unknown;
    }
  }

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  export function log(message: string, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    console.log(`${formattedTime} [${source}] ${message}`);
  }

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  (async () => {
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Internal Server Error:", err);

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
      },
      () => {
        log(`serving on port ${port}`);
        log(`WebSocket server ready on ws://localhost:${port}/ws`, "websocket");
      },
    );
  })();
  