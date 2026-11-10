import React, { useState, useEffect, useRef } from "react";
import "./CopilotPanel.css";

export default function CopilotPanel({
  selectedEmail = null,
  onDraftReply = null,
  onOpenBriefing = null,
  onOpenEmail = null,
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [nextAction, setNextAction] = useState(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const [automationNotice, setAutomationNotice] = useState(null);
  const [runningAutoId, setRunningAutoId] = useState(null);
  const [organizedCount, setOrganizedCount] = useState(6);
  const [followUpCount, setFollowUpCount] = useState(2);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleCondition, setRuleCondition] = useState("");
  const [ruleAction, setRuleAction] = useState("Label & Star");

  const [automations, setAutomations] = useState([
    {
      id: "receipts",
      label: "Receipts, filed.",
      desc: "Label & archive receipts",
      enabled: true,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: "followup",
      label: "Follow up, on time.",
      desc: "Remind me after 3 days",
      enabled: true,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: "meetings",
      label: "Meetings, handled.",
      desc: "Draft replies to invitations",
      enabled: true,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    async function fetchAction() {
      setIsLoadingAction(true);
      try {
        const res = await fetch("/api/copilot/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: selectedEmail }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.has_action) {
            setNextAction(data);
          } else {
            setNextAction(null);
          }
        }
      } catch (err) {
        console.error("[Copilot] Action fetch failed:", err);
      } finally {
        setIsLoadingAction(false);
      }
    }
    fetchAction();
  }, [selectedEmail?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  async function handleSendChat(textToSend = null) {
    const query = (textToSend || chatInput).trim();
    if (!query) return;

    const userMsg = { role: "user", text: query };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        setChatMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.error || "Sorry, I could not process that." },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${err.message}` },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  function handleVoiceReadMessage(text) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  }

  async function handleRunAutomation(auto) {
    setRunningAutoId(auto.id);
    try {
      const res = await fetch("/api/copilot/run-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: auto.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setAutomationNotice(data.message);
        if (auto.id === "receipts") setOrganizedCount((p) => p + (data.count || 1));
        if (auto.id === "followup") setFollowUpCount(data.count || 2);
        setTimeout(() => setAutomationNotice(null), 4000);
      }
    } catch (err) {
      setAutomationNotice(`Routine triggered: ${auto.label}`);
      setTimeout(() => setAutomationNotice(null), 3000);
    } finally {
      setRunningAutoId(null);
    }
  }

  function toggleAutomation(id) {
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextState = !a.enabled;
          if (nextState) handleRunAutomation(a);
          return { ...a, enabled: nextState };
        }
        return a;
      })
    );
  }

  async function handleCreateRule(e) {
    e.preventDefault();
    if (!ruleName.trim()) return;
    const newRule = {
      id: `rule_${Date.now()}`,
      label: ruleName.trim(),
      desc: `${ruleCondition || "All incoming"} → ${ruleAction}`,
      enabled: true,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    };
    try {
      await fetch("/api/copilot/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });
    } catch {}
    setAutomations((prev) => [...prev, newRule]);
    setRuleName("");
    setRuleCondition("");
    setIsRuleModalOpen(false);
    setAutomationNotice(`Created rule: ${newRule.label}`);
    setTimeout(() => setAutomationNotice(null), 3000);
  }

  function handleActionDraft() {
    if (!nextAction) return;
    const targetEmail = nextAction.email || selectedEmail;
    if (onDraftReply && targetEmail) {
      onDraftReply(targetEmail, nextAction.suggested_reply);
    }
  }

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

      {automationNotice && (
        <div className="copilot-notice-toast" role="status">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{automationNotice}</span>
        </div>
      )}

      <div className="copilot-section">
        <div className="copilot-section-label">NEXT BEST ACTION</div>
        {isLoadingAction ? (
          <div className="copilot-action-card copilot-loading-card">
            <div className="copilot-action-spinner" />
            <span>Analyzing email context...</span>
          </div>
        ) : nextAction ? (
          <div className="copilot-action-card">
            <div className="action-card-title">{nextAction.title || "Reply to email"}</div>
            <div className="action-card-desc">{nextAction.desc}</div>
            <button
              type="button"
              className="action-draft-btn"
              onClick={handleActionDraft}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Draft a reply
            </button>
          </div>
        ) : (
          <div className="copilot-action-card copilot-no-email">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="#c7d7fa" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            <p>Select an email to see suggested actions</p>
          </div>
        )}
      </div>

      <div className="copilot-section">
        <div className="copilot-section-header">
          <div className="copilot-section-label">AUTOMATIONS</div>
          <span className="copilot-badge">{automations.filter((a) => a.enabled).length} active</span>
        </div>
        <p className="copilot-section-desc">Small routines. Big time back.</p>
        <div className="automation-list">
          {automations.map((auto) => (
            <div key={auto.id} className="automation-item">
              <div
                className="automation-icon"
                title="Click to run routine now"
                onClick={() => handleRunAutomation(auto)}
                style={{ cursor: "pointer" }}
              >
                {runningAutoId === auto.id ? (
                  <span className="auto-spinner" />
                ) : (
                  auto.icon
                )}
              </div>
              <div
                className="automation-info"
                onClick={() => handleRunAutomation(auto)}
                style={{ cursor: "pointer" }}
                title="Click to run routine now"
              >
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
        <button
          type="button"
          className="create-rule-btn"
          onClick={() => setIsRuleModalOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create a rule
        </button>
      </div>

      {isRuleModalOpen && (
        <div className="rule-modal-backdrop" onClick={() => setIsRuleModalOpen(false)}>
          <div className="rule-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="rule-modal-header">
              <h3>Create Automation Rule</h3>
              <button
                type="button"
                className="rule-modal-close"
                onClick={() => setIsRuleModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="rule-modal-form">
              <label className="rule-field-label">Rule Name</label>
              <input
                type="text"
                className="rule-modal-input"
                placeholder='e.g., "Urgent client alerts"'
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                autoFocus
                required
              />

              <label className="rule-field-label">Condition</label>
              <input
                type="text"
                className="rule-modal-input"
                placeholder='e.g., "From VIP client" or "Subject contains invoice"'
                value={ruleCondition}
                onChange={(e) => setRuleCondition(e.target.value)}
              />

              <label className="rule-field-label">Action</label>
              <select
                className="rule-modal-select"
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value)}
              >
                <option value="Label & Star">Label & Star</option>
                <option value="Archive & Label">Archive & Label</option>
                <option value="Draft Auto-Reply">Draft Auto-Reply</option>
                <option value="Mark as Read">Mark as Read</option>
              </select>

              <div className="rule-modal-buttons">
                <button
                  type="button"
                  className="rule-btn-cancel"
                  onClick={() => setIsRuleModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="rule-btn-save">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="copilot-section copilot-quiet">
        <div className="copilot-section-label">QUIETLY WORKING FOR YOU</div>
        <div className="quiet-items">
          <div
            className="quiet-item clickable"
            title="Click to view organized emails routine"
            onClick={() => handleRunAutomation(automations[0])}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{organizedCount} emails organized today</span>
          </div>
          <div
            className="quiet-item clickable"
            title="Click to review follow-up reminders"
            onClick={() => handleRunAutomation(automations[1])}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{followUpCount} follow-up reminders queued</span>
          </div>
        </div>
      </div>

      {chatMessages.length > 0 && (
        <div className="copilot-chat-history">
          <div className="chat-history-header">
            <span>Copilot Conversation</span>
            <button
              type="button"
              className="chat-clear-btn"
              onClick={() => setChatMessages([])}
              title="Clear conversation"
            >
              Clear
            </button>
          </div>
          <div className="chat-bubbles-scroll">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble-row ${msg.role}`}>
                <div className={`chat-bubble ${msg.role}`}>
                  <p>{msg.text}</p>
                  {msg.role === "assistant" && (
                    <button
                      type="button"
                      className="chat-listen-btn"
                      title="Listen to response"
                      onClick={() => handleVoiceReadMessage(msg.text)}
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                      Listen
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="chat-bubble-row assistant">
                <div className="chat-bubble assistant loading">
                  <span className="dot-pulse" />
                  <span className="dot-pulse" />
                  <span className="dot-pulse" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      <div className="copilot-chat-wrap">
        <form
          className="copilot-chat-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat();
          }}
        >
          <input
            type="text"
            className="copilot-chat-input"
            placeholder="Ask anything about your inbox…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            aria-label="Ask your copilot"
          />
          <button
            type="submit"
            className="copilot-send-btn"
            disabled={!chatInput.trim() || isChatLoading}
            aria-label="Send"
          >
            {isChatLoading ? (
              <span className="auto-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
        <button
          type="button"
          className="copilot-chat-hint-btn"
          onClick={() => handleSendChat("Summarize my unread mail")}
        >
          Try "Summarize my unread mail"
        </button>
        <div className="copilot-footer-note">
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
          </svg>
          Your inbox. Your rules. Always.
        </div>
      </div>
    </aside>
  );
}
