/**
 * frontend/src/components/StatusBadge.jsx — Assistant State Indicator
 * ====================================================================
 * Think of this component like a tiny traffic light on the dashboard.
 * It lets the user instantly know if the assistant is:
 *   - Idle ("Ready")
 *   - Recording your voice ("Listening...")
 *   - Thinking / contacting Gmail ("Processing...")
 *   - Talking back ("Speaking...")
 * 
 * It also updates the ARIA attributes so blind screen-reader users hear
 * the status changes in real-time.
 */

import React from "react";
import "./StatusBadge.css";

const STATUS_LABELS = {
  idle: "Ready",
  listening: "Listening…",
  processing: "Processing…",
  speaking: "Speaking…",
};

export default function StatusBadge({ mode = "idle" }) {
  const label = STATUS_LABELS[mode] || "Ready";

  return (
    <div
      id="status-indicator"
      className={`status-badge status-${mode}`}
      role="status"
      aria-label={`${label} — assistant status`}
    >
      <span className="status-dot" aria-hidden="true" />
      <span id="status-text">{label}</span>
    </div>
  );
}
