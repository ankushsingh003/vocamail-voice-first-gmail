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
from email.mime.text import MIMEText
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
def list_inbox(creds: Credentials, max_results: int = None, label_ids: list[str] = None) -> list[dict]:
    """
    Fetches your recent emails from the given folder/label (defaults to INBOX).
    Packs them into a clean, easy-to-use list with sender, subject, date, and preview.
    """
    if max_results is None:
        max_results = config.INBOX_MAX_RESULTS

    if label_ids is None:
        label_ids = ["INBOX"]

    service = _get_service(creds)

    # 1. Ask Gmail for the message IDs matching the requested label
    result = (
        service.users()
        .messages()
        .list(userId="me", labelIds=label_ids, maxResults=max_results)
        .execute()
    )

    messages_meta = result.get("messages", [])
    if not messages_meta:
        return []

    # 2. Loop through each message ID and fetch its full contents
    inbox = []
    for meta in messages_meta:
        try:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=meta["id"], format="full")
                .execute()
            )

            headers    = msg.get("payload", {}).get("headers", [])
            msg_labels = msg.get("labelIds", [])

            # Clean up the body text
            body_text    = _decode_body(msg.get("payload", {}))
            body_preview = _summarise_body(body_text)

            # Pack the clean email into our organized list
            inbox.append(
                {
                    "id":           msg["id"],
                    "thread_id":    msg.get("threadId", ""),
                    "from":         _get_header(headers, "From"),
                    "to":           _get_header(headers, "To"),
                    "subject":      _get_header(headers, "Subject") or "(no subject)",
                    "snippet":      msg.get("snippet", ""),
                    "date":         _get_header(headers, "Date"),
                    "is_unread":    "UNREAD" in msg_labels,
                    "is_starred":   "STARRED" in msg_labels,
                    "body":         body_text,
                    "body_preview": body_preview,
                    "labels":       msg_labels,
                }
            )
        except Exception as item_err:
            print(f"[VocaMail] Skipping unreadable message {meta['id']}: {item_err}")
            continue

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
        print("[VocaMail] Inbox is empty or could not be reached.")
        return

    print(f"\n[VocaMail] Latest {len(messages)} inbox messages:\n")
    for i, msg in enumerate(messages, start=1):
        unread_flag = "● " if msg["is_unread"] else "  "
        print(f"  {unread_flag}{i}. From: {msg['from']}")
        print(f"       Subject: {msg['subject']}")
        print(f"       Preview: {msg['snippet'][:80]}")
        print()


# ---------------------------------------------------------------------------
# 7. Send an Email by Voice (send_email)
# ---------------------------------------------------------------------------
# Think of this like taking your dictated letter, putting it into a clean
# addressed envelope, sealing it, and handing it directly to Google's postal truck!
#
# Parameters:
#   creds   : Your active Google login credentials.
#   to      : The destination email address (e.g. "friend@example.com").
#   subject : The email title line.
#   body    : The full spoken message you want delivered.
#
# How it works in plain English:
#   1. MIMEText formats the message into standard Internet email format.
#   2. base64.urlsafe_b64encode turns the message into a safe web string Google expects.
#   3. The Gmail API sends the message instantly from your connected Gmail account.
def send_email(creds: Credentials, to: str, subject: str, body: str) -> dict:
    """
    Sends an email from the user's Gmail account via the Gmail API.

    Returns the API response dict containing the sent message ID.
    Raises RuntimeError if sending fails.
    """
    if not to or not to.strip():
        raise ValueError("Cannot send email: missing recipient address.")

    service = _get_service(creds)

    # 1. Prepare standard email envelope and content
    message = MIMEText(body)
    message["to"] = to.strip()
    message["subject"] = subject.strip() if subject else "(no subject)"

    # 2. Google's Gmail API requires the email to be encoded as a base64url string
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    # 3. Post to Google's send endpoint
    try:
        sent_message = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": raw_message})
            .execute()
        )
        return sent_message
    except Exception as e:
        raise RuntimeError(f"Failed to send email via Gmail API: {e}")


# ---------------------------------------------------------------------------
# 8. Search Your Emails by Keyword (search_messages)
# ---------------------------------------------------------------------------
# When the user asks: "Find emails from Amazon" or "Search for receipt",
# this function sends that search query to Gmail, finds matching emails,
# and returns them as a clean list ready to be spoken aloud.
def search_messages(creds: Credentials, query: str, max_results: int = 5) -> list[dict]:
    """
    Searches Gmail using any search query (sender, keyword, subject, etc.)
    and returns a clean list of matching email dictionaries.
    """
    if not query or not query.strip():
        return []

    service = _get_service(creds)

    try:
        result = (
            service.users()
            .messages()
            .list(userId="me", q=query.strip(), maxResults=max_results)
            .execute()
        )
    except Exception as e:
        raise RuntimeError(f"Gmail search failed: {e}")

    messages_meta = result.get("messages", [])
    if not messages_meta:
        return []

    matched = []
    for meta in messages_meta:
        try:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=meta["id"], format="full")
                .execute()
            )
            headers   = msg.get("payload", {}).get("headers", [])
            label_ids = msg.get("labelIds", [])
            body_text = _decode_body(msg.get("payload", {}))

            matched.append(
                {
                    "id":           msg["id"],
                    "thread_id":    msg.get("threadId", ""),
                    "from":         _get_header(headers, "From"),
                    "subject":      _get_header(headers, "Subject") or "(no subject)",
                    "snippet":      msg.get("snippet", ""),
                    "date":         _get_header(headers, "Date"),
                    "is_unread":    "UNREAD" in label_ids,
                    "body_preview": _summarise_body(body_text),
                }
            )
        except Exception:
            continue

    return matched


