import React from "react";
import "./DraftCard.css";

export default function DraftCard({ draft = {}, step = "recipient" }) {
  const stepLabels = {
    recipient: "Step 1: Recipient",
    subject:   "Step 2: Subject",
    body:      "Step 3: Message Body",
    confirm:   "Step 4: Confirm to Send",
  };

  const currentStepLabel = stepLabels[step] || "Composing";

  return (
    <section
      className="draft-card"
      role="region"
      aria-label="Active email draft"
      aria-live="polite"
    >
      <div className="draft-header">
        <div className="draft-title-group">
          <span className="draft-icon" aria-hidden="true">✉️</span>
          <h2 className="draft-title">Active Email Draft</h2>
        </div>
        <span className="draft-step-badge" aria-label={`Current status: ${currentStepLabel}`}>
          {currentStepLabel}
        </span>
      </div>

      <div className="draft-fields">
        {}
        <div className="draft-row">
          <span className="draft-label" id="draft-to-label">To:</span>
          <div
            className={`draft-value ${!draft.to ? "empty" : ""}`}
            aria-labelledby="draft-to-label"
          >
            {draft.to || "(Waiting for recipient address…)"}
          </div>
        </div>

        {}
        <div className="draft-row">
          <span className="draft-label" id="draft-sub-label">Subject:</span>
          <div
            className={`draft-value ${!draft.subject ? "empty" : ""}`}
            aria-labelledby="draft-sub-label"
          >
            {draft.subject || "(Waiting for subject…)"}
          </div>
        </div>

        {}
        <div className="draft-row">
          <span className="draft-label" id="draft-body-label">Message:</span>
          <div
            className={`draft-value body-text ${!draft.body ? "empty" : ""}`}
            aria-labelledby="draft-body-label"
          >
            {draft.body || "(Waiting for message body…)"}
          </div>
        </div>
      </div>

      <p className="draft-hint">
        💡 Tip: Say <kbd>yes</kbd> to send when prompted, or say <kbd>cancel</kbd> at any time to discard.
      </p>
    </section>
  );
}
