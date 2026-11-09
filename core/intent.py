import re
import logging
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)

INTENT_PHRASES = {
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
    "search": [
        "search for",
        "search emails for",
        "find emails from",
        "find emails about",
        "look for emails",
        "search my emails",
        "find messages",
        "search inbox for",
        "search",
        "find",
    ],
    "archive": [
        "archive email",
        "archive message",
        "archive this email",
        "archive",
        "archive the first",
        "archive the second",
        "archive number",
    ],
    "trash": [
        "delete email",
        "delete message",
        "trash email",
        "trash message",
        "delete this email",
        "move to trash",
        "delete number",
        "trash the first",
        "delete the second",
    ],
    "mark_read": [
        "mark as read",
        "mark email as read",
        "mark message as read",
        "mark read",
        "mark the first as read",
        "mark this as read",
    ],
    "confirm": [
        "yes",
        "send",
        "send it",
        "confirm",
        "looks good",
        "go ahead",
        "proceed",
        "sure",
        "ok",
        "okay",
        "yes send it",
        "please send",
        "send the email",
    ],
    "cancel": [
        "no",
        "cancel",
        "stop",
        "abort",
        "don't send",
        "do not send",
        "nevermind",
        "discard",
        "quit",
        "cancel email",
        "no don't send",
    ],
    "briefing": [
        "give me my morning briefing",
        "morning briefing",
        "vocamail briefing",
        "executive briefing",
        "daily briefing",
        "play briefing",
        "play my briefing",
        "daily podcast",
        "morning podcast",
        "briefing",
    ],
}

FUZZY_THRESHOLD = 65


def _ordinal_to_index(word: str) -> int | None:
    ordinals = {
        "first": 0, "second": 1, "third": 2, "fourth": 3, "fifth": 4,
        "sixth": 5, "seventh": 6, "eighth": 7, "ninth": 8, "tenth": 9,
        "1st": 0, "2nd": 1, "3rd": 2, "4th": 3, "5th": 4,
        "6th": 5, "7th": 6, "8th": 7, "9th": 8, "10th": 9,
        "one": 0, "two": 1, "three": 2, "four": 3, "five": 4,
        "six": 5, "seven": 6, "eight": 7, "nine": 8, "ten": 9,
    }
    return ordinals.get(word.lower())


def _extract_params(intent: str, transcript: str) -> dict:
    params = {}
    text = transcript.lower()

    if intent in ("read_email", "archive", "trash", "mark_read"):
        digit_match = re.search(r"\b(\d+)\b", text)
        if digit_match:
            params["email_index"] = int(digit_match.group(1)) - 1

        for word in text.split():
            idx = _ordinal_to_index(word)
            if idx is not None:
                params["email_index"] = idx
                break

        params.setdefault("email_index", 0)

    elif intent == "search":
        query = re.sub(
            r"^(?:search(?:\s+for|\s+emails\s+for|\s+my\s+emails\s+for|\s+inbox\s+for)?|find(?:\s+emails\s+from|\s+emails\s+about|\s+messages\s+from)?|look\s+for)\s+",
            "",
            text,
            flags=re.IGNORECASE,
        ).strip()
        params["query"] = query or text

    elif intent == "compose":
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", transcript)
        if email_match:
            params["recipient"] = email_match.group(0).strip()
        else:
            recipient_match = re.search(
                r"(?:to|for)\s+([A-Za-z0-9\s\.]+?)(?:\s+about|\s+regarding|\s+subject|$)",
                transcript,
                re.IGNORECASE,
            )
            if recipient_match:
                params["recipient"] = recipient_match.group(1).strip()

        subject_match = re.search(
            r"(?:about|regarding|with subject|subject)\s+(.+)$",
            transcript,
            re.IGNORECASE,
        )
        if subject_match:
            params["subject"] = subject_match.group(1).strip()

    return params


def detect_intent(transcript: str) -> dict:
    if not transcript or not transcript.strip():
        return {"intent": "unknown", "confidence": 0, "matched_phrase": "", "params": {}}

    text = transcript.strip()

    best_intent = "unknown"
    best_score = 0.0
    best_phrase = ""

    for intent_name, phrases in INTENT_PHRASES.items():
        for phrase in phrases:
            phrase_clean = phrase.lower().strip()
            if len(phrase_clean.split()) == 1 and len(phrase_clean) <= 5:
                tokens = re.findall(r"\b\w+\b", text.lower())
                if phrase_clean in tokens:
                    score = 100.0
                else:
                    score = fuzz.ratio(phrase_clean, text.lower())
            else:
                score = fuzz.partial_ratio(phrase_clean, text.lower())

            if score > best_score:
                best_score = score
                best_intent = intent_name
                best_phrase = phrase

    if best_score < FUZZY_THRESHOLD:
        best_intent = "unknown"

    params = _extract_params(best_intent, text)

    logger.info(
        f"[VocaMail] Intent: '{best_intent}' "
        f"(score={best_score:.1f}, phrase='{best_phrase}')"
    )

    return {
        "intent": best_intent,
        "confidence": round(best_score, 1),
        "matched_phrase": best_phrase,
        "params": params,
    }