# ---------------------------------------------------------------------------
# 9. Archive an Email (archive_message)
# ---------------------------------------------------------------------------
# In Gmail, "archiving" simply means removing the email from your INBOX
# while keeping it safely stored in "All Mail".
# When the user says "archive email 1", this function removes the INBOX label.
def archive_message(creds: Credentials, msg_id: str) -> bool:
    """
    Archives an email by removing it from the INBOX label.
    Returns True if successfully archived.
    """
    if not msg_id:
        raise ValueError("Cannot archive: missing message ID.")

    service = _get_service(creds)
    try:
        service.users().messages().modify(
            userId="me",
            id=msg_id,
            body={"removeLabelIds": ["INBOX"]},
        ).execute()
        return True
    except Exception as e:
        raise RuntimeError(f"Failed to archive email: {e}")


# ---------------------------------------------------------------------------
# 10. Move an Email to Trash (trash_message)
# ---------------------------------------------------------------------------
# When the user says "delete email 2" or "trash message 3", this function
# moves the message into Gmail's Trash folder (where it stays for 30 days
# before Google permanently erases it, so you never accidentally lose data).
def trash_message(creds: Credentials, msg_id: str) -> bool:
    """
    Moves an email to the Trash folder.
    Returns True if successfully trashed.
    """
    if not msg_id:
        raise ValueError("Cannot delete: missing message ID.")

    service = _get_service(creds)
    try:
        service.users().messages().trash(userId="me", id=msg_id).execute()
        return True
    except Exception as e:
        raise RuntimeError(f"Failed to trash email: {e}")


# ---------------------------------------------------------------------------
# 11. Mark an Email as Read (mark_as_read)
# ---------------------------------------------------------------------------
# When the user listens to an email or says "mark as read", this function
# tells Google to turn off the bold UNREAD highlight on that email.
def mark_as_read(creds: Credentials, msg_id: str) -> bool:
    """
    Marks an email as read by removing the UNREAD label.
    Returns True if successfully updated.
    """
    if not msg_id:
        raise ValueError("Cannot mark as read: missing message ID.")

    service = _get_service(creds)
    try:
        service.users().messages().modify(
            userId="me",
            id=msg_id,
            body={"removeLabelIds": ["UNREAD"]},
        ).execute()
        return True
    except Exception as e:
        raise RuntimeError(f"Failed to mark email as read: {e}")


# ---------------------------------------------------------------------------
# 12. Toggle Star on an Email (toggle_star)
# ---------------------------------------------------------------------------
# When the user clicks the gold star icon in the Gmail table (or says "star email 1"),
# this function adds or removes the official Google 'STARRED' label.
def toggle_star(creds: Credentials, msg_id: str, star: bool = True) -> bool:
    """
    Stars or unstars an email in Gmail.
    """
    if not msg_id:
        raise ValueError("Cannot toggle star: missing message ID.")

    service = _get_service(creds)
    body = {"addLabelIds": ["STARRED"]} if star else {"removeLabelIds": ["STARRED"]}

    try:
        service.users().messages().modify(userId="me", id=msg_id, body=body).execute()
        return True
    except Exception as e:
        raise RuntimeError(f"Failed to toggle star: {e}")


# ---------------------------------------------------------------------------
# 13. Fetch Single Email Detail (get_message)
# ---------------------------------------------------------------------------
# When a user clicks on an email row in the inbox list to read it, this function
# downloads the full email, decodes the body, and formats sender and timestamps.
def get_message(creds: Credentials, msg_id: str) -> dict:
    """
    Fetches the complete content of a single email for the reading pane.
    """
    if not msg_id:
        raise ValueError("Cannot fetch email: missing message ID.")

    service = _get_service(creds)
    try:
        msg = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
        headers    = msg.get("payload", {}).get("headers", [])
        msg_labels = msg.get("labelIds", [])
        body_text  = _decode_body(msg.get("payload", {}))

        return {
            "id":         msg["id"],
            "thread_id":  msg.get("threadId", ""),
            "from":       _get_header(headers, "From"),
            "to":         _get_header(headers, "To"),
            "subject":    _get_header(headers, "Subject") or "(no subject)",
            "date":       _get_header(headers, "Date"),
            "snippet":    msg.get("snippet", ""),
            "is_unread":  "UNREAD" in msg_labels,
            "is_starred": "STARRED" in msg_labels,
            "body":       body_text,
            "labels":     msg_labels,
        }
    except Exception as e:
        raise RuntimeError(f"Failed to fetch email detail: {e}")



