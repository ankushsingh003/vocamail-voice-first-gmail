/**
 * frontend/src/App.jsx — Authentic Real-World Gmail Web App with Voice Integration
 * ================================================================================
 * Matches the layout and functionality of the real Gmail web application
 * (as provided in the user's screenshot), augmented with a senior-developer-grade
 * voice function naturally integrated across every component:
 *
 * 1. Top Navbar (<GmailNavbar />):
 *    - Hamburger toggle, Google/Gmail logo.
 *    - Global Search bar with filters and embedded Voice Search microphone.
 *    - Account avatar with real-time profile info and sign out.
 *
 * 2. Left Sidebar (<GmailSidebar />):
 *    - Authentic "+ Compose" pill button (opens floating compose window).
 *    - Folders: Inbox (with unread badge), Starred, Snoozed, Sent, Drafts, Trash.
 *    - Collapsible state & Labels list.
 *
 * 3. Main Central Content Pane:
 *    - If an email is selected: displays <GmailDetailView /> with full message body,
 *      reply/forward tools, and an explicit "🔊 Listen to Email" voice narration banner.
 *    - If no email selected: displays <GmailEmailTable /> with Primary / Promotions /
 *      Social / Updates category tabs, toolbar, and hover action buttons.
 *
 * 4. Floating Compose Window (<GmailComposeModal />):
 *    - Authentic bottom-right docked modal with To, Subject, Body, and
 *      dedicated Voice Dictation button ("🎙️ Voice Compose").
 *
 * 5. Floating Senior Developer Voice HUD (<VoiceAssistantHUD />):
 *    - Interactive bottom-right floating pill with real-time soundwave visualizer.
 *    - Dynamic states: IDLE, RECORDING, PROCESSING, SPEAKING.
 *    - ARIA live region subtitles for screen readers.
 *    - Expandable voice command cheat sheet.
 *    - Push-to-talk with global Spacebar shortcut and audio playback.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import GmailNavbar from "./components/GmailNavbar";
import GmailSidebar from "./components/GmailSidebar";
import GmailEmailTable from "./components/GmailEmailTable";
import GmailDetailView from "./components/GmailDetailView";
import GmailComposeModal from "./components/GmailComposeModal";
import VoiceAssistantHUD from "./components/VoiceAssistantHUD";
import LoginCard from "./components/LoginCard";

// Microphone capture utility
import { startRecording, stopRecording } from "./utils/audioRecorder";

import "./App.css";

export default function App() {
  // ---- Authentication & User Info ----
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState({ name: "User", email: "" });

  // ---- Email Navigation & Data ----
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [emails, setEmails] = useState([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isNarratingEmail, setIsNarratingEmail] = useState(false);

  // ---- UI State ----
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState({ to: "", subject: "", body: "" });
  const [isSending, setIsSending] = useState(false);

  // ---- Voice Assistant States ----
  const [voiceState, setVoiceState] = useState("idle"); // "idle" | "recording" | "processing" | "speaking"
  const [isRecording, setIsRecording] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [vocamailState, setVocamailState] = useState({
    mode: "idle",
    compose_step: null,
    draft: { to: null, subject: null, body: null },
  });

  // Track recording state in ref for keyboard events
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecording;

  // --------------------------------------------------------------------------
  // 1. Initial Session Check on App Load
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const data = await res.json();
          if (data.logged_in) {
            setIsLoggedIn(true);
            if (data.user) {
              setUserProfile({
                name: data.user.name || "User",
                email: data.user.email || "",
              });
            }
            if (data.state) {
              setVocamailState(data.state);
            }
          } else {
            setIsLoggedIn(false);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.warn("[VocaMail] Session check warning:", err.message);
        setIsLoggedIn(false);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // --------------------------------------------------------------------------
  // 2. Fetch Emails for Active Folder or Search Query
  // --------------------------------------------------------------------------
  const loadEmails = useCallback(async (folder = activeFolder, query = "") => {
    setIsLoadingEmails(true);
    try {
      let url = `/api/inbox?limit=50&label=${encodeURIComponent(folder)}`;
      if (query.trim()) {
        url = `/api/search?q=${encodeURIComponent(query.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.messages || []);
      } else if (res.status === 401) {
        setIsLoggedIn(false);
      }
    } catch (err) {
      console.error("[VocaMail] Error fetching emails:", err);
    } finally {
      setIsLoadingEmails(false);
    }
  }, [activeFolder]);

  // Load emails when user logs in or switches folders
  useEffect(() => {
    if (isLoggedIn) {
      loadEmails(activeFolder, searchQuery);
    }
  }, [isLoggedIn, activeFolder, loadEmails]);

  // --------------------------------------------------------------------------
  // 3. Email Actions (Open, Archive, Trash, Star, Mark Read)
  // --------------------------------------------------------------------------
  async function handleOpenEmail(emailSummary) {
    try {
      const res = await fetch(`/api/email/${encodeURIComponent(emailSummary.id)}`);
      if (res.ok) {
        const fullEmail = await res.json();
        setSelectedEmail(fullEmail);
      } else {
        setSelectedEmail(emailSummary);
      }
    } catch {
      setSelectedEmail(emailSummary);
    }
  }

  async function handleArchiveEmail(id) {
    try {
      await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      // Remove or update locally
      setEmails((prev) => prev.filter((m) => m.id !== id));
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail(null);
      }
      setSubtitle("Email archived.");
    } catch (err) {
      console.error("[VocaMail] Archive error:", err);
    }
  }

  async function handleTrashEmail(id) {
    try {
      await fetch("/api/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEmails((prev) => prev.filter((m) => m.id !== id));
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail(null);
      }
      setSubtitle("Email moved to Trash.");
    } catch (err) {
      console.error("[VocaMail] Trash error:", err);
    }
  }

  async function handleMarkRead(id) {
    try {
      await fetch("/api/mark_read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEmails((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_unread: false } : m))
      );
    } catch (err) {
      console.error("[VocaMail] Mark read error:", err);
    }
  }

  async function handleToggleStar(id, currentStar) {
    const nextStar = !currentStar;
    try {
      await fetch("/api/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, star: nextStar }),
      });
      setEmails((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_starred: nextStar } : m))
      );
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail((prev) => ({ ...prev, is_starred: nextStar }));
      }
    } catch (err) {
      console.error("[VocaMail] Toggle star error:", err);
    }
  }

  // --------------------------------------------------------------------------
  // 4. Compose & Reply Actions
  // --------------------------------------------------------------------------
  function handleOpenCompose(initial = { to: "", subject: "", body: "" }) {
    setComposeDraft(initial);
    setIsComposeOpen(true);
  }

  function handleReply(email) {
    handleOpenCompose({
      to: email.sender || "",
      subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ""}`,
      body: `\n\n--- On ${email.date || "recent"}, ${email.sender} wrote: ---\n${email.body || email.snippet || ""}`,
    });
  }

  function handleForward(email) {
    handleOpenCompose({
      to: "",
      subject: email.subject?.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject || ""}`,
      body: `\n\n---------- Forwarded message ---------\nFrom: ${email.sender}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body || email.snippet || ""}`,
    });
  }

  async function handleSendEmail(draft) {
    setIsSending(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setIsComposeOpen(false);
        setComposeDraft({ to: "", subject: "", body: "" });
        setSubtitle("Email sent successfully!");
        loadEmails();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to send email. Please check recipient address.");
      }
    } catch (err) {
      console.error("[VocaMail] Send error:", err);
      alert("Error sending email.");
    } finally {
      setIsSending(false);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Voice Reading Narration for Current Email
  // --------------------------------------------------------------------------
  function handleVoiceReadEmail(email) {
    if (isNarratingEmail) {
      // Stop reading
      window.speechSynthesis?.cancel();
      setIsNarratingEmail(false);
      setVoiceState("idle");
      return;
    }

    const textToRead = `${email.subject || "No subject"}. From ${email.sender || "unknown"}. ${email.body || email.snippet || "Empty message"}`;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onstart = () => {
        setIsNarratingEmail(true);
        setVoiceState("speaking");
        setSubtitle(`Reading: ${email.subject}`);
      };
      utterance.onend = () => {
        setIsNarratingEmail(false);
        setVoiceState("idle");
      };
      utterance.onerror = () => {
        setIsNarratingEmail(false);
        setVoiceState("idle");
      };
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported on this browser.");
    }
  }

  // --------------------------------------------------------------------------
  // 6. Senior-Developer Push-to-Talk Voice Pipeline
  // --------------------------------------------------------------------------
  async function handleStartListening() {
    if (isRecordingRef.current) return;
    try {
      await startRecording();
      setIsRecording(true);
      setVoiceState("recording");
      setSubtitle("Listening... Speak your command now.");
    } catch (err) {
      console.error("[VocaMail Voice] Mic start error:", err);
      setSubtitle(`Microphone error: ${err.message}`);
      setVoiceState("idle");
    }
  }

  async function handleStopListening() {
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    setVoiceState("processing");
    setSubtitle("Whisper is transcribing your command...");

    try {
      const audioBlob = await stopRecording();
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 401) {
          setIsLoggedIn(false);
          throw new Error("Session expired. Please sign in again.");
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setTranscript(data.transcript || "");
      const responseText = data.text || data.transcript || "Command processed.";
      setSubtitle(responseText);

      // Multi-turn draft update: if user is composing via voice, open modal
      if (data.state) {
        setVocamailState(data.state);
        if (data.state.mode === "composing") {
          setIsComposeOpen(true);
          setComposeDraft({
            to: data.state.draft?.to || "",
            subject: data.state.draft?.subject || "",
            body: data.state.draft?.body || "",
          });
        }
      }

      // Voice search trigger: if intent had a search query
      if (data.search_query) {
        setSearchQuery(data.search_query);
        loadEmails(activeFolder, data.search_query);
      } else {
        // Refresh inbox in case read/archive/trash was invoked
        loadEmails();
      }

      // Play gTTS spoken reply
      if (data.audio_url) {
        setAudioUrl(data.audio_url);
        setVoiceState("speaking");
      } else {
        setVoiceState("idle");
      }
    } catch (err) {
      console.error("[VocaMail Voice] Pipeline error:", err);
      setSubtitle(`Error: ${err.message}`);
      setVoiceState("idle");
    }
  }

  // Push-to-Talk via Spacebar (holding space records, releasing finishes)
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't trigger voice push-to-talk if typing inside an input or textarea
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) {
        return;
      }
      if (e.code === "Space" && !e.repeat && !isRecordingRef.current) {
        e.preventDefault();
        handleStartListening();
      }
    }

    function handleKeyUp(e) {
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) {
        return;
      }
      if (e.code === "Space" && isRecordingRef.current) {
        e.preventDefault();
        handleStopListening();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --------------------------------------------------------------------------
  // 7. Render Views
  // --------------------------------------------------------------------------

  // Loading view
  if (isCheckingAuth) {
    return (
      <div className="gmail-loading-screen" role="status" aria-live="polite">
        <div className="gmail-loading-spinner" />
        <span>Loading Gmail...</span>
      </div>
    );
  }

  // Logged-out view
  if (!isLoggedIn) {
    return (
      <main className="gmail-login-screen">
        <LoginCard />
      </main>
    );
  }

  // Authentic Gmail Web Interface
  return (
    <div className="gmail-app-root">
      {/* 1. Authentic Top Gmail Navbar */}
      <GmailNavbar
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onSearchSubmit={(q) => loadEmails(activeFolder, q)}
        onToggleVoice={() => {
          if (voiceState === "recording") handleStopListening();
          else handleStartListening();
        }}
        isRecording={voiceState === "recording"}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onLogout={() => {
          fetch("/logout").then(() => setIsLoggedIn(false));
        }}
        userName={userProfile.name}
      />

      {/* 2. Main 2-Column Body Layout */}
      <div className="gmail-body-layout">
        {/* Left Sidebar */}
        <GmailSidebar
          currentFolder={activeFolder}
          onSelectFolder={(folder) => {
            setActiveFolder(folder);
            setSelectedEmail(null);
            setSearchQuery("");
          }}
          onOpenCompose={() => handleOpenCompose()}
          unreadCount={emails.filter((m) => m.is_unread).length}
          isCollapsed={isSidebarCollapsed}
        />

        {/* Central Content Area: Email Table or Detail View */}
        <main className="gmail-main-content-region" id="main-content">
          {selectedEmail ? (
            <GmailDetailView
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onArchive={handleArchiveEmail}
              onTrash={handleTrashEmail}
              onMarkRead={handleMarkRead}
              onToggleStar={handleToggleStar}
              onReply={handleReply}
              onForward={handleForward}
              onVoiceRead={handleVoiceReadEmail}
              isNarrating={isNarratingEmail}
            />
          ) : (
            <GmailEmailTable
              messages={emails}
              isLoading={isLoadingEmails}
              onOpenEmail={handleOpenEmail}
              onRefresh={() => loadEmails(activeFolder, searchQuery)}
              onArchive={handleArchiveEmail}
              onTrash={handleTrashEmail}
              onMarkRead={handleMarkRead}
              onToggleStar={handleToggleStar}
            />
          )}
        </main>
      </div>

      {/* 3. Authentic Floating Compose Window */}
      <GmailComposeModal
        isOpen={isComposeOpen}
        initialDraft={composeDraft}
        isSending={isSending}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
        onVoiceDictate={() => {
          if (voiceState === "recording") handleStopListening();
          else handleStartListening();
        }}
        isVoiceActive={voiceState === "recording"}
      />

      {/* 4. Senior Developer Floating Voice HUD */}
      <VoiceAssistantHUD
        voiceState={voiceState}
        subtitle={subtitle}
        transcript={transcript}
        audioUrl={audioUrl}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        onAudioEnded={() => setVoiceState("idle")}
      />
    </div>
  );
}
