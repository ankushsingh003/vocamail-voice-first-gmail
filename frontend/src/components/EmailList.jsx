/**
 * frontend/src/components/EmailList.jsx — Gmail Inbox Message List Component
 * ===========================================================================
 * Think of this component like the physical letter tray.
 * 
 * Features:
 *   1. "Fetch Latest Emails" button: Triggers a call to our Flask `/api/inbox` endpoint.
 *   2. Renders each email in a clean, legible card showing sender, subject, and preview.
 *   3. Adds an accented violet highlight on the left if the email is unread.
 *   4. Fully accessible with `role="article"` and `aria-label` for screen readers.
 */

import React, { useState } from "react";
import "./EmailList.css";

export default function EmailList({ onAnnounce }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchInbox() {
    setIsLoading(true);
    setError(null);
    if (onAnnounce) onAnnounce("Fetching your latest emails…");

    try {
      const res = await fetch("/api/inbox");
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Failed to fetch inbox");

      setMessages(data.messages || []);

      if (data.messages.length === 0) {
        if (onAnnounce) onAnnounce("Your inbox is empty.");
      } else {
        const unreadCount = data.messages.filter((m) => m.is_unread).length;
        if (onAnnounce) {
          onAnnounce(`You have ${data.messages.length} emails, ${unreadCount} unread.`);
        }
      }
    } catch (err) {
      console.error("[VocaMail] Inbox fetch error:", err);
      setError(err.message);
      if (onAnnounce) onAnnounce("Failed to fetch emails. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="test-panel">
      <h2 className="test-panel-title">Phase 1 — Gmail Connection Test</h2>

      <button
        id="btn-test-inbox"
        type="button"
        className="btn-outline"
        aria-label="Fetch and display your 5 latest emails"
        disabled={isLoading}
        onClick={fetchInbox}
      >
        {isLoading ? "Fetching…" : "Fetch Latest Emails"}
      </button>

      {/* Error notification */}
      {error && (
        <p className="email-error" role="alert">
          Error: {error}
        </p>
      )}

      {/* Messages list */}
      <div className="inbox-list" aria-live="polite" aria-label="Email list">
        {isLoading && <p className="email-loading">Fetching your latest emails…</p>}

        {!isLoading && messages.length > 0 && messages.map((m, i) => (
          <article
            key={m.id || i}
            className={`email-item ${m.is_unread ? "unread" : ""}`}
            aria-label={`Email ${i + 1}: from ${m.from}, subject ${m.subject}`}
          >
            <span className="email-from">{m.from}</span>
            <span className="email-subject">{m.subject}</span>
            <span className="email-snippet">{m.snippet}</span>
          </article>
        ))}

        {!isLoading && !error && messages.length === 0 && (
          <p className="email-loading">No messages loaded yet. Click the button above to test.</p>
        )}
      </div>
    </div>
  );
}
