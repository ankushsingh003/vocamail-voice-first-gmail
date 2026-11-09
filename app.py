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
import re
import uuid
import logging
from flask import (
    Flask, redirect, request, session,
    jsonify, render_template, url_for
)

import config
from auth.google_oauth import build_auth_url, exchange_code, get_credentials, revoke_credentials
from core.state import get_state, set_state, reset_state
from core.intent import detect_intent
from gmail.client import (
    list_inbox, print_inbox_summary, send_email,
    search_messages, archive_message, trash_message, mark_as_read
)
from gmail.reader import (
    narrate_inbox, narrate_email, get_help_text, narrate_search_results
)
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
            # If the browser is calling an API endpoint, return clean JSON 401
            # instead of a 302 HTML redirect so React fetch handles it gracefully.
            if request.path.startswith("/api/"):
                return jsonify({
                    "ok": False,
                    "error": "Google session expired or not signed in. Please log in again."
                }), 401
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
# Helper: Spoken Email Address Cleaner (_normalize_spoken_email)
# ---------------------------------------------------------------------------
# When blind users dictate an email address by voice, speech recognition
# might hear "john dot doe at gmail dot com" instead of "john.doe@gmail.com".
# This helper converts spoken words ("at", "dot", "dash") into real email punctuation.
def _normalize_spoken_email(text: str) -> str:
    """Converts spoken email addresses into clean standard email strings."""
    if not text:
        return ""

    # If the transcript already contains a valid email address, use it directly
    match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    if match:
        return match.group(0).lower().strip()

    # Convert spoken words to standard email symbols
    cleaned = text.lower()
    cleaned = re.sub(r"\bat\b", "@", cleaned)
    cleaned = re.sub(r"\bdot\b", ".", cleaned)
    cleaned = re.sub(r"\bunderscore\b", "_", cleaned)
    cleaned = re.sub(r"\bdash\b", "-", cleaned)

    # Remove all spaces between words/symbols (e.g. "john @ gmail . com" -> "john@gmail.com")
    cleaned = re.sub(r"\s+", "", cleaned)
    # Strip any trailing punctuation marks
    cleaned = cleaned.strip(". ,;:!")
    return cleaned


