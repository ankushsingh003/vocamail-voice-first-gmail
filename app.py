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
    jsonify, render_template, url_for, send_from_directory
)

import config
from auth.google_oauth import build_auth_url, exchange_code, get_credentials, revoke_credentials
from core.state import get_state, set_state, reset_state
from core.intent import detect_intent
from gmail.client import (
    list_inbox, print_inbox_summary, send_email,
    search_messages, archive_message, trash_message, mark_as_read,
    toggle_star, get_message
)
from gmail.reader import (
    narrate_inbox, narrate_email, get_help_text, narrate_search_results
)
from gmail.briefing import create_morning_briefing
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
# Frontend Distribution Path Settings (Vite React Build)
# ---------------------------------------------------------------------------
# Path to the compiled frontend production assets
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "dist"))
FRONTEND_ASSETS_DIR = os.path.join(FRONTEND_DIST_DIR, "assets")


# ---------------------------------------------------------------------------
# 3. Web Interface & Static Asset Delivery (GET / and GET /assets/...)
# ---------------------------------------------------------------------------
# Serves the real Gmail web application interface (compiled with Vite):
@app.route("/assets/<path:filename>")
def serve_frontend_assets(filename):
    """Serves compiled Vite React JS and CSS bundle files."""
    if os.path.exists(os.path.join(FRONTEND_ASSETS_DIR, filename)):
        return send_from_directory(FRONTEND_ASSETS_DIR, filename)
    return "Asset not found", 404


@app.route("/")
def index():
    """
    Renders the authentic Gmail web application:
    - If Vite production build exists, serves frontend/dist/index.html.
    - Otherwise falls back to templates/index.html.
    """
    creds = get_credentials()
    logged_in = creds is not None

    if logged_in:
        try:
            print_inbox_summary(creds)
        except Exception as e:
            print(f"[VocaMail] Could not fetch inbox: {e}")

    dist_index = os.path.join(FRONTEND_DIST_DIR, "index.html")
    if os.path.exists(dist_index):
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")

    return render_template("index.html", logged_in=logged_in)


# ---------------------------------------------------------------------------
# 4. Starting the Google Login (GET /login)
# ---------------------------------------------------------------------------
@app.route("/login")
def login():
    """
    Redirects the user to Google's official permissions consent page.
    Remembers whether user came from Vite dev port 5173 or Flask port 5000.
    """
    referrer = request.referrer or ""
    origin = request.args.get("origin") or ""
    if "5173" in referrer or "5173" in origin:
        session["oauth_post_redirect"] = "http://localhost:5173/"
    else:
        session["oauth_post_redirect"] = "http://localhost:5000/"

    auth_url = build_auth_url()
    return redirect(auth_url)


# ---------------------------------------------------------------------------
# 5. The Google Callback Checkpoint (GET /oauth/callback)
# ---------------------------------------------------------------------------
@app.route("/oauth/callback")
def oauth_callback():
    """Exchanges Google's approval code for user tokens and redirects back cleanly."""
    if "error" in request.args:
        return f"OAuth error: {request.args['error']}", 400

    expected_state = session.get("oauth_state")
    incoming_state = request.args.get("state")

    if expected_state and incoming_state != expected_state:
        return redirect(url_for("login"))

    try:
        exchange_code(request.url)
        reset_state()   # Start fresh conversation state for the new session
    except Exception as e:
        return f"Failed to exchange OAuth code: {e}", 500

    # Redirect to the active interface (port 5173 in dev, or port 5000)
    post_redirect = session.pop("oauth_post_redirect", None)
    if post_redirect:
        return redirect(post_redirect)

    return redirect(url_for("index"))


# ---------------------------------------------------------------------------
# 6. Logging Out (GET & POST /logout)
# ---------------------------------------------------------------------------
@app.route("/logout", methods=["GET", "POST"])
def logout():
    """Clears all session credentials and redirects back to the login interface."""
    revoke_credentials()
    reset_state()

    referrer = request.referrer or ""
    # If called via fetch/AJAX from frontend, return clean JSON
    if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", ""):
        return jsonify({"ok": True, "message": "Signed out successfully"})

    if "5173" in referrer:
        return redirect("http://localhost:5173/")
    return redirect(url_for("index"))


# ---------------------------------------------------------------------------
# 7. Check Current Session (GET /api/session)
# ---------------------------------------------------------------------------
@app.route("/api/session")
def api_session():
    """
    Returns the current conversation memory state and authentication status.
    Returns logged_in: False when credentials are not active.
    """
    creds = get_credentials()
    if creds is None:
        return jsonify({"logged_in": False, "state": get_state()})

    user_info = session.get("google_token", {})
    return jsonify({
        "logged_in": True,
        "state": get_state(),
        "user": {
            "name": "User",
            "email": ""
        }
    })


