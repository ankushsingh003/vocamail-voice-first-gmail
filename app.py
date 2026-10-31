"""
app.py — The Traffic Controller & Web Server
============================================
Think of this file like the reception desk of our application.
Whenever you open your web browser and click a button or visit a link,
your browser sends a request here. This file looks at what you asked for
(e.g., "log me in", "show me the homepage", or "get my emails") and directs
you to the right helper.

The main jobs this file manages:
  1. GET  /               -> Shows the homepage (Login screen if logged out, Voice UI if logged in).
  2. GET  /login          -> Sends you over to Google's sign-in page.
  3. GET  /oauth/callback -> Welcomes you back when Google finishes verifying your account.
  4. POST /logout         -> Logs you out and clears your data.
  5. GET  /api/session    -> Lets the webpage check if you are still logged in.
  6. GET  /api/inbox      -> Test endpoint: pulls 5 emails from Gmail and returns them as JSON.
  7. POST /api/voice      -> Full voice pipeline: Whisper → Intent → Gmail → gTTS reply.

Phase 4 additions:
  - detect_intent()  : figures out what the user asked for (read_inbox, read_email, help…)
  - narrate_inbox()  : formats Gmail inbox as a spoken sentence
  - narrate_email()  : reads one full email body aloud
  - get_help_text()  : returns the list of voice commands as speech
"""

import os
import uuid
import logging
from flask import (
    Flask, redirect, request, session,
    jsonify, render_template, url_for
)

import config
from auth.google_oauth import build_auth_url, exchange_code, get_credentials, revoke_credentials
from core.state import get_state, reset_state
from core.intent import detect_intent
from gmail.client import list_inbox, print_inbox_summary
from gmail.reader import narrate_inbox, narrate_email, get_help_text
from speech.transcribe import transcribe_audio
from speech.tts import speak, cleanup_old_audio


# ---------------------------------------------------------------------------
# 1. Starting Up Flask & Setting Up Local Storage
# ---------------------------------------------------------------------------
# We initialize the Flask web engine and give it our secret encryption key.
app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,
)

# Set up a logger so we can print helpful debug messages to the terminal
logger = logging.getLogger(__name__)

# Make sure the 'static/audio' directory exists so we have a place to save
# temporary spoken .mp3 audio clips before playing them.
os.makedirs(config.AUDIO_TEMP_DIR, exist_ok=True)

# Google OAuth normally insists on strict HTTPS encryption.
# On your local laptop (localhost), this setting tells Google:
# "It's okay to test over regular HTTP for now while building locally."
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")


# ---------------------------------------------------------------------------
# 2. The Security Guard Decorator (@login_required)
# ---------------------------------------------------------------------------
# Think of this like a bouncer at the door of VIP pages or API endpoints.
# If someone tries to fetch emails or call the voice API without being logged in,
# the bouncer catches them and redirects them straight to the login screen!
def login_required(f):
    """Checks if the user has a valid Google login badge before running the endpoint."""
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if get_credentials() is None:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper


# ---------------------------------------------------------------------------
# 3. Homepage (GET /)
# ---------------------------------------------------------------------------
# When you visit http://localhost:5000 in your browser:
# - If you are NOT logged in: Shows the stylish dark-mode Login screen.
# - If you ARE logged in: Shows the Voice UI with the big microphone button!
@app.route("/")
def index():
    """Renders the main single-page interface based on your login status."""
    creds = get_credentials()
    logged_in = creds is not None

    # Developer helper: if logged in, also print the inbox directly in the terminal
    if logged_in:
        try:
            print_inbox_summary(creds)
        except Exception as e:
            print(f"[VocaMail] Could not fetch inbox: {e}")

    return render_template("index.html", logged_in=logged_in)


