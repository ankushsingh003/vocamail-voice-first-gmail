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
  7. POST /api/voice      -> The main voice turn pipeline (Whisper + Gmail + Speech playback).
"""

import os
from flask import (
    Flask, redirect, request, session,
    jsonify, render_template, url_for
)

import config
from auth.google_oauth import build_auth_url, exchange_code, get_credentials, revoke_credentials
from core.state import get_state, reset_state
from gmail.client import list_inbox, print_inbox_summary


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
# This will be the main voice highway in Phase 2+:
# 1. Takes the recorded voice audio from the browser microphone.
# 2. Hands it to Whisper to turn it into text.
# 3. Figure out what the user wants ("read inbox", "send email").
# 4. Talks to Gmail if needed.
# 5. Converts the answer to spoken audio using gTTS.
# 6. Returns the text and audio URL to the browser to play out loud!
@app.route("/api/voice", methods=["POST"])
@login_required
def api_voice():
    """The central endpoint for speech audio in -> spoken response out."""
    return jsonify({
        "ok":         True,
        "transcript": "(voice pipeline coming in Phase 2)",
        "text":       "Voice pipeline coming in Phase 2.",
        "audio_url":  None,
        "state":      get_state(),
    })


# ---------------------------------------------------------------------------
# 10. Start the Local Server
# ---------------------------------------------------------------------------
# When you type 'python app.py' in the terminal, this turns on the Flask engine
# in debug mode on port 5000 (accessible at http://127.0.0.1:5000).
if __name__ == "__main__":
    app.run(debug=True, port=5000)