# ---------------------------------------------------------------------------
# 9. The Core Voice Pipeline (POST /api/voice)
# ---------------------------------------------------------------------------
# This is the full voice highway — the heart of VocaMail:
#
#  Step 1: Browser sends recorded audio → we save to a temp file on disk
#  Step 2: Whisper AI converts the audio → plain English text (transcript)
#  Step 3: Check conversation state memory:
#            - If user is in the middle of composing: handle the next step (recipient -> subject -> body -> confirm)
#            - If idle: detect intent (read_inbox, compose, read_email, help, logout)
#  Step 4: Perform the Gmail action and build a friendly spoken reply string
#  Step 5: gTTS converts the reply string → MP3 audio file
#  Step 6: Return transcript + reply text + audio URL + updated state to React
@app.route("/api/voice", methods=["POST"])
@login_required
def api_voice():
    """Full voice pipeline: audio in → Whisper → state machine / intent → Gmail action → gTTS audio out."""

    # ---- 1. Check that an audio file was actually sent ----
    if "audio" not in request.files or request.files["audio"].filename == "":
        return jsonify({"ok": False, "error": "No audio file received."}), 400

    audio_file = request.files["audio"]

    # ---- 2. Save the audio blob to a temp file on disk ----
    ext = ".webm"   # Chrome & Edge record in WebM format by default
    temp_filename = f"voice_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(config.AUDIO_TEMP_DIR, temp_filename)
    audio_file.save(temp_path)

    # ---- 3. Whisper: audio → text ----
    try:
        transcript = transcribe_audio(temp_path)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Transcription failed: {e}"}), 500

    logger.info(f"[VocaMail] Transcript: '{transcript}'")

    # ---- 4. Check conversation memory & detect user command ----
    state = get_state()
    current_mode = state.get("mode", "idle")
    compose_step = state.get("compose_step")
    draft = state.get("draft", {"to": None, "subject": None, "body": None})

    intent_result = detect_intent(transcript)
    intent        = intent_result["intent"]
    params        = intent_result["params"]

    logger.info(f"[VocaMail] Mode: {current_mode} | Step: {compose_step} | Intent: {intent}")

    creds = get_credentials()
    reply_text = ""

    # =======================================================================
    # SCENARIO A: User is in the middle of COMPOSING an email (multi-turn)
    # =======================================================================
    if current_mode == "composing":
        # Check if user wants to cancel the compose flow
        if intent == "cancel" or transcript.lower().strip() in ["cancel", "stop", "abort", "nevermind"]:
            reset_state()
            reply_text = "Email cancelled. Draft discarded. Returning to main menu."

        elif compose_step == "recipient":
            # User just spoke the recipient's name or email address
            recipient = _normalize_spoken_email(transcript)
            draft["to"] = recipient
            state["draft"] = draft

            if draft.get("subject"):
                state["compose_step"] = "body"
                reply_text = f"Recipient is {recipient}. Subject is '{draft['subject']}'. What would you like the body of the email to say?"
            else:
                state["compose_step"] = "subject"
                reply_text = f"Recipient set to {recipient}. What is the subject of the email?"

            set_state(state)

        elif compose_step == "subject":
            # User just spoke the subject line
            clean_subject = transcript.strip().rstrip(".")
            draft["subject"] = clean_subject
            state["draft"] = draft
            state["compose_step"] = "body"
            set_state(state)
            reply_text = f"Subject set to '{clean_subject}'. What would you like the message body to say?"

        elif compose_step == "body":
            # User just spoke the body of the message
            clean_body = transcript.strip()
            draft["body"] = clean_body
            state["draft"] = draft
            state["compose_step"] = "confirm"
            set_state(state)
            reply_text = (
                f"Here is your email to {draft.get('to')}. "
                f"Subject: {draft.get('subject')}. "
                f"Message: {clean_body}. "
                "Would you like to send this email now? Say yes to send, or say cancel."
            )

        elif compose_step == "confirm":
            # User is deciding whether to send or cancel
            if intent == "confirm" or any(w in transcript.lower() for w in ["yes", "send", "confirm", "proceed"]):
                to_addr = draft.get("to")
                sub_txt = draft.get("subject", "(no subject)")
                body_txt = draft.get("body", "")

                try:
                    send_email(creds, to=to_addr, subject=sub_txt, body=body_txt)
                    reset_state()
                    reply_text = f"Success! Your email to {to_addr} has been sent."
                except Exception as e:
                    logger.error(f"[VocaMail] Send email failed: {e}")
                    reply_text = f"Sorry, sending the email failed: {e}. Say yes to retry, or cancel to abort."
            else:
                reply_text = (
                    "I didn't catch that. Please say 'yes' or 'send' to deliver the email, "
                    "or say 'cancel' to discard it."
                )

        else:
            reset_state()
            reply_text = "Something went wrong in the compose flow. Draft reset. How can I help you?"

    # =======================================================================
    # SCENARIO B: User is IDLE and speaking a fresh command
    # =======================================================================
    else:
        if intent == "read_inbox":
            reply_text = narrate_inbox(creds)

        elif intent == "read_email":
            email_index = params.get("email_index", 0)
            reply_text  = narrate_email(creds, email_index)

        elif intent == "search":
            query = params.get("query", "").strip()
            reply_text = narrate_search_results(creds, query)

        elif intent == "archive":
            # Archive an email from the inbox
            email_index = params.get("email_index", 0)
            try:
                emails = list_inbox(creds)
                if 0 <= email_index < len(emails):
                    target_email = emails[email_index]
                    archive_message(creds, target_email["id"])
                    reply_text = f"Archived email {email_index + 1}: '{target_email.get('subject')}'. It has been removed from your inbox."
                else:
                    reply_text = f"Cannot archive: there are only {len(emails)} emails in your inbox."
            except Exception as e:
                logger.error(f"[VocaMail] Archive error: {e}")
                reply_text = f"Sorry, could not archive that email: {e}"

        elif intent == "trash":
            # Delete an email (move to trash)
            email_index = params.get("email_index", 0)
            try:
                emails = list_inbox(creds)
                if 0 <= email_index < len(emails):
                    target_email = emails[email_index]
                    trash_message(creds, target_email["id"])
                    reply_text = f"Deleted email {email_index + 1}: '{target_email.get('subject')}'. Moved to Trash."
                else:
                    reply_text = f"Cannot delete: there are only {len(emails)} emails in your inbox."
            except Exception as e:
                logger.error(f"[VocaMail] Delete error: {e}")
                reply_text = f"Sorry, could not delete that email: {e}"

        elif intent == "mark_read":
            # Mark an email as read
            email_index = params.get("email_index", 0)
            try:
                emails = list_inbox(creds)
                if 0 <= email_index < len(emails):
                    target_email = emails[email_index]
                    mark_as_read(creds, target_email["id"])
                    reply_text = f"Marked email {email_index + 1}: '{target_email.get('subject')}' as read."
                else:
                    reply_text = f"Cannot mark as read: there are only {len(emails)} emails in your inbox."
            except Exception as e:
                logger.error(f"[VocaMail] Mark as read error: {e}")
                reply_text = f"Sorry, could not mark that email as read: {e}"

        elif intent == "compose":
            # Start the multi-turn email compose wizard
            recipient = params.get("recipient")
            subject   = params.get("subject")
            fresh_draft = {"to": None, "subject": None, "body": None}

            state["mode"] = "composing"

            if recipient:
                fresh_draft["to"] = _normalize_spoken_email(recipient)
                if subject:
                    fresh_draft["subject"] = subject.strip().rstrip(".")
                    state["compose_step"] = "body"
                    reply_text = f"Composing email to {fresh_draft['to']} with subject '{fresh_draft['subject']}'. What would you like the message to say?"
                else:
                    state["compose_step"] = "subject"
                    reply_text = f"Composing email to {fresh_draft['to']}. What is the subject of the email?"
            else:
                state["compose_step"] = "recipient"
                reply_text = "Who would you like to email? You can speak an email address or a name."

            state["draft"] = fresh_draft
            set_state(state)

        elif intent == "help":
            reply_text = get_help_text()

        elif intent == "logout":
            reply_text = (
                "To sign out, click the Sign Out button at the top of the screen, "
                "or say log out and then confirm."
            )

        elif intent == "cancel":
            reset_state()
            reply_text = "Nothing to cancel. Ready for your command. Say 'help' to hear what I can do."

        else:
            reply_text = (
                f"I heard you say: {transcript}. "
                "I'm not sure what you'd like me to do. "
                "Try saying 'read my inbox', 'compose email', 'read email 1', or 'help'."
            )

    # ---- 5. gTTS: reply text → spoken MP3 audio file ----
    cleanup_old_audio()
    try:
        audio_url = speak(reply_text)
    except Exception as e:
        logger.warning(f"[VocaMail] TTS failed: {e}")
        audio_url = None

    # ---- 6. Return everything to the React frontend ----
    return jsonify({
        "ok":         True,
        "transcript": transcript,
        "intent":     intent,
        "text":       reply_text,
        "audio_url":  audio_url,
        "state":      get_state(),
    })


# ---------------------------------------------------------------------------
# Global JSON Error Handler for /api/* Endpoints
# ---------------------------------------------------------------------------
# Prevents Flask from returning raw HTML error pages to React fetch calls.
@app.errorhandler(500)
def handle_internal_server_error(e):
    """Catches unhandled server crashes and returns clean JSON to API callers."""
    logger.error(f"[VocaMail] Unhandled 500 server error: {e}")
    if request.path.startswith("/api/"):
        return jsonify({"ok": False, "error": f"Internal server error: {e}"}), 500
    return f"Internal Server Error: {e}", 500


# ---------------------------------------------------------------------------
# 10. Start the Local Server
# ---------------------------------------------------------------------------
# When you type 'python app.py' in the terminal, this turns on the Flask engine
# in debug mode on port 5000 (accessible at http://127.0.0.1:5000).
if __name__ == "__main__":
    app.run(debug=True, port=5000)
