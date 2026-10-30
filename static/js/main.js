/**
 * static/js/main.js — Frontend Controls & Screen-Reader Announcer
 * ===============================================================
 * Think of this JavaScript file like the nerve center inside the user's browser.
 * It does three critical jobs:
 *   1. Listens to button clicks (and keyboard Spacebar presses).
 *   2. Sends requests to our Python Flask server in the background (AJAX)
 *      so the page never has to reload or flicker.
 *   3. Announces status updates directly to Screen Readers (like NVDA or JAWS)
 *      using ARIA Live Regions, ensuring blind users are never left in the dark!
 */

"use strict";

// ---------------------------------------------------------------------------
// 1. Grabbing Elements from the Webpage (DOM References)
// ---------------------------------------------------------------------------
// We find all the buttons, status badges, and text areas on the page so
// our JavaScript can read or change them whenever something happens.
const ariaStatus   = document.getElementById("aria-status");      // Invisible megaphone for screen readers
const statusBadge  = document.getElementById("status-indicator"); // Visual glowing status badge (Ready/Listening/Processing)
const statusText   = document.getElementById("status-text");      // Text inside that badge ("Ready", "Loading...", etc.)
const responseText = document.getElementById("response-text");    // Main assistant text bubble on screen
const btnTestInbox = document.getElementById("btn-test-inbox");   // "Fetch Latest Emails" test button
const inboxResults = document.getElementById("inbox-results");   // The container list where email cards appear
const btnTalk      = document.getElementById("btn-talk");        // Big round microphone button


// ---------------------------------------------------------------------------
// 2. Helper: Change Assistant Status (setStatus)
// ---------------------------------------------------------------------------
// Switches the visual LED light on the screen:
// - 'idle'       -> grey dot (waiting for user)
// - 'listening'  -> pulsing red dot (recording your voice)
// - 'processing' -> glowing amber dot (thinking / contacting Gmail)
// - 'speaking'   -> green dot (assistant is talking)
// It also updates the 'aria-label' so blind users' screen readers speak the status!
function setStatus(mode, label) {
  if (!statusBadge || !statusText) return;
  statusBadge.className = `status-badge status-${mode}`;
  statusBadge.setAttribute("aria-label", `${label} — status`);
  statusText.textContent = label;
}


// ---------------------------------------------------------------------------
// 3. Helper: Announce Messages to Everyone (announce)
// ---------------------------------------------------------------------------
// When the assistant speaks or has news, this puts the words into TWO places:
// 1. Into the visible text card on screen (for sighted users or helpers).
// 2. Into the hidden <div role="status" aria-live="polite"> element, which
//    prompts the user's screen reader to immediately speak the sentence aloud!
function announce(message) {
  if (ariaStatus) ariaStatus.textContent = message;
  if (responseText) responseText.textContent = message;
}


// ---------------------------------------------------------------------------
// 4. Test Button: Fetch & Show 5 Recent Emails
// ---------------------------------------------------------------------------
// When you click the "Fetch Latest Emails" button:
// 1. Disables the button so you can't accidentally spam click it.
// 2. Changes status to "Loading..." and announces it.
// 3. Calls GET /api/inbox to ask our Python server for recent emails.
// 4. If emails are found, generates clean little cards showing who sent it,
//    the subject line, and a short snippet.
// 5. Announces how many emails were found (including how many are unread).
if (btnTestInbox) {
  btnTestInbox.addEventListener("click", async () => {
    btnTestInbox.disabled = true;
    setStatus("processing", "Loading…");
    announce("Fetching your latest emails…");

    if (inboxResults) {
      inboxResults.innerHTML =
        '<p class="email-loading" aria-live="polite">Fetching…</p>';
    }

    try {
      // Ask Flask for the emails in the background
      const res  = await fetch("/api/inbox");
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Unknown error");

      const messages = data.messages;

      // Handle empty inbox
      if (messages.length === 0) {
        inboxResults.innerHTML =
          '<p class="email-loading">No messages found in inbox.</p>';
        announce("Your inbox is empty.");
      } else {
        // Build an HTML card for each email found
        inboxResults.innerHTML = messages
          .map(
            (m, i) => `
          <div class="email-item ${m.is_unread ? "unread" : ""}"
               role="article"
               aria-label="Email ${i + 1}: from ${m.from}, subject ${m.subject}">
            <span class="email-from">${escapeHtml(m.from)}</span>
            <span class="email-subject">${escapeHtml(m.subject)}</span>
            <span class="email-snippet">${escapeHtml(m.snippet)}</span>
          </div>`
          )
          .join("");

        const unreadCount = messages.filter((m) => m.is_unread).length;
        const summary = `You have ${messages.length} emails, ${unreadCount} unread.`;
        announce(summary);
      }

      setStatus("idle", "Ready");
    } catch (err) {
      console.error("[VocaMail] Inbox fetch error:", err);
      if (inboxResults) {
        inboxResults.innerHTML = `<p class="email-error">Error: ${escapeHtml(err.message)}</p>`;
      }
      announce("Failed to fetch emails. Check the console for details.");
      setStatus("idle", "Error");
    } finally {
      btnTestInbox.disabled = false;
    }
  });
}


// ---------------------------------------------------------------------------
// 5. The Microphone / Talk Button (btnTalk)
// ---------------------------------------------------------------------------
// In Phase 2, this will record audio through Web Audio API / MediaRecorder.
// For now in Phase 1, it provides a friendly placeholder reminder.
// It also binds the SPACEBAR key so you can just press Space to talk!
if (btnTalk) {
  btnTalk.addEventListener("click", () => {
    announce("Voice recording is coming in Phase 2. For now, use the Fetch Emails button.");
    setStatus("idle", "Coming soon");
  });

  // Keyboard shortcut: pressing Space anywhere on the page activates the mic button
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault(); // Stop the webpage from scrolling down when pressing Space
      btnTalk.click();
    }
  });
}


// ---------------------------------------------------------------------------
// 6. Security Sanitizer: Prevent Malicious Code in Emails (escapeHtml)
// ---------------------------------------------------------------------------
// If someone sends a spam email with malicious JavaScript code like <script>alert('hacked')</script>,
// this function replaces the dangerous angle brackets (< >) with safe harmless text entities
// (&lt; &gt;) so the email can never hack your browser.
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
