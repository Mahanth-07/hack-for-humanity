import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "../../index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROBOCALLER_PY = path.resolve(__dirname, "../../../robocaller.py");

export interface RobocallContext {
  detectionType: string;
  confidence: number;
  sceneContext: string;
  humanLifePresent: boolean;
  inanimateObjects: string;
  description: string;
  severity: string;
  location: string;
  cameraName: string;
}

/**
 * Fire-and-forget: spawns robocaller.py with the incident ID.
 * Does NOT block the HTTP response.
 */
export function triggerRobocall(incidentId: number, context: RobocallContext): void {
  log(`Triggering robocall for incident ${incidentId} (${context.detectionType}, ${context.severity})`, "robocaller");

  const pythonBin = process.env.PYTHON_BIN || "python3";
  const child = spawn(pythonBin, [ROBOCALLER_PY, String(incidentId)], {
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  child.stdout.on("data", (data: Buffer) => {
    for (const line of data.toString().trim().split("\n")) {
      if (line) log(line, "robocaller");
    }
  });

  child.stderr.on("data", (data: Buffer) => {
    for (const line of data.toString().trim().split("\n")) {
      if (line) log(`[stderr] ${line}`, "robocaller");
    }
  });

  child.on("close", (code: number | null) => {
    log(`robocaller.py exited with code ${code} for incident ${incidentId}`, "robocaller");
  });

  child.on("error", (err: Error) => {
    log(`Failed to spawn robocaller.py: ${err.message}`, "robocaller");
  });
}
