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
import urllib.request
import urllib.error
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
    finished_at = "NOW()" if status in ("completed", "failed") else "NULL"
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE robocalls
            SET status = %s,
                last_attempt_at = NOW(),
                completed_at = {finished_at}
            WHERE id = %s
            """,
            (status, robocall_id),
        )
        conn.commit()


def build_dynamic_vars(incident: dict, contact: dict, risk: dict | None) -> tuple[str, str, str]:
    """
    Build the three ElevenLabs dynamic variable strings.
    Returns (CAMERA_FACTS, LOCATION, CALLER_CONTEXT)
    """
    # Parse description for camera facts if stored as JSON-like text
    desc = incident.get("description", "")

    # CAMERA_FACTS — what the camera saw
    detection_type = incident.get("title", "").split(" Detected")[0] if " Detected" in (incident.get("title") or "") else "Unknown"
    camera_facts_parts = [
        f"Detection: {detection_type}",
        f"Description: {desc}",
    ]
    camera_facts = " | ".join(camera_facts_parts)

    # LOCATION
    location = incident.get("location") or "Unknown location"

    # CALLER_CONTEXT — severity, risk, recommendations
    severity = incident.get("severity", "unknown").upper()
    context_parts = [
        f"Severity: {severity}",
        f"Status: {incident.get('status', 'active')}",
    ]
    if risk:
        context_parts.append(f"Risk score: {risk.get('risk_score', 'N/A')}/100")
        context_parts.append(f"Threat level: {risk.get('threat_level', 'unknown')}")
        analysis = risk.get("analysis", "")
        if analysis:
            context_parts.append(f"Analysis: {analysis}")
        recommendations = risk.get("recommendations") or []
        if isinstance(recommendations, str):
            try:
                recommendations = json.loads(recommendations)
            except Exception:
                recommendations = [recommendations]
        if recommendations:
            context_parts.append("Recommended actions: " + "; ".join(str(r) for r in recommendations[:3]))
    caller_context = " | ".join(context_parts)

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
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs API error {e.code}: {body}") from e


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
    voice_id = get_env("ELEVEN_VOICE_ID")

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
        print(f"[robocaller] Incident {incident_id} | type={detection_type} | contact={contact['name']} ({contact['role']}) | to={to_number}")

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
            print(f"[robocaller] Call placed successfully: {json.dumps(result)}")
            update_robocall_status(conn, robocall_id, "completed")
        except RuntimeError as call_err:
            print(f"[robocaller] Call failed: {call_err}", file=sys.stderr)
            update_robocall_status(conn, robocall_id, "failed")
            sys.exit(1)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
