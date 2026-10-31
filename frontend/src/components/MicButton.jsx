/**
 * frontend/src/components/MicButton.jsx — The Big Push-To-Talk Button
 * ===================================================================
 * Think of this component like the walkie-talkie button on your screen.
 *
 * Fully accessible for blind users and keyboard-only navigation:
 *
 *   MOUSE users    : Click the button to start/stop recording.
 *   KEYBOARD users : Press TAB to focus the button, then SPACE or ENTER to activate.
 *   SPACEBAR       : Works globally anywhere on the page (not just when button is focused).
 *   SCREEN READERS : The button announces its state via aria-pressed and aria-label
 *                    so screen readers say "Press and Hold to Talk, toggle button, not pressed"
 *                    and when recording: "Stop Recording, toggle button, pressed".
 *
 * Accessibility features used:
 *   - aria-pressed      : Tells screen readers whether the mic is currently ON or OFF.
 *   - aria-label        : Describes the button's purpose in plain English.
 *   - aria-describedby  : Points to a hidden hint about the keyboard shortcut.
 *   - tabIndex="0"      : Makes the button reachable by pressing TAB on the keyboard.
 *   - onKeyDown         : Activates on ENTER key as well as SPACE (standard button behaviour).
 *   - autoFocus         : When the dashboard loads, keyboard focus lands here automatically.
 *   - :focus-visible    : Shows a bright purple ring when navigating by keyboard
 *                         (hidden when clicking with a mouse so it doesn't look cluttered).
 */

import React, { useEffect, useRef } from "react";
import "./MicButton.css";

export default function MicButton({ isRecording = false, onToggleRecord, mode = "idle" }) {
  // A ref lets us directly call .focus() on the button element from JS code
  const buttonRef = useRef(null);

  // ---- Global SPACEBAR shortcut ----
  // No matter where on the page the keyboard focus is (unless inside a text input),
  // pressing SPACE will trigger the microphone toggle.
  // This is the primary interaction method for blind users using screen readers.
  useEffect(() => {
    function handleKeyDown(e) {
      // Only fire if Space is pressed and the user is NOT typing in a text/input field
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || e.target?.isContentEditable;

      if (e.code === "Space" && !isTyping) {
        e.preventDefault(); // Prevent the page from scrolling down
        if (onToggleRecord) onToggleRecord();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    // Clean up listener when component unmounts to prevent memory leaks
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleRecord]);

  // ---- Auto-focus: move keyboard focus to the mic button when recording stops ----
  // After Whisper finishes and mode returns to "idle", refocus the mic button.
  // This means a blind user doesn't have to TAB around to find it again.
  useEffect(() => {
    if (mode === "idle" && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [mode]);

  // ---- Handle Enter key on the button itself ----
  // HTML <button> elements fire onClick for Space automatically.
  // We add Enter explicitly so the button behaves like all standard buttons.
  function handleKeyPress(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onToggleRecord) onToggleRecord();
    }
  }

  // Determine dynamic aria-label based on current recording state
  // Screen readers will say this label when the user focuses the button
  const ariaLabel = isRecording
    ? "Stop recording. Press Space or Enter to stop."
    : "Start recording. Press Space or Enter to speak a command.";

  return (
    <div className="talk-wrapper">
      {/*
        Hidden keyboard shortcut hint — linked via aria-describedby.
        Screen readers read: "[aria-label] ... [aria-describedby hint]"
        This text is invisible visually (sr-only class) but spoken by screen readers.
      */}
      <p id="mic-hint" className="sr-only">
        Keyboard shortcut: press Space from anywhere on the page to toggle the microphone.
      </p>

      <button
        ref={buttonRef}
        id="btn-talk"
        type="button"
        className={`btn-talk ${isRecording ? "recording" : ""} ${mode === "processing" ? "processing" : ""}`}
        aria-label={ariaLabel}
        aria-pressed={isRecording}
        aria-describedby="mic-hint"
        tabIndex={0}
        onClick={onToggleRecord}
        onKeyDown={handleKeyPress}
        disabled={mode === "processing"}  /* Can't re-press while Whisper is running */
      >
        {/* aria-hidden hides the emoji from screen readers — the aria-label describes it */}
        <span className="mic-icon" aria-hidden="true">
          {mode === "processing" ? "⏳" : isRecording ? "⏹" : "🎙"}
        </span>
        <span className="btn-talk-label">
          {mode === "processing"
            ? "Processing…"
            : isRecording
            ? "Tap to Stop"
            : "Press & Hold to Talk"}
        </span>
      </button>
    </div>
  );
}
