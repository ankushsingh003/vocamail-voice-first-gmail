/**
 * frontend/src/components/MicButton.jsx — The Big Push-To-Talk Button
 * ===================================================================
 * Think of this component like the walkie-talkie button on your screen.
 * 
 * Features:
 *   1. Tap or Hold to record your voice.
 *   2. Automatically hooks into the keyboard SPACEBAR so blind users or
 *      keyboard-first navigators can talk without reaching for a mouse.
 *   3. Uses ARIA attributes (aria-pressed) so screen readers notify the user
 *      when the microphone is live.
 */

import React, { useEffect } from "react";
import "./MicButton.css";

export default function MicButton({ isRecording = false, onToggleRecord }) {
  // Bind the global SPACEBAR key as a keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      // If Space is pressed and user is not typing in a text field, activate talk
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault(); // Prevent webpage from scrolling down
        if (onToggleRecord) onToggleRecord();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleRecord]);

  return (
    <div className="talk-wrapper">
      <button
        id="btn-talk"
        type="button"
        className={`btn-talk ${isRecording ? "recording" : ""}`}
        aria-label="Press Space or tap to record your voice command"
        aria-pressed={isRecording}
        onClick={onToggleRecord}
      >
        <span className="mic-icon" aria-hidden="true">🎙</span>
        <span className="btn-talk-label">
          {isRecording ? "Listening…" : "Press & Hold to Talk"}
        </span>
      </button>
    </div>
  );
}
