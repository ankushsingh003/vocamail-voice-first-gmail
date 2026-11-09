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
