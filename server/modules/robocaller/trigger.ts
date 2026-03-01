import { spawn } from "child_process";
import path from "path";
import dotenv from "dotenv";
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
    // Point to the root directory
    const scriptPath = path.resolve(process.cwd(), "robocaller.py");

    log(
        `Spawning robocaller.py for incident ${incidentId} (${context.detectionType}, ${context.severity})`,
        "robocaller",
    );

    // Ensure .env is loaded so the python process inherits ELEVEN_API_KEY etc
    dotenv.config();

    // Pass rich camera AI context via env vars so robocaller.py can build
    // accurate dynamic variables without re-deriving them from the DB
    const child = spawn(pythonBin, [scriptPath, String(incidentId)], {
        detached: true,
        stdio: "pipe",
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

    child.stdout?.on("data", (data) => log(`[robocaller.py stdout] ${data.toString().trim()}`, "robocaller"));
    child.stderr?.on("data", (data) => log(`[robocaller.py stderr] ${data.toString().trim()}`, "robocaller"));

    child.on("error", (err) => {
        log(`Failed to spawn robocaller.py: ${err.message}`, "robocaller");
    });

    child.unref();
}
