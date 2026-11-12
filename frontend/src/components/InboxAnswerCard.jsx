import React, { useState } from "react";
import "./InboxAnswerCard.css";

export default function InboxAnswerCard({ answer, citation, query, onOpenEmail, onDismiss }) {
  const [isListening, setIsListening] = useState(false);

  if (!answer) return null;

  function handleListen() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsListening(true);
    utterance.onend = () => setIsListening(false);
    utterance.onerror = () => setIsListening(false);
    window.speechSynthesis.speak(utterance);
  }

  function handleStopListen() {
    window.speechSynthesis.cancel();
    setIsListening(false);
  }

  const displayAnswer = answer.replace(/\s*\(Source:[^)]+\)/gi, "").trim();
  const sourceMatch = answer.match(/\(Source:\s*([^,]+),\s*([^)]+)\)/i);
  const sourceLabel = sourceMatch ? `${sourceMatch[1].trim()} · ${sourceMatch[2].trim()}` : null;

  return (
    <div className="inbox-answer-card" role="region" aria-label="AI Inbox Answer">
      <div className="iac-header">
        <div className="iac-header-left">
          <span className="iac-sparkle" aria-hidden="true">✨</span>
          <span className="iac-title">AI Answer</span>
          <span className="iac-query-pill" title={query}>"{query}"</span>
        </div>
        <div className="iac-header-right">
          <button
            type="button"
            className={`iac-listen-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? handleStopListen : handleListen}
            aria-label={isListening ? "Stop reading answer" : "Listen to answer"}
            title={isListening ? "Stop" : "Listen"}
          >
            {isListening ? (
              <>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M6 6h12v12H6z" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
                Listen
              </>
            )}
          </button>
          <button
            type="button"
            className="iac-dismiss-btn"
            onClick={onDismiss}
            aria-label="Dismiss AI answer"
            title="Dismiss"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="iac-answer-text">{displayAnswer}</div>

      {citation && (
        <div className="iac-citation-row">
          <span className="iac-citation-label">Source:</span>
          <button
            type="button"
            className="iac-citation-pill"
            onClick={() => citation.id && onOpenEmail && onOpenEmail({ id: citation.id })}
            title={`Open: ${citation.subject}`}
            disabled={!citation.id || !onOpenEmail}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            <span className="iac-citation-subject">{citation.subject}</span>
            {citation.sender && <span className="iac-citation-sender">· {citation.sender}</span>}
            {citation.date && <span className="iac-citation-date">· {citation.date}</span>}
          </button>
          {sourceLabel && !citation.id && (
            <span className="iac-citation-static">{sourceLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

