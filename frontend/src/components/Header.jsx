/**
 * frontend/src/components/Header.jsx — Top Navigation Bar Component
 * ==================================================================
 * Think of this component like the top roof of the app.
 * It shows the VocaMail glowing logo on the left, and a clean "Sign out"
 * button on the right that logs the user out and clears their session.
 */

import React from "react";
import "./Header.css";

export default function Header({ onLogout }) {
  return (
    <header className="app-header" role="banner">
      {/* Brand logo and app name */}
      <div className="brand-small" aria-label="VocaMail logo">
        <span className="brand-icon-small" aria-hidden="true">✦</span>
        <span className="brand-name-small">VocaMail</span>
      </div>

      {/* Sign out form: posts to /logout to clear credentials */}
      <form action="/logout" method="POST" style={{ margin: 0 }}>
        <button
          id="btn-logout"
          type="submit"
          className="btn-ghost"
          aria-label="Sign out of VocaMail"
          onClick={onLogout}
        >
          Sign out
        </button>
      </form>
    </header>
  );
}
