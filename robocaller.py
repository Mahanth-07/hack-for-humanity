#!/usr/bin/env python3
"""
robocaller.py — Triggered by the Node.js server when a new incident is created.

Usage:
   python robocaller.py <incident_id>

Env vars required:
   DATABASE_URL                  — Neon PostgreSQL connection string
   ELEVEN_API_KEY                — ElevenLabs API key
   ELEVEN_AGENT_ID               — ElevenLabs Convai agent ID
   ELEVEN_AGENT_PHONE_NUMBER_ID  — Twilio phone number ID registered in ElevenLabs
   DEMO_TO_NUMBER                — (optional) Override destination phone for testing
"""

import os
import sys
import json
import socket
import urllib.request
import urllib.error
import ssl
import psycopg2
import psycopg2.extras
from datetime import datetime

# ---------------------------------------------------------------------------
# Contact role routing: detection_type → preferred contact role(s)
# ---------------------------------------------------------------------------
ROLE_MAP: dict[str, list[str]] = {
   "fire":          ["fire", "first_responder"],
   "flood":         ["first_responder", "coordinator"],
   "hazmat":        ["first_responder", "fire"],
   "environmental": ["first_responder", "coordinator"],
   "structural":    ["first_responder", "coordinator"],
   "fight":         ["police", "first_responder"],
   "weapon":        ["police", "first_responder"],
   "anomaly":       ["police", "first_responder"],
   "medical":       ["medical", "first_responder"],
   "crash":         ["police", "first_responder"],
   "vehicle":       ["police", "first_responder"],
}

def get_env(name: str, required: bool = True) -> str:
   val = os.environ.get(name, "")
   if required and not val:
       print(f"[robocaller] ERROR: missing env var {name}", file=sys.stderr)
       sys.exit(1)
   return val

def connect_db() -> psycopg2.extensions.connection:
   database_url = get_env("DATABASE_URL")
   return psycopg2.connect(database_url, cursor_factory=psycopg2.extras.RealDictCursor)

def fetch_incident(conn, incident_id: int) -> dict:
   with conn.cursor() as cur:
       cur.execute(
           "SELECT * FROM incidents WHERE id = %s LIMIT 1",
           (incident_id,),
       )
       row = cur.fetchone()
   if not row:
       print(f"[robocaller] ERROR: incident {incident_id} not found", file=sys.stderr)
       sys.exit(1)
   return dict(row)

def fetch_latest_risk(conn, incident_id: int) -> dict | None:
   with conn.cursor() as cur:
       cur.execute(
           """
           SELECT * FROM risk_assessments
           WHERE incident_id = %s
           ORDER BY created_at DESC
           LIMIT 1
           """,
           (incident_id,),
       )
       row = cur.fetchone()
   return dict(row) if row else None

def pick_contact(conn, detection_type: str) -> dict | None:
   """
   Pick the best active contact by role-matching the detection type.
   Falls back to highest-priority active contact if no role match found.
   """
   preferred_roles = ROLE_MAP.get(detection_type.lower(), [])

   with conn.cursor() as cur:
       # Try each preferred role in order
       for role in preferred_roles:
           cur.execute(
               """
               SELECT * FROM contacts
               WHERE is_active = TRUE AND role = %s
               ORDER BY priority ASC
               LIMIT 1
               """,
               (role,),
           )
           row = cur.fetchone()
           if row:
               return dict(row)

       # Fallback: highest-priority active contact of any role
       cur.execute(
           """
           SELECT * FROM contacts
           WHERE is_active = TRUE
           ORDER BY priority ASC
           LIMIT 1
           """,
       )
       row = cur.fetchone()
       return dict(row) if row else None

