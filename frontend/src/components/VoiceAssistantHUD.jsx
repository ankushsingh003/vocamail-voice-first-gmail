import React, { useState, useEffect, useRef } from "react";
import "./VoiceAssistantHUD.css";

export default function VoiceAssistantHUD({
  voiceState = "idle",
  subtitle = "",
  transcript = "",
  audioUrl = null,
  onStartListening,
  onStopListening,
  onAudioEnded,
}) {
  const [isCardOpen, setIsCardOpen] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch((err) => {
        console.warn("[VocaMail Voice HUD] Audio autoplay blocked or failed:", err);
      });
    }
  }, [audioUrl]);

  function handlePillClick() {
    if (voiceState === "recording") {
      onStopListening && onStopListening();
    } else if (voiceState === "idle" || voiceState === "speaking") {
      onStartListening && onStartListening();
    }
  }

  function getStatusLabel() {
    switch (voiceState) {
      case "recording":
        return "Listening...";
      case "processing":
        return "Transcribing with Whisper...";
      case "speaking":
        return "Speaking...";
      case "idle":
      default:
        return "VocaMail Voice";
    }
  }

  function getSubtext() {
    if (subtitle) return subtitle;
    switch (voiceState) {
      case "recording":
        return "Speak your command clearly...";
      case "processing":
        return "Analyzing intent & Gmail actions...";
      case "speaking":
        return "Playing voice audio...";
      case "idle":
      default:
        return "Hold Spacebar or Click to Speak";
    }
  }

  return (
    <aside className="voice-hud-container" aria-label="VocaMail Voice Assistant">
      {}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          border: 0,
        }}
      >
        {subtitle || getStatusLabel()}
      </div>

      {}
      <audio
        ref={audioRef}
        onEnded={() => onAudioEnded && onAudioEnded()}
        preload="auto"
      />

      {}
      {isCardOpen && (
        <section className="voice-hud-card" aria-label="Voice command helper">
          <div className="voice-hud-card-header">
            <span className="voice-hud-card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Voice Transcript & Commands
            </span>
            <button
              type="button"
              className="voice-hud-card-close"
              title="Close panel"
              aria-label="Close voice commands panel"
              onClick={() => setIsCardOpen(false)}
            >
              ✕
            </button>
          </div>

          {}
          {transcript && (
            <div className="voice-hud-transcript">
              <strong>You said:</strong> "{transcript}"
            </div>
          )}

          {}
          <div className="voice-hud-tips">
            <div className="voice-tip-item">
              <span className="voice-tip-code">"Read my unread emails"</span>
              <span>— reads top unread list</span>
            </div>
            <div className="voice-tip-item">
              <span className="voice-tip-code">"Read email 1"</span>
              <span>— opens and speaks email body</span>
            </div>
            <div className="voice-tip-item">
              <span className="voice-tip-code">"Search for meeting"</span>
              <span>— filters your inbox</span>
            </div>
            <div className="voice-tip-item">
              <span className="voice-tip-code">"Compose to john@..."</span>
              <span>— opens voice composer</span>
            </div>
            <div className="voice-tip-item">
              <span className="voice-tip-code">"Archive this"</span>
              <span>— moves email to archive</span>
            </div>
          </div>
        </section>
      )}

      {}
      <button
        type="button"
        className={`voice-hud-pill ${voiceState}`}
        onClick={handlePillClick}
        aria-label={`${getStatusLabel()} - Click to activate voice assistant`}
      >
        {}
        <div className="voice-hud-mic-circle">
          {voiceState === "recording" || voiceState === "speaking" ? (
            <div className="voice-equalizer" aria-hidden="true">
              <span className="voice-bar" />
              <span className="voice-bar" />
              <span className="voice-bar" />
              <span className="voice-bar" />
              <span className="voice-bar" />
            </div>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </div>

        {}
        <div className="voice-hud-text-area">
          <span className="voice-hud-status">{getStatusLabel()}</span>
          <span className="voice-hud-sub" title={getSubtext()}>
            {getSubtext()}
          </span>
        </div>

        {}
        <span className="voice-hud-badge" title="Press & hold Spacebar to talk">
          Space
        </span>

        {}
        <div
          role="button"
          tabIndex={0}
          title="Toggle voice commands guide"
          aria-label="Toggle voice commands guide"
          onClick={(e) => {
            e.stopPropagation();
            setIsCardOpen((prev) => !prev);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setIsCardOpen((prev) => !prev);
            }
          }}
          style={{
            marginLeft: "4px",
            display: "inline-flex",
            alignItems: "center",
            opacity: 0.8,
            cursor: "pointer",
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
      </button>
    </aside>
  );
}
