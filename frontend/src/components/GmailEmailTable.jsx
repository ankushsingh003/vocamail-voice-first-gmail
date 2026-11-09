/**
 * frontend/src/components/GmailEmailTable.jsx — Authentic Gmail Inbox Table
 * ===========================================================================
 * Matches the layout of Gmail from the user's screenshot:
 *
 * 1. Action Toolbar:
 *    - Checkbox (select all).
 *    - Refresh button (calls onRefresh to fetch latest emails).
 *    - More menu (three dots).
 *    - Pagination text (e.g. "1–25 of 53").
 *
 * 2. Category Tabs:
 *    - Primary (blue icon, blue underline).
 *    - Promotions (tag icon with green "8 new" badge).
 *    - Social (people icon).
 *    - Updates (info icon with orange "7 new" badge).
 *
 * 3. Email Rows (exact visual match):
 *    - Checkbox & Star button (stars toggle live).
 *    - Sender name (bold if unread).
 *    - Subject in bold + Snippet in light gray.
 *    - Date / timestamp on right.
 *    - Hover action buttons: Archive, Delete (Trash), Mark as read.
 *    - Clicking any row opens the full email detail view!
 */

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
}) {
  const [activeTab, setActiveTab] = useState("primary");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Toggle selection for a single email checkbox
  function toggleSelectOne(id, e) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Toggle select all
  function toggleSelectAll() {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  }

  // Format date strings like Gmail (e.g. "28 Oct", "27 Oct", or "14:32")
  function formatGmailDate(dateStr) {
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

  // Clean sender display name (e.g. "Google <no-reply@google.com>" -> "Google")
  function formatSender(fromStr) {
    if (!fromStr) return "Unknown";
    const match = fromStr.match(/^"?([^"<]+)"?\s*<?/);
    if (match && match[1].trim()) return match[1].trim();
    return fromStr.split("@")[0];
  }

  return (
    <section className="gmail-main-content" role="region" aria-label="Email inbox table">
      {/* 1. Action Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input
            type="checkbox"
            className="table-checkbox"
            aria-label="Select all emails"
            checked={messages.length > 0 && selectedIds.size === messages.length}
            onChange={toggleSelectAll}
          />
          <button
            type="button"
            className="icon-btn"
            title="Refresh"
            aria-label="Refresh inbox"
            onClick={onRefresh}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
          </button>
          <button type="button" className="icon-btn" title="More options" aria-label="More options">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        </div>

        <div className="toolbar-right">
          <span className="pagination-text">
            {messages.length > 0 ? `1–${messages.length} of ${messages.length}` : "0 of 0"}
          </span>
          <button type="button" className="icon-btn" aria-label="Newer page" disabled>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <button type="button" className="icon-btn" aria-label="Older page" disabled>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Category Tabs (Primary, Promotions, Social, Updates) */}
      <div className="category-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "primary"}
          className={`tab-btn ${activeTab === "primary" ? "active" : ""}`}
          onClick={() => setActiveTab("primary")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z" />
          </svg>
          <span>Primary</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "promotions"}
          className={`tab-btn ${activeTab === "promotions" ? "active" : ""}`}
          onClick={() => setActiveTab("promotions")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
          </svg>
          <span>Promotions</span>
          <span className="tab-badge green">8 new</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "social"}
          className={`tab-btn ${activeTab === "social" ? "active" : ""}`}
          onClick={() => setActiveTab("social")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <span>Social</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "updates"}
          className={`tab-btn ${activeTab === "updates" ? "active" : ""}`}
          onClick={() => setActiveTab("updates")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z" />
          </svg>
          <span>Updates</span>
          <span className="tab-badge orange">7 new</span>
        </button>
      </div>

      {/* 3. Email Rows List */}
      <div className="email-table-scroll" role="table" aria-label="Inbox messages">
        {isLoading && (
          <div className="empty-table-state">
            <p>Loading your Gmail messages…</p>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="empty-table-state">
            <p>Your inbox is empty!</p>
          </div>
        )}

        {!isLoading &&
          messages.map((email, idx) => {
            const isUnread = email.is_unread;
            const isStarred = email.is_starred;
            const isSelected = selectedIds.has(email.id);

            return (
              <div
                key={email.id || idx}
                className={`email-row ${isUnread ? "unread" : ""}`}
                role="row"
                tabIndex={0}
                onClick={() => onOpenEmail && onOpenEmail(email)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onOpenEmail && onOpenEmail(email);
                }}
              >
                {/* Leading: Checkbox & Star Button */}
                <div className="row-leading">
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectOne(email.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select email from ${formatSender(email.from)}`}
                  />
                  <button
                    type="button"
                    className={`star-btn ${isStarred ? "starred" : ""}`}
                    aria-label={isStarred ? "Unstar email" : "Star email"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar && onToggleStar(email.id, !isStarred);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </button>
                </div>

                {/* Sender Column */}
                <span className="row-sender" title={email.from}>
                  {formatSender(email.from)}
                </span>

                {/* Subject & Snippet Preview Column */}
                <div className="row-content">
                  <span className="row-subject">{email.subject}</span>
                  <span className="row-separator">-</span>
                  <span className="row-snippet">{email.snippet}</span>
                </div>

                {/* Trailing: Date / Hover Action Bar */}
                <div className="row-trailing">
                  <span className="row-date">{formatGmailDate(email.date)}</span>

                  {/* Hover Quick Actions */}
                  <div className="row-hover-actions">
                    <button
                      type="button"
                      className="hover-icon-btn"
                      title="Archive"
                      aria-label="Archive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive && onArchive(email.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="hover-icon-btn"
                      title="Delete"
                      aria-label="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrash && onTrash(email.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="hover-icon-btn"
                      title="Mark as read"
                      aria-label="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead && onMarkRead(email.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
