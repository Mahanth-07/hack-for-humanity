import { spawn } from "child_process";
import path from "path";
import { log } from "../../index";

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

export function triggerRobocall(incidentId: number, context: RobocallContext): void {
  const pythonBin = process.env.PYTHON_BIN || "python3";
  const scriptPath = path.resolve(process.cwd(), "robocaller.py");

  log(
    `Spawning robocaller.py for incident ${incidentId} (${context.detectionType}, ${context.severity})`,
    "robocaller",
  );

  // Pass rich camera AI context via env vars so robocaller.py can build
  // accurate dynamic variables without re-deriving them from the DB
  const child = spawn(pythonBin, [scriptPath, String(incidentId)], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      RC_DETECTION_TYPE: context.detectionType,
      RC_CONFIDENCE: String(context.confidence),
      RC_SCENE_CONTEXT: context.sceneContext,
      RC_HUMAN_LIFE_PRESENT: context.humanLifePresent ? "1" : "0",
      RC_INANIMATE_OBJECTS: context.inanimateObjects,
      RC_DESCRIPTION: context.description,
      RC_SEVERITY: context.severity,
      RC_LOCATION: context.location,
      RC_CAMERA_NAME: context.cameraName,
    },
  });

  child.on("error", (err) => {
    log(`Failed to spawn robocaller.py: ${err.message}`, "robocaller");
  });

  child.unref();
}
