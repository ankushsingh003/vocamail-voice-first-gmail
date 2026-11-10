import React, { useState } from "react";
import "./GmailEmailTable.css";

export default function GmailEmailTable({
  messages = [],
  isLoading = false,
  onOpenEmail,
  onRefresh,
  onArchive,
  onTrash,
  onMarkRead,
  onToggleStar,
  onOpenBriefing,
  currentFolder = "INBOX",
}) {
  const [activeTab, setActiveTab] = useState("primary");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isFocusMode, setIsFocusMode] = useState(false);

  function toggleSelectOne(id, e) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(" ").slice(1, 3).join(" ");
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  }

  function formatSender(fromStr) {
    if (!fromStr) return "Unknown";
    const match = fromStr.match(/^"?([^"<]+)"?\s*<?/);
    if (match && match[1].trim()) return match[1].trim();
    return fromStr.split("@")[0];
  }

  const unreadCount = messages.filter((m) => m.is_unread).length;
  const folderLabel = currentFolder === "INBOX" ? "Inbox" : currentFolder.charAt(0) + currentFolder.slice(1).toLowerCase();

  return (
    <section className="email-table-root" role="region" aria-label="Email inbox">
      <div className="inbox-header-row">
        <div className="inbox-title-block">
          <h1 className="inbox-title">{folderLabel}</h1>
          <p className="inbox-subtitle">A fresh start, without the busywork.</p>
        </div>
        <button
          type="button"
          className={`focus-mode-btn ${isFocusMode ? "active" : ""}`}
          onClick={() => setIsFocusMode((p) => !p)}
          title="Focus mode"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Focus mode
        </button>
      </div>

      {currentFolder === "INBOX" && (
        <div className="daily-brief-banner">
          <div className="brief-banner-left">
            <div className="brief-banner-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#4f78e8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="brief-banner-label">YOUR DAILY BRIEF</span>
            </div>
            <h2 className="brief-banner-heading">Less sorting. More doing.</h2>
            <p className="brief-banner-sub">
              {unreadCount > 0
                ? `${unreadCount} conversation${unreadCount > 1 ? "s" : ""} need${unreadCount === 1 ? "s" : ""} your attention. I've taken care of the rest.`
                : "You're all caught up! I've organized your inbox."}
            </p>
            <div className="brief-banner-stats">
              <span className="brief-stat">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {Math.min(3, unreadCount)} replies to send
              </span>
              <span className="brief-stat">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                2 upcoming meetings
              </span>
              <span className="brief-stat">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {messages.length - unreadCount} emails organized
              </span>
            </div>
          </div>
          <div className="brief-banner-right">
            <button
              type="button"
              className="brief-ai-summary-btn"
              onClick={onOpenBriefing}
            >
              AI summary
            </button>
            <button
              type="button"
              className="brief-view-btn"
              onClick={onOpenBriefing}
            >
              View briefing
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="email-tabs-row" role="tablist">
        {[
          {
            key: "primary", label: "Primary", count: unreadCount,
            icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
          },
          {
            key: "updates", label: "Updates", count: 8,
            icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" /></svg>
          },
          {
            key: "promotions", label: "Promotions", count: 12,
            icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v.5" /><path d="M4 7V5a1 1 0 0 1 1-1h3" /><path d="M16 7V5a1 1 0 0 0-1-1h-2" /><rect x="2" y="9" width="20" height="12" rx="2" /><line x1="12" y1="13" x2="12" y2="17" /><line x1="10" y1="15" x2="14" y2="15" /></svg>
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`email-tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="email-list-toolbar">
        <div className="toolbar-left">
          <input
            type="checkbox"
            className="list-checkbox"
            aria-label="Select all"
            checked={messages.length > 0 && selectedIds.size === messages.length}
            onChange={toggleSelectAll}
          />
          <button type="button" className="toolbar-icon-btn" title="Refresh" onClick={onRefresh} aria-label="Refresh">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button type="button" className="toolbar-icon-btn" title="More options" aria-label="More options">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
        <div className="toolbar-right">
          <span className="pagination-label">
            {messages.length > 0 ? `1–${messages.length} of ${messages.length}` : "0 of 0"}
          </span>
          <button type="button" className="toolbar-icon-btn" aria-label="Previous page" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button type="button" className="toolbar-icon-btn" aria-label="Next page" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      <div className="email-list" role="list">
        {isLoading && (
          <div className="email-list-loading" role="status">
            <div className="loading-pulse" /><div className="loading-pulse" /><div className="loading-pulse" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="email-list-empty">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="#d1d5db" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            <p>Your inbox is empty</p>
          </div>
        )}

        {!isLoading && messages.map((email, idx) => {
          const isUnread = email.is_unread;
          const isStarred = email.is_starred;
          const isSelected = selectedIds.has(email.id);

          return (
            <div
              key={email.id || idx}
              role="listitem"
              tabIndex={0}
              className={`email-row ${isUnread ? "unread" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => onOpenEmail && onOpenEmail(email)}
              onKeyDown={(e) => { if (e.key === "Enter") onOpenEmail && onOpenEmail(email); }}
            >
              <div className="email-row-left">
                <span className={`unread-indicator ${isUnread ? "visible" : ""}`} aria-hidden="true" />
                <input
                  type="checkbox"
                  className="list-checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleSelectOne(email.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select email from ${formatSender(email.from)}`}
                />
                <button
                  type="button"
                  className={`star-btn ${isStarred ? "starred" : ""}`}
                  aria-label={isStarred ? "Unstar" : "Star"}
                  onClick={(e) => { e.stopPropagation(); onToggleStar && onToggleStar(email.id, !isStarred); }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.8" fill={isStarred ? "#f59e0b" : "none"} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={isStarred ? "#f59e0b" : "currentColor"} />
                  </svg>
                </button>
              </div>

              <span className="email-row-sender" title={email.from}>
                {formatSender(email.from)}
              </span>

              <div className="email-row-content">
                <span className="email-row-subject">{email.subject || "(no subject)"}</span>
                <span className="email-row-sep"> — </span>
                <span className="email-row-snippet">{email.snippet}</span>
              </div>

              <div className="email-row-trailing">
                <span className="email-row-date">{formatDate(email.date)}</span>
                <div className="email-row-actions">
                  <button type="button" className="row-action-btn" title="Archive" aria-label="Archive"
                    onClick={(e) => { e.stopPropagation(); onArchive && onArchive(email.id); }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                  </button>
                  <button type="button" className="row-action-btn" title="Delete" aria-label="Delete"
                    onClick={(e) => { e.stopPropagation(); onTrash && onTrash(email.id); }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                  <button type="button" className="row-action-btn" title="Mark as read" aria-label="Mark as read"
                    onClick={(e) => { e.stopPropagation(); onMarkRead && onMarkRead(email.id); }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="email-list-footer">
        <span className="footer-left">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          You're in control. AI never sends without your approval.
        </span>
        <span className="footer-right">Last synced just now</span>
      </div>
    </section>
  );
}
