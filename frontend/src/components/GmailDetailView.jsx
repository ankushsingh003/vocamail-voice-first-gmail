/**
 * frontend/src/components/GmailDetailView.jsx — Authentic Gmail Email Detail / Reading View
 * =========================================================================================
 * Displays the full contents of an open email message:
 *
 * 1. Top action toolbar:
 *    - Back arrow: returns to the inbox list view.
 *    - Archive, Trash, Mark as unread buttons with authentic Gmail SVG icons.
 *
 * 2. Voice Narration Bar (Senior Developer Voice Function):
 *    - "🔊 Listen to Email" button: uses VocaMail voice synthesis to read the email aloud.
 *    - Real-time pulsating visual indicator showing speech status.
 *
 * 3. Email Header:
 *    - Large Google Sans subject line with an "Inbox" badge.
 *    - Circular sender avatar with initial.
 *    - Sender display name, email address, date, and "to me" tag.
 *
 * 4. Email Body:
 *    - Renders the full email body or fallback snippet clearly.
 *
 * 5. Quick Actions:
 *    - "Reply" and "Forward" pill buttons that automatically pop open the Compose Modal.
 */

import React from "react";
import "./GmailDetailView.css";

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
  isNarrating = false,
}) {
  if (!email) {
    return (
      <div className="gmail-detail-pane">
        <div style={{ padding: "40px", textAlign: "center", color: "#5e5e5e" }}>
          No email selected.
        </div>
      </div>
    );
  }

  // Derive initial letter for the circular sender avatar
  const senderName = email.sender || "Unknown";
  const avatarLetter = (senderName.charAt(0) || "U").toUpperCase();

  return (
    <article className="gmail-detail-pane" aria-label={`Email from ${senderName}: ${email.subject}`}>
      {/* 1. Top Action Toolbar */}
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

      {/* 2. Voice Narration Bar (Explicit Senior Developer Voice Function) */}
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

      {/* 3. Subject Header */}
      <header className="detail-header-subject">
        <h1 className="detail-subject-text">
          {email.subject || "(no subject)"}
          <span className="detail-tag-inbox">Inbox</span>
        </h1>
      </header>

      {/* 4. Sender Details */}
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

      {/* 5. Email Body Content */}
      <section className="detail-body-card" tabIndex="0" aria-label="Email message body">
        {(email.body && email.body.trim().length > 0)
          ? email.body
          : (email.body_preview && email.body_preview.trim().length > 0)
            ? email.body_preview
            : email.snippet || "(No content)"}
      </section>

      {/* 6. Quick Reply & Forward Pill Buttons */}
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
