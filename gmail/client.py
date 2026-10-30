"""
gmail/client.py — The Postman / Gmail Translator
=================================================
Think of this file like our assistant's personal postman who runs over to Gmail,
fetches your letters, translates them into clean readable text, and brings them back.

Why do we need a whole file just for this?
When Google hands you an email through their API, it doesn't arrive as a simple
plain-text string. It arrives as an intimidating, nested tree of scrambled Base64
characters, HTML styling tags, tracking pixels, and technical headers.
This file unwraps that package, strips away the junk, and gives us simple,
friendly sentences ready to be read aloud by our voice synthesizer!
"""

import base64
import re
from typing import Optional

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from bs4 import BeautifulSoup

import config


# ---------------------------------------------------------------------------
# 1. Establish the Official Connection to Gmail (_get_service)
# ---------------------------------------------------------------------------
# Takes the user's verified credentials and opens up an authorized channel
# to Google's official Gmail v1 API.
def _get_service(creds: Credentials):
    """Creates a ready-to-use Gmail API service tool using your login badge."""
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


# ---------------------------------------------------------------------------
# 2. Extract Key Details from the Envelope (_get_header)
# ---------------------------------------------------------------------------
# An email comes with a big list of technical stamps called "headers".
# This helper searches that list to find simple things like "Who sent this?"
# (From) or "What is it about?" (Subject).
def _get_header(headers: list[dict], name: str) -> str:
    """Finds a specific field like 'From' or 'Subject' from the email's headers list."""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


# ---------------------------------------------------------------------------
# 3. Unscramble and Clean the Email Message (_decode_body)
# ---------------------------------------------------------------------------
# Emails are sent over the internet in a scrambled format called "Base64",
# and modern marketing emails are full of messy HTML code (like <div>, <b>, <table>).
# If a voice assistant tried to read raw HTML, it would literally speak:
# "less than div style equals margin zero greater than"! That sounds awful.
# This function:
# 1. Decodes the scrambled Base64 back into normal human characters.
# 2. Uses BeautifulSoup to strip out all the ugly HTML tags, leaving only clean text.
def _decode_body(payload: dict) -> str:
    """
    Finds the actual email text, decodes it from Base64, and removes
    all messy HTML tags so it sounds natural when spoken aloud.
    """
    mime_type = payload.get("mimeType", "")
    body_data = payload.get("body", {}).get("data", "")

    # If it's pure plain text, just decode the Base64 scramble
    if mime_type == "text/plain" and body_data:
        return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

    # If it's styled HTML, decode it and let BeautifulSoup strip away all HTML tags
    if mime_type == "text/html" and body_data:
        html = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")
        return BeautifulSoup(html, "html.parser").get_text(separator=" ")

    # If the email is multipart (contains text + images + attachments),
    # check inside each sub-part until we find the actual readable text
    for part in payload.get("parts", []):
        result = _decode_body(part)
        if result:
            return result

    return ""


# ---------------------------------------------------------------------------
# 4. Create a Short, Spoken-Friendly Summary (_summarise_body)
# ---------------------------------------------------------------------------
# Nobody wants a voice assistant to read a 10-page newsletter all at once.
# This function trims the message down to the first 2-3 sentences (~300 characters),
# ending gracefully at a period (.) instead of awkwardly cutting off mid-word.
def _summarise_body(text: str, max_chars: int = 300) -> str:
    """
    Shortens long emails to the first 2-3 sentences so it's pleasant to listen to.
    """
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars:
        return text
    # Try to cut off at the end of a complete sentence
    stop = text.rfind(".", 0, max_chars)
    return text[: stop + 1] if stop > 50 else text[:max_chars] + "…"


# ---------------------------------------------------------------------------
# 5. Fetch Your Latest Inbox Messages (list_inbox)
# ---------------------------------------------------------------------------
# This is the star function of Phase 1!
# What it does step-by-step:
# 1. Asks Gmail for the IDs of the top 5 messages in your INBOX.
# 2. For each ID, downloads the full details (sender, subject, date, body).
# 3. Checks if the email is still marked as UNREAD.
# 4. Returns a clean, organized list of dictionaries ready for our voice engine.
def list_inbox(creds: Credentials, max_results: int = None) -> list[dict]:
    """
    Fetches your recent inbox emails and packs them into a clean, easy-to-use list.
    """
    if max_results is None:
        max_results = config.INBOX_MAX_RESULTS

    service = _get_service(creds)

    # 1. Ask Gmail: "What are the IDs of the latest 5 emails in the INBOX?"
    result = (
        service.users()
        .messages()
        .list(userId="me", labelIds=["INBOX"], maxResults=max_results)
        .execute()
    )

    messages_meta = result.get("messages", [])
    if not messages_meta:
        return []

    # 2. Loop through each message ID and fetch its full contents
    inbox = []
    for meta in messages_meta:
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=meta["id"], format="full")
            .execute()
        )

        headers   = msg.get("payload", {}).get("headers", [])
        label_ids = msg.get("labelIds", [])

        # Clean up the body text
        body_text    = _decode_body(msg.get("payload", {}))
        body_preview = _summarise_body(body_text)

        # Pack the clean email into our organized list
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


# ---------------------------------------------------------------------------
# 6. Debug / Terminal Preview (print_inbox_summary)
# ---------------------------------------------------------------------------
# When developing and testing in the terminal, this prints your latest emails
# with nice dots for unread messages so you can immediately see that your
# Gmail connection is working without even opening the browser!
def print_inbox_summary(creds: Credentials) -> None:
    """
    Prints a quick, easy-to-read summary of your inbox directly in the terminal console.
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
