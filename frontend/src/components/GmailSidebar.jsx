import React from "react";
import "./GmailSidebar.css";

export default function GmailSidebar({
  currentFolder = "INBOX",
  onSelectFolder,
  onOpenCompose,
  unreadCount = 0,
  isCollapsed = false,
  labels = ["Work", "Personal", "Receipts"],
  onAddLabel,
  activeLabel = null,
  onSelectLabel,
}) {
  const [isAddLabelOpen, setIsAddLabelOpen] = React.useState(false);
  const [newLabelText, setNewLabelText] = React.useState("");
  const folders = [
    {
      id: "INBOX",
      label: "Inbox",
      count: unreadCount || null,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z" />
        </svg>
      ),
    },
    {
      id: "STARRED",
      label: "Starred",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ),
    },
    {
      id: "SNOOZED",
      label: "Snoozed",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
      ),
    },
    {
      id: "SENT",
      label: "Sent",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      ),
    },
    {
      id: "DRAFT",
      label: "Drafts",
      count: 1,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      ),
    },
    {
      id: "TRASH",
      label: "Trash",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className={`gmail-sidebar ${isCollapsed ? "collapsed" : ""}`}
      role="navigation"
      aria-label="Mail folders"
    >
      {}
      <div className="compose-btn-wrap">
        <button
          type="button"
          className="compose-btn"
          onClick={onOpenCompose}
          aria-label="Compose new email (or speak 'compose email')"
        >
          <svg className="compose-icon-svg" viewBox="0 0 24 24">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          <span className="compose-text">Compose</span>
        </button>
      </div>

      {}
      <nav className="sidebar-nav">
        {folders.map((folder) => {
          const isActive = currentFolder === folder.id;
          return (
            <button
              key={folder.id}
              type="button"
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectFolder && onSelectFolder(folder.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="nav-item-icon" aria-hidden="true">
                {folder.icon}
              </span>
              <span className="nav-item-label">{folder.label}</span>
              {folder.count && (
                <span className="nav-item-count">{folder.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {}
      {!isCollapsed && (
        <div className="sidebar-labels-wrapper">
          <div className="sidebar-section-title">
            <span>Labels</span>
            <button
              type="button"
              className="sidebar-add-btn"
              aria-label="Create new label"
              title="Create new label"
              onClick={() => setIsAddLabelOpen((prev) => !prev)}
            >
              +
            </button>
          </div>

          {}
          {isAddLabelOpen && (
            <form
              className="sidebar-new-label-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (newLabelText.trim()) {
                  if (onAddLabel) onAddLabel(newLabelText.trim());
                  setNewLabelText("");
                  setIsAddLabelOpen(false);
                }
              }}
            >
              <input
                type="text"
                className="sidebar-new-label-input"
                placeholder="New label name..."
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                autoFocus
              />
              <button type="submit" className="sidebar-new-label-save">
                Add
              </button>
            </form>
          )}

          {}
          <div className="sidebar-labels-list">
            {labels.map((labelName) => {
              const isActive = activeLabel === labelName;
              return (
                <button
                  key={labelName}
                  type="button"
                  className={`nav-item label-item ${isActive ? "active" : ""}`}
                  onClick={() => onSelectLabel && onSelectLabel(labelName)}
                >
                  <span className="nav-item-icon label-tag-icon">🏷️</span>
                  <span className="nav-item-label">{labelName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
