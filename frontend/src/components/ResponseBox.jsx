import React from "react";
import "./ResponseBox.css";

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
      {}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {urgent ? message : ""}
      </div>

      {}
      <div
        id="aria-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {urgent ? "" : message}
      </div>

      {}
      <div
        className="response-box"
        role="log"
        aria-label="Assistant response"
        aria-live="off"   
      >
        <p id="response-text" className="response-text">
          {message}
        </p>
      </div>
    </>
  );
}
