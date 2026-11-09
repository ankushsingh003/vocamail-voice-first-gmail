import React from "react";
import "./Header.css";

export default function Header({ onLogout }) {
  return (
    <header className="app-header" role="banner">
      {}
      <div className="brand-small" aria-label="VocaMail logo">
        <span className="brand-icon-small" aria-hidden="true">✦</span>
        <span className="brand-name-small">VocaMail</span>
      </div>

      {}
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
