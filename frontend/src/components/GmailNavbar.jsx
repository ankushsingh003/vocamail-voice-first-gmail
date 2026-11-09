/**
 * frontend/src/components/GmailNavbar.jsx — Authentic Gmail Top Navigation Bar
 * ==============================================================================
 * Matches the official Google Gmail top header layout exactly:
 *
 * 1. Left Side:
 *    - Hamburger menu button to toggle sidebar collapse.
 *    - Official Google-colored Gmail envelope SVG logo + "VocaMail" title.
 *
 * 2. Center Search Bar (Senior Dev Voice Integration):
 *    - Rounded pill search input ("Search mail").
 *    - Dedicated Voice Search Microphone: clicking activates Whisper voice search.
 *    - Tune / Filter sliders icon.
 *
 * 3. Right Side:
 *    - Help ? icon.
 *    - Settings ⚙ gear icon.
 *    - Google Apps 9-dot Waffle Menu: opens a full dropdown panel with all
 *      Google services — Account, Drive, Gmail, YouTube, Gemini, Maps, Search,
 *      Calendar, Chrome, Meet, Forms, Docs, Sheets, Slides, Photos, Translate,
 *      Contacts, Keep + a Gemini banner promo — identical to the real Gmail.
 *    - User profile avatar circle.
 *    - Sign Out button.
 */

import React, { useState, useEffect, useRef } from "react";
import "./GmailNavbar.css";

// ---------------------------------------------------------------------------
// Google Apps Data — using Google's official product icons via gstatic CDN
// Matches the real Gmail 9-dot waffle panel 100% pixel-perfect.
// ---------------------------------------------------------------------------
const FAVORITE_APPS = [
  {
    id: "account",
    label: "Account",
    href: "https://myaccount.google.com/",
    iconUrl: "https://ssl.gstatic.com/gb/images/bar/al-icon.png",
  },
  {
    id: "drive",
    label: "Drive",
    href: "https://drive.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png",
  },
  {
    id: "gmail",
    label: "Gmail",
    href: "https://mail.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/youtube_48dp.png",
  },
  {
    id: "gemini",
    label: "Gemini",
    href: "https://gemini.google.com/",
    iconUrl: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
  },
  {
    id: "maps",
    label: "Maps",
    href: "https://maps.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/1x/maps_48dp.png",
  },
  {
    id: "search",
    label: "Search",
    href: "https://www.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/googleg_48dp.png",
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "https://calendar.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png",
  },
  {
    id: "chrome",
    label: "Chrome",
    href: "https://www.google.com/chrome/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/chrome_48dp.png",
  },
];

// More Google apps (shown below the favorites in the dropdown)
const MORE_APPS = [
  {
    id: "meet",
    label: "Meet",
    href: "https://meet.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/meet_2020q4_48dp.png",
  },
  {
    id: "forms",
    label: "Forms",
    href: "https://docs.google.com/forms/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/forms_2020q4_48dp.png",
  },
  {
    id: "docs",
    label: "Docs",
    href: "https://docs.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png",
  },
  {
    id: "sheets",
    label: "Sheets",
    href: "https://docs.google.com/spreadsheets/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png",
  },
  {
    id: "slides",
    label: "Slides",
    href: "https://docs.google.com/presentation/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/slides_2020q4_48dp.png",
  },
  {
    id: "photos",
    label: "Photos",
    href: "https://photos.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/photos_48dp.png",
  },
  {
    id: "translate",
    label: "Translate",
    href: "https://translate.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/translate_48dp.png",
  },
  {
    id: "keep",
    label: "Keep",
    href: "https://keep.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/keep_2020q4_48dp.png",
  },
  {
    id: "contacts",
    label: "Contacts",
    href: "https://contacts.google.com/",
    iconUrl: "https://ssl.gstatic.com/images/branding/product/2x/contacts_2022_48dp.png",
  },
];

