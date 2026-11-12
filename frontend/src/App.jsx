import React, { useState, useEffect, useRef, useCallback } from "react";
import GmailNavbar from "./components/GmailNavbar";
import GmailSidebar from "./components/GmailSidebar";
import GmailEmailTable from "./components/GmailEmailTable";
import GmailDetailView from "./components/GmailDetailView";
import GmailComposeModal from "./components/GmailComposeModal";
import BriefingModal from "./components/BriefingModal";
import SettingsModal from "./components/SettingsModal";
import LoginCard from "./components/LoginCard";
import CopilotPanel from "./components/CopilotPanel";
import InboxAnswerCard from "./components/InboxAnswerCard";

import { startRecording, stopRecording } from "./utils/audioRecorder";

import "./App.css";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState({ name: "User", email: "" });

  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [emails, setEmails] = useState([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isNarratingEmail, setIsNarratingEmail] = useState(false);

  const [ragAnswer, setRagAnswer] = useState(null);
  const [isRagLoading, setIsRagLoading] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState({ to: "", subject: "", body: "" });
  const [isSending, setIsSending] = useState(false);

  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [briefingData, setBriefingData] = useState(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ density: "default", voiceSpeed: "normal", soundCues: true });
  const [labels, setLabels] = useState(["Work", "Personal", "Receipts"]);
  const [activeLabel, setActiveLabel] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState(null);
  const [vocamailState, setVocamailState] = useState({
    mode: "idle",
    compose_step: null,
    draft: { to: null, subject: null, body: null },
  });

  const audioRef = useRef(null);
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecording;

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

  const loadEmails = useCallback(async (folder = activeFolder, query = "") => {
    setIsLoadingEmails(true);
    setRagAnswer(null);
    try {
      if (query.trim()) {
        const ragRes = await fetch("/api/rag-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });
        if (ragRes.ok) {
          const ragData = await ragRes.json();
          if (ragData.ok) {
            setEmails(ragData.messages || []);
            if (ragData.is_question && ragData.has_answer) {
              setRagAnswer({
                answer: ragData.answer,
                citation: ragData.citation,
                query: query.trim(),
              });
            }
            setIsLoadingEmails(false);
            return;
          }
        }
      }
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

  async function handleOpenEmail(emailSummary) {
    try {
      const res = await fetch(`/api/email/${encodeURIComponent(emailSummary.id)}`);
      if (res.ok) {
        const data = await res.json();
        const raw = data.email || data;
        setSelectedEmail({ ...raw, sender: raw.from || raw.sender || "Unknown" });
      } else {
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

  function handleVoiceReadEmail(email) {
    if (isNarratingEmail) {
      window.speechSynthesis?.cancel();
      setIsNarratingEmail(false);
      return;
    }
    let actionAnnouncement = "";
    if (email.actions) {
      const items = [];
      if (email.actions.meeting?.detected && email.actions.meeting.date_str) {
        items.push(`Meeting proposed for ${email.actions.meeting.date_str}`);
      }
      if (email.actions.invoice?.detected) {
        items.push(`Invoice due ${email.actions.invoice.due_date || "soon"}${email.actions.invoice.amount ? ` for ${email.actions.invoice.amount}` : ""}`);
      }
      if (email.actions.meeting_link) {
        items.push(`${email.actions.meeting_link.platform} link detected`);
      }
      if (items.length > 0) {
        actionAnnouncement = ` Action items: ${items.join(". ")}. `;
      }
    }
    const textToRead = `${email.subject || "No subject"}. From ${email.sender || "unknown"}.${actionAnnouncement} ${email.body || email.snippet || "Empty message"}`;
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

  async function handleOpenBriefing() {
    setIsBriefingOpen(true);
    if (briefingData) return;
    setIsLoadingBriefing(true);
    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBriefingData(data);
      }
    } catch (err) {
      console.error("[VocaMail] Briefing fetch error:", err);
    } finally {
      setIsLoadingBriefing(false);
    }
  }

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

      const res = await fetch("/api/voice", { method: "POST", body: formData });

      if (!res.ok) {
        if (res.status === 401) { setIsLoggedIn(false); return; }
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Voice processing failed.");
        return;
      }

      const data = await res.json();

      if (data.state) setVocamailState(data.state);

      if (data.state?.mode === "composing" && data.state?.draft) {
        setIsComposeOpen(true);
        setComposeDraft({
          to: data.state.draft?.to || "",
          subject: data.state.draft?.subject || "",
          body: data.state.draft?.body || "",
        });
      }

      if (data.briefing_data) {
        setBriefingData(data.briefing_data);
        setIsBriefingOpen(true);
      }

      if (data.calendar_url) {
        window.open(data.calendar_url, "_blank");
      }

      if (data.meeting_url) {
        window.open(data.meeting_url, "_blank");
      }

      if (data.audio_url && audioRef.current && !data.briefing_data) {
        audioRef.current.src = data.audio_url;
        audioRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("[VocaMail Voice] Pipeline error:", err);
      alert(`Voice error: ${err.message}`);
    }
  }

  function handleToggleSearchVoice() {
    if (isRecording && voiceTarget === "search") handleStopVoice();
    else handleStartVoice("search");
  }

  function handleToggleComposeVoice() {
    if (isRecording && voiceTarget === "compose") handleStopVoice();
    else handleStartVoice("compose");
  }

  if (isCheckingAuth) {
    return (
      <div className="app-loading-screen" role="status" aria-live="polite">
        <div className="app-loading-spinner" />
        <span>Loading VocaMail...</span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="app-login-screen">
        <LoginCard />
      </main>
    );
  }

  return (
    <div className="app-root">
      <audio ref={audioRef} aria-hidden="true" style={{ display: "none" }} />

      <GmailNavbar
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onSearchSubmit={(q) => loadEmails(activeFolder, q)}
        onToggleVoice={handleToggleSearchVoice}
        isRecording={isRecording && voiceTarget === "search"}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenBriefing={handleOpenBriefing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={() => { fetch("/logout").then(() => setIsLoggedIn(false)); }}
        userName={userProfile.name}
      />

      <div className="app-body">
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

        <main className="app-main" id="main-content">
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
              onSmartReplyDraft={handleOpenCompose}
              isNarrating={isNarratingEmail}
            />
          ) : (
            <>
              {ragAnswer && (
                <InboxAnswerCard
                  answer={ragAnswer.answer}
                  citation={ragAnswer.citation}
                  query={ragAnswer.query}
                  onOpenEmail={(emailRef) => {
                    handleOpenEmail(emailRef);
                    setSelectedEmail(null);
                  }}
                  onDismiss={() => setRagAnswer(null)}
                />
              )}
              <GmailEmailTable
                messages={emails}
                isLoading={isLoadingEmails}
                onOpenEmail={handleOpenEmail}
                onRefresh={() => loadEmails(activeFolder, searchQuery)}
                onArchive={handleArchiveEmail}
                onTrash={handleTrashEmail}
                onMarkRead={handleMarkRead}
                onToggleStar={handleToggleStar}
                onOpenBriefing={handleOpenBriefing}
                currentFolder={activeFolder}
              />
            </>
          )}
        </main>

        <CopilotPanel
          selectedEmail={selectedEmail}
          onDraftReply={(email, suggestedReply) => {
            if (suggestedReply) {
              handleOpenCompose({
                to: email.sender || email.from || "",
                subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ""}`,
                body: suggestedReply,
              });
            } else {
              handleReply(email);
            }
          }}
          onOpenBriefing={handleOpenBriefing}
          onOpenEmail={handleOpenEmail}
        />
      </div>

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

      <BriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        briefingData={briefingData}
        isLoading={isLoadingBriefing}
        onOpenEmail={handleOpenEmail}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}
