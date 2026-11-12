import re
import logging
import config

logger = logging.getLogger(__name__)

QUESTION_STARTERS = re.compile(
    r"^(what|who|when|where|why|how|which|did|does|do|was|is|are|can|could|tell\s+me|find\s+out|check\s+if)\b",
    re.IGNORECASE
)

INTENT_KEYWORDS = re.compile(
    r"\b("
    r"flight\s*number|flight|flights|airline|ticket|tickets|boarding\s*pass|"
    r"what\s+time|departure|arrival|due\s+date|how\s+much|tracking\s*number|tracking|"
    r"reservation|confirmation\s*code|internship|assignment|contract|lawyer|attorney|"
    r"hotel|booking|receipt|deadline|password\s*reset|verification\s*code|otp"
    r")\b",
    re.IGNORECASE
)

STOPWORDS = {
    "what", "was", "the", "for", "my", "me", "about", "did", "say", "is", "a", "an",
    "please", "can", "you", "tell", "show", "who", "when", "where", "why", "how",
    "which", "does", "do", "are", "i", "have", "had", "any", "to", "from", "in",
    "on", "at", "with", "by", "of", "and", "or", "that", "this", "there", "it"
}

SYNONYMS = [
    (re.compile(r"\b(flight|fly|airline|plane|ticket)\b", re.I), "(flight OR airline OR booking OR ticket OR reservation)"),
    (re.compile(r"\b(hotel|stay|room|airbnb)\b", re.I), "(hotel OR reservation OR booking OR check-in)"),
    (re.compile(r"\b(contract|agreement|legal|lawyer|attorney)\b", re.I), "(contract OR agreement OR legal OR lawyer OR deadline)"),
    (re.compile(r"\b(internship|assignment|intern|interview)\b", re.I), "(internship OR assignment OR interview OR offer)"),
    (re.compile(r"\b(invoice|bill|receipt|payment|charge)\b", re.I), "(invoice OR receipt OR bill OR payment)"),
    (re.compile(r"\b(tracking|package|shipment|delivery|order)\b", re.I), "(tracking OR shipment OR delivery OR order OR shipped)"),
]


def is_conversational_query(q: str) -> bool:
    if not q:
        return False
    q_str = q.strip()
    if q_str.endswith("?"):
        return True
    if QUESTION_STARTERS.search(q_str):
        return True
    if INTENT_KEYWORDS.search(q_str) and len(q_str.split()) >= 3:
        return True
    return False


def expand_search_query(q: str) -> str:
    if not q:
        return ""
    q_str = q.strip()
    tokens = [w for w in re.findall(r"\b[a-zA-Z0-9_-]+\b", q_str) if w.lower() not in STOPWORDS]
    expansions = []
    used_tokens = set()
    for pattern, group in SYNONYMS:
        if pattern.search(q_str):
            expansions.append(group)
            for m in pattern.findall(q_str):
                used_tokens.add(m.lower())
    remaining = [t for t in tokens if t.lower() not in used_tokens]
    final_parts = remaining + expansions
    return " ".join(final_parts) if final_parts else q_str


def _extract_deterministic_answer(query: str, emails: list) -> dict:
    if not emails:
        return {
            "has_answer": False,
            "answer": "I searched your recent emails but could not find information regarding that.",
            "citation": None,
            "source_text": None,
        }

    q_lower = query.lower()

    for em in emails:
        text = f"{em.get('subject', '')} {em.get('snippet', '')} {em.get('body', '')}"
        subj = em.get("subject", "Email")
        sender = (em.get("from") or em.get("sender") or "Unknown").split("<")[0].strip()
        date = em.get("date", "recent")

        if any(w in q_lower for w in ["flight", "airline", "ticket", "trip", "mumbai"]):
            fl_match = re.search(r"\b([A-Z0-9]{2,3}\s*\d{3,4})\b", text)
            time_match = re.search(r"\b(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)\b", text)
            term_match = re.search(r"\b(Terminal\s*\d+)\b", text, re.I)
            if fl_match:
                fl = fl_match.group(1)
                t_str = f" departing at {time_match.group(1)}" if time_match else ""
                term_str = f" from {term_match.group(1)}" if term_match else ""
                answer = f"Your flight is {fl}{t_str}{term_str}."
                source_text = f"Source: {subj}, {date}"
                return {
                    "has_answer": True,
                    "answer": f"{answer} ({source_text})",
                    "citation": {
                        "id": em.get("id"),
                        "subject": subj,
                        "sender": sender,
                        "date": date,
                        "snippet": em.get("snippet", ""),
                    },
                    "source_text": source_text,
                }

        if any(w in q_lower for w in ["internship", "assignment", "interview", "offer", "job"]):
            if any(w in text.lower() for w in ["internship", "assignment", "interview", "offer"]):
                snip = (em.get("snippet") or em.get("body", "")[:120]).strip()
                answer = f"{sender} emailed regarding \"{subj}\": {snip}"
                source_text = f"Source: {subj}, {date}"
                return {
                    "has_answer": True,
                    "answer": f"{answer} ({source_text})",
                    "citation": {
                        "id": em.get("id"),
                        "subject": subj,
                        "sender": sender,
                        "date": date,
                        "snippet": em.get("snippet", ""),
                    },
                    "source_text": source_text,
                }

        if any(w in q_lower for w in ["contract", "deadline", "lawyer", "agreement", "due"]):
            due_match = re.search(
                r"(?:due|deadline|by|before)\s+(?:on\s+)?([A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)",
                text,
                re.I
            )
            if due_match:
                answer = f"The deadline mentioned in \"{subj}\" is {due_match.group(1)}."
                source_text = f"Source: {subj}, {date}"
                return {
                    "has_answer": True,
                    "answer": f"{answer} ({source_text})",
                    "citation": {
                        "id": em.get("id"),
                        "subject": subj,
                        "sender": sender,
                        "date": date,
                        "snippet": em.get("snippet", ""),
                    },
                    "source_text": source_text,
                }

    top = emails[0]
    top_subj = top.get("subject", "Email")
    top_sender = (top.get("from") or top.get("sender") or "Unknown").split("<")[0].strip()
    top_date = top.get("date", "recent")
    top_text = (top.get("snippet") or top.get("body", "")[:120]).strip()
    source_text = f"Source: {top_subj}, {top_date}"
    answer = f"Found email from {top_sender} regarding \"{top_subj}\": {top_text}"
    return {
        "has_answer": True,
        "answer": f"{answer} ({source_text})",
        "citation": {
            "id": top.get("id"),
            "subject": top_subj,
            "sender": top_sender,
            "date": top_date,
            "snippet": top.get("snippet", ""),
        },
        "source_text": source_text,
    }


