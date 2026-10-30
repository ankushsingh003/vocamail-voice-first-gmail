import os
from dotenv import load_dotenv

load_dotenv()

# ── Flask ──────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")

# ── Google OAuth ───────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
OAUTH_REDIRECT_URI   = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:5000/oauth/callback")

# OAuth scopes — read, send, modify (archive / mark-read / labels)
GMAIL_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]

# ── Whisper ────────────────────────────────────────────────────────────────────
WHISPER_MODE  = os.getenv("WHISPER_MODE", "local")   # 'local' | 'api'
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
WHISPER_MODEL = "base"   # tiny / base / small — trade speed vs accuracy

# ── Audio / TTS ────────────────────────────────────────────────────────────────
AUDIO_TEMP_DIR = os.path.join("static", "audio")    # served as /static/audio/
TTS_LANGUAGE   = "en"

# ── Gmail fetch limits ─────────────────────────────────────────────────────────
INBOX_MAX_RESULTS = 5
