import React from "react";
import "./SettingsModal.css";

export default function SettingsModal({
  isOpen = false,
  onClose,
  settings = { density: "default", voiceSpeed: "normal", soundCues: true },
  onUpdateSettings,
}) {
  if (!isOpen) return null;

  return (
    <div className="settings-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        {}
        <div className="settings-header">
          <h2 className="settings-title">Quick settings</h2>
          <button
            type="button"
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {}
        <div className="settings-body">
          {}
          <div className="settings-section">
            <span className="settings-section-label">Voice & Accessibility</span>

            <div
              className="settings-option-card"
              onClick={() =>
                onUpdateSettings &&
                onUpdateSettings({ ...settings, soundCues: !settings.soundCues })
              }
            >
              <div>
                <div className="settings-option-title">Microphone Beep Tones</div>
                <div className="settings-option-desc">Play audio tone when recording starts/stops</div>
              </div>
              <div className={`settings-toggle ${settings.soundCues ? "checked" : ""}`}>
                <div className="settings-toggle-thumb" />
              </div>
            </div>

            <div
              className="settings-option-card"
              onClick={() =>
                onUpdateSettings &&
                onUpdateSettings({
                  ...settings,
                  voiceSpeed: settings.voiceSpeed === "fast" ? "normal" : "fast",
                })
              }
            >
              <div>
                <div className="settings-option-title">Voice Narration Speed</div>
                <div className="settings-option-desc">
                  Current: {settings.voiceSpeed === "fast" ? "Fast (1.25x)" : "Standard (1.0x)"}
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="settings-section">
            <span className="settings-section-label">Density</span>
            {["default", "comfortable", "compact"].map((d) => (
              <div
                key={d}
                className={`settings-option-card ${settings.density === d ? "active" : ""}`}
                onClick={() => onUpdateSettings && onUpdateSettings({ ...settings, density: d })}
              >
                <div>
                  <div className="settings-option-title" style={{ textTransform: "capitalize" }}>
                    {d}
                  </div>
                  <div className="settings-option-desc">
                    {d === "default" && "Optimal spacing for mouse and touch"}
                    {d === "comfortable" && "Spacious view for easy reading"}
                    {d === "compact" && "Fit more messages on screen"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
