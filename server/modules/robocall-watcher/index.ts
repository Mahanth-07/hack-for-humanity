import { db } from "../../db";
import { incidents, riskAssessments, contacts, robocalls } from "@shared/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { openai } from "../../replit_integrations/audio/client";

type DbAssessment = typeof riskAssessments.$inferSelect;

async function triggerRobocallFromTopAssessment() {
  try {
    // 1. Only proceed if there are no pending or in-progress robocalls
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

    // 7. Build the robocall message and insert the row
    const message = `Emergency Alert: ${incident.title}. ${incident.description}. Severity level: ${incident.severity}. Location: ${incident.location ?? "Unknown"}. Please respond immediately.`;

    await db.insert(robocalls).values({
      incidentId: incident.id,
      contactId: matchedContact.id,
      message,
      status: "pending",
      attempts: 0,
    });

    // 8. Delete all risk assessment rows for that incident
    await db.delete(riskAssessments).where(eq(riskAssessments.incidentId, incident.id));
  } catch (err) {
    console.error("Error in robocall watcher:", err);
  }
}

// Continuously watch for unaddressed high-priority incidents every 15 seconds
setInterval(() => {
  triggerRobocallFromTopAssessment();
}, 15_000);