# ---------------------------------------------------------------------------
# 4. Starting the Google Login (GET /login)
# ---------------------------------------------------------------------------
# When you click the "Sign in with Google" button, your browser visits this route.
# It builds the official Google login link and immediately redirects your browser to Google.
@app.route("/login")
def login():
    """Redirects the user to Google's official permissions consent page."""
    auth_url = build_auth_url()
    return redirect(auth_url)


# ---------------------------------------------------------------------------
# 5. The Google Callback Checkpoint (GET /oauth/callback)
# ---------------------------------------------------------------------------
# When you click "Allow" on Google's website, Google redirects your browser back here.
# This function does three crucial security checks:
# 1. Verifies the security code (CSRF token) to ensure nobody hijacked the connection.
# 2. Trades the temporary code from Google for permanent access tokens.
# 3. Resets the conversation memory so you start with a clean slate, then sends you home.
@app.route("/oauth/callback")
def oauth_callback():
    """Exchanges Google's approval code for user tokens and returns to the homepage."""
    if "error" in request.args:
        return f"OAuth error: {request.args['error']}", 400

    expected_state = session.get("oauth_state")
    incoming_state = request.args.get("state")

    # If state is missing or mismatched (e.g. from an old tab or expired cookie),
    # restart the login flow cleanly rather than displaying a raw error page.
    if expected_state and incoming_state != expected_state:
        return redirect(url_for("login"))

    try:
        exchange_code(request.url)
        reset_state()   # Start fresh conversation state for the new session
    except Exception as e:
        return f"Failed to exchange OAuth code: {e}", 500

    return redirect(url_for("index"))


# ---------------------------------------------------------------------------
# 6. Logging Out (POST /logout)
# ---------------------------------------------------------------------------
# When you click "Sign out", this function deletes all stored keys and
# conversation memory from your session, safely logging you out.
@app.route("/logout", methods=["POST"])
def logout():
    """Clears all session keys and sends you back to the login screen."""
    revoke_credentials()
    return redirect(url_for("index"))


# ---------------------------------------------------------------------------
# 7. Check Current Session (GET /api/session)
# ---------------------------------------------------------------------------
# If you refresh the webpage, the frontend can quietly ask this endpoint:
# "Hey, what was I in the middle of doing?" and get back the assistant's memory state.
@app.route("/api/session")
@login_required
def api_session():
    """Returns the current conversation memory state as JSON."""
    return jsonify({"state": get_state(), "logged_in": True})


# ---------------------------------------------------------------------------
# 8. Test Endpoint: Fetch Latest Emails (GET /api/inbox)
# ---------------------------------------------------------------------------
# Used by the "Fetch Latest Emails" button in the Phase 1 UI.
# It calls our Gmail postman (gmail/client.py), grabs the 5 newest emails,
# and sends them as clean JSON data so the browser can display them on screen.
@app.route("/api/inbox")
@login_required
def api_inbox():
    """Fetches your recent inbox emails and sends them back as JSON."""
    try:
        creds = get_credentials()
        messages = list_inbox(creds)
        return jsonify({"ok": True, "messages": messages})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# 9. The Core Voice Pipeline (POST /api/voice)
