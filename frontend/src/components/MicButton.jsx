import React, { useEffect, useRef } from "react";
import "./MicButton.css";

export default function MicButton({ isRecording = false, onToggleRecord, mode = "idle" }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || e.target?.isContentEditable;

      if (e.code === "Space" && !isTyping) {
        e.preventDefault();
        if (onToggleRecord) onToggleRecord();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleRecord]);

  useEffect(() => {
    if (mode === "idle" && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [mode]);

  function handleKeyPress(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onToggleRecord) onToggleRecord();
    }
  }

  const ariaLabel = isRecording
    ? "Stop recording. Press Space or Enter to stop."
    : "Start recording. Press Space or Enter to speak a command.";

  return (
    <div className="talk-wrapper">
      {}
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
        disabled={mode === "processing"}  
      >
        {}
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
