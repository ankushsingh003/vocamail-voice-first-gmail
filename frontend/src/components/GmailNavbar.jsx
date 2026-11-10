import React, { useState } from "react";
import "./GmailNavbar.css";

export default function GmailNavbar({
  searchQuery = "",
  onSearchChange,
  onSearchSubmit,
  onToggleVoice,
  isRecording = false,
  onToggleSidebar,
  onOpenBriefing,
  onOpenSettings,
  onLogout,
  userName = "User",
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  function handleSearchKey(e) {
    if (e.key === "Enter" && onSearchSubmit) {
      onSearchSubmit(searchQuery);
    }
  }

  const avatarLetter = (userName.charAt(0) || "U").toUpperCase();

  return (
    <header className="app-navbar" role="banner">
      <div className="navbar-left">
        <button
          type="button"
          className="navbar-icon-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          title="Main menu"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="navbar-brand">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
            <rect width="24" height="24" rx="4" fill="#4f78e8" fillOpacity="0.12" />
            <path d="M4 8l8 5 8-5" stroke="#4f78e8" strokeWidth="2" strokeLinecap="round" />
            <rect x="4" y="7" width="16" height="11" rx="2" stroke="#4f78e8" strokeWidth="2" fill="none" />
          </svg>
          <span className="navbar-brand-text">GGmail</span>
        </div>
      </div>

      <div className="navbar-center">
        <div className={`navbar-search-wrap ${isRecording ? "recording" : ""}`}>
          <button
            type="button"
            className="search-icon-btn"
            aria-label="Search"
            onClick={() => onSearchSubmit && onSearchSubmit(searchQuery)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <input
            type="search"
            className="navbar-search-input"
            placeholder="Search your mail, or ask a question"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            onKeyDown={handleSearchKey}
            aria-label="Search mail"
          />
          <div className="search-right-actions">
            <span className="search-kbd-hint">⌘K</span>
            <button
              type="button"
              className={`navbar-icon-btn mic-btn ${isRecording ? "active" : ""}`}
              onClick={onToggleVoice}
              aria-label={isRecording ? "Stop voice input" : "Start voice input"}
              title="Voice search"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <line x1="9" y1="21" x2="15" y2="21" />
              </svg>
            </button>
            <button
              type="button"
              className="navbar-icon-btn"
              title="Filters"
              aria-label="Search filters"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="navbar-right">
        <button
          type="button"
          className="navbar-icon-btn"
          title="Help"
          aria-label="Help"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className="navbar-icon-btn"
          title="Settings"
          aria-label="Settings"
          onClick={onOpenSettings}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          type="button"
          className="navbar-icon-btn"
          title="Google apps"
          aria-label="Google apps"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </button>

        <div className="navbar-user-wrap">
          <button
            type="button"
            className="navbar-avatar-btn"
            onClick={() => setIsUserMenuOpen((p) => !p)}
            aria-label={`Account menu for ${userName}`}
            aria-expanded={isUserMenuOpen}
          >
            <span className="navbar-avatar">{avatarLetter}</span>
            <span className="navbar-username">{userName}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isUserMenuOpen && (
            <div className="navbar-user-dropdown" role="menu">
              <div className="user-dropdown-info">
                <div className="user-dropdown-avatar">{avatarLetter}</div>
                <span className="user-dropdown-name">{userName}</span>
              </div>
              <hr className="user-dropdown-divider" />
              <button
                type="button"
                role="menuitem"
                className="user-dropdown-item"
                onClick={() => { setIsUserMenuOpen(false); onLogout && onLogout(); }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
