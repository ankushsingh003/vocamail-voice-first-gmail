/**
 * frontend/src/components/ResponseBox.jsx — Spoken Assistant Output Bubble
 * =========================================================================
 * Think of this component like the assistant's mouth and subtitles.
 * 
 * It serves two audiences at the same time:
 *   1. Sighted users: Displays the speech transcript in a clean, legible bubble.
 *   2. Blind users: Feeds the same text into an invisible ARIA live region
 *      (`aria-live="polite"`), which tells the screen reader to speak it aloud!
 */

import React from "react";
import "./ResponseBox.css";

export default function ResponseBox({ message = "Signed in! Gmail access is active. Say something or press Space to begin." }) {
  return (
    <>
      {/* Invisible live region for screen-reader speech announcement */}
      <div
        id="aria-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>

      {/* Visible assistant reply box */}
      <div className="response-box" aria-label="Assistant response">
        <p id="response-text" className="response-text">
          {message}
        </p>
      </div>
    </>
  );
}
