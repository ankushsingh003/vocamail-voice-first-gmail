"""
gmail/client.py
───────────────
Thin wrapper around the Gmail REST API.

Phase 1 implements:
  - list_inbox()   → return the N most recent message summaries

Future phases will add: get_message(), send_email(), reply(), search(),
mark_read(), archive(), trash().
"""

import base64
import re
from typing import Optional

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from bs4 import BeautifulSoup

import config


# ── Build the API service ──────────────────────────────────────────────────────

def _get_service(creds: Credentials):
    """Return an authorised Gmail API service object."""
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_header(headers: list[dict], name: str) -> str:
    """Extract a named header value from a Gmail message headers list."""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _decode_body(payload: dict) -> str:
    """
    Recursively find the plain-text (or HTML-fallback) body of a message.
    Returns clean plain text, stripping HTML tags via BeautifulSoup.
    """
    mime_type = payload.get("mimeType", "")
    body_data = payload.get("body", {}).get("data", "")

    if mime_type == "text/plain" and body_data:
        return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

    if mime_type == "text/html" and body_data:
        html = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")
        return BeautifulSoup(html, "html.parser").get_text(separator=" ")

    # Multipart: recurse into parts
    for part in payload.get("parts", []):
        result = _decode_body(part)
        if result:
            return result

    return ""


def _summarise_body(text: str, max_chars: int = 300) -> str:
    """Trim body to first N characters, stop at a sentence boundary if possible."""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars:
        return text
    # Try to stop at a period
    stop = text.rfind(".", 0, max_chars)
    return text[: stop + 1] if stop > 50 else text[:max_chars] + "…"


# ── Phase 1: List inbox ────────────────────────────────────────────────────────

def list_inbox(creds: Credentials, max_results: int = None) -> list[dict]:
    """
    Fetch the N most recent INBOX messages.

    Returns a list of dicts:
      {
        "id":       str,          # Gmail message ID
        "thread_id": str,
        "from":     str,          # sender display name / address
        "subject":  str,
        "snippet":  str,          # Gmail's own short preview
        "date":     str,
        "is_unread": bool,
        "body_preview": str,      # first ~300 chars of decoded body
      }
    """
    if max_results is None:
        max_results = config.INBOX_MAX_RESULTS

    service = _get_service(creds)

    # 1. Get a list of message IDs
    result = (
        service.users()
        .messages()
        .list(userId="me", labelIds=["INBOX"], maxResults=max_results)
        .execute()
    )

    messages_meta = result.get("messages", [])
    if not messages_meta:
        return []

    # 2. Fetch each message in full
    inbox = []
    for meta in messages_meta:
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=meta["id"], format="full")
            .execute()
        )

        headers  = msg.get("payload", {}).get("headers", [])
        label_ids = msg.get("labelIds", [])

        body_text    = _decode_body(msg.get("payload", {}))
        body_preview = _summarise_body(body_text)

        inbox.append(
            {
                "id":           msg["id"],
                "thread_id":    msg.get("threadId", ""),
                "from":         _get_header(headers, "From"),
                "subject":      _get_header(headers, "Subject") or "(no subject)",
                "snippet":      msg.get("snippet", ""),
                "date":         _get_header(headers, "Date"),
                "is_unread":    "UNREAD" in label_ids,
                "body_preview": body_preview,
            }
        )

    return inbox


# ── Phase 1: Quick terminal test ───────────────────────────────────────────────

def print_inbox_summary(creds: Credentials) -> None:
    """
    For Phase 1 testing only.
    Prints subject + sender for each message to the terminal.
    """
    messages = list_inbox(creds)
    if not messages:
        print("[AuraMail] Inbox is empty or could not be reached.")
        return

    print(f"\n[AuraMail] Latest {len(messages)} inbox messages:\n")
    for i, msg in enumerate(messages, start=1):
        unread_flag = "● " if msg["is_unread"] else "  "
        print(f"  {unread_flag}{i}. From: {msg['from']}")
        print(f"       Subject: {msg['subject']}")
        print(f"       Preview: {msg['snippet'][:80]}")
        print()
