"""
app.py — AuraMail Flask entry point
────────────────────────────────────
Phase 1 routes:
  GET  /              → main page (login wall if not authed)
  GET  /login         → redirect to Google consent screen
  GET  /oauth/callback → finish OAuth, store tokens, redirect to /
  GET  /api/session   → return current state as JSON
  GET  /api/inbox     → Phase-1 test: return 5 latest email subjects as JSON
  POST /logout        → clear session
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

# ── App setup ──────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.secret_key = config.SECRET_KEY

# Ensure the temp audio dir exists
os.makedirs(config.AUDIO_TEMP_DIR, exist_ok=True)

# Needed so OAuth works over plain HTTP on localhost
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")


# ── Auth guard decorator ───────────────────────────────────────────────────────

def login_required(f):
    """Redirect to /login if the user has no valid token."""
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if get_credentials() is None:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """
    Main page.
    - Not logged in  → show login screen
    - Logged in      → show the voice interface (Phase 2+)
    """
    creds = get_credentials()
    logged_in = creds is not None

    # Phase 1 terminal test: print inbox to console when logged in
    if logged_in:
        try:
            print_inbox_summary(creds)
        except Exception as e:
            print(f"[AuraMail] Could not fetch inbox: {e}")

    return render_template("index.html", logged_in=logged_in)


@app.route("/login")
def login():
    """Kick off the OAuth flow — redirect user to Google."""
    auth_url = build_auth_url()
    return redirect(auth_url)


@app.route("/oauth/callback")
def oauth_callback():
    """
    Google redirects here after the user consents.
    Exchange the auth code for tokens and redirect to home.
    """
    # Basic CSRF check
    if request.args.get("state") != session.get("oauth_state"):
        return "OAuth state mismatch — possible CSRF attack.", 400

    if "error" in request.args:
        return f"OAuth error: {request.args['error']}", 400

    try:
        exchange_code(request.url)
        reset_state()   # fresh conversation state for new session
    except Exception as e:
        return f"Failed to exchange OAuth code: {e}", 500

    return redirect(url_for("index"))


@app.route("/logout", methods=["POST"])
def logout():
    """Clear all session data and return to login screen."""
    revoke_credentials()
    return redirect(url_for("index"))


# ── API endpoints ──────────────────────────────────────────────────────────────

@app.route("/api/session")
@login_required
def api_session():
    """Return current conversation state as JSON (useful for page reloads)."""
    return jsonify({"state": get_state(), "logged_in": True})


@app.route("/api/inbox")
@login_required
def api_inbox():
    """
    Phase-1 test endpoint.
    Returns the 5 latest inbox messages as JSON so we can verify
    Gmail access before wiring up voice in Phase 2.
    """
    try:
        creds = get_credentials()
        messages = list_inbox(creds)
        return jsonify({"ok": True, "messages": messages})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ── Phase 2+ placeholder ───────────────────────────────────────────────────────

@app.route("/api/voice", methods=["POST"])
@login_required
def api_voice():
    """
    Phase 2: will receive audio blob → Whisper → intent → Gmail → gTTS → response.
    For now, return a stub so the frontend wiring can be tested.
    """
    return jsonify({
        "ok":       True,
        "transcript": "(voice not wired yet — Phase 2)",
        "text":     "Voice pipeline coming in Phase 2.",
        "audio_url": None,
        "state":    get_state(),
    })


# ── Run ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
