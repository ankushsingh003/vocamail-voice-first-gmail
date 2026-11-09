/**
 * frontend/src/components/GmailNavbar.jsx — Authentic Gmail Top Navigation Bar
 * ==============================================================================
 * Matches the official Google Gmail top header layout:
 *
 * 1. Left Side:
 *    - Hamburger menu button to toggle sidebar collapse.
 *    - Official Google-colored Gmail envelope SVG logo.
 *    - "VocaMail" logo with subtle "Voice AI" pill.
 *
 * 2. Center Search Bar (Senior Dev Integration):
 *    - Rounded pill search input ("Search mail").
 *    - Dedicated Voice Search Microphone button: clicking this triggers Whisper
 *      transcription directly into the search bar or executes spoken search!
 *    - Tune / Filter sliders icon.
 *
 * 3. Right Side:
 *    - Help icon (speaks voice commands list when clicked).
 *    - Settings gear.
 *    - Google 9-dot app grid.
 *    - User profile avatar circle + Quick Sign Out button.
 */

import React from "react";
import "./GmailNavbar.css";

export default function GmailNavbar({
  searchQuery = "",
  onSearchChange,
  onSearchSubmit,
  isRecording = false,
  onToggleVoice,
  onToggleSidebar,
  onHelpClick,
  onLogout,
}) {
  function handleKeyDown(e) {
    if (e.key === "Enter" && onSearchSubmit) {
      e.preventDefault();
      onSearchSubmit(searchQuery);
    }
  }

  return (
    <header className="gmail-header" role="banner">
      {/* 1. Left: Hamburger + Google VocaMail Logo */}
      <div className="header-left">
        <button
          type="button"
          className="icon-btn"
          aria-label="Toggle Main Menu"
          onClick={onToggleSidebar}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        <div className="brand-link" tabIndex={0} role="link" aria-label="VocaMail Home">
          {/* Authentic Google Gmail Envelope Logo in Vector SVG */}
          <svg className="brand-logo-svg" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M1.5 5.25v13.5c0 .966.784 1.75 1.75 1.75H6V10.2L1.5 6.75z" />
            <path fill="#34a853" d="M18 20.5h2.75c.966 0 1.75-.784 1.75-1.75V5.25l-4.5 3.45z" />
            <path fill="#ea4335" d="M18 5.25l-6 4.5-6-4.5h12z" />
            <path fill="#fbbc05" d="M6 5.25l6 4.5 6-4.5V3.5c0-.966-.784-1.75-1.75-1.75h-8.5C6.784 1.75 6 2.534 6 3.5z" />
          </svg>
          <span className="brand-title">VocaMail</span>
          <span className="voice-badge-tag">Voice AI</span>
        </div>
      </div>

      {/* 2. Center: Gmail Search Bar with Embedded Voice Mic */}
      <div className="header-center">
        <div className="gmail-search-box" role="search">
          {/* Search Glass Icon */}
          <button
            type="button"
            className="icon-btn"
            aria-label="Search"
            onClick={() => onSearchSubmit && onSearchSubmit(searchQuery)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>

          {/* Search Input Field */}
          <input
            type="text"
            className="search-input"
            placeholder="Search mail (or click mic / press Space)"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search mail"
          />

          {/* Senior Developer Explicit Voice Mic in Search Bar */}
          <button
            type="button"
            className={`voice-search-btn ${isRecording ? "recording" : ""}`}
            title="Search with your voice (Spacebar)"
            aria-label={isRecording ? "Stop voice listening" : "Start voice search"}
            aria-pressed={isRecording}
            onClick={onToggleVoice}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>

          {/* Search Options / Tune Icon */}
          <button type="button" className="icon-btn" aria-label="Show search options">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 3. Right: Support, Settings, Google Apps Grid, User Avatar */}
      <div className="header-right">
        {/* Support Question Mark Button */}
        <button
          type="button"
          className="icon-btn"
          aria-label="Help and voice commands guide"
          onClick={onHelpClick}
          title="Voice command help"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
          </svg>
        </button>

        {/* Settings Gear */}
        <button type="button" className="icon-btn" aria-label="Settings">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </button>

        {/* Google Apps 9-Dot Grid */}
        <button type="button" className="icon-btn" aria-label="Google apps">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>

        {/* User Account Avatar */}
        <button
          type="button"
          className="profile-avatar-btn"
          aria-label="Google Account"
          title="Google Account"
        >
          A
        </button>

        {/* Sign Out Button */}
        {onLogout && (
          <button
            type="button"
            className="signout-btn"
            onClick={onLogout}
            aria-label="Sign out of Google"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
