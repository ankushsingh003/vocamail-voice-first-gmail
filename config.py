"""
config.py — Central Control Room / Settings File
=================================================
Think of this file like the master control panel or settings sheet for our entire app.
Instead of scattering passwords, URLs, and settings across 10 different files,
we keep everything right here in one place so it's super easy to change later.
"""

import os
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# 1. Load Secret Keys from our private .env file
# ---------------------------------------------------------------------------
# In real life, you never want your passwords written directly in the code where
# someone on GitHub could steal them. load_dotenv() quietly reads the hidden '.env'
# file on your computer and loads those secrets safely into memory.
load_dotenv()


# ---------------------------------------------------------------------------
# 2. Flask Web Server Security Key
# ---------------------------------------------------------------------------
# Flask uses this secret key like a digital signature stamp to protect user sessions
# and cookies from being tampered with by hackers.
SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")


# ---------------------------------------------------------------------------
# 3. Google Login & Gmail Credentials (OAuth 2.0)
# ---------------------------------------------------------------------------
# These values are the "ID badge" and "password" Google gives our app so it knows
# who is asking for permission.
# - GOOGLE_CLIENT_ID: The public username for our app on Google Cloud.
# - GOOGLE_CLIENT_SECRET: The secret password that only our server knows.
# - OAUTH_REDIRECT_URI: The exact web address where Google should send the user
#   back to after they click "Allow" on the Google sign-in screen.
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
OAUTH_REDIRECT_URI   = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:5000/oauth/callback")


# ---------------------------------------------------------------------------
# 4. What Permissions (Scopes) Are We Asking From Google?
# ---------------------------------------------------------------------------
# When you log into Google, it shows a list of checkboxes asking:
# "Do you let this app read and send emails?"
# These URLs tell Google exactly what powers our voice assistant needs:
# - openid & userinfo.email : Just to know who is logged in.
# - gmail.readonly          : So we can read your inbox aloud to you.
# - gmail.send              : So you can speak an email and send it.
# - gmail.modify            : So you can say "archive this" or "mark as read".
GMAIL_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]


# ---------------------------------------------------------------------------
# 5. Whisper Speech Recognition (Turning Voice into Text)
# ---------------------------------------------------------------------------
# - WHISPER_MODE: 'local' means your own computer converts your speech to text
#   (completely free, runs offline). 'api' uses OpenAI's cloud servers.
# - OPENAI_API_KEY: Only needed if you choose to use the cloud API version.
# - WHISPER_MODEL: How smart/heavy the AI ear should be.
#   'base' is the sweet spot between being fast on your CPU and very accurate.
WHISPER_MODE   = os.getenv("WHISPER_MODE", "local")   # 'local' | 'api'
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
WHISPER_MODEL  = "base"   # options: tiny (fastest), base (balanced), small (smartest)


# ---------------------------------------------------------------------------
# 6. Text-to-Speech (Turning AI Answers into Spoken Audio)
# ---------------------------------------------------------------------------
# - AUDIO_TEMP_DIR: The folder on disk where we briefly save spoken .mp3 audio clips
#   before the browser plays them through your speakers.
# - TTS_LANGUAGE: Spoken language (en = English).
AUDIO_TEMP_DIR = os.path.join("static", "audio")
TTS_LANGUAGE   = "en"


# ---------------------------------------------------------------------------
# 7. Inbox Limits
# ---------------------------------------------------------------------------
# Blind and voice users don't want 50 emails read at once—it's overwhelming!
# We cap each inbox summary at 5 emails so it feels snappy and easy to follow.
INBOX_MAX_RESULTS = 5
