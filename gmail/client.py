import base64
import re
from email.mime.text import MIMEText
from typing import Optional

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from bs4 import BeautifulSoup

import config


def _get_service(creds: Credentials):
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def _get_header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _clean_email_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[\u200B-\u200D\uFEFF]", "", text)
    text = text.replace("\u00a0", " ").replace("&nbsp;", " ")
    lines = [line.rstrip() for line in text.splitlines()]
    cleaned_lines = []
    prev_blank = False
    for line in lines:
        if not line.strip():
            if not prev_blank and cleaned_lines:
                cleaned_lines.append("")
                prev_blank = True
        else:
            cleaned_lines.append(line)
            prev_blank = False
    return "\n".join(cleaned_lines).strip()


def _extract_body_parts(payload: dict) -> tuple[str, str]:
    plain_text = ""
    html_text = ""

    def _walk(part: dict):
        nonlocal plain_text, html_text
        mime = part.get("mimeType", "")
        data = part.get("body", {}).get("data", "")
        if data:
            try:
                decoded = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                if mime == "text/plain" and not plain_text:
                    plain_text = decoded
                elif mime == "text/html" and not html_text:
                    html_text = decoded
            except Exception:
                pass
        for subpart in part.get("parts", []):
            _walk(subpart)

    _walk(payload)

    if not plain_text and html_text:
        try:
            soup = BeautifulSoup(html_text, "html.parser")
            for tag in soup(["script", "style", "meta", "noscript"]):
                tag.decompose()
            plain_text = soup.get_text(separator="\n")
        except Exception:
            plain_text = html_text

    plain_text = _clean_email_text(plain_text)
    return plain_text, html_text


def _decode_body(payload: dict) -> str:
    plain_text, _ = _extract_body_parts(payload)
    return plain_text


def _summarise_body(text: str, max_chars: int = 300) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars:
        return text
    stop = text.rfind(".", 0, max_chars)
    return text[: stop + 1] if stop > 50 else text[:max_chars] + "…"


def list_inbox(creds: Credentials, max_results: int = None, label_ids: list[str] = None) -> list[dict]:
    if max_results is None:
        max_results = config.INBOX_MAX_RESULTS

    if label_ids is None:
        label_ids = ["INBOX"]

    service = _get_service(creds)

    result = (
        service.users()
        .messages()
        .list(userId="me", labelIds=label_ids, maxResults=max_results)
        .execute()
    )

    messages_meta = result.get("messages", [])
    if not messages_meta:
        return []

    inbox = []
    for meta in messages_meta:
        try:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=meta["id"], format="full")
                .execute()
            )

            headers = msg.get("payload", {}).get("headers", [])
            msg_labels = msg.get("labelIds", [])

            body_text, body_html = _extract_body_parts(msg.get("payload", {}))
            body_preview = _summarise_body(body_text)

            inbox.append(
                {
                    "id": msg["id"],
                    "thread_id": msg.get("threadId", ""),
                    "from": _get_header(headers, "From"),
                    "to": _get_header(headers, "To"),
                    "subject": _get_header(headers, "Subject") or "(no subject)",
                    "snippet": msg.get("snippet", ""),
                    "date": _get_header(headers, "Date"),
                    "is_unread": "UNREAD" in msg_labels,
                    "is_starred": "STARRED" in msg_labels,
                    "body": body_text,
                    "body_html": body_html,
                    "body_preview": body_preview,
                    "labels": msg_labels,
                }
            )
        except Exception as item_err:
            print(f"[VocaMail] Skipping unreadable message {meta['id']}: {item_err}")
            continue

    return inbox


def print_inbox_summary(creds: Credentials) -> None:
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


def send_email(creds: Credentials, to: str, subject: str, body: str) -> dict:
    if not to or not to.strip():
        raise ValueError("Cannot send email: missing recipient address.")

    service = _get_service(creds)

    message = MIMEText(body)
    message["to"] = to.strip()
    message["subject"] = subject.strip() if subject else "(no subject)"

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

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


def search_messages(creds: Credentials, query: str, max_results: int = 5) -> list[dict]:
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
            headers = msg.get("payload", {}).get("headers", [])
            label_ids = msg.get("labelIds", [])
            body_text = _decode_body(msg.get("payload", {}))

            matched.append(
                {
                    "id": msg["id"],
                    "thread_id": msg.get("threadId", ""),
                    "from": _get_header(headers, "From"),
                    "subject": _get_header(headers, "Subject") or "(no subject)",
                    "snippet": msg.get("snippet", ""),
                    "date": _get_header(headers, "Date"),
                    "is_unread": "UNREAD" in label_ids,
                    "body_preview": _summarise_body(body_text),
                }
            )
        except Exception:
            continue

    return matched


def archive_message(creds: Credentials, msg_id: str) -> bool:
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


def trash_message(creds: Credentials, msg_id: str) -> bool:
    if not msg_id:
        raise ValueError("Cannot delete: missing message ID.")

    service = _get_service(creds)
    try:
        service.users().messages().trash(userId="me", id=msg_id).execute()
        return True
    except Exception as e:
        raise RuntimeError(f"Failed to trash email: {e}")


def mark_as_read(creds: Credentials, msg_id: str) -> bool:
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


def toggle_star(creds: Credentials, msg_id: str, star: bool = True) -> bool:
    if not msg_id:
        raise ValueError("Cannot toggle star: missing message ID.")

    service = _get_service(creds)
    body = {"addLabelIds": ["STARRED"]} if star else {"removeLabelIds": ["STARRED"]}

    try:
        service.users().messages().modify(userId="me", id=msg_id, body=body).execute()
        return True
    except Exception as e:
        raise RuntimeError(f"Failed to toggle star: {e}")


def get_message(creds: Credentials, msg_id: str) -> dict:
    if not msg_id:
        raise ValueError("Cannot fetch email: missing message ID.")

    service = _get_service(creds)
    try:
        msg = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
        headers = msg.get("payload", {}).get("headers", [])
        msg_labels = msg.get("labelIds", [])
        body_text, body_html = _extract_body_parts(msg.get("payload", {}))

        return {
            "id": msg["id"],
            "thread_id": msg.get("threadId", ""),
            "from": _get_header(headers, "From"),
            "to": _get_header(headers, "To"),
            "subject": _get_header(headers, "Subject") or "(no subject)",
            "date": _get_header(headers, "Date"),
            "snippet": msg.get("snippet", ""),
            "is_unread": "UNREAD" in msg_labels,
            "is_starred": "STARRED" in msg_labels,
            "body": body_text,
            "body_html": body_html,
            "labels": msg_labels,
        }
    except Exception as e:
        raise RuntimeError(f"Failed to fetch email detail: {e}")
