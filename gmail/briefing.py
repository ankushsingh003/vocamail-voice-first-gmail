"""
gmail/briefing.py — Morning Executive Briefing Engine for vocamail
===================================================================
Generates an executive podcast-style daily audio briefing and structured summary
from the user's unread emails received in the last 24–48 hours.

Key Functions:
  1. fetch_recent_unread_emails(creds, max_results=15)
     Fetches recent unread messages with sender, subject, date, and snippet.
  2. generate_briefing_digest(emails)
     Triages emails into:
       - urgent: actionable items (interviews, bills, deadlines, security)
       - updates: team discussions, newsletters, general notes
       - noise_count: total low-priority promotional / automated messages
     Builds a natural, human-sounding 60-second spoken script.
  3. create_morning_briefing(creds)
     Master entry point: fetches emails, runs triage, generates audio via gTTS,
     and returns structured JSON ready for the frontend player.
"""

import os
import re
import json
import logging
from typing import Dict, Any, List
from google.oauth2.credentials import Credentials

from gmail.client import _get_service, _get_header, _decode_body, _summarise_body
from speech.tts import speak
import config

logger = logging.getLogger(__name__)


def fetch_recent_unread_emails(creds: Credentials, max_results: int = 15) -> List[Dict[str, Any]]:
    """
    Fetches unread emails from the past 2 days using Gmail API query syntax.
    """
    service = _get_service(creds)
    
    # Query for unread emails from the last 2 days in the inbox
    query = "newer_than:2d is:unread"
    
    try:
        result = (
            service.users()
            .messages()
            .list(userId="me", q=query, maxResults=max_results)
            .execute()
        )
    except Exception as e:
        logger.warning(f"[VocaMail Briefing] Query '{query}' failed, falling back to INBOX label: {e}")
        result = (
            service.users()
            .messages()
            .list(userId="me", labelIds=["INBOX"], maxResults=max_results)
            .execute()
        )

    messages_meta = result.get("messages", [])
    if not messages_meta:
        return []

    emails = []
    for meta in messages_meta:
        try:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=meta["id"], format="full")
                .execute()
            )

            headers = msg.get("payload", {}).get("headers", [])
            body_text = _decode_body(msg.get("payload", {}))
            body_preview = _summarise_body(body_text)

            sender = _get_header(headers, "From")
            # Clean up sender string (e.g., 'Alice <alice@example.com>' -> 'Alice')
            clean_sender = re.sub(r"<[^>]+>", "", sender).strip().strip('"') or sender

            emails.append({
                "id": meta["id"],
                "thread_id": msg.get("threadId"),
                "sender": clean_sender,
                "full_sender": sender,
                "subject": _get_header(headers, "Subject") or "(No subject)",
                "date": _get_header(headers, "Date"),
                "snippet": msg.get("snippet", ""),
                "body_preview": body_preview,
            })
        except Exception as err:
            logger.debug(f"[VocaMail Briefing] Could not parse message {meta.get('id')}: {err}")
            continue

    return emails


