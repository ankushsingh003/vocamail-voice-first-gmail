import React, { useState, useEffect } from "react";
import "./GmailDetailView.css";

const TONE_META = {
  accept: { emoji: "🟢", color: "accept" },
  reschedule: { emoji: "🟡", color: "reschedule" },
  decline: { emoji: "🔴", color: "decline" },
};

function detectClientActionItems(email) {
  if (!email) return null;
  const text = `${email.subject || ""} ${email.body || email.body_preview || email.snippet || ""}`;
  const zoom = text.match(/https:\/\/[\w.-]*zoom\.us\/(?:j\/|my\/|wc\/)[\w?=&.-]+/i);
  const meet = text.match(/https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i);
  const teams = text.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[\w%?=&.-]+/i);
  let meetingLink = null;
  if (zoom) meetingLink = { platform: "Zoom", url: zoom[0] };
  else if (meet) meetingLink = { platform: "Google Meet", url: meet[0] };
  else if (teams) meetingLink = { platform: "Teams", url: teams[0] };

  const curMatch = text.match(/(?:due|invoice|total|amount|bill|pay(?:ment)?|charge)[^\n\r$€£₹]{0,35}([\$€£₹]\s*[0-9]+(?:\.[0-9]{2})?)|([\$€£₹]\s*[0-9]+(?:\.[0-9]{2})?)[^\n\r]{0,35}(?:due|invoice|payable|by|before)/i);
  const dueMatch = text.match(/(?:due|by|before|date:?)\s*(?:on\s+)?([A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
  const meetTimeMatch = text.match(/\b((?:mon|tues|wednes|thurs|fri|satur|sun)day|tomorrow|today|tonight)\b(?:\s+(?:at|around)\s+|\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s*(?:ist|est|pst|gmt|utc|cst|edt|pdt))?)\b/i);

  const title = encodeURIComponent(email.subject || "Meeting");
  const loc = encodeURIComponent(meetingLink ? meetingLink.url : "");
  const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${loc}`;

  return {
    meeting: {
      detected: Boolean(meetTimeMatch || meetingLink),
      date_str: meetTimeMatch ? `${meetTimeMatch[1]} at ${meetTimeMatch[2]}`.trim() : (meetingLink ? "Meeting proposed" : null),
      calendar_url: calUrl,
    },
    invoice: {
      detected: Boolean(curMatch || dueMatch),
      amount: curMatch ? (curMatch[1] || curMatch[2]) : null,
      due_date: dueMatch ? dueMatch[1] : null,
    },
    meeting_link: meetingLink,
  };
}

function cleanPlainTextBody(rawText) {
  if (!rawText) return "";
  const text = rawText
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0|&nbsp;/g, " ");
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd());
  const cleanedLines = [];
  let prevBlank = false;
  for (const line of lines) {
    if (!line.trim()) {
      if (!prevBlank && cleanedLines.length > 0) {
        cleanedLines.push("");
        prevBlank = true;
      }
    } else {
      cleanedLines.push(line);
      prevBlank = false;
    }
  }
  return cleanedLines.join("\n").trim();
}

export default function GmailDetailView({
  email,
  onBack,
  onArchive,
  onTrash,
  onMarkRead,
  onToggleStar,
  onReply,
  onForward,
  onVoiceRead,
  onSmartReplyDraft,
  isNarrating = false,
}) {
  const [smartReplies, setSmartReplies] = useState(null);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [voiceInstruction, setVoiceInstruction] = useState("");
  const [isDraftingVoice, setIsDraftingVoice] = useState(false);
  const [activePill, setActivePill] = useState(null);

  const [actionItems, setActionItems] = useState(null);
  const [reminderSet, setReminderSet] = useState(false);
  const [reminderToast, setReminderToast] = useState(null);
  const [viewMode, setViewMode] = useState("rich");

  useEffect(() => {
    setViewMode(email?.body_html ? "rich" : "plain");
  }, [email?.id, email?.body_html]);

  useEffect(() => {
    setSmartReplies(null);
    setActivePill(null);
    setVoiceInstruction("");
    setReminderSet(false);
    setReminderToast(null);

    if (!email) {
      setActionItems(null);
      return;
    }

    if (email.actions) {
      setActionItems(email.actions);
    } else {
      const clientDetected = detectClientActionItems(email);
      setActionItems(clientDetected);

      fetch("/api/detect-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: email.subject || "",
          sender: email.sender || "",
          body: email.body || email.body_preview || email.snippet || "",
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.actions) setActionItems(d.actions);
        })
        .catch(() => {});
    }
  }, [email?.id]);

  async function loadSmartReplies() {
    if (!email) return;
    setIsLoadingReplies(true);
    try {
      const res = await fetch("/api/smart-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: email.subject || "",
          body: email.body || email.body_preview || email.snippet || "",
          sender: email.sender || "",
        }),
      });
      const data = await res.json();
      if (data.ok) setSmartReplies(data.suggestions);
    } catch (err) {
      console.error("[VocaMail] Smart replies error:", err);
    } finally {
      setIsLoadingReplies(false);
    }
  }

  function handlePillClick(suggestion) {
    setActivePill(suggestion.tone);
    if (onSmartReplyDraft) {
      onSmartReplyDraft({
        to: email.sender || "",
        subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ""}`,
        body: suggestion.body,
      });
    }
  }

  async function handleVoiceDraft() {
    if (!voiceInstruction.trim()) return;
    setIsDraftingVoice(true);
    try {
      const res = await fetch("/api/ai-draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: email.subject || "",
          body: email.body || email.body_preview || email.snippet || "",
          sender: email.sender || "",
          instruction: voiceInstruction.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok && data.draft && onSmartReplyDraft) {
        onSmartReplyDraft(data.draft);
        setVoiceInstruction("");
      }
    } catch (err) {
      console.error("[VocaMail] AI draft error:", err);
    } finally {
      setIsDraftingVoice(false);
    }
  }

  function handleSetReminder() {
    setReminderSet(true);
    const invoiceDesc = actionItems?.invoice?.due_date
      ? `Reminder set for ${actionItems.invoice.due_date}`
      : "Reminder queued in Copilot Workspace";
    setReminderToast(invoiceDesc);
    setTimeout(() => setReminderToast(null), 4000);
  }

  if (!email) {
    return (
      <div className="gmail-detail-pane">
        <div style={{ padding: "40px", textAlign: "center", color: "#5e5e5e" }}>
          No email selected.
        </div>
      </div>
    );
  }

  const senderName = email.sender || "Unknown";
  const avatarLetter = (senderName.charAt(0) || "U").toUpperCase();
  const hasAnyAction = actionItems && (actionItems.meeting?.detected || actionItems.invoice?.detected || actionItems.meeting_link);

  return (
    <article className="gmail-detail-pane" aria-label={`Email from ${senderName}: ${email.subject}`}>
      <nav className="detail-toolbar" aria-label="Email toolbar">
        <div className="detail-toolbar-left">
          <button
            type="button"
            className="toolbar-icon-btn"
            title="Back to inbox"
            aria-label="Back to inbox"
            onClick={onBack}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>

          <span className="detail-toolbar-sep" aria-hidden="true" />

          <button
            type="button"
            className="toolbar-icon-btn"
            title="Archive"
            aria-label="Archive email"
            onClick={() => onArchive && onArchive(email.id)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.83 1H5.42l.82-1zM5 19V8h14v11H5zm11-5.5l-4 4-4-4 1.41-1.41L11 13.67V10h2v3.67l1.59-1.59L16 13.5z" />
            </svg>
          </button>

          <button
            type="button"
            className="toolbar-icon-btn"
            title="Delete"
            aria-label="Delete email"
            onClick={() => onTrash && onTrash(email.id)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>

          <button
            type="button"
            className="toolbar-icon-btn"
            title="Mark as unread"
            aria-label="Mark email as unread"
            onClick={() => onMarkRead && onMarkRead(email.id)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </button>
        </div>

        <div className="detail-toolbar-right">
          <button
            type="button"
            className="toolbar-icon-btn"
            title={email.is_starred ? "Starred" : "Not starred"}
            aria-label={email.is_starred ? "Unstar email" : "Star email"}
            onClick={() => onToggleStar && onToggleStar(email.id, email.is_starred)}
          >
            {email.is_starred ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#f4b400">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      <div className="voice-read-bar" role="region" aria-label="Voice reading controls">
        <div className="voice-read-info">
          <span className="voice-pulsing-dot" aria-hidden="true" />
          <span>
            {isNarrating
              ? "VocaMail Voice is reading this email aloud..."
              : "Voice Narration ready (say 'read this email' or press Listen)"}
          </span>
        </div>
        <button
          type="button"
          className={`voice-read-action-btn ${isNarrating ? "active" : ""}`}
          onClick={() => onVoiceRead && onVoiceRead(email)}
          aria-label={isNarrating ? "Stop voice narration" : "Listen to this email out loud"}
        >
          {isNarrating ? (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M6 6h12v12H6z" />
              </svg>
              <span>Stop Reading</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              <span>Listen to Email</span>
            </>
          )}
        </button>
      </div>

      <header className="detail-header-subject">
        <h1 className="detail-subject-text">
          {email.subject || "(no subject)"}
          <span className="detail-tag-inbox">Inbox</span>
        </h1>
      </header>

      <div className="detail-meta">
        <div className="detail-meta-left">
          <div className="detail-avatar" aria-hidden="true">
            {avatarLetter}
          </div>
          <div className="detail-sender-lines">
            <div className="detail-sender-top">
              <span className="detail-sender-name">{senderName}</span>
              <span className="detail-sender-email">&lt;{email.sender}&gt;</span>
            </div>
            <div className="detail-to-me">to me ▾</div>
          </div>
        </div>

        <div className="detail-meta-right">
          <time className="detail-date">{email.date || ""}</time>
          <button
            type="button"
            className="toolbar-icon-btn"
            title="Reply"
            aria-label="Reply to sender"
            onClick={() => onReply && onReply(email)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
            </svg>
          </button>
        </div>
      </div>

      {hasAnyAction && (
        <div className="action-items-card" role="region" aria-label="Action Items Detected">
          <div className="action-items-header">
            <div className="action-items-title">
              <span className="action-sparkle-icon">✨</span>
              <span>Action Items Detected</span>
            </div>
            {reminderToast && (
              <span className="action-reminder-toast">{reminderToast}</span>
            )}
          </div>
          <div className="action-items-list">
            {actionItems.meeting?.detected && (
              <div className="action-item-row">
                <div className="action-item-info">
                  <span className="action-item-icon">🕒</span>
                  <div className="action-item-text">
                    <span className="action-item-label">Meeting Proposed:</span>
                    <span className="action-item-detail">{actionItems.meeting.date_str || "Review proposal"}</span>
                  </div>
                </div>
                <a
                  href={actionItems.meeting.calendar_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn calendar-btn"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Add to Google Calendar
                </a>
              </div>
            )}

            {actionItems.invoice?.detected && (
              <div className="action-item-row">
                <div className="action-item-info">
                  <span className="action-item-icon">📄</span>
                  <div className="action-item-text">
                    <span className="action-item-label">Invoice Due:</span>
                    <span className="action-item-detail">
                      {actionItems.invoice.due_date ? `${actionItems.invoice.due_date}` : "Due soon"}
                      {actionItems.invoice.amount ? ` (${actionItems.invoice.amount})` : ""}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`action-btn reminder-btn ${reminderSet ? "set" : ""}`}
                  onClick={handleSetReminder}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {reminderSet ? "Reminder Set" : "Set Reminder"}
                </button>
              </div>
            )}

            {actionItems.meeting_link && (
              <div className="action-item-row">
                <div className="action-item-info">
                  <span className="action-item-icon">🔗</span>
                  <div className="action-item-text">
                    <span className="action-item-label">{actionItems.meeting_link.platform} Link:</span>
                    <span className="action-item-detail truncate">{actionItems.meeting_link.url}</span>
                  </div>
                </div>
                <a
                  href={actionItems.meeting_link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn join-btn"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Join Meeting
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {email.body_html && (
        <div className="detail-view-toggle-bar">
          <button
            type="button"
            className={`detail-view-toggle-btn ${viewMode === "rich" ? "active" : ""}`}
            onClick={() => setViewMode("rich")}
            aria-label="View formatted email"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM11 7h2v10h-2V7zM7 11h10v2H7v-2z" />
            </svg>
            Formatted View
          </button>
          <button
            type="button"
            className={`detail-view-toggle-btn ${viewMode === "plain" ? "active" : ""}`}
            onClick={() => setViewMode("plain")}
            aria-label="View plain text email"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
            Plain Text
          </button>
        </div>
      )}

      {viewMode === "rich" && email.body_html ? (
        <div className="detail-html-wrap">
          <iframe
            title="Formatted email content"
            className="detail-html-frame"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            srcDoc={`<!DOCTYPE html><html><head><base target="_blank"><meta charset="utf-8"><style>html,body{margin:0;padding:16px 20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1f1f1f;background:#ffffff;word-break:break-word;}img{max-width:100%!important;height:auto!important;}table{max-width:100%!important;}</style></head><body>${email.body_html}</body></html>`}
            onLoad={(e) => {
              try {
                const frame = e.target;
                if (frame && frame.contentWindow && frame.contentWindow.document) {
                  const doc = frame.contentWindow.document;
                  const h = Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0);
                  if (h > 0) {
                    frame.style.height = `${h + 30}px`;
                  }
                }
              } catch (err) {}
            }}
          />
        </div>
      ) : (
        <section className="detail-body-card" tabIndex="0" aria-label="Email message body">
          {cleanPlainTextBody(
            (email.body && email.body.trim().length > 0)
              ? email.body
              : (email.body_preview && email.body_preview.trim().length > 0)
                ? email.body_preview
                : email.snippet || "(No content)"
          )}
        </section>
      )}

      <div className="smart-reply-section" role="region" aria-label="AI Smart Replies">
        <div className="smart-reply-header">
          <div className="smart-reply-header-left">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#0b57d0">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" />
            </svg>
            <span>AI Smart Replies</span>
          </div>
          {!smartReplies && (
            <button
              type="button"
              className="smart-reply-load-btn"
              onClick={loadSmartReplies}
              disabled={isLoadingReplies}
              aria-label="Generate smart reply suggestions"
            >
              {isLoadingReplies ? (
                <span className="smart-reply-spinner" aria-hidden="true" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                  </svg>
                  Generate Suggestions
                </>
              )}
            </button>
          )}
          {smartReplies && (
            <button
              type="button"
              className="smart-reply-load-btn smart-reply-refresh"
              onClick={loadSmartReplies}
              disabled={isLoadingReplies}
              aria-label="Refresh smart reply suggestions"
            >
              {isLoadingReplies ? <span className="smart-reply-spinner" aria-hidden="true" /> : "↻ Refresh"}
            </button>
          )}
        </div>

        {smartReplies && (
          <div className="smart-reply-pills" role="list">
            {smartReplies.map((s, i) => {
              const meta = TONE_META[s.tone] || { emoji: "💬", color: "accept" };
              return (
                <button
                  key={i}
                  type="button"
                  role="listitem"
                  className={`smart-reply-pill smart-reply-pill--${meta.color} ${activePill === s.tone ? "active" : ""}`}
                  onClick={() => handlePillClick(s)}
                  aria-label={`${s.label}: ${s.preview}`}
                  title={s.preview}
                >
                  <span className="pill-emoji" aria-hidden="true">{meta.emoji}</span>
                  <span className="pill-label">{s.label}</span>
                  <span className="pill-preview">{s.preview}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="smart-reply-voice-row">
          <div className="smart-reply-voice-input-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#5e5e5e" className="voice-input-icon">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <input
              type="text"
              className="smart-reply-voice-input"
              placeholder='Say what to reply, e.g. "I agree, ask for the Zoom link"'
              value={voiceInstruction}
              onChange={(e) => setVoiceInstruction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVoiceDraft()}
              aria-label="Custom reply instruction"
            />
          </div>
          <button
            type="button"
            className="smart-reply-draft-btn"
            onClick={handleVoiceDraft}
            disabled={isDraftingVoice || !voiceInstruction.trim()}
            aria-label="Draft reply from instruction"
          >
            {isDraftingVoice ? (
              <span className="smart-reply-spinner" aria-hidden="true" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                Draft Reply
              </>
            )}
          </button>
        </div>
      </div>

      <div className="detail-reply-row">
        <button
          type="button"
          className="quick-reply-btn"
          onClick={() => onReply && onReply(email)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
          </svg>
          Reply
        </button>

        <button
          type="button"
          className="quick-reply-btn"
          onClick={() => onForward && onForward(email)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" />
          </svg>
          Forward
        </button>
      </div>
    </article>
  );
}
