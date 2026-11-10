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
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      ),
    },
    {
      id: "STARRED",
      label: "Starred",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      id: "SNOOZED",
      label: "Snoozed",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: "SENT",
      label: "Sent",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
    },
    {
      id: "DRAFT",
      label: "Drafts",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
    },
    {
      id: "TRASH",
      label: "Trash",
      count: null,
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      ),
    },
  ];

  const labelColors = { Work: "#3b82f6", Personal: "#10b981", Receipts: "#f59e0b" };

  return (
    <aside
      className={`app-sidebar ${isCollapsed ? "collapsed" : ""}`}
      role="navigation"
      aria-label="Mail navigation"
    >
      <div className="sidebar-compose-wrap">
        <button
          type="button"
          className="sidebar-compose-btn"
          onClick={onOpenCompose}
          aria-label="Compose new email"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {!isCollapsed && <span>Compose</span>}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Folders">
        {folders.map((folder) => {
          const isActive = currentFolder === folder.id;
          return (
            <button
              key={folder.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectFolder && onSelectFolder(folder.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="sidebar-nav-icon">{folder.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="sidebar-nav-label">{folder.label}</span>
                  {folder.count != null && (
                    <span className="sidebar-nav-count">{folder.count}</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {!isCollapsed && (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-title">Smart Workspace</span>
            </div>
            <button type="button" className="sidebar-nav-item sidebar-smart-item">
              <span className="sidebar-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <span className="sidebar-nav-label">Automations</span>
              <span className="sidebar-nav-badge">3</span>
            </button>
            <button type="button" className="sidebar-nav-item sidebar-smart-item">
              <span className="sidebar-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              <span className="sidebar-nav-label">Follow-ups</span>
            </button>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-title">Labels</span>
              <button
                type="button"
                className="sidebar-add-label-btn"
                onClick={() => setIsAddLabelOpen((p) => !p)}
                aria-label="Add label"
                title="Add label"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {isAddLabelOpen && (
              <form
                className="sidebar-add-label-form"
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
                  className="sidebar-label-input"
                  placeholder="Label name..."
                  value={newLabelText}
                  onChange={(e) => setNewLabelText(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="sidebar-label-save">Add</button>
              </form>
            )}

            {labels.map((labelName) => {
              const isActive = activeLabel === labelName;
              const color = labelColors[labelName] || "#6b7280";
              return (
                <button
                  key={labelName}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => onSelectLabel && onSelectLabel(labelName)}
                >
                  <span className="sidebar-nav-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
                    </svg>
                  </span>
                  <span className="sidebar-nav-label">{labelName}</span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-storage">
            <div className="storage-bar-wrap">
              <div className="storage-bar">
                <div className="storage-bar-fill" style={{ width: "21%" }} />
              </div>
            </div>
            <span className="storage-text">3.2 GB of 15 GB used</span>
            <button type="button" className="manage-storage-btn">Manage storage</button>
          </div>
        </>
      )}
    </aside>
  );
}