def _triage_with_heuristics(emails: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Lightweight, robust fallback classifier.
    Categorizes emails without needing an external LLM key,
    ensuring the feature works 100% reliably even offline or if API quota is 0.
    """
    urgent_keywords = [
        "urgent", "action required", "interview", "offer", "payment",
        "bill", "due", "security alert", "verification", "deadline",
        "confirm", "meeting", "invitation", "hiring", "status", "application"
    ]
    noise_keywords = [
        "unsubscribe", "discount", "sale", "newsletter", "off", "deal",
        "promo", "weekly", "digest", "no-reply", "noreply", "marketing"
    ]

    urgent = []
    updates = []
    noise_count = 0

    for email in emails:
        text = f"{email['subject']} {email['snippet']}".lower()
        sender_lower = email['sender'].lower()

        # Check noise first
        if any(w in text for w in noise_keywords) or "noreply" in sender_lower or "no-reply" in sender_lower:
            noise_count += 1
            continue

        # Check urgent
        if any(w in text for w in urgent_keywords):
            urgent.append({
                "id": email["id"],
                "sender": email["sender"],
                "subject": email["subject"],
                "snippet": email["snippet"][:140],
                "reason": "Action or time-sensitive request detected"
            })
        else:
            updates.append({
                "id": email["id"],
                "sender": email["sender"],
                "subject": email["subject"],
                "snippet": email["snippet"][:140],
            })

    # Build natural spoken script
    script_parts = ["Good morning! Here is your vocamail executive briefing."]

    if not emails:
        script_parts.append("Your inbox is completely clear. You have no unread messages from the past twenty-four hours.")
        audio_script = " ".join(script_parts)
        return {
            "greeting": "Inbox Zero",
            "urgent": [],
            "updates": [],
            "noise_count": 0,
            "audio_script": audio_script,
        }

    total = len(emails)
    script_parts.append(f"You have {total} unread message{'s' if total != 1 else ''}.")

    if urgent:
        script_parts.append(f"First, you have {len(urgent)} high priority item{'s' if len(urgent) != 1 else ''}:")
        for u in urgent[:3]:  # Top 3 urgent
            script_parts.append(f"From {u['sender']}, regarding: {u['subject']}.")
    else:
        script_parts.append("Good news: no urgent action items or deadlines were detected.")

    if updates:
        top_update = updates[0]
        script_parts.append(f"In general updates, {top_update['sender']} sent: {top_update['subject']}.")

    if noise_count > 0:
        script_parts.append(f"Additionally, {noise_count} promotional and automated notification{'s have' if noise_count != 1 else ' has'} been organized.")

    script_parts.append("Have a productive day!")
    audio_script = " ".join(script_parts)

    return {
        "greeting": "Executive Briefing Ready",
        "urgent": urgent,
        "updates": updates,
        "noise_count": noise_count,
        "audio_script": audio_script,
    }


def generate_briefing_digest(emails: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyzes inbox emails using OpenAI if available, or falls back to
    deterministic heuristics so the user NEVER gets an error.
    """
    api_key = getattr(config, "OPENAI_API_KEY", "").strip()

    # If OpenAI key is available, attempt LLM summarization
    if api_key and api_key != "YOUR_OPENAI_API_KEY_HERE" and emails:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)

            email_previews = [
                {
                    "id": m["id"],
                    "sender": m["sender"],
                    "subject": m["subject"],
                    "snippet": m["snippet"][:150]
                }
                for m in emails[:12]
            ]

            prompt = (
                "You are an executive chief of staff. Review the user's unread emails from the last 24 hours:\n"
                f"{json.dumps(email_previews, indent=2)}\n\n"
                "Return a valid JSON object with:\n"
                "{\n"
                '  "greeting": "short 3-5 word headline",\n'
                '  "urgent": [ {"id": "email_id", "sender": "name", "subject": "topic", "snippet": "summary", "reason": "why urgent"} ],\n'
                '  "updates": [ {"id": "email_id", "sender": "name", "subject": "topic", "snippet": "summary"} ],\n'
                '  "noise_count": number_of_newsletters_or_promos,\n'
                '  "audio_script": "A 45-60 second natural spoken podcast script starting with: Good morning! Here is your vocamail briefing..."\n'
                "}\n"
                "Do NOT wrap in markdown code blocks. Return raw JSON only."
            )

            res = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=600,
            )

            raw_text = res.choices[0].message.content.strip()
            # Strip potential ```json markers
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(json)?\n?", "", raw_text)
                raw_text = re.sub(r"\n?```$", "", raw_text)

            digest = json.loads(raw_text)
            return digest
        except Exception as err:
            logger.warning(f"[VocaMail Briefing] LLM summarization failed, falling back to heuristics: {err}")

    # Fallback to smart heuristic classifier
    return _triage_with_heuristics(emails)


def create_morning_briefing(creds: Credentials) -> Dict[str, Any]:
    """
    End-to-end briefing generator:
      1. Fetches unread emails.
      2. Generates structured triage & audio script.
      3. Synthesizes podcast audio file with gTTS.
      4. Returns structured summary + audio URL.
    """
    emails = fetch_recent_unread_emails(creds, max_results=15)
    digest = generate_briefing_digest(emails)

    audio_script = digest.get("audio_script", "Good morning! You have no new messages today.")
    try:
        audio_url = speak(audio_script)
    except Exception as e:
        logger.warning(f"[VocaMail Briefing] TTS generation failed: {e}")
        audio_url = None

    return {
        "ok": True,
        "total_unread": len(emails),
        "greeting": digest.get("greeting", "Daily Digest"),
        "urgent": digest.get("urgent", []),
        "updates": digest.get("updates", []),
        "noise_count": digest.get("noise_count", 0),
        "audio_script": audio_script,
        "audio_url": audio_url,
    }
