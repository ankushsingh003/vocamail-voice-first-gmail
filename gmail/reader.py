"""
gmail/reader.py — VocaMail's Gmail Narrator
============================================
Think of this file like a radio news anchor who reads out your emails.

Once the intent detector (core/intent.py) figures out WHAT the user wants
(e.g. "read my inbox" or "read email 2"), this file fetches the actual
Gmail data and formats it into natural, easy-to-listen-to spoken sentences.

Key functions:
  1. narrate_inbox()   → Reads out a summary of your latest emails
                         e.g. "You have 5 emails. Email 1: from Alice about Meeting tomorrow..."
  2. narrate_email()   → Reads the full body of one specific email
                         e.g. "Email from Bob Singh, subject Hello, sent 2 hours ago. Body: Hi there..."
  3. get_help_text()   → Returns the list of available voice commands as a spoken sentence

All output is plain readable English — no HTML, no bullet points, no jargon —
because it will be spoken aloud by gTTS and heard through speakers, not read on screen.
"""

import logging
from gmail.client import list_inbox, search_messages
from google.oauth2.credentials import Credentials

logger = logging.getLogger(__name__)

# How many emails to fetch and read in an inbox summary
INBOX_SUMMARY_COUNT = 5


# ---------------------------------------------------------------------------
# 1. Format a Single Email Into a Spoken Line (_format_email_line)
# ---------------------------------------------------------------------------
# Turns one raw email dict (from gmail/client.py) into one easy-to-hear sentence.
# Example output: "Email 1 from Alice Johnson, subject: Meeting Tomorrow. Unread."
def _format_email_line(email: dict, index: int) -> str:
    """Formats one email dict into a short spoken summary line."""
    sender  = email.get("from", "unknown sender")
    subject = email.get("subject", "no subject")
    snippet = email.get("snippet", "")
    unread  = email.get("unread", False)

    # Build a clean spoken line
    line = f"Email {index + 1}, from {sender}, subject: {subject}."
    if unread:
        line += " Unread."
    if snippet:
        # Keep the snippet short so it doesn't run on too long when spoken
        short_snippet = snippet[:120].strip()
        line += f" Preview: {short_snippet}."

    return line


# ---------------------------------------------------------------------------
# 2. Narrate the Full Inbox Summary (narrate_inbox)
# ---------------------------------------------------------------------------
# Called when the user says "read my inbox" or "check emails".
# Fetches the latest N emails and builds one big speakable paragraph.
# Example:
#   "You have 5 emails. Email 1, from GitHub, subject: Pull request merged. Unread.
#    Email 2, from Mum, subject: Dinner plans. ..."
def narrate_inbox(creds: Credentials) -> str:
    """
    Fetches the inbox and returns a full spoken summary string.
    Returns a friendly error string if fetching fails.
    """
    try:
        emails = list_inbox(creds, max_results=INBOX_SUMMARY_COUNT)
    except Exception as e:
        logger.error(f"[VocaMail] Failed to fetch inbox for narration: {e}")
        return "Sorry, I could not fetch your emails right now. Please try again."

    if not emails:
        return "Your inbox is empty. You have no emails."

    count = len(emails)
    lines = [f"You have {count} email{'s' if count != 1 else ''} in your inbox."]

    for i, email in enumerate(emails):
        lines.append(_format_email_line(email, i))

    # Join all lines with a short pause-friendly separator
    return " ".join(lines)


# ---------------------------------------------------------------------------
# 3. Narrate a Single Full Email (narrate_email)
# ---------------------------------------------------------------------------
# Called when the user says "read email 2" or "open the third message".
# Reads the full body text of that specific email.
# Example:
#   "Email 2, from Mum. Subject: Dinner plans. Sent on Thursday.
#    Body: Hi sweetheart, are you free for dinner on Sunday?..."
def narrate_email(creds: Credentials, email_index: int = 0) -> str:
    """
    Fetches emails and reads the full body of the email at email_index (0-based).
    Returns a friendly string if the index is out of range or fetch fails.
    """
    try:
        emails = list_inbox(creds, max_results=INBOX_SUMMARY_COUNT)
    except Exception as e:
        logger.error(f"[VocaMail] Failed to fetch email for reading: {e}")
        return "Sorry, I could not load your emails right now."

    if not emails:
        return "Your inbox is empty. There are no emails to read."

    # Make sure the requested index actually exists
    if email_index < 0 or email_index >= len(emails):
        return (
            f"There are only {len(emails)} emails in your inbox. "
            f"Please say a number between 1 and {len(emails)}."
        )

    email   = emails[email_index]
    sender  = email.get("from",    "unknown sender")
    subject = email.get("subject", "no subject")
    date    = email.get("date",    "unknown date")
    body    = email.get("body",    email.get("snippet", "No message body found."))

    # Trim the body so it doesn't take 5 minutes to read aloud
    # 800 characters ≈ about 45 seconds of speech at a natural pace
    if len(body) > 800:
        body = body[:800].strip() + "... Message continues but has been trimmed for length."

    spoken = (
        f"Reading email {email_index + 1}. "
        f"From {sender}. "
        f"Subject: {subject}. "
        f"Sent: {date}. "
        f"Body: {body}"
    )

    return spoken


# ---------------------------------------------------------------------------
# 4. Narrate Search Results (narrate_search_results)
# ---------------------------------------------------------------------------
# When the user asks "search for amazon" or "find receipts", this function
# searches Gmail and summarizes the matching emails in a friendly voice.
def narrate_search_results(creds: Credentials, query: str) -> str:
    """
    Searches Gmail for the given query and returns a spoken summary of results.
    """
    if not query:
        return "What would you like to search for? Please say a keyword or sender name."

    try:
        results = search_messages(creds, query=query, max_results=INBOX_SUMMARY_COUNT)
    except Exception as e:
        logger.error(f"[VocaMail] Search error: {e}")
        return f"Sorry, the search for '{query}' failed. Please try again."

    if not results:
        return f"No emails found matching '{query}'. Try a different search word."

    count = len(results)
    lines = [f"Found {count} email{'s' if count != 1 else ''} for '{query}'."]
    for i, email in enumerate(results):
        lines.append(_format_email_line(email, i))

    return " ".join(lines)


# ---------------------------------------------------------------------------
# 5. Help Narration (get_help_text)
# ---------------------------------------------------------------------------
# Called when the user says "help" or "what can you do".
# Returns a friendly spoken list of all supported voice commands.
def get_help_text() -> str:
    """Returns a friendly spoken description of all supported voice commands."""
    return (
        "Here is what you can ask me. "
        "Say 'give me my briefing' to hear your morning executive podcast. "
        "Say 'read my inbox' to hear your recent emails. "
        "Say 'read email 1' to hear a full email. "
        "Say 'search for' followed by a keyword to find specific emails. "
        "Say 'archive email 1' to move an email out of your inbox. "
        "Say 'delete email 1' to send it to the trash. "
        "Say 'mark email 1 as read' to clear its unread status. "
        "Say 'compose email' to dictate and send a new email. "
        "Say 'log out' to sign out of your account. "
        "Press Space or tap the microphone button to talk."
    )