def synthesize_inbox_rag(query: str, emails: list) -> dict:
    if not emails:
        return {
            "has_answer": False,
            "answer": "I searched your recent emails but could not find information regarding that.",
            "citation": None,
            "source_text": None,
        }

    email_contexts = []
    for i, em in enumerate(emails[:6], 1):
        subj = em.get("subject", "No subject")
        sender = em.get("from") or em.get("sender") or "Unknown"
        date = em.get("date", "")
        snip = em.get("snippet") or em.get("body", "")[:300]
        email_contexts.append(
            f"Email #{i} [ID: {em.get('id', '')}]:\nFrom: {sender}\nDate: {date}\nSubject: {subj}\nContent: {snip}\n"
        )
    context_str = "\n".join(email_contexts)

    try:
        import openai
        client = openai.OpenAI(api_key=config.OPENAI_API_KEY)
        prompt = (
            "You are VocaMail Inbox RAG Assistant. Your job is to answer the user's specific question "
            "directly using ONLY facts found in the provided emails.\n\n"
            "INSTRUCTIONS:\n"
            "1. Answer concisely in 1-2 direct sentences.\n"
            "2. Cite the exact source email with '(Source: <Subject>, <Date>)'. Example:\n"
            "   'Your flight is AI 805 departing at 6:45 AM from Terminal 2 (Source: Air India Booking Confirmation, Oct 28).'\n"
            "3. If the emails do not contain enough facts to answer, reply: 'I could not find an answer in your recent emails regarding that.'\n"
            "4. Never invent details.\n\n"
            f"EMAILS CONTEXT:\n{context_str}\n\n"
            f"USER QUESTION: {query}"
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a factual inbox search assistant. Always include (Source: <Subject>, <Date>)."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.2,
        )
        answer = response.choices[0].message.content.strip()

        source_match = re.search(r"\(Source:\s*([^,]+),\s*([^)]+)\)", answer)
        citation = None
        source_text = None
        if source_match:
            matched_subj = source_match.group(1).strip()
            source_text = f"Source: {matched_subj}, {source_match.group(2).strip()}"
            for em in emails:
                if matched_subj.lower() in em.get("subject", "").lower() or em.get("subject", "").lower() in matched_subj.lower():
                    citation = {
                        "id": em.get("id"),
                        "subject": em.get("subject"),
                        "sender": (em.get("from") or em.get("sender") or "").split("<")[0].strip(),
                        "date": em.get("date"),
                        "snippet": em.get("snippet", ""),
                    }
                    break
        if not citation and emails:
            top = emails[0]
            citation = {
                "id": top.get("id"),
                "subject": top.get("subject"),
                "sender": (top.get("from") or top.get("sender") or "").split("<")[0].strip(),
                "date": top.get("date"),
                "snippet": top.get("snippet", ""),
            }

        return {
            "has_answer": "could not find" not in answer.lower(),
            "answer": answer,
            "citation": citation,
            "source_text": source_text,
        }
    except Exception as e:
        logger.warning(f"[VocaMail RAG] OpenAI failed, using deterministic fallback: {e}")
        return _extract_deterministic_answer(query, emails)

