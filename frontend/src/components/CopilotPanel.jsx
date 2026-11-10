import React, { useState } from "react";
import "./CopilotPanel.css";

export default function CopilotPanel({
  selectedEmail = null,
  onDraftReply = null,
  onOpenBriefing = null,
}) {
  const [chatInput, setChatInput] = useState("");
  const [automations, setAutomations] = useState([
    { id: "receipts", label: "Receipts, filed.", desc: "Label & archive receipts", enabled: true,
      icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
    { id: "followup", label: "Follow up, on time.", desc: "Remind me after 3 days", enabled: true,
      icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { id: "meetings", label: "Meetings, handled.", desc: "Draft replies to invitations", enabled: true,
      icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ]);

  function toggleAutomation(id) {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }

  const senderName = selectedEmail
    ? (selectedEmail.sender || selectedEmail.from || "").replace(/<[^>]+>/g, "").trim() || "someone"
    : null;

  return (
    <aside className="copilot-panel" role="complementary" aria-label="Your AI copilot">
      <div className="copilot-header">
        <div className="copilot-header-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#4f78e8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div>
          <div className="copilot-title">Your copilot</div>
          <div className="copilot-status">
            <span className="copilot-status-dot" />
            Ready when you are
          </div>
        </div>
      </div>

      {selectedEmail ? (
        <div className="copilot-section">
          <div className="copilot-section-label">NEXT BEST ACTION</div>
          <div className="copilot-action-card">
            <div className="action-card-title">
              {selectedEmail.subject ? `Re: ${selectedEmail.subject}` : "Reply to this email"}
            </div>
            <div className="action-card-desc">
              {senderName && `${senderName} is waiting for your reply.`}{" "}
              I can help you write a thoughtful response.
            </div>
            <button
              type="button"
              className="action-draft-btn"
              onClick={() => onDraftReply && onDraftReply(selectedEmail)}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Draft a reply
            </button>
          </div>
        </div>
      ) : (
        <div className="copilot-section">
          <div className="copilot-section-label">NEXT BEST ACTION</div>
          <div className="copilot-action-card copilot-no-email">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="#c7d7fa" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            <p>Select an email to see suggested actions</p>
          </div>
        </div>
      )}

      <div className="copilot-section">
        <div className="copilot-section-header">
          <div className="copilot-section-label">AUTOMATIONS</div>
          <span className="copilot-badge">{automations.filter((a) => a.enabled).length} active</span>
        </div>
        <p className="copilot-section-desc">Small routines. Big time back.</p>
        <div className="automation-list">
          {automations.map((auto) => (
            <div key={auto.id} className="automation-item">
              <div className="automation-icon">{auto.icon}</div>
              <div className="automation-info">
                <span className="automation-label">{auto.label}</span>
                <span className="automation-desc">{auto.desc}</span>
              </div>
              <button
                type="button"
                className={`toggle-switch ${auto.enabled ? "on" : ""}`}
                role="switch"
                aria-checked={auto.enabled}
                onClick={() => toggleAutomation(auto.id)}
                aria-label={`Toggle ${auto.label}`}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="create-rule-btn">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create a rule
        </button>
      </div>

      <div className="copilot-section copilot-quiet">
        <div className="copilot-section-label">QUIETLY WORKING FOR YOU</div>
        <div className="quiet-items">
          <div className="quiet-item">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>6 emails organized today</span>
          </div>
          <div className="quiet-item">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span>2 follow-up reminders queued</span>
          </div>
        </div>
      </div>

      <div className="copilot-chat-wrap">
        <div className="copilot-chat-input-row">
          <input
            type="text"
            className="copilot-chat-input"
            placeholder="Ask anything about your inbox…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            aria-label="Ask your copilot"
          />
          <button
            type="button"
            className="copilot-send-btn"
            disabled={!chatInput.trim()}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div className="copilot-chat-hint">Try "Summarize my unread mail"</div>
        <div className="copilot-footer-note">
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
          </svg>
          Your inbox. Your rules. Always.
        </div>
      </div>
    </aside>
  );
}
