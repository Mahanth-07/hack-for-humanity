import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../../db";
import { incidents, riskAssessments, contacts, robocalls } from "@shared/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { openai } from "../../replit_integrations/audio/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROBOCALLER_PY = path.resolve(__dirname, "../../../robocaller.py");

type DbAssessment = typeof riskAssessments.$inferSelect;

async function triggerRobocallFromTopAssessment() {
  try {
    // 1. Only proceed if there are no pending or in-progress robocalls (one call at a time)
    const activeRobocalls = await db
      .select({ id: robocalls.id })
      .from(robocalls)
      .where(inArray(robocalls.status, ["pending", "calling"]))
      .limit(1);

    if (activeRobocalls.length > 0) return;

    // 2. Collect incident IDs already addressed by any robocall entry
    const addressedRows = await db
      .selectDistinct({ incidentId: robocalls.incidentId })
      .from(robocalls);
    const addressedIds = new Set(
      addressedRows.map((r) => r.incidentId).filter((id): id is number => id !== null),
    );

    // 3. Get all active incidents that have not yet been addressed
    const activeIncidents = await db
      .select()
      .from(incidents)
      .where(eq(incidents.status, "active"));

    const unaddressedIncidents = activeIncidents.filter((i) => !addressedIds.has(i.id));
    if (unaddressedIncidents.length === 0) return;

    const unaddressedIds = unaddressedIncidents.map((i) => i.id);

    // 4. Find the latest assessment per unaddressed incident; pick the highest priorityScore
    const allAssessments = await db
      .select()
      .from(riskAssessments)
      .where(inArray(riskAssessments.incidentId, unaddressedIds))
      .orderBy(desc(riskAssessments.createdAt));

    const latestByIncident = new Map<number, DbAssessment>();
    for (const row of allAssessments) {
      if (!latestByIncident.has(row.incidentId)) {
        latestByIncident.set(row.incidentId, row);
      }
    }

    let topAssessment: DbAssessment | null = null;
    for (const assessment of Array.from(latestByIncident.values())) {
      if (!topAssessment || (assessment.priorityScore ?? 0) > (topAssessment.priorityScore ?? 0)) {
        topAssessment = assessment;
      }
    }

    if (!topAssessment) return;

    const incident = unaddressedIncidents.find((i) => i.id === topAssessment!.incidentId);
    if (!incident) return;

    // 5. Get all active contacts ordered by priority
    const activeContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.isActive, true))
      .orderBy(asc(contacts.priority));

    if (activeContacts.length === 0) return;

    // 6. Use OpenAI to select the most relevant contact for this incident
    const contactList = activeContacts
      .map((c) => `ID: ${c.id}, Name: ${c.name}, Role: ${c.role}, Phone: ${c.phone}`)
      .join("\n");

    const matchResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an emergency dispatch system. Given an incident and a list of emergency contacts, select the single most relevant contact to notify. Return only a JSON object with the field 'contactId' (integer).",
        },
        {
          role: "user",
          content: `Incident:\nTitle: ${incident.title}\nDescription: ${incident.description}\nSeverity: ${incident.severity}\nLocation: ${incident.location ?? "Unknown"}\n\nAvailable Contacts:\n${contactList}\n\nReturn JSON: {"contactId": <number>}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = matchResponse.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { contactId?: number };
    const matchedContact =
      activeContacts.find((c) => c.id === parsed.contactId) ?? activeContacts[0];

    // 7. Insert the robocall row as "pending" and capture its ID
    const message = `Emergency Alert: ${incident.title}. ${incident.description}. Severity level: ${incident.severity}. Location: ${incident.location ?? "Unknown"}. Please respond immediately.`;

    const [inserted] = await db.insert(robocalls).values({
      incidentId: incident.id,
      contactId: matchedContact.id,
      message,
      status: "pending",
      attempts: 0,
    }).returning();

    // 8. Spawn robocaller.py with incident_id and robocall_id so it uses this row
    const pythonBin = process.env.PYTHON_BIN || "python3";
    const child = spawn(pythonBin, [ROBOCALLER_PY, String(incident.id), String(inserted.id)], {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    child.stdout.on("data", (d: Buffer) => {
      for (const line of d.toString().trim().split("\n")) {
        if (line) console.log("[robocaller]", line);
      }
    });
    child.stderr.on("data", (d: Buffer) => {
      for (const line of d.toString().trim().split("\n")) {
        if (line) console.error("[robocaller]", line);
      }
    });
    child.on("error", (err: Error) => {
      console.error("[robocaller] Failed to spawn robocaller.py:", err.message);
    });
  } catch (err) {
    console.error("Error in robocall watcher:", err);
  }
}

// Poll every 1 second; DB status check ("pending"/"calling") prevents overlapping calls
setInterval(() => {
  triggerRobocallFromTopAssessment();
}, 1_000);