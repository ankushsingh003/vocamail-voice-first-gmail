/**
 * frontend/src/App.jsx — Root Application Orchestrator
 * ======================================================
 * Think of this component like the conductor of an orchestra.
 *
 * Responsibilities:
 *   1. When you first open the page, quietly calls `/api/session` to check
 *      if you are already logged in with Google.
 *   2. If NOT logged in: Displays the `<LoginCard />`.
 *   3. If LOGGED IN: Displays the complete voice dashboard:
 *      - `<Header />` (Logo + Sign Out)
 *      - `<StatusBadge />` (Glowing LED status)
 *      - `<MicButton />` (Circular Talk button)
 *      - `<DraftCard />` (Live voice email draft card when composing)
 *      - `<ResponseBox />` (Spoken assistant bubble + ARIA announcer)
 *      - `<EmailList />` (Inbox message cards)
 *
 * Voice pipeline:
 *   - Phase 2: mic capture → Whisper transcription
 *   - Phase 3: gTTS audio reply auto-plays through hidden <audio> element
 *   - Phase 4: Intent parsing ("read inbox", "read email 1", "help")
 *   - Phase 5: Complete keyboard and ARIA screen reader accessibility
 *   - Phase 6: Multi-turn email composition with live DraftCard visualizer
 */

import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import LoginCard from "./components/LoginCard";
import StatusBadge from "./components/StatusBadge";
import MicButton from "./components/MicButton";
import DraftCard from "./components/DraftCard";
import ResponseBox from "./components/ResponseBox";
import EmailList from "./components/EmailList";

// Import the real microphone recorder from audioRecorder.js
import { startRecording, stopRecording } from "./utils/audioRecorder";

import "./App.css";

export default function App() {
  // ---- Authentication state ----
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ---- Assistant & voice recording states ----
  // mode controls the glowing LED badge and mic button appearance:
  //   "idle"       = ready, waiting for user input
  //   "listening"  = mic is active, recording in progress
  //   "processing" = audio sent to Whisper, waiting for result
  //   "speaking"   = gTTS audio is currently playing through the speakers
  const [mode, setMode] = useState("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState(
    "Signed in! Gmail access is active. Say something or press Space to begin."
  );

  // ---- Conversation memory state (from Flask core.state) ----
  // Holds multi-turn information like whether we're composing an email,
  // what question we're currently asking, and current draft fields.
  const [vocamailState, setVocamailState] = useState({
    mode: "idle",
    compose_step: null,
    draft: { to: null, subject: null, body: null },
  });

  // ---- Hidden <audio> element reference ----
  // When Flask returns an audio_url (the gTTS MP3), we load it and play it.
  // This is the key accessibility feature: blind users hear the reply aloud!
  const audioRef = useRef(null);

  // ---- Check login status on page mount ----
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(Boolean(data.logged_in));
          if (data.state) {
            setVocamailState(data.state);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.warn("[VocaMail] Session check:", err.message);
        setIsLoggedIn(false);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  // ---- Handler: Push-to-Talk mic button toggle ----
  // First press  → activates mic + plays start beep
  // Second press → stops mic + plays stop beep + posts audio to Flask
  async function handleToggleRecord() {
    if (isRecording) {
      // === STOP: finish recording and send to Flask ===

      setIsRecording(false);
      setMode("processing");
      setMessage("Processing… Whisper is listening to your voice.");

      try {
        // stopRecording() returns a Promise resolving to the audio Blob
        const audioBlob = await stopRecording();

        // Build a FormData payload — Flask reads it as request.files["audio"]
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        // POST the audio to our Flask /api/voice endpoint
        const res = await fetch("/api/voice", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          if (res.status === 401) {
            setIsLoggedIn(false);
            throw new Error("Session expired. Please sign in with Google again.");
          }
          let errorMsg = `Server error ${res.status}`;
          try {
            const err = await res.json();
            if (err && err.error) errorMsg = err.error;
          } catch {
            const raw = await res.text().catch(() => "");
            if (raw && raw.length < 100) errorMsg = raw;
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();

        // Update conversation memory state (e.g. composing mode, draft values)
        if (data.state) {
          setVocamailState(data.state);
        }

        // Show the transcript / assistant response in the response bubble
        const displayText = data.text || data.transcript || "(No speech detected)";
        setMessage(displayText);

        // ---- Play the gTTS spoken audio reply ----
        if (data.audio_url && audioRef.current) {
          setMode("speaking");
          audioRef.current.src = data.audio_url;

          try {
            await audioRef.current.play();
          } catch (playErr) {
            console.warn("[VocaMail] Audio autoplay blocked:", playErr.message);
          }
        } else {
          setMode("idle");
        }

      } catch (err) {
        console.error("[VocaMail] Voice pipeline error:", err);
        setMessage(`Error: ${err.message}. Please try again.`);
        setMode("idle");
      }

    } else {
      // === START: request microphone access and begin recording ===

      try {
        await startRecording();
        setIsRecording(true);
        setMode("listening");
        setMessage("Listening… Speak your command now!");
      } catch (err) {
        console.error("[VocaMail] Could not start recording:", err);
        setMessage(`Microphone error: ${err.message}`);
        setMode("idle");
      }
    }
  }

  // ---- When the spoken audio reply finishes playing ----
  function handleAudioEnded() {
    setMode("idle");
  }

  // ---- Helper: let child components show messages in the response bubble ----
  function handleAnnounce(text) {
    setMessage(text);
  }

  // ---- Handle logout ----
  function handleLogout() {
    setIsLoggedIn(false);
  }

  // ---- Loading spinner while checking initial session status ----
  if (isCheckingAuth) {
    return (
      <main id="main-content">
        <div className="app-loading" role="status" aria-live="polite">
          <p>✦ Initializing VocaMail…</p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content">
      {/*
        Hidden <audio> element — the voice output speaker.
        Starts automatically when gTTS returns an audio URL.
      */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        aria-hidden="true"
        style={{ display: "none" }}
      />

      {!isLoggedIn ? (
        // Screen A: Login Card
        <LoginCard />
      ) : (
        // Screen B: Main Voice Dashboard
        <section className="voice-screen" aria-labelledby="app-heading">
          {/* Top header navigation */}
          <Header onLogout={handleLogout} />

          {/* Voice hero title and Spacebar instruction */}
          <div className="voice-hero">
            <h1 id="app-heading" className="voice-title">Your inbox, by voice.</h1>
            <p className="voice-subtitle">
              Press <kbd>Space</kbd> or tap the button to start talking.
            </p>
          </div>

          {/* Glowing Status LED indicator */}
          <StatusBadge mode={mode} />

          {/* The Big Circular Push-to-Talk button */}
          <MicButton
            isRecording={isRecording}
            onToggleRecord={handleToggleRecord}
            mode={mode}
          />

          {/* Live Email Draft Card (visible during multi-turn email compose) */}
          {vocamailState.mode === "composing" && (
            <DraftCard
              draft={vocamailState.draft}
              step={vocamailState.compose_step}
            />
          )}

          {/* Spoken Assistant Bubble + ARIA live region */}
          <ResponseBox message={message} />

          {/* Gmail Inbox Fetching & Display Panel */}
          <EmailList onAnnounce={handleAnnounce} />
        </section>
      )}
    </main>
  );
}
