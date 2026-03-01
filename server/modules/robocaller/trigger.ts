import { db } from "../../db";
import { contacts, robocalls } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { log, broadcast } from "../../index";

// Mirror of the role-routing table in robocaller.py
const ROLE_MAP: Record<string, string[]> = {
  fire:          ["fire", "first_responder"],
  flood:         ["first_responder", "coordinator"],
  hazmat:        ["first_responder", "fire"],
  environmental: ["first_responder", "coordinator"],
  structural:    ["first_responder", "coordinator"],
  fight:         ["police", "first_responder"],
  weapon:        ["police", "first_responder"],
  anomaly:       ["police", "first_responder"],
  medical:       ["medical", "first_responder"],
  crash:         ["police", "first_responder"],
  vehicle:       ["police", "first_responder"],
};

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

function buildCameraFacts(ctx: RobocallContext): string {
  const parts = [`A ${ctx.detectionType.toLowerCase()} was detected.`];
  if (ctx.description) parts.push(ctx.description);
  if (ctx.sceneContext) parts.push(ctx.sceneContext);
  if (ctx.humanLifePresent) parts.push("Human life is present at the scene.");
  if (ctx.inanimateObjects) parts.push(`Objects visible: ${ctx.inanimateObjects}.`);
  if (ctx.cameraName) parts.push(`Source: ${ctx.cameraName}.`);
  if (ctx.confidence) parts.push(`Detection confidence: ${ctx.confidence}%.`);
  return parts.join(" ");
}

function buildCallerContext(ctx: RobocallContext): string {
  const parts = [
    `Alert level: ${ctx.severity.toUpperCase()} (camera AI detection)`,
    `Incident status: active`,
  ];
  return parts.join(". ") + ".";
}

export async function triggerRobocall(incidentId: number, context: RobocallContext): Promise<void> {
  log(`Starting robocall for incident ${incidentId} (${context.detectionType}, ${context.severity})`, "robocaller");

  const apiKey    = process.env.ELEVEN_API_KEY;
  const agentId   = process.env.ELEVEN_AGENT_ID;
  const phoneId   = process.env.ELEVEN_AGENT_PHONE_NUMBER_ID;
  const voiceId   = process.env.ELEVEN_VOICE_ID;
  const toNumber  = process.env.DEMO_TO_NUMBER;

  if (!apiKey || !agentId || !phoneId || !voiceId || !toNumber) {
    const missing = ["ELEVEN_API_KEY", "ELEVEN_AGENT_ID", "ELEVEN_AGENT_PHONE_NUMBER_ID", "ELEVEN_VOICE_ID", "DEMO_TO_NUMBER"]
      .filter((k) => !process.env[k])
      .join(", ");
    log(`Missing env vars [${missing}] — skipping call for incident ${incidentId}`, "robocaller");
    return;
  }

  // Pick best contact by role, falling back to highest-priority active contact
  const preferredRoles = ROLE_MAP[context.detectionType.toLowerCase()] ?? [];
  let contact: typeof contacts.$inferSelect | null = null;

  for (const role of preferredRoles) {
    const [found] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.isActive, true), eq(contacts.role, role)))
      .orderBy(contacts.priority)
      .limit(1);
    if (found) { contact = found; break; }
  }

  if (!contact) {
    const [fallback] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.isActive, true))
      .orderBy(contacts.priority)
      .limit(1);
    contact = fallback ?? null;
  }

  if (!contact) {
    log(`No active contacts found for incident ${incidentId} — aborting call`, "robocaller");
    return;
  }

  const masked = toNumber.length >= 4 ? `***${toNumber.slice(-4)}` : "***";
  log(`Incident ${incidentId} | type=${context.detectionType} | contact=${contact.name} | to=${masked}`, "robocaller");

  const message = `Emergency alert for incident ${incidentId}: ${context.detectionType} detected at ${context.location || "unknown location"}. Severity: ${context.severity}.`;

  const [robocall] = await db
    .insert(robocalls)
    .values({
      incidentId,
      contactId: contact.id,
      status: "calling",
      message,
      attempts: 1,
      lastAttemptAt: new Date(),
    })
    .returning();

  log(`Created robocall record id=${robocall.id} for contact "${contact.name}"`, "robocaller");

  const payload = {
    agent_id: agentId,
    agent_phone_number_id: phoneId,
    to_number: toNumber,
    conversation_initiation_client_data: {
      dynamic_variables: {
        CAMERA_FACTS:   buildCameraFacts(context),
        LOCATION:       context.location || "Unknown location",
        CALLER_CONTEXT: buildCallerContext(context),
      },
      conversation_config_override: {
        tts: { voice_id: voiceId },
      },
    },
  };

  try {
    const resp = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`ElevenLabs API ${resp.status}: ${body}`);
    }

    const result = await resp.json() as Record<string, unknown>;
    const callSid = (result.callSid ?? result.call_sid ?? "<unknown>") as string;
    log(`Call placed for incident ${incidentId} | callSid=${callSid}`, "robocaller");

    await db
      .update(robocalls)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(robocalls.id, robocall.id));

    broadcast("robocall_completed", { incidentId, robocallId: robocall.id, callSid });

  } catch (err) {
    log(`Call FAILED for incident ${incidentId}: ${err}`, "robocaller");

    await db
      .update(robocalls)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(robocalls.id, robocall.id));

    broadcast("robocall_failed", { incidentId, robocallId: robocall.id, error: String(err) });

    throw err;
  }
}
