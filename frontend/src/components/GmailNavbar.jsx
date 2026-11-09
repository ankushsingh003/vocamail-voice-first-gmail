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
// Google Apps Data — matching the real Gmail waffle dropdown exactly
// ---------------------------------------------------------------------------
const FAVORITE_APPS = [
  {
    id: "account",
    label: "Account",
    href: "https://myaccount.google.com/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#f1f3f4" />
        <path fill="#5f6368" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
  {
    id: "drive",
    label: "Drive",
    href: "https://drive.google.com/",
    icon: (
      <svg viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 51H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
        <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 00-1.2 4.5h27.5z" fill="#00ac47" />
        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 55.5c.8-1.4 1.2-2.95 1.2-4.5H59.8L73.55 76.8z" fill="#ea4335" />
        <path d="M43.65 25L57.4 0H43.65 29.9z" fill="#00832d" />
        <path d="M59.8 51h27.5L73.55 26.5c-.8-1.4-1.95-2.5-3.3-3.3L56.5 51z" fill="#2684fc" />
        <path d="M0 51h27.5L13.75 23.2c-.8-1.4-1.95-2.5-3.3-3.3L0 36.35V51z" fill="#ffba00" />
      </svg>
    ),
  },
  {
    id: "gmail",
    label: "Gmail",
    href: "https://mail.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#4285f4" d="M1.5 5.25v13.5c0 .966.784 1.75 1.75 1.75H6V10.2L1.5 6.75z" />
        <path fill="#34a853" d="M18 20.5h2.75c.966 0 1.75-.784 1.75-1.75V5.25l-4.5 3.45z" />
        <path fill="#ea4335" d="M18 5.25l-6 4.5-6-4.5h12z" />
        <path fill="#fbbc05" d="M6 5.25l6 4.5 6-4.5V3.5c0-.966-.784-1.75-1.75-1.75h-8.5C6.784 1.75 6 2.534 6 3.5z" />
      </svg>
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#ff0000" d="M21.8 8.001a2.75 2.75 0 00-1.935-1.946C18.09 5.6 12 5.6 12 5.6s-6.09 0-7.865.455A2.75 2.75 0 002.2 8.001 28.8 28.8 0 001.75 12a28.8 28.8 0 00.45 3.999 2.75 2.75 0 001.935 1.945C5.91 18.4 12 18.4 12 18.4s6.09 0 7.865-.456a2.75 2.75 0 001.935-1.945A28.8 28.8 0 0022.25 12a28.8 28.8 0 00-.45-3.999z" />
        <path fill="#ffffff" d="M9.75 15L15.5 12 9.75 9z" />
      </svg>
    ),
  },
  {
    id: "gemini",
    label: "Gemini",
    href: "https://gemini.google.com/",
    icon: (
      <svg viewBox="0 0 28 28" fill="none">
        <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="url(#gemini_gradient)" />
        <defs>
          <linearGradient id="gemini_gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="50%" stopColor="#9B72CB" />
            <stop offset="100%" stopColor="#D96570" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "maps",
    label: "Maps",
    href: "https://maps.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#34a853" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <path fill="#1a73e8" d="M12 2C8.13 2 5 5.13 5 9c0 1.57.46 3.03 1.24 4.26L12 2z" />
        <path fill="#ea4335" d="M12 2l5.76 11.26C18.54 12.03 19 10.57 19 9c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
      </svg>
    ),
  },
  {
    id: "search",
    label: "Search",
    href: "https://www.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "https://calendar.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="1" y="4" width="22" height="18" rx="2" fill="#1a73e8" />
        <rect x="1" y="4" width="22" height="5" fill="#4285f4" />
        <rect x="1" y="4" width="22" height="5.5" fill="#1a73e8" opacity="0" />
        <text x="12" y="18" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">31</text>
        <rect x="6" y="1" width="2" height="6" rx="1" fill="#1a73e8" />
        <rect x="16" y="1" width="2" height="6" rx="1" fill="#1a73e8" />
        <rect x="1" y="8" width="22" height="1" fill="#e8eaed" />
      </svg>
    ),
  },
  {
    id: "chrome",
    label: "Chrome",
    href: "https://www.google.com/chrome/",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5" fill="#4285f4" />
        <circle cx="12" cy="12" r="3" fill="#ffffff" />
        <path fill="#ea4335" d="M12 7h9.5A10 10 0 0012 2z" />
        <path fill="#34a853" d="M6.74 9.5L2.5 2.5A10 10 0 002 12z" />
        <path fill="#fbbc05" d="M6.74 14.5L2.5 21.5A10 10 0 0012 22z" />
        <path fill="#4285f4" d="M17.26 14.5L21.5 21.5A10 10 0 0022 12z" />
      </svg>
    ),
  },
];

