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

/**
 * Robocall dispatch is handled exclusively by the robocall-watcher module.
 * This function is intentionally a no-op to prevent duplicate DB writes.
 */
export function triggerRobocall(incidentId: number, context: RobocallContext): void {
  log(`Robocall for incident ${incidentId} will be handled by the watcher (${context.detectionType}, ${context.severity})`, "robocaller");
}