def insert_robocall(conn, incident_id: int, contact_id: int, message: str) -> int:
   with conn.cursor() as cur:
       cur.execute(
           """
           INSERT INTO robocalls (incident_id, contact_id, status, message, attempts, created_at)
           VALUES (%s, %s, 'calling', %s, 1, NOW())
           RETURNING id
           """,
           (incident_id, contact_id, message),
       )
       row = cur.fetchone()
       conn.commit()
   return row["id"]

def update_robocall_status(conn, robocall_id: int, status: str) -> None:
   completed_at = datetime.now() if status in ("completed", "failed") else None
   with conn.cursor() as cur:
       cur.execute(
           """
           UPDATE robocalls
           SET status = %s,
               last_attempt_at = NOW(),
               completed_at = %s
           WHERE id = %s
           """,
           (status, completed_at, robocall_id),
       )
       conn.commit()

def build_dynamic_vars(incident: dict, contact: dict, risk: dict | None) -> tuple[str, str, str]:
   """
   Build the three ElevenLabs dynamic variable strings.
   Prefers RC_* env vars (rich camera AI context passed from the Node server)
   and falls back to incident DB fields when not set.
   Returns (CAMERA_FACTS, LOCATION, CALLER_CONTEXT)
   """
   # Prefer live AI context from the camera module over DB-derived values
   detection_type = os.environ.get("RC_DETECTION_TYPE") or (
       incident.get("title", "").split(" Detected")[0]
       if " Detected" in (incident.get("title") or "")
       else "Unknown"
   )
   scene_context = os.environ.get("RC_SCENE_CONTEXT", "")
   description = os.environ.get("RC_DESCRIPTION") or incident.get("description", "")
   human_life = os.environ.get("RC_HUMAN_LIFE_PRESENT", "") == "1"
   inanimate = os.environ.get("RC_INANIMATE_OBJECTS", "")
   camera_name = os.environ.get("RC_CAMERA_NAME", "")
   confidence_raw = os.environ.get("RC_CONFIDENCE", "")
   confidence = int(confidence_raw) if confidence_raw.isdigit() else None

   # CAMERA_FACTS — rich, first-responder-readable sentence built from AI output
   facts_parts = [f"A {detection_type.lower()} was detected."]
   if description:
       facts_parts.append(description)
   if scene_context:
       facts_parts.append(scene_context)
   if human_life:
       facts_parts.append("Human life is present at the scene.")
   if inanimate:
       facts_parts.append(f"Objects visible: {inanimate}.")
   if camera_name:
       facts_parts.append(f"Source: {camera_name}.")
   if confidence is not None:
       facts_parts.append(f"Detection confidence: {confidence}%.")
   camera_facts = " ".join(facts_parts).strip()

   # LOCATION — prefer env var, fall back to incident DB field
   location = os.environ.get("RC_LOCATION") or incident.get("location") or "Unknown location"

   # CALLER_CONTEXT — severity + status + risk recommendations
   severity = (os.environ.get("RC_SEVERITY") or incident.get("severity", "unknown")).upper()
   status = incident.get("status", "active")
   context_parts = [
       f"Alert level: {severity} (camera AI detection)",
       f"Incident status: {status}",
   ]
   if risk:
       recommendations = risk.get("recommendations") or []
       if isinstance(recommendations, str):
           try:
               recommendations = json.loads(recommendations)
           except Exception:
               recommendations = [recommendations]
       if recommendations:
           context_parts.append("Recommended actions: " + "; ".join(str(r) for r in recommendations[:3]))
   caller_context = ". ".join(context_parts) + "."

   return camera_facts, location, caller_context