// ---------------------------------------------------------------------------
// Main GmailNavbar Component
// ---------------------------------------------------------------------------
export default function GmailNavbar({
  searchQuery = "",
  onSearchChange,
  onSearchSubmit,
  isRecording = false,
  onToggleVoice,
  onToggleSidebar,
  onHelpClick,
  onOpenBriefing,
  onOpenSettings,
  onLogout,
  userName = "User",
}) {
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(true);
  const appsRef = useRef(null);

  // Close dropdown when clicking anywhere outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (appsRef.current && !appsRef.current.contains(e.target)) {
        setIsAppsOpen(false);
      }
    }
    if (isAppsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAppsOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") setIsAppsOpen(false);
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  function handleKeyDown(e) {
    if (e.key === "Enter" && onSearchSubmit) {
      e.preventDefault();
      onSearchSubmit(searchQuery);
    }
  }

  // Get first letter of user's name for the avatar circle
  const avatarLetter = (userName || "U").charAt(0).toUpperCase();

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

        <div className="brand-link" tabIndex={0} role="link" aria-label="vocamail Home">
          {/* Authentic Official Google Gmail Logo */}
          <img
            src="https://ssl.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png"
            alt="Gmail"
            className="brand-logo-img"
            width="32"
            height="32"
          />
          <span className="brand-title">vocamail</span>
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

          {/* Senior Developer Voice Mic embedded in Search Bar */}
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
        {/* ⚡ Morning Executive Briefing Button */}
        {onOpenBriefing && (
          <button
            type="button"
            className="briefing-trigger-btn"
            onClick={onOpenBriefing}
            title="Listen to 60-Second Morning Executive Briefing"
            aria-label="Morning Executive Briefing"
          >
            <span style={{ fontSize: "14px" }}>⚡</span>
            <span>Briefing</span>
          </button>
        )}

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
        <button
          type="button"
          className="icon-btn"
          aria-label="Settings"
          title="Settings"
          onClick={onOpenSettings}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </button>

        {/* ============================================================
            Google Apps 9-Dot Waffle Menu (Working Dropdown!)
            Clicking this opens the full Google apps panel exactly like
            the real Gmail — with all Google services as clickable tiles.
            ============================================================ */}
        <div className="google-apps-wrapper" ref={appsRef}>
          <button
            type="button"
            className={`icon-btn ${isAppsOpen ? "icon-btn-active" : ""}`}
            aria-label="Google apps"
            aria-expanded={isAppsOpen}
            aria-haspopup="true"
            title="Google apps"
            onClick={() => setIsAppsOpen((prev) => !prev)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {/* Google Apps Dropdown Panel */}
          {isAppsOpen && (
            <div
              className="google-apps-dropdown"
              role="dialog"
              aria-label="Google apps"
            >
              {/* Panel Header */}
              <div className="apps-dropdown-header">
                <span className="apps-dropdown-title">Your favorites</span>
                <button
                  type="button"
                  className="apps-edit-btn"
                  title="Edit app shortcuts"
                  aria-label="Edit app shortcuts"
                  onClick={() => setIsAppsOpen(false)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
              </div>

              {/* Favorites Apps Grid (3×3) */}
              <div className="apps-grid">
                {FAVORITE_APPS.map((app) => (
                  <a
                    key={app.id}
                    href={app.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-tile"
                    aria-label={`Open ${app.label}`}
                    onClick={() => setIsAppsOpen(false)}
                  >
                    <div className="app-icon-circle">
                      <img
                        src={app.iconUrl}
                        alt=""
                        width="40"
                        height="40"
                        loading="lazy"
                      />
                    </div>
                    <span className="app-label">{app.label}</span>
                  </a>
                ))}
              </div>

              {/* Gemini Promo Banner */}
              {showPromo && (
                <div className="apps-promo-banner">
                  <div className="apps-promo-text">
                    <svg viewBox="0 0 28 28" width="20" height="20" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="url(#promo_grad)" />
                      <defs>
                        <linearGradient id="promo_grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#4285F4" />
                          <stop offset="0.5" stopColor="#9B72CB" />
                          <stop offset="1" stopColor="#D96570" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span>Students, claim your Gemini plan at no cost for 1 year</span>
                  </div>
                  <div className="apps-promo-actions">
                    <button
                      type="button"
                      className="apps-promo-no"
                      onClick={() => setShowPromo(false)}
                    >
                      No thanks
                    </button>
                    <a
                      href="https://gemini.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apps-promo-learn"
                      onClick={() => setIsAppsOpen(false)}
                    >
                      Learn more
                    </a>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="apps-dropdown-divider" />

              {/* More Google Apps Grid */}
              <div className="apps-section-label">More Google apps</div>
              <div className="apps-grid">
                {MORE_APPS.map((app) => (
                  <a
                    key={app.id}
                    href={app.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-tile"
                    aria-label={`Open ${app.label}`}
                    onClick={() => setIsAppsOpen(false)}
                  >
                    <div className="app-icon-circle">
                      <img
                        src={app.iconUrl}
                        alt=""
                        width="40"
                        height="40"
                        loading="lazy"
                      />
                    </div>
                    <span className="app-label">{app.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Account Avatar */}
        <button
          type="button"
          className="profile-avatar-btn"
          aria-label="Google Account"
          title={`Signed in as ${userName}`}
        >
          {avatarLetter}
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
