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
 */

import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import LoginCard from "./components/LoginCard";
import StatusBadge from "./components/StatusBadge";
import MicButton from "./components/MicButton";
import ResponseBox from "./components/ResponseBox";
import EmailList from "./components/EmailList";
import "./App.css";

export default function App() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Assistant & voice recording states
  const [mode, setMode] = useState("idle"); // "idle" | "listening" | "processing" | "speaking"
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState(
    "Signed in! Gmail access is active. Say something or press Space to begin."
  );

  // Check login status on page mount
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

  // Handler: push-to-talk button toggle (will connect to recorder.js in Phase 2)
  function handleToggleRecord() {
    if (isRecording) {
      // Stopping recording
      setIsRecording(false);
      setMode("processing");
      setMessage("Thinking… (Voice pipeline connects in Phase 2)");
      setTimeout(() => {
        setMode("idle");
      }, 1500);
    } else {
      // Starting recording
      setIsRecording(true);
      setMode("listening");
      setMessage("Listening… Speak your command now!");
    }
  }

  // Helper for components to announce messages to both the visual bubble and ARIA
  function handleAnnounce(text) {
    setMessage(text);
  }

  // Handle logout
  function handleLogout() {
    setIsLoggedIn(false);
  }

  // Loading spinner while checking initial session status
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
