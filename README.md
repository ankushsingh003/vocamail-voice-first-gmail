<div align="center">

# ✦ V O C A M A I L ✦
### *Voice-First Gmail for Everyone*

**Eyes-free · Hands-free · Screen-reader ready**

---

![Python](https://img.shields.io/badge/Python-3.10+-7c3aed?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-7c3aed?style=flat-square&logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff?style=flat-square&logo=vite&logoColor=white)
![Gmail API](https://img.shields.io/badge/Gmail_API-v1-ea4335?style=flat-square&logo=gmail&logoColor=white)
![Whisper](https://img.shields.io/badge/Whisper-OpenAI-10b981?style=flat-square&logo=openai&logoColor=white)
![gTTS](https://img.shields.io/badge/gTTS-Google_Speech-4285f4?style=flat-square)
![ARIA](https://img.shields.io/badge/WCAG-2.1_AA-7c3aed?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-21_Passed-10b981?style=flat-square)
![Build](https://img.shields.io/badge/Build-All_8_Phases_Complete-10b981?style=flat-square)

</div>

---

## ▌What is VocaMail?

VocaMail is an **eyes-free, voice-first Gmail interface** engineered specifically for blind users, users with motor impairments, and anyone seeking a seamless hands-free email experience. 

Instead of requiring sight to browse lists or fine motor skills to type and point with a mouse, VocaMail operates through natural speech. Tap <kbd>Space</kbd>, speak a command, and VocaMail transcribes your voice, carries out your Gmail action, and speaks the reply aloud.

---

## ▌Complete Voice Turn Lifecycle

```mermaid
flowchart LR
    A["🎙️ BROWSER<br/>audioRecorder.js"] -->|audio/webm blob<br/>POST /api/voice| B["⚙️ FLASK API<br/>app.py"]
    B -->|raw audio| C["👂 WHISPER AI<br/>transcribe.py"]
    C -->|transcript text| D["🧠 INTENT PARSER<br/>core/intent.py"]
    D -->|intent & slots| E["✉️ GMAIL CLIENT<br/>gmail/client.py"]
    E -->|data / action| F["🗣️ gTTS VOICE<br/>speech/tts.py"]
    F -->|spoken .mp3| G["🔊 REACT APP<br/>Hidden &lt;audio&gt;"]
    G -->|ARIA announcement| H["📢 SCREEN READERS<br/>NVDA / VoiceOver"]

    style A fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f1f0ff
    style B fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f1f0ff
    style C fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f1f0ff
    style D fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f1f0ff
    style E fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f1f0ff
    style F fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f1f0ff
    style G fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f1f0ff
    style H fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f1f0ff
```

---

## ▌Full System Architecture

```mermaid
flowchart TD
    subgraph Frontend ["React 18 + Vite Client (Port 5173)"]
        APP["App.jsx · App.css"]
        MIC["MicButton.jsx · Spacebar Shortcut"]
        DRAFT["DraftCard.jsx · Live Email Notepad"]
        RESP["ResponseBox.jsx · Dual ARIA Live Regions"]
        LIST["EmailList.jsx · Visual Inbox View"]
        REC["utils/audioRecorder.js · Web Audio Cues"]
    end

    subgraph Server ["Flask 3.0 API Server (Port 5000)"]
        API["app.py · Routes & Session Guard"]
        AUTH["auth/google_oauth.py · PKCE Safe OAuth 2.0"]
        STATE["core/state.py · Conversation Memory"]
        INTENT["core/intent.py · Fuzzy Phrase Matcher"]
    end

    subgraph SpeechAI ["Speech Pipeline"]
        WHISPER["speech/transcribe.py · Whisper Model Cache"]
        TTS["speech/tts.py · gTTS Audio Generator"]
    end

    subgraph GoogleBackend ["Google Workspace"]
        GMAIL["gmail/client.py · Official Gmail v1 API"]
        READER["gmail/reader.py · Spoken Text Formatter"]
    end

    MIC -->|1. Record Voice| REC
    REC -->|2. POST audio/webm| API
    API -->|3. Validate Token| AUTH
    API -->|4. Check Memory State| STATE
    API -->|5. Transcribe Speech| WHISPER
    WHISPER -->|6. Transcript Text| INTENT
    INTENT -->|7. Intent & Parameters| GMAIL
    GMAIL -->|8. Fetch / Send / Modify| READER
    READER -->|9. Plain English Sentences| TTS
    TTS -->|10. Stream MP3 & Text| APP
    APP -->|11. Auto-play Speech & Update UI| RESP
    APP -->|12. Show Draft Progress| DRAFT

    style Frontend fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f1f0ff
    style Server fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#f1f0ff
    style SpeechAI fill:#022c22,stroke:#10b981,stroke-width:2px,color:#f1f0ff
    style GoogleBackend fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#f1f0ff
```

---

## ▌Supported Voice Commands

| Voice Command | Action Description | Example Spoken Input |
|---|---|---|
| **Read Inbox** | Fetches and reads your 5 latest emails with sender & subject | *"read my inbox"*, *"check my emails"*, *"what's new"* |
| **Read Full Email** | Opens a specific email and reads its full body text aloud | *"read email 1"*, *"open the second email"*, *"read message 3"* |
| **Compose Email** | Launches the step-by-step voice dictation wizard | *"compose email to alice@example.com about meeting tomorrow"* |
| **Search Emails** | Queries Gmail for any sender, keyword, or topic | *"search for amazon receipts"*, *"find emails from GitHub"* |
| **Archive Email** | Removes an email from INBOX (stored safely in All Mail) | *"archive email 1"*, *"archive the second email"* |
| **Delete Email** | Moves an email into Gmail's Trash folder | *"delete email 3"*, *"trash message 1"* |
| **Mark as Read** | Clears the UNREAD flag on an email | *"mark email 1 as read"*, *"mark as read"* |
| **Confirm Action** | Confirms sending an email during the compose flow | *"yes"*, *"send"*, *"send it"*, *"confirm"* |
| **Cancel Action** | Discards active draft and resets to main menu | *"cancel"*, *"stop"*, *"abort"*, *"nevermind"* |
| **Help** | Narrates all available voice commands | *"help"*, *"what can you do"*, *"commands"* |
| **Log Out** | Guides user to sign out of their Google account | *"log out"*, *"sign out"* |

---

## ▌Multi-Turn Email Composition Wizard

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Composing : "compose email"
    state Composing {
        [*] --> Recipient : "Who would you like to email?"
        Recipient --> Subject : "john at gmail dot com"
        Subject --> Body : "project update"
        Body --> Confirm : "The prototype is ready!"
        Confirm --> Sent : "yes" / "send"
        Confirm --> Discarded : "cancel"
    }
    Sent --> Idle : Email Delivered via Gmail API
    Discarded --> Idle : Draft Wiped
```

During composition:
- The glowing **`DraftCard`** live-updates on screen showing `To`, `Subject`, `Message Body`, and current step.
- Spoken email addresses like *"john dot doe at gmail dot com"* are automatically normalized to *"john.doe@gmail.com"*.
- Saying *"cancel"* at any turn immediately discards the draft.

---

## ▌Repository Layout

```
vocamail/
│
├── app.py                      ← Flask API server, session management, voice pipeline
├── config.py                   ← Settings & environment loader (.env)
├── requirements.txt            ← Python dependencies (Whisper, Flask, gTTS, Google APIs)
├── .env.example                ← Environment template
│
├── auth/
│   └── google_oauth.py         ← OAuth 2.0 flow with PKCE session persistence
│
├── core/
│   ├── intent.py               ← Fuzzy voice intent detector (rapidfuzz)
│   └── state.py                ← Session memory state machine (get/set/reset/update)
│
├── gmail/
│   ├── client.py               ← list_inbox, send_email, search, archive, trash, mark_read
│   └── reader.py               ← Formats email dicts into natural spoken sentences
│
├── speech/
│   ├── transcribe.py           ← Whisper Speech-to-Text (Local CPU / OpenAI API fallback)
│   └── tts.py                  ← gTTS voice synthesizer (MP3 generator & cleaner)
│
├── tests/
│   ├── __init__.py             ← Test suite package
│   ├── test_intent.py          ← 15 unit tests covering all voice commands
│   ├── test_state.py           ← 3 unit tests for session conversation lifecycle
│   └── test_reader.py          ← 3 unit tests for email speech formatting
│
└── frontend/                   ← React 18 + Vite Single Page Application
    ├── package.json            ← React 18, Vite, lucide-react
    ├── vite.config.js          ← Proxies /api, /login, /oauth to Flask on :5000
    ├── index.html              ← HTML shell with skip-links and viewport
    └── src/
        ├── main.jsx            ← React 18 createRoot mount
        ├── index.css           ← Global tokens, nebula theme, typography
        ├── App.jsx / App.css   ← Orchestrator, auth state, voice turn coordinator
        ├── utils/
        │   └── audioRecorder.js← Web Audio recorder with 440Hz / 300Hz accessibility beeps
        └── components/
            ├── Header.jsx / Header.css         ← Accessible navigation & sign out
            ├── LoginCard.jsx / LoginCard.css   ← Glassmorphism Google sign-in card
            ├── StatusBadge.jsx / StatusBadge.css← Pulsing LED status (Ready, Listening, Speaking)
            ├── MicButton.jsx / MicButton.css   ← Push-to-talk button with purple focus ring
            ├── DraftCard.jsx / DraftCard.css   ← Live voice email draft visualizer
            ├── ResponseBox.jsx / ResponseBox.css← Dual ARIA live region speech subtitles
            └── EmailList.jsx / EmailList.css   ← Visual inbox cards with unread badges
```

---

## ▌Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm
- **Google Account** with Gmail enabled

### 1. Clone & Configure

```bash
git clone https://github.com/ankushsingh003/vocamail-voice-first-gmail.git
cd vocamail-voice-first-gmail
```

Copy the environment template:
```bash
cp .env.example .env
```
Fill in your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud Console.

### 2. Install Dependencies

**Backend:**
```bash
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 3. Run Automated Tests

Run all 21 unit tests:
```bash
python -m unittest discover tests
```

### 4. Start the Application

**Terminal 1 — Backend (Flask on port 5000):**
```bash
python app.py
```

**Terminal 2 — Frontend (Vite on port 5173):**
```bash
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser, sign in with Google, and press <kbd>Space</kbd> to begin speaking!

---

## ▌Accessibility Standards (WCAG 2.1 AA)

- **Auditory Cues (Web Audio API):** Clean 440 Hz start tone and 300 Hz stop tone let blind users know exactly when recording starts and ends without looking at the screen.
- **Dual ARIA Live Regions:** Urgent updates (*"Listening…"*, *"Processing…"*) use `aria-live="assertive"`, while assistant responses use `aria-live="polite"` to avoid clobbering screen reader speech.
- **Keyboard Navigation:** Full keyboard navigation using <kbd>Space</kbd> or <kbd>Enter</kbd> to record; bright purple `:focus-visible` outlines for low-vision navigators.
- **Auto-Focus Management:** Keyboard focus returns smoothly to the microphone button after every voice turn.

---

## ▌License

Distributed under the MIT License. Built with ❤️ for accessibility and voice-first interaction.
