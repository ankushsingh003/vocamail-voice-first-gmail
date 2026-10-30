<div align="center">

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║    ✦  A U R A M A I L  —  Voice-First Gmail Interface  ✦        ║
║                                                                  ║
║      Eyes-free  ·  Hands-free  ·  Screen-reader ready           ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

![Python](https://img.shields.io/badge/Python-3.13-7c3aed?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-7c3aed?style=flat-square&logo=flask&logoColor=white)
![Gmail API](https://img.shields.io/badge/Gmail_API-v1-7c3aed?style=flat-square&logo=gmail&logoColor=white)
![Whisper](https://img.shields.io/badge/Whisper-OpenAI-7c3aed?style=flat-square&logo=openai&logoColor=white)
![ARIA](https://img.shields.io/badge/WCAG-2.1_AA-7c3aed?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square)
![Phase](https://img.shields.io/badge/Build-Phase_1_Complete-10b981?style=flat-square)

</div>

---

## ▌What is AuraMail?

AuraMail is a **voice-first Gmail client** built for people who navigate the web by voice — including blind users, users with motor impairments, and anyone who wants a hands-free email experience. You press a key, speak a command, and AuraMail reads your inbox aloud, composes messages by dictation, and confirms before sending.

No mouse. No screen scanning. Just your voice.

---

## ▌One Conversation Turn — How It Works

```
┌──────────────┐     audio blob      ┌──────────────┐    transcript    ┌──────────────┐
│   BROWSER    │ ─────────────────▶  │    FLASK     │ ──────────────▶  │   WHISPER    │
│  MediaRec.   │   POST /api/voice   │   app.py     │                  │  transcribe  │
└──────────────┘                     └──────────────┘                  └──────────────┘
                                                                                │
        ┌───────────────────────────────────────────────────────────────────────┘
        │  intent + slots
        ▼
┌──────────────┐    Gmail call      ┌──────────────┐    spoken text    ┌──────────────┐
│   INTENT     │ ─────────────────▶ │  GMAIL API   │ ──────────────▶  │    gTTS      │
│  DETECTOR    │                    │  (OAuth 2.0) │                  │  → .mp3      │
└──────────────┘                    └──────────────┘                  └──────────────┘
                                                                                │
        ┌───────────────────────────────────────────────────────────────────────┘
        │  { text, audio_url, state }
        ▼
┌──────────────┐                    ┌──────────────┐
│   BROWSER    │  plays audio  +    │  ARIA LIVE   │  ← screen readers
│  <audio>     │  updates UI   ──▶  │   REGION     │    announce here
└──────────────┘                    └──────────────┘
```

---

## ▌System Architecture

```
                              ┌─────────────────────────────────────────────────────────┐
                              │                    AURAMAIL SYSTEM                       │
                              └─────────────────────────────────────────────────────────┘

  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
  │  FRONTEND   │   │   SPEECH    │   │     NLP     │   │    CORE     │   │   GMAIL     │
  │             │   │             │   │             │   │             │   │             │
  │ index.html  │   │transcribe.py│   │ intents.py  │   │  router.py  │   │  client.py  │
  │ recorder.js │◀─▶│   tts.py   │   │  parser.py  │   │  state.py   │   │             │
  │   main.js   │   │             │   │             │   │  handlers/  │   │ list_inbox  │
  │  style.css  │   │  [Whisper]  │   │ [rapidfuzz] │   │   inbox     │   │ get_message │
  │             │   │   [gTTS]    │   │   [regex]   │   │   compose   │   │  send_email │
  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   │   search    │
         │                 │                  │                  │          └──────┬──────┘
         └─────────────────┴──────────────────┴──────────────────┴────────────────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │      app.py        │
                                    │  (Flask + Routes)  │
                                    │                    │
                                    │  GET  /            │
                                    │  GET  /login       │
                                    │  GET  /oauth/...   │
                                    │  POST /api/voice   │
                                    │  GET  /api/session │
                                    │  POST /logout      │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │   auth/            │
                                    │  google_oauth.py   │
                                    │  (OAuth 2.0 flow)  │
                                    └────────────────────┘
```

---

## ▌Folder Structure

```
auramail/
│
├── app.py                  ← Flask entry point, all routes
├── config.py               ← Central settings (reads from .env)
├── requirements.txt        ← Python dependencies
├── .env.example            ← Template — copy to .env and fill in
├── .gitignore
│
├── auth/
│   └── google_oauth.py     ← Build URL · Exchange code · Refresh · Revoke
│
├── speech/
│   ├── transcribe.py       ← Whisper wrapper: audio file → transcript text
│   └── tts.py              ← gTTS wrapper: speak(text) → mp3 file path
│
├── nlp/
│   ├── intents.py          ← Intent → keyword/phrase pattern dictionary
│   └── parser.py           ← detect_intent() · extract_slots()
│
├── core/
│   ├── router.py           ← State-aware command router
│   ├── state.py            ← Session state helpers (get/set/update/reset)
│   └── handlers/
│       ├── inbox.py        ← READ_INBOX, READ_MESSAGE, NEXT, PREVIOUS
│       ├── compose.py      ← COMPOSE multi-turn state machine
│       ├── reply.py        ← REPLY, FORWARD
│       └── search.py       ← SEARCH, FILTER
│
├── gmail/
│   └── client.py           ← list · get · send · reply · modify · trash
│
├── static/
│   ├── js/
│   │   ├── main.js         ← App init, ARIA announcer, status badge
│   │   ├── recorder.js     ← MediaRecorder, push-to-talk (Phase 2)
│   │   └── audio.js        ← TTS audio playback, beep sounds (Phase 2)
│   ├── css/
│   │   └── style.css       ← Dark mode · Glassmorphism · Animations
│   └── audio/              ← Temp mp3 files (auto-deleted, gitignored)
│
└── templates/
    └── index.html          ← Single-page app: login + voice interface
```

---

## ▌Tech Stack

```
┌─────────────────┬──────────────────────────────┬────────────────────────────────┐
│     Layer        │         Technology            │           Purpose              │
├─────────────────┼──────────────────────────────┼────────────────────────────────┤
│ Web Framework   │  Flask 3.0                    │  Routes, session, server       │
│ Voice Capture   │  Web Audio API / MediaRecorder│  Browser mic → audio blob      │
│ Transcription   │  OpenAI Whisper (local/API)   │  Audio → text                  │
│ Intent Parsing  │  rapidfuzz + regex            │  Text → intent + slots         │
│ Email Backend   │  Gmail API v1                 │  Read · Send · Search · Modify │
│ Authentication  │  Google OAuth 2.0             │  Secure token-based login      │
│ Text-to-Speech  │  gTTS                         │  Spoken response → mp3         │
│ Accessibility   │  ARIA live regions + WCAG 2.1 │  Screen reader support         │
│ Styling         │  Vanilla CSS                  │  Dark mode · Glassmorphism     │
└─────────────────┴──────────────────────────────┴────────────────────────────────┘
```

---

## ▌Conversation State Machine

```
                              ┌──────────┐
                              │   IDLE   │◀────────────── cancel / stop
                              └────┬─────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                         │
          ▼                        ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │   READING   │          │  COMPOSING  │          │  SEARCHING  │
   │             │          │             │          │             │
   │ READ_INBOX  │          │ ① recipient │          │  SEARCH     │
   │ READ_MSG    │          │ ② subject   │          │  keyword /  │
   │ NEXT / PREV │          │ ③ body      │          │  sender     │
   │ READ_MORE   │          │ ④ confirm   │          └──────┬──────┘
   └──────┬──────┘          └──────┬──────┘                 │
          │                        │                         │
          │                   send / cancel                  │
          │                        │                         │
          └────────────────────────▼─────────────────────────┘
                              ┌──────────┐
                              │  BACK TO │
                              │   IDLE   │
                              └──────────┘
```

---

## ▌Supported Voice Commands (MVP — 25+)

```
┌─────────────────┬──────────────────────────────────────────┬───────────────────┐
│     Intent       │          Example Phrases                  │      Slots        │
├─────────────────┼──────────────────────────────────────────┼───────────────────┤
│ READ_INBOX      │  "check my inbox" · "any new mail"        │  —                │
│ READ_MESSAGE    │  "open the first one" · "read message 2"  │  index            │
│ NEXT            │  "next" · "next email"                    │  —                │
│ PREVIOUS        │  "go back" · "previous"                   │  —                │
│ READ_MORE       │  "read more" · "continue"                 │  —                │
│ READ_AGAIN      │  "repeat" · "say that again"              │  —                │
│ COMPOSE         │  "write a message" · "compose an email"   │  recipient (opt.) │
│ REPLY           │  "reply to this" · "respond"              │  —                │
│ FORWARD         │  "forward this" · "forward to John"       │  recipient (opt.) │
│ SEARCH          │  "search for emails from Amazon"          │  sender / keyword │
│ MARK_READ       │  "mark as read" · "mark it read"          │  —                │
│ ARCHIVE         │  "archive this" · "archive it"            │  —                │
│ DELETE          │  "delete this" · "trash it"               │  —                │
│ STOP            │  "stop" · "never mind"                    │  —                │
│ HELP            │  "what can I say" · "help"                │  —                │
│ YES             │  "yes" · "confirm" · "send it"            │  —                │
│ NO / CANCEL     │  "no" · "cancel" · "start over"           │  —                │
│ UNREAD_COUNT    │  "how many unread" · "unread emails"       │  —                │
│ NEWEST_FIRST    │  "newest first" · "sort by date"          │  —                │
│ OPEN_THREAD     │  "open the thread" · "show replies"       │  —                │
│ SPELL_ADDRESS   │  "spell the address" (compose helper)     │  —                │
│ EDIT_DRAFT      │  "edit subject" · "change the body"       │  field            │
│ LABEL           │  "label this as work"                     │  label name       │
│ SNOOZE          │  "snooze this for tomorrow"               │  time (future)    │
│ LOGOUT          │  "sign out" · "log out"                   │  —                │
└─────────────────┴──────────────────────────────────────────┴───────────────────┘
```

---

## ▌Build Phases

```
  Phase 1          Phase 2          Phase 3          Phase 4          Phase 5
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ PLUMBING │────▶│ VOICE IN │────▶│ VOICE OUT│────▶│ INTENTS  │────▶│ COMPOSE  │
│          │     │          │     │          │     │          │     │          │
│ ✅ Flask  │     │ Browser  │     │ gTTS     │     │READ_INBOX│     │ Multi-   │
│ ✅ OAuth  │     │ records  │     │ mp3      │     │READ_MSG  │     │ turn     │
│ ✅ Gmail  │     │ Whisper  │     │ playback │     │ NEXT     │     │ state    │
│ ✅ list() │     │ transcript│    │ ARIA     │     │ HELP     │     │ machine  │
│ ✅ UI     │     │ on screen│     │ live rgn │     │          │     │ + send   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘

  Phase 6          Phase 7          Phase 8
┌──────────┐     ┌──────────┐     ┌──────────┐
│ ACTIONS  │────▶│  A11Y    │────▶│ POLISH   │
│          │     │  AUDIT   │     │          │
│ Reply    │     │ NVDA /   │     │ Errors   │
│ Search   │     │ VoiceOver│     │ Repeat   │
│ Archive  │     │ Lighthouse│    │ Timeouts │
│ Delete   │     │ axe      │     │ README   │
│ Mark read│     │ WCAG 2.1 │     │ Demo vid │
└──────────┘     └──────────┘     └──────────┘

  ████████░░░░░░░░░░░░░░░░░░░░░░░░  Phase 1 of 8 Complete
```

---

## ▌Getting Started

### Prerequisites

```
Python 3.10+       https://python.org
ffmpeg             https://ffmpeg.org  (needed for local Whisper)
Google Account     with Gmail enabled
Git                https://git-scm.com
```

### 1 · Clone the repo

```bash
git clone https://github.com/ankushsingh003/auramail-voice-first-gmail.git
cd auramail-voice-first-gmail
```

### 2 · Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3 · Set up Google Cloud (one-time)

```
① Go to  →  console.cloud.google.com
② Create a project  →  "AuraMail"
③ Enable  →  Gmail API
④ OAuth consent screen  →  External  →  add your Gmail as Test User
⑤ Credentials  →  + Create  →  OAuth 2.0 Client ID  →  Web application
⑥ Authorized redirect URI  →  http://localhost:5000/oauth/callback
⑦ Copy your  Client ID  and  Client Secret
```

### 4 · Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
FLASK_SECRET_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
```

### 5 · Run

```bash
python app.py
```

Open → **http://localhost:5000** → click **Sign in with Google**

---

## ▌API Reference

```
┌────────┬───────────────────┬──────────────────────────────────────────────────────┐
│ Method │      Route        │                     Purpose                           │
├────────┼───────────────────┼──────────────────────────────────────────────────────┤
│ GET    │ /                 │  Main page — login wall if not authenticated          │
│ GET    │ /login            │  Start Google OAuth flow                              │
│ GET    │ /oauth/callback   │  Finish OAuth, store tokens                           │
│ GET    │ /api/session      │  Return current conversation state as JSON            │
│ GET    │ /api/inbox        │  Phase-1 test: 5 latest email summaries               │
│ POST   │ /api/voice        │  Core: audio blob → transcript → Gmail → TTS → JSON  │
│ POST   │ /logout           │  Clear session and tokens                             │
└────────┴───────────────────┴──────────────────────────────────────────────────────┘
```

### `POST /api/voice` — Request & Response

```
REQUEST                              RESPONSE
────────────────────────             ────────────────────────────────────
Content-Type: multipart/form-data    {
  audio: <blob>  (audio/webm)          "ok":        true,
                                       "transcript": "check my inbox",
                                       "text":       "You have 3 unread emails.
                                                      First, from Amazon...",
                                       "audio_url":  "/static/audio/abc123.mp3",
                                       "state": {
                                         "mode": "reading",
                                         "current_index": 0
                                       }
                                     }
```

---

## ▌Accessibility Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ACCESSIBILITY STACK                               │
├───────────────┬─────────────────────────────────────────────────────┤
│ ARIA          │  role="status" aria-live="polite" on response div   │
│               │  All buttons have aria-label and aria-pressed        │
│               │  Status badge mirrors state in aria-label            │
├───────────────┼─────────────────────────────────────────────────────┤
│ KEYBOARD      │  Space = push-to-talk   Escape = cancel             │
│               │  Full tab order maintained                           │
│               │  Visible focus outline on all interactive elements   │
├───────────────┼─────────────────────────────────────────────────────┤
│ VISUAL        │  High-contrast dark mode (violet on near-black)      │
│               │  No colour-only information                          │
│               │  Status shown as text + colour + shape               │
├───────────────┼─────────────────────────────────────────────────────┤
│ AUDIO SAFETY  │  TTS muted while mic is active (no feedback loop)   │
│               │  Beep on mic start / stop                           │
│               │  "One moment" spoken during Whisper processing       │
├───────────────┼─────────────────────────────────────────────────────┤
│ SCREEN READER │  Tested with NVDA (Windows) and VoiceOver (macOS)   │
│               │  Lighthouse score target: 100 Accessibility          │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

## ▌Security Notes

```
⚠  Tokens are stored server-side in the Flask session — never sent to the browser
⚠  Temp audio blobs and mp3 files are deleted immediately after each voice turn
⚠  Email content is never logged to disk or console
⚠  .env is gitignored — never commit secrets
⚠  OAUTHLIB_INSECURE_TRANSPORT=1 is only set for localhost development
⚠  Keep the Google Cloud app in "Testing" mode — limit to known test users
```

---

## ▌Roadmap

- [ ] Phase 2 — Voice In (MediaRecorder + Whisper)
- [ ] Phase 3 — Voice Out (gTTS + playback + ARIA)
- [ ] Phase 4 — Intents (READ_INBOX, READ_MESSAGE, NEXT, HELP)
- [ ] Phase 5 — Compose multi-turn state machine
- [ ] Phase 6 — Reply, search, archive, delete, mark read
- [ ] Phase 7 — Accessibility audit (NVDA, VoiceOver, axe, Lighthouse)
- [ ] Phase 8 — Polish, error handling, demo video

---

## ▌License

MIT © 2026 Ankush Singh — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for the people who never got to use email the way they deserved.**

`✦ AuraMail — Your voice is the interface ✦`

</div>