// More Google apps (shown below the favorites in the dropdown)
const MORE_APPS = [
  {
    id: "meet",
    label: "Meet",
    href: "https://meet.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#00897b" d="M15 8v8H9V8h6m1-2H8c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z" />
      </svg>
    ),
  },
  {
    id: "forms",
    label: "Forms",
    href: "https://docs.google.com/forms/",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="2" width="18" height="20" rx="2" fill="#673ab7" />
        <rect x="6" y="7" width="12" height="1.5" rx="0.75" fill="white" opacity="0.8" />
        <rect x="6" y="10.5" width="8" height="1.5" rx="0.75" fill="white" opacity="0.8" />
        <rect x="6" y="14" width="10" height="1.5" rx="0.75" fill="white" opacity="0.8" />
        <circle cx="6" cy="10.5" r="1" fill="white" />
        <circle cx="6" cy="14" r="1" fill="white" />
      </svg>
    ),
  },
  {
    id: "docs",
    label: "Docs",
    href: "https://docs.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#4285f4" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
        <path fill="#a8c7fa" d="M14 2v6h6L14 2z" />
        <rect x="8" y="12" width="8" height="1.2" rx="0.6" fill="white" />
        <rect x="8" y="14.5" width="6" height="1.2" rx="0.6" fill="white" />
        <rect x="8" y="17" width="7" height="1.2" rx="0.6" fill="white" />
      </svg>
    ),
  },
  {
    id: "sheets",
    label: "Sheets",
    href: "https://docs.google.com/spreadsheets/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#34a853" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
        <path fill="#81c995" d="M14 2v6h6L14 2z" />
        <rect x="7" y="11" width="4" height="1.5" rx="0.3" fill="white" />
        <rect x="13" y="11" width="3" height="1.5" rx="0.3" fill="white" />
        <rect x="7" y="14" width="4" height="1.5" rx="0.3" fill="white" />
        <rect x="13" y="14" width="3" height="1.5" rx="0.3" fill="white" />
        <line x1="11.5" y1="11" x2="11.5" y2="17" stroke="white" strokeWidth="0.8" />
        <line x1="7" y1="13" x2="16" y2="13" stroke="white" strokeWidth="0.8" />
        <line x1="7" y1="16" x2="16" y2="16" stroke="white" strokeWidth="0.8" />
      </svg>
    ),
  },
  {
    id: "slides",
    label: "Slides",
    href: "https://docs.google.com/presentation/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#fbbc05" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
        <path fill="#fde293" d="M14 2v6h6L14 2z" />
        <rect x="7" y="11" width="10" height="6" rx="1" fill="white" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: "photos",
    label: "Photos",
    href: "https://photos.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="8" cy="4" r="4" fill="#ea4335" />
        <circle cx="20" cy="8" r="4" fill="#4285f4" />
        <circle cx="4" cy="16" r="4" fill="#34a853" />
        <circle cx="16" cy="20" r="4" fill="#fbbc05" />
        <circle cx="12" cy="12" r="3.5" fill="white" />
      </svg>
    ),
  },
  {
    id: "translate",
    label: "Translate",
    href: "https://translate.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#4285f4" d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
      </svg>
    ),
  },
  {
    id: "keep",
    label: "Keep",
    href: "https://keep.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#fbbc05" d="M9 21h6v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z" />
      </svg>
    ),
  },
  {
    id: "contacts",
    label: "Contacts",
    href: "https://contacts.google.com/",
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#1a73e8" d="M20 0H4v2h16V0zM4 24h16v-2H4v2zM20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75c1.24 0 2.25 1.01 2.25 2.25s-1.01 2.25-2.25 2.25S9.75 10.24 9.75 9 10.76 6.75 12 6.75zM17 17H7v-1.5c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z" />
      </svg>
    ),
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

        <div className="brand-link" tabIndex={0} role="link" aria-label="VocaMail Home">
          {/* Authentic Google Gmail Envelope Logo */}
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
                      {app.icon}
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
                      {app.icon}
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
