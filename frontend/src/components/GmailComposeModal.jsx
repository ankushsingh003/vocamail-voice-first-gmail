import React, { useState, useEffect } from "react";
import "./GmailComposeModal.css";

export default function GmailComposeModal({
  isOpen = false,
  initialDraft = null,
  draft = null,
  onDraftChange = null,
  isSending = false,
  onClose,
  onSend,
  onVoiceDictate,
  isVoiceActive = false,
}) {
  const currentDraft = draft || initialDraft || { to: "", subject: "", body: "" };
  const [localTo, setLocalTo] = useState(currentDraft.to || "");
  const [localSubject, setLocalSubject] = useState(currentDraft.subject || "");
  const [localBody, setLocalBody] = useState(currentDraft.body || "");
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const src = draft || initialDraft;
    if (src) {
      setLocalTo(src.to || "");
      setLocalSubject(src.subject || "");
      setLocalBody(src.body || "");
    }
  }, [draft, initialDraft]);

  if (!isOpen) return null;

  const to = draft ? (draft.to ?? localTo) : localTo;
  const subject = draft ? (draft.subject ?? localSubject) : localSubject;
  const body = draft ? (draft.body ?? localBody) : localBody;

  function handleToChange(val) {
    setLocalTo(val);
    if (onDraftChange) onDraftChange({ to: val, subject, body });
  }

  function handleSubjectChange(val) {
    setLocalSubject(val);
    if (onDraftChange) onDraftChange({ to, subject: val, body });
  }

  function handleBodyChange(val) {
    setLocalBody(val);
    if (onDraftChange) onDraftChange({ to, subject, body: val });
  }

  function handleFormSubmit(e) {
    if (e) e.preventDefault();
    if (!to.trim()) {
      alert("Please specify at least one recipient in the 'To' field.");
      return;
    }
    if (onSend) {
      onSend({ to: to.trim(), subject: subject.trim(), body: body.trim() });
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleFormSubmit();
    }
  }

  return (
    <aside
      className={`gmail-compose-window ${isMinimized ? "minimized" : ""}`}
      role="dialog"
      aria-label="New Message Dialog"
      onKeyDown={handleKeyDown}
    >
      {}
      <header
        className="compose-header"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <span className="compose-header-title">
          {subject ? subject : "New Message"}
        </span>

        <div className="compose-header-actions" onClick={(e) => e.stopPropagation()}>
          {}
          <button
            type="button"
            className="compose-tool-btn"
            title={isMinimized ? "Maximize" : "Minimize"}
            aria-label={isMinimized ? "Maximize draft window" : "Minimize draft window"}
            onClick={() => setIsMinimized((prev) => !prev)}
          >
            {isMinimized ? "🗖" : "—"}
          </button>

          {}
          <button
            type="button"
            className="compose-tool-btn"
            title="Save & close"
            aria-label="Close compose window"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </header>

      {}
      {!isMinimized && (
        <>
          {}
          <div className="compose-voice-helper" role="region" aria-label="Voice compose helper">
            <div className="compose-voice-helper-left">
              <span>🎙️ Voice Compose</span>
              <span style={{ color: "#5e5e5e", fontWeight: "normal" }}>
                Say "write an email to..." or speak your draft
              </span>
            </div>
            {onVoiceDictate && (
              <button
                type="button"
                className={`compose-voice-btn-pill ${isVoiceActive ? "recording" : ""}`}
                onClick={onVoiceDictate}
                aria-label="Dictate message with voice"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                {isVoiceActive ? "Listening..." : "Dictate"}
              </button>
            )}
          </div>

          {}
          <div className="compose-field-row">
            <label htmlFor="compose-to" className="compose-field-label">
              To
            </label>
            <input
              id="compose-to"
              type="email"
              className="compose-input"
              placeholder="Recipients"
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              autoFocus
            />
          </div>

          {}
          <div className="compose-field-row">
            <label htmlFor="compose-subject" className="compose-field-label">
              Subject
            </label>
            <input
              id="compose-subject"
              type="text"
              className="compose-input"
              placeholder="Subject"
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
            />
          </div>

          {}
          <div className="compose-body-area">
            <textarea
              id="compose-body"
              className="compose-textarea"
              placeholder="Compose your email here (or use voice)..."
              value={body}
              onChange={(e) => handleBodyChange(e.target.value)}
              aria-label="Email message body"
            />
          </div>

          {}
          <footer className="compose-footer">
            <div className="compose-footer-left">
              <div className="compose-send-group">
                <button
                  type="button"
                  className="compose-send-btn"
                  onClick={handleFormSubmit}
                  disabled={isSending || !to.trim()}
                  aria-label="Send email"
                >
                  {isSending ? (
                    "Sending..."
                  ) : (
                    <>
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>

              {}
              <div className="compose-footer-tools" aria-label="Formatting options">
                <button
                  type="button"
                  className="compose-tool-btn"
                  title="Formatting options"
                  aria-label="Formatting options"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="compose-tool-btn"
                  title="Attach files"
                  aria-label="Attach files"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="compose-tool-btn"
                  title="Insert emoji"
                  aria-label="Insert emoji"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                  </svg>
                </button>
              </div>
            </div>

            {}
            <div className="compose-footer-right">
              <button
                type="button"
                className="compose-tool-btn"
                title="Discard draft"
                aria-label="Discard draft"
                onClick={onClose}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13z" />
                </svg>
              </button>
            </div>
          </footer>
        </>
      )}
    </aside>
  );
}
