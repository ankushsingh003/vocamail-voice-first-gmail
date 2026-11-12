import logging
from gmail.client import list_inbox, search_messages
from google.oauth2.credentials import Credentials
from core.action_detector import detect_all_action_items
from core.rag_search import is_conversational_query, expand_search_query, synthesize_inbox_rag

logger = logging.getLogger(__name__)

INBOX_SUMMARY_COUNT = 5


def _format_email_line(email: dict, index: int) -> str:
    sender = email.get("from", "unknown sender")
    subject = email.get("subject", "no subject")
    snippet = email.get("snippet", "")
    unread = email.get("unread", False)

    line = f"Email {index + 1}, from {sender}, subject: {subject}."
    if unread:
        line += " Unread."
    if snippet:
        short_snippet = snippet[:120].strip()
        line += f" Preview: {short_snippet}."

    return line


def narrate_inbox(creds: Credentials) -> str:
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

    return " ".join(lines)


def narrate_email(creds: Credentials, email_index: int = 0) -> str:
    try:
        emails = list_inbox(creds, max_results=INBOX_SUMMARY_COUNT)
    except Exception as e:
        logger.error(f"[VocaMail] Failed to fetch email for reading: {e}")
        return "Sorry, I could not load your emails right now."

    if not emails:
        return "Your inbox is empty. There are no emails to read."

    if email_index < 0 or email_index >= len(emails):
        return (
            f"There are only {len(emails)} emails in your inbox. "
            f"Please say a number between 1 and {len(emails)}."
        )

    email = emails[email_index]
    sender = email.get("from", "unknown sender")
    subject = email.get("subject", "no subject")
    date = email.get("date", "unknown date")
    body = email.get("body", email.get("snippet", "No message body found."))

    if len(body) > 800:
        body = body[:800].strip() + "... Message continues but has been trimmed for length."

    actions = detect_all_action_items(subject=subject, sender=sender, body=body)
    announcements = []
    if actions.get("meeting", {}).get("detected") and actions["meeting"].get("date_str"):
        announcements.append(f"Meeting proposed for {actions['meeting']['date_str']}.")
    if actions.get("invoice", {}).get("detected"):
        inv = actions["invoice"]
        inv_str = f"Invoice due {inv.get('due_date', 'soon')}"
        if inv.get("amount"):
            inv_str += f" for {inv['amount']}"
        announcements.append(inv_str + ".")
    if actions.get("meeting_link"):
        announcements.append(f"{actions['meeting_link']['platform']} link detected.")

    action_text = f" Action items: {' '.join(announcements)} " if announcements else " "

    spoken = (
        f"Reading email {email_index + 1}. "
        f"From {sender}. "
        f"Subject: {subject}.{action_text}"
        f"Sent: {date}. "
        f"Body: {body}"
    )

    return spoken


def narrate_search_results(creds: Credentials, query: str) -> str:
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


def narrate_rag_answer(creds: Credentials, query: str) -> str:
    if not query:
        return "What would you like to know from your inbox?"

    if not is_conversational_query(query):
        return narrate_search_results(creds, query)

    try:
        expanded = expand_search_query(query)
        candidates = search_messages(creds, query=expanded, max_results=6)
        if not candidates:
            fallback_q = " ".join(w for w in query.split() if len(w) > 3)
            candidates = search_messages(creds, query=fallback_q, max_results=4)
    except Exception as e:
        logger.error(f"[VocaMail] RAG search error: {e}")
        return f"Sorry, I could not search your inbox for that question. Please try again."

    result = synthesize_inbox_rag(query, candidates)

    if not result.get("has_answer"):
        return "I searched your inbox but could not find a specific answer to that question."

    answer = result.get("answer", "")
    citation = result.get("citation")
    if citation and "source" not in answer.lower():
        subj = citation.get("subject", "")
        date = citation.get("date", "")
        if subj and date:
            answer += f" Source: {subj}, {date}."

    return answer


def get_help_text() -> str:
    return (
        "Here is what you can ask me. "
        "Say 'give me my briefing' to hear your morning executive podcast. "
        "Say 'read my inbox' to hear your recent emails. "
        "Say 'read email 1' to hear a full email and detected action items. "
        "Say 'add to calendar' to schedule an extracted meeting. "
        "Say 'join meeting' or 'join zoom' to open a video call. "
        "Say 'set reminder' to flag an invoice deadline. "
        "Say 'search for' followed by a keyword to find specific emails. "
        "Say 'archive email 1' to move an email out of your inbox. "
        "Say 'delete email 1' to send it to the trash. "
        "Say 'mark email 1 as read' to clear its unread status. "
        "Say 'compose email' to dictate and send a new email. "
        "Say 'log out' to sign out of your account. "
        "Press Space or tap the microphone button to talk."
    )