def place_call(
   agent_id: str,
   phone_number_id: str,
   api_key: str,
   to_number: str,
   camera_facts: str,
   location: str,
   caller_context: str,
   voice_id: str,
) -> dict:
   url = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"

   payload = {
       "agent_id": agent_id,
       "agent_phone_number_id": phone_number_id,
       "to_number": to_number,
       "conversation_initiation_client_data": {
           "dynamic_variables": {
               "CAMERA_FACTS": camera_facts,
               "LOCATION": location,
               "CALLER_CONTEXT": caller_context,
           },
           "conversation_config_override": {
               "tts": {
                   "voice_id": voice_id,
               },
           },
       },
   }
   data = json.dumps(payload).encode("utf-8")
   req = urllib.request.Request(
       url,
       data=data,
       headers={
           "Content-Type": "application/json",
           "xi-api-key": api_key,
       },
       method="POST",
   )
   try:
       context = ssl._create_unverified_context()
       with urllib.request.urlopen(req, timeout=15, context=context) as resp:
           return json.loads(resp.read().decode("utf-8"))
   except urllib.error.HTTPError as e:
       body = e.read().decode("utf-8", errors="replace")
       raise RuntimeError(f"ElevenLabs API error {e.code}: {body}") from e
   except urllib.error.URLError as e:
       raise RuntimeError(f"ElevenLabs network error: {e.reason}") from e
   except (socket.timeout, TimeoutError) as e:
       raise RuntimeError(f"ElevenLabs request timed out: {e}") from e
   except json.JSONDecodeError as e:
       raise RuntimeError(f"ElevenLabs response parse error: {e}") from e

def main() -> None:
   if len(sys.argv) < 2:
       print("[robocaller] ERROR: usage: python robocaller.py <incident_id>", file=sys.stderr)
       sys.exit(1)

   try:
       incident_id = int(sys.argv[1])
   except ValueError:
       print(f"[robocaller] ERROR: invalid incident_id: {sys.argv[1]}", file=sys.stderr)
       sys.exit(1)

   api_key = get_env("ELEVEN_API_KEY")
   agent_id = get_env("ELEVEN_AGENT_ID")
   phone_number_id = get_env("ELEVEN_AGENT_PHONE_NUMBER_ID")
   voice_id = get_env("ELEVEN_VOICE_ID", required=False) # Voice ID can likely be optional

   conn = connect_db()

   try:
       incident = fetch_incident(conn, incident_id)
       risk = fetch_latest_risk(conn, incident_id)

       # Derive detection type from incident title ("Fire Detected — Camera 1" → "fire")
       title = incident.get("title", "")
       detection_type = title.split(" Detected")[0].lower().strip() if " Detected" in title else "anomaly"

       contact = pick_contact(conn, detection_type)
       if not contact:
           print(f"[robocaller] No active contacts found for incident {incident_id}. Aborting.", file=sys.stderr)
           sys.exit(1)

       to_number = get_env("DEMO_TO_NUMBER", required=False) or contact["phone"]
       masked_to = f"***{to_number[-4:]}" if len(to_number) >= 4 else "***"
       print(f"[robocaller] Incident {incident_id} | type={detection_type} | contact_id={contact['id']} | to={masked_to}")

       camera_facts, location, caller_context = build_dynamic_vars(incident, contact, risk)

       message = f"Emergency alert for incident {incident_id}: {incident.get('title', '')} at {location}. Severity: {incident.get('severity', 'unknown')}."
       robocall_id = insert_robocall(conn, incident_id, contact["id"], message)
       print(f"[robocaller] Created robocall record id={robocall_id}")

       try:
           result = place_call(
               agent_id=agent_id,
               phone_number_id=phone_number_id,
               api_key=api_key,
               to_number=to_number,
               camera_facts=camera_facts,
               location=location,
               caller_context=caller_context,
               voice_id=voice_id,
           )
           call_sid = result.get("callSid") or result.get("call_sid") or "<unknown>"
           print(f"[robocaller] Call placed successfully for incident {incident_id} | callSid={call_sid}")
           update_robocall_status(conn, robocall_id, "completed")
       except RuntimeError as call_err:
           print(f"[robocaller] Call failed: {call_err}", file=sys.stderr)
           update_robocall_status(conn, robocall_id, "failed")
           sys.exit(1)

   finally:
       conn.close()

if __name__ == "__main__":
   main()
