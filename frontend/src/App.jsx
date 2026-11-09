/**
 * frontend/src/App.jsx — Authentic Gmail Web Application with Natural Voice Integration
 * ======================================================================================
 * Voice is integrated naturally where it belongs — not as a floating widget:
 *
 * 1. Top Navbar (<GmailNavbar />):
 *    - Hamburger toggle, Google/Gmail logo, search bar.
 *    - 🎙️ Voice mic button INSIDE the search bar → Whisper-powered voice search.
 *      Click the mic → speak → Whisper transcribes → inbox filters automatically.
 *
 * 2. Left Sidebar (<GmailSidebar />):
 *    - Authentic "+ Compose" pill button → opens the floating compose window.
 *
 * 3. Main Central Content Pane:
 *    - Email Table with category tabs (Primary, Promotions, Social, Updates).
 *    - Email Detail View with "🔊 Listen to Email" narration banner.
 *
 * 4. Floating Compose Window (<GmailComposeModal />):
 *    - To, Subject, Body fields.
 *    - 🎙️ "Dictate" button inside the compose window → voice-to-text for
 *      those who cannot type. Whisper transcribes speech directly into the body.
 *
 * No separate voice widget is shown. Voice is embedded naturally into the UI.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import GmailNavbar from "./components/GmailNavbar";
import GmailSidebar from "./components/GmailSidebar";
import GmailEmailTable from "./components/GmailEmailTable";
import GmailDetailView from "./components/GmailDetailView";
import GmailComposeModal from "./components/GmailComposeModal";
import BriefingModal from "./components/BriefingModal";
import SettingsModal from "./components/SettingsModal";
import LoginCard from "./components/LoginCard";

// Microphone capture utility (used by both search mic and compose dictation)
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

  // ---- Morning Executive Briefing State ----
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [briefingData, setBriefingData] = useState(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);

  // ---- Settings & Labels State ----
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ density: "default", voiceSpeed: "normal", soundCues: true });
  const [labels, setLabels] = useState(["Work", "Personal", "Receipts"]);
  const [activeLabel, setActiveLabel] = useState(null);

  // ---- Voice Recording State (shared by search mic & compose dictation) ----
  // voiceTarget: "search" = mic in search bar, "compose" = dictate in compose window
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState(null);
  const [vocamailState, setVocamailState] = useState({
    mode: "idle",
    compose_step: null,
    draft: { to: null, subject: null, body: null },
  });

  // Hidden audio element for gTTS voice reply playback
  const audioRef = useRef(null);
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecording;

  // --------------------------------------------------------------------------
  // 1. Session Check on App Load
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
            if (data.state) setVocamailState(data.state);
          } else {
            setIsLoggedIn(false);
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

  // --------------------------------------------------------------------------
  // 2. Fetch Emails
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
      console.error("[VocaMail] Fetch emails error:", err);
    } finally {
      setIsLoadingEmails(false);
    }
  }, [activeFolder]);

  useEffect(() => {
    if (isLoggedIn) loadEmails(activeFolder, searchQuery);
  }, [isLoggedIn, activeFolder, loadEmails]);

  // --------------------------------------------------------------------------
  // 3. Email Actions
  // --------------------------------------------------------------------------
  async function handleOpenEmail(emailSummary) {
    try {
      const res = await fetch(`/api/email/${encodeURIComponent(emailSummary.id)}`);
      if (res.ok) {
        const data = await res.json();
        // Backend wraps the email under { ok: true, email: {...} }
        // Also normalize 'from' → 'sender' so GmailDetailView renders correctly
        const raw = data.email || data;
        setSelectedEmail({ ...raw, sender: raw.from || raw.sender || "Unknown" });
      } else {
        // Fallback: use the inbox row data we already have (normalize field names too)
        setSelectedEmail({ ...emailSummary, sender: emailSummary.from || emailSummary.sender || "Unknown" });
      }
    } catch {
      setSelectedEmail({ ...emailSummary, sender: emailSummary.from || emailSummary.sender || "Unknown" });
    }
  }

  async function handleArchiveEmail(id) {
    try {
      await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEmails((prev) => prev.filter((m) => m.id !== id));
      if (selectedEmail?.id === id) setSelectedEmail(null);
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
      if (selectedEmail?.id === id) setSelectedEmail(null);
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
      setEmails((prev) => prev.map((m) => (m.id === id ? { ...m, is_unread: false } : m)));
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
      setEmails((prev) => prev.map((m) => (m.id === id ? { ...m, is_starred: nextStar } : m)));
      if (selectedEmail?.id === id) {
        setSelectedEmail((prev) => ({ ...prev, is_starred: nextStar }));
      }
    } catch (err) {
      console.error("[VocaMail] Star error:", err);
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
        loadEmails();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to send email. Please check the recipient address.");
      }
    } catch (err) {
      console.error("[VocaMail] Send error:", err);
      alert("Error sending email.");
    } finally {
      setIsSending(false);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Email Voice Narration ("Listen to Email" in detail view)
  // --------------------------------------------------------------------------
  function handleVoiceReadEmail(email) {
    if (isNarratingEmail) {
      window.speechSynthesis?.cancel();
      setIsNarratingEmail(false);
      return;
    }
    const textToRead = `${email.subject || "No subject"}. From ${email.sender || "unknown"}. ${email.body || email.snippet || "Empty message"}`;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onstart = () => setIsNarratingEmail(true);
      utterance.onend = () => setIsNarratingEmail(false);
      utterance.onerror = () => setIsNarratingEmail(false);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported on this browser.");
    }
  }

  // --------------------------------------------------------------------------
  // 5b. Morning Executive Briefing
  // --------------------------------------------------------------------------
  async function handleOpenBriefing() {
    setIsBriefingOpen(true);
    if (briefingData) return; // Keep cached briefing if already generated in this session

    setIsLoadingBriefing(true);
    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBriefingData(data);
      } else {
        console.error("[VocaMail] Failed to load briefing:", res.status);
      }
    } catch (err) {
      console.error("[VocaMail] Briefing fetch error:", err);
    } finally {
      setIsLoadingBriefing(false);
    }
  }

  // --------------------------------------------------------------------------
  // 6. Whisper Voice Pipeline
  //    Used by both the Search bar mic and the Compose dictation button.
  //    target: "search" or "compose"
  // --------------------------------------------------------------------------
  async function handleStartVoice(target) {
    if (isRecordingRef.current) return;
    try {
      await startRecording();
      setIsRecording(true);
      setVoiceTarget(target);
    } catch (err) {
      console.error("[VocaMail Voice] Mic error:", err);
      alert(`Microphone error: ${err.message}`);
    }
  }

  async function handleStopVoice() {
    if (!isRecordingRef.current) return;
    const target = voiceTarget;
    setIsRecording(false);
    setVoiceTarget(null);

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
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      const spokenText = data.text || data.transcript || "";

      if (target === "search") {
        // Voice search: populate search bar and filter emails
        const query = data.search_query || data.transcript || spokenText;
        if (query) {
          setSearchQuery(query);
          loadEmails(activeFolder, query);
        }
      } else if (target === "compose") {
        // Voice dictation: append transcribed text into the compose body
        if (data.transcript) {
          setComposeDraft((prev) => ({
            ...prev,
            body: prev.body ? `${prev.body} ${data.transcript}` : data.transcript,
          }));
        }
      }

      // Handle multi-turn compose flow from backend intent
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

      // Play gTTS spoken audio reply if server returns one
      if (data.audio_url && audioRef.current) {
        audioRef.current.src = data.audio_url;
        audioRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("[VocaMail Voice] Pipeline error:", err);
      alert(`Voice error: ${err.message}`);
    }
  }

  // Toggle helpers used by navbar mic and compose dictate button
  function handleToggleSearchVoice() {
    if (isRecording && voiceTarget === "search") handleStopVoice();
    else handleStartVoice("search");
  }

  function handleToggleComposeVoice() {
    if (isRecording && voiceTarget === "compose") handleStopVoice();
    else handleStartVoice("compose");
  }

  // --------------------------------------------------------------------------
  // 7. Render
  // --------------------------------------------------------------------------

  // Loading screen
  if (isCheckingAuth) {
    return (
      <div className="gmail-loading-screen" role="status" aria-live="polite">
        <div className="gmail-loading-spinner" />
        <span>Loading Gmail...</span>
      </div>
    );
  }

  // Logged-out: show sign-in card
  if (!isLoggedIn) {
    return (
      <main className="gmail-login-screen">
        <LoginCard />
      </main>
    );
  }

  // Authenticated: full authentic Gmail web UI
  return (
    <div className="gmail-app-root">
      {/* Hidden audio element for gTTS voice reply playback */}
      <audio ref={audioRef} aria-hidden="true" style={{ display: "none" }} />

      {/* 1. Top Gmail Navbar — voice mic naturally embedded inside search bar */}
      <GmailNavbar
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onSearchSubmit={(q) => loadEmails(activeFolder, q)}
        onToggleVoice={handleToggleSearchVoice}
        isRecording={isRecording && voiceTarget === "search"}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenBriefing={handleOpenBriefing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={() => {
          fetch("/logout").then(() => setIsLoggedIn(false));
        }}
        userName={userProfile.name}
      />

      {/* 2. Main 2-Column Body: Sidebar + Content */}
      <div className="gmail-body-layout">
        {/* Left Sidebar: Compose pill + folder list + labels */}
        <GmailSidebar
          currentFolder={activeFolder}
          onSelectFolder={(folder) => {
            setActiveFolder(folder);
            setActiveLabel(null);
            setSelectedEmail(null);
            setSearchQuery("");
          }}
          onOpenCompose={() => handleOpenCompose()}
          unreadCount={emails.filter((m) => m.is_unread).length}
          isCollapsed={isSidebarCollapsed}
          labels={labels}
          activeLabel={activeLabel}
          onSelectLabel={(lbl) => {
            setActiveLabel(lbl);
            setSelectedEmail(null);
            setSearchQuery(lbl);
            loadEmails(activeFolder, lbl);
          }}
          onAddLabel={(newLbl) => setLabels((prev) => [...prev, newLbl])}
        />

        {/* Central Content: Email Table or Email Detail */}
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

      {/* 3. Floating Compose Window — voice dictation embedded inside for accessibility */}
      <GmailComposeModal
        isOpen={isComposeOpen}
        draft={composeDraft}
        onDraftChange={(updated) => setComposeDraft(updated)}
        isSending={isSending}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
        onVoiceDictate={handleToggleComposeVoice}
        isVoiceActive={isRecording && voiceTarget === "compose"}
      />

      {/* 4. Morning Executive Briefing Podcast Modal */}
      <BriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        briefingData={briefingData}
        isLoading={isLoadingBriefing}
        onOpenEmail={handleOpenEmail}
      />

      {/* 5. Quick Settings Side Drawer */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}
