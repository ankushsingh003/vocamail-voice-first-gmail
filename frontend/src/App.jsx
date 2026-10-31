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
 *      - `<ResponseBox />` (Spoken assistant bubble + ARIA announcer)
 *      - `<EmailList />` (Inbox message cards)
 *
 * Phase 2 additions:
 *   - handleToggleRecord() is now wired to the real browser microphone via audioRecorder.js
 *   - startRecording() captures voice, stopRecording() returns the audio Blob
 *   - The Blob is sent to POST /api/voice → Whisper transcribes → transcript shown on screen
 *   - Mode transitions: idle → listening → processing → idle (drives StatusBadge + MicButton UI)
 */

import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import LoginCard from "./components/LoginCard";
import StatusBadge from "./components/StatusBadge";
import MicButton from "./components/MicButton";
import ResponseBox from "./components/ResponseBox";
import EmailList from "./components/EmailList";

// Import the real microphone recorder we built in audioRecorder.js
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
  //   "speaking"   = (Phase 3) reading the response aloud
  const [mode, setMode] = useState("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState(
    "Signed in! Gmail access is active. Say something or press Space to begin."
  );

  // ---- Check login status on page mount ----
  // As soon as the page loads, we silently ping Flask to see if there is an active session.
  // No need to ask the user to log in if they already did 5 minutes ago!
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(Boolean(data.logged_in));
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
  // This is the heart of the voice pipeline:
  //   First press  → asks the browser for mic permission, plays start beep, starts recording
  //   Second press → plays stop beep, sends audio to Whisper, displays transcript
  async function handleToggleRecord() {
    if (isRecording) {
      // === STOP: finish recording and send to Flask ===

      setIsRecording(false);
      setMode("processing");
      setMessage("Processing… Whisper is listening to your voice.");

      try {
        // stopRecording() returns a Promise that resolves to the raw audio Blob
        const audioBlob = await stopRecording();

        // Build a FormData payload — Flask reads it as request.files["audio"]
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        // POST the audio to our Flask /api/voice endpoint
        const res = await fetch("/api/voice", {
          method: "POST",
          body: formData,
          // Note: do NOT set Content-Type header — the browser sets it automatically
          // with the correct multipart boundary when using FormData
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown server error" }));
          throw new Error(err.error || `Server error ${res.status}`);
        }

        const data = await res.json();

        // Show the transcript that Whisper returned
        const transcript = data.transcript || "(No speech detected)";
        setMessage(`You said: "${transcript}"`);
        setMode("idle");

      } catch (err) {
        // Something went wrong — show a friendly error message
        console.error("[VocaMail] Voice pipeline error:", err);
        setMessage(`Error: ${err.message}. Please try again.`);
        setMode("idle");
      }

    } else {
      // === START: request microphone access and begin recording ===

      try {
        await startRecording();   // plays start beep + activates mic
        setIsRecording(true);
        setMode("listening");
        setMessage("Listening… Speak your command now!");
      } catch (err) {
        // User denied mic access or browser doesn't support it
        console.error("[VocaMail] Could not start recording:", err);
        setMessage(`Microphone error: ${err.message}`);
        setMode("idle");
      }
    }
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
          />

          {/* Spoken Assistant Bubble + ARIA live region */}
          <ResponseBox message={message} />

          {/* Gmail Inbox Fetching & Display Panel */}
          <EmailList onAnnounce={handleAnnounce} />
        </section>
      )}
    </main>
  );
}