# ---------------------------------------------------------------------------
# This is the full voice highway — the heart of VocaMail:
#
#  Step 1: Browser sends recorded audio → we save to a temp file on disk
#  Step 2: Whisper AI converts the audio → plain English text (transcript)
#  Step 3: Intent detector reads the transcript → figures out what the user wants
#            e.g. "read my inbox" → intent: read_inbox
#            e.g. "read email 2"  → intent: read_email, params: {email_index: 1}
#  Step 4: We perform the correct Gmail action and build a spoken reply string
#  Step 5: gTTS converts the reply string → MP3 audio file
#  Step 6: Return transcript + reply text + audio URL to React
#            → React displays text and auto-plays the spoken audio
@app.route("/api/voice", methods=["POST"])
@login_required
def api_voice():
    """Full voice pipeline: audio in → Whisper → intent → Gmail action → gTTS audio out."""

    # ---- 1. Check that an audio file was actually sent ----
    # The browser sends the recording inside a form field named "audio".
    if "audio" not in request.files or request.files["audio"].filename == "":
        return jsonify({"ok": False, "error": "No audio file received."}), 400

    audio_file = request.files["audio"]

    # ---- 2. Save the audio blob to a temp file on disk ----
    # Whisper needs a real file path — it cannot read a raw bytes stream.
    # We give each file a unique name so concurrent users don't overwrite each other.
    ext = ".webm"   # Chrome & Edge record in WebM format by default
    temp_filename = f"voice_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(config.AUDIO_TEMP_DIR, temp_filename)
    audio_file.save(temp_path)

    # ---- 3. Whisper: audio → text ----
    # transcribe_audio() automatically deletes the temp file after transcription
    # so your private voice recording never lingers on disk.
    try:
        transcript = transcribe_audio(temp_path)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Transcription failed: {e}"}), 500

    logger.info(f"[VocaMail] Transcript: '{transcript}'")

    # ---- 4. Intent detection: what did the user ask for? ----
    # detect_intent() uses fuzzy matching to map the transcript to one of our
    # known command categories: read_inbox, read_email, compose, logout, help, unknown.
    intent_result = detect_intent(transcript)
    intent        = intent_result["intent"]
    params        = intent_result["params"]

    logger.info(f"[VocaMail] Intent: {intent} | Params: {params}")

    # ---- 5. Perform the Gmail action and build the spoken reply ----
    creds = get_credentials()

    if intent == "read_inbox":
        # User said something like "read my inbox" or "check emails"
        # Fetch latest emails and narrate them as a sentence
        reply_text = narrate_inbox(creds)

    elif intent == "read_email":
        # User said something like "read email 2" or "open the third message"
        email_index = params.get("email_index", 0)
        reply_text  = narrate_email(creds, email_index)

    elif intent == "help":
        # User said "help" or "what can you do"
        reply_text = get_help_text()

    elif intent == "logout":
        # User said "log out" or "sign out"
        # We don't actually log out here (that needs a POST /logout from the frontend)
        # but we tell them how to do it
        reply_text = (
            "To sign out, click the Sign Out button at the top of the screen, "
            "or say log out and then confirm."
        )

    elif intent == "compose":
        # Compose is a future feature — acknowledge it gracefully
        recipient  = params.get("recipient", "")
        if recipient:
            reply_text = (
                f"Composing an email to {recipient} is coming soon. "
                "For now, you can read your inbox or open a specific email."
            )
        else:
            reply_text = (
                "Email composing is coming soon. "
                "You can say 'read my inbox' or 'read email 1' to get started."
            )

    else:
        # Unknown intent — didn't understand the command
        reply_text = (
            f"I heard you say: {transcript}. "
            "I'm not sure what you'd like me to do. "
            "Try saying 'read my inbox', 'read email 1', or 'help' for a list of commands."
        )

    # ---- 6. gTTS: reply text → spoken MP3 audio file ----
    # cleanup_old_audio() quietly deletes MP3 files older than 10 minutes to save space.
    cleanup_old_audio()
    try:
        audio_url = speak(reply_text)
    except Exception as e:
        # TTS failure is non-fatal — frontend still shows the text reply
        logger.warning(f"[VocaMail] TTS failed: {e}")
        audio_url = None

    # ---- 7. Return everything to the React frontend ----
    return jsonify({
        "ok":         True,
        "transcript": transcript,
        "intent":     intent,
        "text":       reply_text,
        "audio_url":  audio_url,   # e.g. "/static/audio/tts_abc123.mp3"
        "state":      get_state(),
    })


# ---------------------------------------------------------------------------
# 10. Start the Local Server
# ---------------------------------------------------------------------------
# When you type 'python app.py' in the terminal, this turns on the Flask engine
# in debug mode on port 5000 (accessible at http://127.0.0.1:5000).
if __name__ == "__main__":
    app.run(debug=True, port=5000)
