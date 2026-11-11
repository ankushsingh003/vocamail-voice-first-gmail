import re
from datetime import datetime, timedelta, timezone
import urllib.parse
import config

ZOOM_REGEX = re.compile(r"https://[\w.-]*zoom\.us/(?:j/|my/|wc/)[a-zA-Z0-9?=&._-]+", re.IGNORECASE)
MEET_REGEX = re.compile(r"https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}", re.IGNORECASE)
TEAMS_REGEX = re.compile(r"https://teams\.microsoft\.com/l/meetup-join/[a-zA-Z0-9%?=&._-]+", re.IGNORECASE)

CURRENCY_REGEX = re.compile(r"(?:due|invoice|total|amount|bill|pay(?:ment)?|charge)[^\n\r$€£₹]{0,35}([\$€£₹]\s*[0-9]+(?:\.[0-9]{2})?)|([\$€£₹]\s*[0-9]+(?:\.[0-9]{2})?)[^\n\r]{0,35}(?:due|invoice|payable|by|before)", re.IGNORECASE)
DUE_DATE_REGEX = re.compile(r"(?:due|by|before|date:?)\s*(?:on\s+)?([A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?|\d{1,2}/\d{1,2}(?:/\d{2,4})?)", re.IGNORECASE)
MEETING_TIME_REGEX = re.compile(r"\b((?:mon|tues|wednes|thurs|fri|satur|sun)day|tomorrow|today|tonight)\b(?:\s+(?:at|around)\s+|\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s*(?:ist|est|pst|gmt|utc|cst|edt|pdt))?)\b", re.IGNORECASE)


def extract_meeting_link(text: str) -> dict | None:
    if not text:
        return None
    zoom_match = ZOOM_REGEX.search(text)
    if zoom_match:
        return {"platform": "Zoom", "url": zoom_match.group(0)}

    meet_match = MEET_REGEX.search(text)
    if meet_match:
        return {"platform": "Google Meet", "url": meet_match.group(0)}

    teams_match = TEAMS_REGEX.search(text)
    if teams_match:
        return {"platform": "Teams", "url": teams_match.group(0)}

    return None


def extract_invoice_info(text: str) -> dict | None:
    if not text:
        return None

    cur_match = CURRENCY_REGEX.search(text)
    if not cur_match:
        if "invoice" not in text.lower() and "receipt" not in text.lower() and "due" not in text.lower():
            return None

    amount = None
    if cur_match:
        amount = (cur_match.group(1) or cur_match.group(2) or "").strip()

    due_match = DUE_DATE_REGEX.search(text)
    due_date = due_match.group(1).strip() if due_match else None

    if amount or due_date:
        return {
            "amount": amount or "Amount specified in email",
            "due_date": due_date or "Check email for date",
        }
    return None


def extract_meeting_proposal(text: str) -> dict | None:
    if not text:
        return None

    match = MEETING_TIME_REGEX.search(text)
    if match:
        day_str = match.group(1)
        time_str = match.group(2) if match.group(2) else ""
        return {
            "date_str": f"{day_str.capitalize()} at {time_str}".strip(),
            "time_raw": time_str,
        }
    return None


def build_google_calendar_url(title: str, date_str: str = "", details: str = "", location: str = "") -> str:
    base = "https://calendar.google.com/calendar/render?action=TEMPLATE"
    params = {
        "text": title or "Meeting from Email",
        "details": details or "",
        "location": location or "",
    }

    now = datetime.now(timezone.utc) + timedelta(days=1)
    start_str = now.strftime("%Y%m%dT100000Z")
    end_str = (now + timedelta(hours=1)).strftime("%Y%m%dT110000Z")
    params["dates"] = f"{start_str}/{end_str}"

    return f"{base}&{urllib.parse.urlencode(params)}"


def detect_all_action_items(subject: str = "", sender: str = "", body: str = "") -> dict:
    combined_text = f"{subject}\n{body}"

    link_info = extract_meeting_link(combined_text)
    invoice_info = extract_invoice_info(combined_text)
    meeting_proposal = extract_meeting_proposal(combined_text)

    cal_title = subject if subject else f"Meeting with {sender.split('<')[0].strip()}"
    cal_url = build_google_calendar_url(
        title=cal_title,
        date_str=meeting_proposal.get("date_str") if meeting_proposal else "",
        details=f"From: {sender}\n\n{body[:300]}",
        location=link_info.get("url") if link_info else "",
    )

    result = {
        "meeting": {
            "detected": bool(meeting_proposal or link_info),
            "date_str": meeting_proposal.get("date_str") if meeting_proposal else ("Meeting proposed" if link_info else None),
            "calendar_url": cal_url,
        },
        "invoice": {
            "detected": bool(invoice_info),
            "amount": invoice_info.get("amount") if invoice_info else None,
            "due_date": invoice_info.get("due_date") if invoice_info else None,
        },
        "meeting_link": link_info,
    }

    if config.OPENAI_API_KEY and (meeting_proposal or invoice_info or link_info or "meet" in combined_text.lower() or "invoice" in combined_text.lower() or "due" in combined_text.lower()):
        try:
            import openai
            import json as json_lib
            client = openai.OpenAI(api_key=config.OPENAI_API_KEY)
            prompt = (
                "Analyze this email snippet and extract action items into JSON with keys: "
                "\"meeting_proposed\": boolean, "
                "\"meeting_time\": string or null (e.g., 'Friday at 4:00 PM IST'), "
                "\"invoice_detected\": boolean, "
                "\"invoice_amount\": string or null (e.g., '$45.00'), "
                "\"invoice_due_date\": string or null (e.g., 'Nov 15'), "
                "\"meeting_link_url\": string or null, "
                "\"meeting_link_platform\": string or null (Zoom, Google Meet, Teams). "
                "Return ONLY valid JSON."
            )
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Subject: {subject}\nFrom: {sender}\nBody: {body[:800]}"},
                ],
                max_tokens=300,
                temperature=0.2,
            )
            raw = response.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\n?", "", raw)
                raw = re.sub(r"\n?```$", "", raw)
            ai_data = json_lib.loads(raw)

            if ai_data.get("meeting_proposed") and ai_data.get("meeting_time"):
                result["meeting"]["detected"] = True
                result["meeting"]["date_str"] = ai_data.get("meeting_time")
                result["meeting"]["calendar_url"] = build_google_calendar_url(
                    title=cal_title,
                    date_str=ai_data.get("meeting_time"),
                    details=f"From: {sender}\n\n{body[:300]}",
                    location=ai_data.get("meeting_link_url") or (link_info.get("url") if link_info else ""),
                )

            if ai_data.get("invoice_detected"):
                result["invoice"]["detected"] = True
                if ai_data.get("invoice_amount"):
                    result["invoice"]["amount"] = ai_data.get("invoice_amount")
                if ai_data.get("invoice_due_date"):
                    result["invoice"]["due_date"] = ai_data.get("invoice_due_date")

            if ai_data.get("meeting_link_url"):
                result["meeting_link"] = {
                    "platform": ai_data.get("meeting_link_platform") or "Meeting",
                    "url": ai_data.get("meeting_link_url"),
                }
        except Exception:
            pass

    return result
