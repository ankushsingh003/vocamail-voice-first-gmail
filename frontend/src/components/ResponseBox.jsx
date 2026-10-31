/**
 * frontend/src/components/ResponseBox.jsx — Spoken Assistant Output Bubble
 * =========================================================================
 * Think of this component like the assistant's mouth AND subtitles combined.
 *
 * It serves two audiences simultaneously:
 *   1. Sighted users   : Displays the assistant's text reply in a clean glowing bubble.
 *   2. Blind users     : Feeds the same text into an ARIA live region that tells
 *                        the screen reader to SPEAK the text aloud in real time.
 *
 * Phase 5 ARIA upgrades:
 *   - Two live regions: one "polite" for normal replies (waits for screen reader to finish
 *     speaking), and one "assertive" for urgent status updates like "Listening…" or
 *     "Processing…" (interrupts whatever the screen reader is saying immediately).
 *   - aria-atomic="true" : Reads the full message every time, not just changed words.
 *   - role="log"         : Semantically marks the visible bubble as a conversation log
 *                          so screen readers understand it contains a live conversation.
 *
 * How "polite" vs "assertive" ARIA live regions work:
 *   - aria-live="polite"    → Screen reader finishes its current sentence, THEN reads the update.
 *                             Good for: email transcripts, assistant replies.
 *   - aria-live="assertive" → Screen reader IMMEDIATELY interrupts and reads the update NOW.
 *                             Good for: "Listening…", "Processing…", error messages.
 */

import React from "react";
import "./ResponseBox.css";

// These status messages are urgent — the user needs to know RIGHT NOW
// that the mic turned on or that processing started, without waiting.
const URGENT_MESSAGES = [
  "Listening",
  "Processing",
  "Microphone error",
  "Error:",
];

function isUrgent(message) {
  return URGENT_MESSAGES.some((keyword) =>
    message?.toLowerCase().startsWith(keyword.toLowerCase())
  );
}

export default function ResponseBox({
  message = "Signed in! Gmail access is active. Say something or press Space to begin.",
}) {
  const urgent = isUrgent(message);

  return (
    <>
      {/* ---- Assertive live region for urgent status updates ----
          Screen reader interrupts immediately for: "Listening…", "Processing…", errors.
          aria-atomic means the WHOLE message is read, not just the changed word. */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {urgent ? message : ""}
      </div>

      {/* ---- Polite live region for normal assistant replies ----
          Screen reader waits for a natural pause before reading.
          Used for: email summaries, transcripts, help text. */}
      <div
        id="aria-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {urgent ? "" : message}
      </div>

      {/* ---- Visible assistant reply bubble ----
          role="log" tells assistive tech: "this is a live conversation feed".
          aria-label gives it a meaningful name instead of just "region". */}
      <div
        className="response-box"
        role="log"
        aria-label="Assistant response"
        aria-live="off"   /* The hidden regions above handle announcements — no double-reading */
      >
        <p id="response-text" className="response-text">
          {message}
        </p>
      </div>
    </>
  );
}