# ---------------------------------------------------------------------------
# 8. Test Endpoint: Fetch Latest Emails (GET /api/inbox)
# ---------------------------------------------------------------------------
# Used by the "Fetch Latest Emails" button in the Phase 1 UI.
# It calls our Gmail postman (gmail/client.py), grabs the 5 newest emails,
# and sends them as clean JSON data so the browser can display them on screen.
# ---------------------------------------------------------------------------
# 8. Webmail REST Endpoints (Fetch Inbox, Email Detail, Actions)
# ---------------------------------------------------------------------------
# These endpoints power the full real Gmail web client interface:

@app.route("/api/inbox")
@login_required
def api_inbox():
    """Fetches emails for the requested folder/label (e.g. INBOX, STARRED, SENT, TRASH)."""
    try:
        creds = get_credentials()
        limit = request.args.get("limit", 50, type=int)
        label = request.args.get("label", "INBOX").upper()
        messages = list_inbox(creds, max_results=limit, label_ids=[label])
        return jsonify({"ok": True, "messages": messages, "label": label})
    except Exception as e:
        logger.error(f"[VocaMail] api_inbox error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/email/<msg_id>")
@login_required
def api_email_detail(msg_id):
    """Fetches full content, headers, and decoded body of a specific email."""
    try:
        creds = get_credentials()
        detail = get_message(creds, msg_id)
        return jsonify({"ok": True, "email": detail})
    except Exception as e:
        logger.error(f"[VocaMail] api_email_detail error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/send", methods=["POST"])
@login_required
def api_send_email():
    """Sends an email directly from the visual Compose modal."""
    try:
        data = request.get_json(silent=True) or {}
        to = data.get("to", "").strip()
        subject = data.get("subject", "").strip()
        body = data.get("body", "").strip()

        if not to:
            return jsonify({"ok": False, "error": "Recipient email address is required."}), 400

        creds = get_credentials()
        res = send_email(creds, to=to, subject=subject, body=body)
        return jsonify({"ok": True, "sent": res})
    except Exception as e:
        logger.error(f"[VocaMail] api_send error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/archive", methods=["POST"])
@login_required
def api_archive_email():
    """Archives an email by removing it from the INBOX label."""
    try:
        data = request.get_json(silent=True) or {}
        msg_id = data.get("id")
        if not msg_id:
            return jsonify({"ok": False, "error": "Missing email id."}), 400
        creds = get_credentials()
        archive_message(creds, msg_id)
        return jsonify({"ok": True})
    except Exception as e:
        logger.error(f"[VocaMail] api_archive error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/trash", methods=["POST"])
@login_required
def api_trash_email():
    """Moves an email into Gmail's Trash folder."""
    try:
        data = request.get_json(silent=True) or {}
        msg_id = data.get("id")
        if not msg_id:
            return jsonify({"ok": False, "error": "Missing email id."}), 400
        creds = get_credentials()
        trash_message(creds, msg_id)
        return jsonify({"ok": True})
    except Exception as e:
        logger.error(f"[VocaMail] api_trash error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/mark_read", methods=["POST"])
@login_required
def api_mark_read():
    """Marks an email as read."""
    try:
        data = request.get_json(silent=True) or {}
        msg_id = data.get("id")
        if not msg_id:
            return jsonify({"ok": False, "error": "Missing email id."}), 400
        creds = get_credentials()
        mark_as_read(creds, msg_id)
        return jsonify({"ok": True})
    except Exception as e:
        logger.error(f"[VocaMail] api_mark_read error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/star", methods=["POST"])
@login_required
def api_star_email():
    """Stars or unstars an email in Gmail."""
    try:
        data = request.get_json(silent=True) or {}
        msg_id = data.get("id")
        star = bool(data.get("star", True))
        if not msg_id:
            return jsonify({"ok": False, "error": "Missing email id."}), 400
        creds = get_credentials()
        toggle_star(creds, msg_id, star=star)
        return jsonify({"ok": True, "starred": star})
    except Exception as e:
        logger.error(f"[VocaMail] api_star error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/search")
@login_required
def api_search():
    """Searches emails by keyword, sender, or subject."""
    try:
        query = request.args.get("q", "").strip()
        limit = request.args.get("limit", 25, type=int)
        if not query:
            return jsonify({"ok": True, "messages": []})
        creds = get_credentials()
        results = search_messages(creds, query=query, max_results=limit)
        return jsonify({"ok": True, "messages": results, "query": query})
    except Exception as e:
        logger.error(f"[VocaMail] api_search error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/briefing", methods=["GET", "POST"])
@login_required
def api_briefing():
    """
    ⚡ Morning Executive Briefing:
    Fetches unread emails from the past 24-48 hours, triages urgent vs general updates,
    and returns a synthesized audio podcast URL plus structured executive bullet cards.
    """
    try:
        creds = get_credentials()
        briefing_data = create_morning_briefing(creds)
        return jsonify(briefing_data)
    except Exception as e:
        logger.error(f"[VocaMail] Briefing generation failed: {e}")
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
