/**
 * frontend/src/components/BriefingModal.jsx — Morning Executive Briefing Card
 * ============================================================================
 * Provides an audio podcast daily digest and structured executive briefing:
 *   - Auto-plays the 60-second podcast audio.
 *   - Displays Urgent Action Items with one-click deep link to open the email.
 *   - Groups Key Updates and summarizes triaged background noise.
 */

import React, { useState, useEffect, useRef } from "react";
import "./BriefingModal.css";

export default function BriefingModal({
  isOpen = false,
  onClose,
  briefingData = null,
  isLoading = false,
  onOpenEmail,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isOpen && briefingData?.audio_url && audioRef.current) {
      audioRef.current.src = briefingData.audio_url;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(false);
    }
  }, [isOpen, briefingData]);

  if (!isOpen) return null;

  function toggleAudio() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }

  const urgent = briefingData?.urgent || [];
  const updates = briefingData?.updates || [];
  const noiseCount = briefingData?.noise_count || 0;

  return (
    <div className="briefing-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="briefing-card" onClick={(e) => e.stopPropagation()}>
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
        />

        {/* 1. Header */}
        <div className="briefing-header">
          <div className="briefing-header-left">
            <span className="briefing-header-badge">⚡ AI Podcast</span>
            <h2 className="briefing-header-title">Morning Executive Briefing</h2>
          </div>
          <button
            type="button"
            className="briefing-close-btn"
            onClick={onClose}
            aria-label="Close briefing"
          >
            ✕
          </button>
        </div>

        {/* 2. Audio Podcast Player Bar */}
        <div className="briefing-audio-bar">
          <div className="briefing-audio-info">
            <span>🎙️</span>
            <span>60-Second Daily Audio Digest</span>
          </div>
          <button
            type="button"
            className="briefing-play-btn"
            onClick={toggleAudio}
            disabled={isLoading || !briefingData?.audio_url}
          >
            {isPlaying ? "⏸️ Pause Audio" : "▶️ Play Podcast"}
          </button>
        </div>

        {/* 3. Content Body */}
        <div className="briefing-body">
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#5f6368" }}>
              <div className="gmail-loading-spinner" style={{ margin: "0 auto 16px" }} />
              <p>Analyzing your unread messages and preparing your podcast...</p>
            </div>
          ) : (
            <>
              {/* Urgent Action Items Section */}
              {urgent.length > 0 && (
                <section className="briefing-section">
                  <div className="briefing-section-title urgent">
                    <span>🔴</span>
                    <span>High Priority Action Items ({urgent.length})</span>
                  </div>
                  {urgent.map((item) => (
                    <div
                      key={item.id}
                      className="briefing-item-card"
                      onClick={() => {
                        onClose();
                        if (onOpenEmail) onOpenEmail(item);
                      }}
                      title="Click to open this email"
                    >
                      <div className="briefing-item-header">
                        <span className="briefing-item-sender">{item.sender}</span>
                        <span className="briefing-item-badge">Needs Action</span>
                      </div>
                      <div className="briefing-item-subject">{item.subject}</div>
                      <div className="briefing-item-snippet">{item.snippet}</div>
                    </div>
                  ))}
                </section>
              )}

              {/* General Updates Section */}
              {updates.length > 0 && (
                <section className="briefing-section">
                  <div className="briefing-section-title updates">
                    <span>🔵</span>
                    <span>Key Updates ({updates.length})</span>
                  </div>
                  {updates.map((item) => (
                    <div
                      key={item.id}
                      className="briefing-item-card"
                      onClick={() => {
                        onClose();
                        if (onOpenEmail) onOpenEmail(item);
                      }}
                      title="Click to open this email"
                    >
                      <div className="briefing-item-header">
                        <span className="briefing-item-sender">{item.sender}</span>
                      </div>
                      <div className="briefing-item-subject">{item.subject}</div>
                      <div className="briefing-item-snippet">{item.snippet}</div>
                    </div>
                  ))}
                </section>
              )}

              {urgent.length === 0 && updates.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#5f6368" }}>
                  <p>🎉 All caught up! You have no pending action items in your inbox.</p>
                </div>
              )}

              {/* Noise Summary Tag */}
              {noiseCount > 0 && (
                <div className="briefing-noise-pill">
                  <span>🧹</span>
                  <span>{noiseCount} promotional & newsletter emails automatically organized.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 4. Footer */}
        <div className="briefing-footer">
          <button type="button" className="briefing-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
