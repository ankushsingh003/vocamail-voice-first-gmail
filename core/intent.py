"""
core/intent.py — VocaMail's Brain (Voice Command Understander)
==============================================================
Think of this file like a multilingual receptionist who listens to what
you say and figures out exactly what task you want done.

When Whisper converts your voice into text (e.g. "read my latest emails"),
this file reads that text and answers: "Ah, the user wants to READ INBOX."

It then returns a clean, structured result that app.py uses to decide
which Gmail action to perform and what to say back to you.

Supported voice commands (with many natural variations):
  - "read my inbox" / "check emails" / "what's new" → intent: read_inbox
  - "read email 1" / "open the third message"        → intent: read_email (+ index)
  - "compose email to John"                          → intent: compose   (+ recipient)
  - "log out" / "sign out"                           → intent: logout
  - "help" / "what can you do"                       → intent: help
  - anything else                                    → intent: unknown

Why fuzzy matching?
  Speech recognition isn't perfect. You might say "red my inbox" instead of
  "read my inbox". Fuzzy matching catches these small transcription errors
  by measuring how SIMILAR two phrases are (not just if they're identical).
  We use the rapidfuzz library for this — it's fast and battle-tested.
"""

import re
import logging
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Intent Vocabulary — All Trigger Phrases Per Intent
# ---------------------------------------------------------------------------
# Each intent has a list of natural language phrases a user might say.
# Fuzzy matching compares the user's transcript against ALL of these
# and picks the closest match above a confidence threshold.
INTENT_PHRASES = {
    # --- Read the inbox summary ---
    "read_inbox": [
        "read my inbox",
        "check my emails",
        "check inbox",
        "what's new",
        "any new emails",
        "show emails",
        "list emails",
        "read emails",
        "what emails do I have",
        "read my messages",
        "check messages",
        "new messages",
        "do I have any mail",
        "show me my inbox",
        "read my mail",
        "latest emails",
        "open inbox",
    ],

    # --- Read a specific email by number ---
    "read_email": [
        "read email",
        "open email",
        "read message",
        "open message",
        "read the first",
        "read the second",
        "read the third",
        "email number",
        "message number",
        "read number",
        "open number",
    ],

    # --- Compose / send an email ---
    "compose": [
        "compose email",
        "send email",
        "write email",
        "new email",
        "compose message",
        "send message",
        "write to",
        "email to",
        "send to",
        "compose to",
    ],

    # --- Log out ---
    "logout": [
        "log out",
        "logout",
        "sign out",
        "signout",
        "exit",
        "log me out",
        "sign me out",
        "goodbye",
        "bye",
    ],

    # --- Help / capabilities ---
    "help": [
        "help",
        "what can you do",
        "how does this work",
        "what are the commands",
        "commands",
        "options",
        "what do you support",
        "how do I use this",
    ],
}

# Minimum similarity score (0–100) needed to accept a fuzzy match.
# 65 means "at least 65% similar" — loose enough to catch transcription errors,
# strict enough to avoid random false matches.
FUZZY_THRESHOLD = 65


# ---------------------------------------------------------------------------
# 2. Ordinal Word → Number Converter (_ordinal_to_index)
# ---------------------------------------------------------------------------
# Converts spoken ordinal words into zero-based array indices.
# "first" → 0, "second" → 1, "third" → 2 … "tenth" → 9
def _ordinal_to_index(word: str) -> int | None:
    """Converts spoken ordinal words (first, second…) to zero-based index."""
    ordinals = {
        "first": 0, "second": 1, "third": 2, "fourth": 3, "fifth": 4,
        "sixth": 5, "seventh": 6, "eighth": 7, "ninth": 8, "tenth": 9,
        "1st": 0, "2nd": 1, "3rd": 2, "4th": 3, "5th": 4,
        "6th": 5, "7th": 6, "8th": 7, "9th": 8, "10th": 9,
        "one": 0, "two": 1, "three": 2, "four": 3, "five": 4,
        "six": 5, "seven": 6, "eight": 7, "nine": 8, "ten": 9,
    }
    return ordinals.get(word.lower())


# ---------------------------------------------------------------------------
# 3. Parse Extra Details from the Transcript (_extract_params)
# ---------------------------------------------------------------------------
# Once we know the intent, we extract additional parameters:
# - For "read_email" → which email number (1, 2, 3…)?
# - For "compose"    → who is the recipient ("email to John" → "John")?
def _extract_params(intent: str, transcript: str) -> dict:
    """Pulls extra parameters from the transcript based on the detected intent."""
    params = {}
    text = transcript.lower()

    if intent == "read_email":
        # Try to find a digit: "read email 2" → index 1
        digit_match = re.search(r"\b(\d+)\b", text)
        if digit_match:
            params["email_index"] = int(digit_match.group(1)) - 1  # convert to 0-based

        # Try to find an ordinal word: "read the third email" → index 2
        for word in text.split():
            idx = _ordinal_to_index(word)
            if idx is not None:
                params["email_index"] = idx
                break

        # Default to first email if no number found
        params.setdefault("email_index", 0)

    elif intent == "compose":
        # Try to extract a recipient: "email to John Smith" → "John Smith"
        recipient_match = re.search(
            r"(?:to|for)\s+([A-Za-z][A-Za-z\s]+?)(?:\s+about|\s+regarding|$)",
            transcript,
            re.IGNORECASE,
        )
        if recipient_match:
            params["recipient"] = recipient_match.group(1).strip()

    return params


# ---------------------------------------------------------------------------
# 4. Main Entry Point: Detect Intent (detect_intent)
# ---------------------------------------------------------------------------
# This is the only function you call from app.py.
#
# It takes the raw Whisper transcript (e.g. "hey can you read my emails please")
# and returns a structured dict like:
#   {
#     "intent": "read_inbox",
#     "confidence": 89.5,
#     "matched_phrase": "read my inbox",
#     "params": {}
#   }
#
# If nothing matches well enough, intent will be "unknown".
def detect_intent(transcript: str) -> dict:
    """
    Analyses the user's spoken transcript and identifies the closest matching
    voice command intent using fuzzy string matching.

    Returns a dict with:
      - intent      : string name of the detected action (or "unknown")
      - confidence  : 0–100 match score (higher = more certain)
      - matched_phrase: the trigger phrase that scored highest
      - params      : extra extracted data (e.g. email_index, recipient)
    """
    if not transcript or not transcript.strip():
        return {"intent": "unknown", "confidence": 0, "matched_phrase": "", "params": {}}

    text = transcript.strip()

    best_intent     = "unknown"
    best_score      = 0.0
    best_phrase     = ""

    # Compare the transcript against every phrase in every intent category
    for intent_name, phrases in INTENT_PHRASES.items():
        for phrase in phrases:
            # partial_ratio is great for short phrases inside longer sentences
            # e.g. "read my inbox" inside "hey please read my inbox right now"
            score = fuzz.partial_ratio(phrase.lower(), text.lower())

            if score > best_score:
                best_score  = score
                best_intent = intent_name
                best_phrase = phrase

    # If nothing scored above our confidence threshold, call it unknown
    if best_score < FUZZY_THRESHOLD:
        best_intent = "unknown"

    params = _extract_params(best_intent, text)

    logger.info(
        f"[VocaMail] Intent: '{best_intent}' "
        f"(score={best_score:.1f}, phrase='{best_phrase}')"
    )

    return {
        "intent":        best_intent,
        "confidence":    round(best_score, 1),
        "matched_phrase": best_phrase,
        "params":        params,
    }

