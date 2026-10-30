/**
 * static/js/main.js — AuraMail Phase 1
 * ───────────────────────────────────────
 * Phase 1: wires up the "Fetch Latest Emails" test button and the ARIA live region.
 * Phase 2 will add voice recording logic here.
 */

"use strict";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const ariaStatus     = document.getElementById("aria-status");
const statusBadge    = document.getElementById("status-indicator");
const statusText     = document.getElementById("status-text");
const responseText   = document.getElementById("response-text");
const btnTestInbox   = document.getElementById("btn-test-inbox");
const inboxResults   = document.getElementById("inbox-results");
const btnTalk        = document.getElementById("btn-talk");

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Update both the visible status badge and the ARIA live region.
 * @param {"idle"|"listening"|"processing"|"speaking"} mode
 * @param {string} label  Human-readable label shown in badge
 */
function setStatus(mode, label) {
  if (!statusBadge || !statusText) return;
  statusBadge.className = `status-badge status-${mode}`;
  statusBadge.setAttribute("aria-label", `${label} — status`);
  statusText.textContent = label;
}

/**
 * Write a message into the ARIA live region and into the response box.
 */
function announce(message) {
  if (ariaStatus) ariaStatus.textContent = message;
  if (responseText) responseText.textContent = message;
}

// ── Phase 1: inbox test ───────────────────────────────────────────────────────

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
      const res  = await fetch("/api/inbox");
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Unknown error");

      const messages = data.messages;

      if (messages.length === 0) {
        inboxResults.innerHTML =
          '<p class="email-loading">No messages found in inbox.</p>';
        announce("Your inbox is empty.");
      } else {
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
      console.error("[AuraMail] Inbox fetch error:", err);
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

// ── Phase 2 placeholder: Talk button ──────────────────────────────────────────
// Full voice recording logic goes here in Phase 2 (recorder.js + audio.js).
if (btnTalk) {
  btnTalk.addEventListener("click", () => {
    announce("Voice recording is coming in Phase 2. For now, use the Fetch Emails button.");
    setStatus("idle", "Coming soon");
  });

  // Space key shortcut
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      btnTalk.click();
    }
  });
}

// ── Utility: XSS-safe HTML escaping ──────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
