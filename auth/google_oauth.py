"""
auth/google_oauth.py
────────────────────
Handles the full Google OAuth 2.0 flow:
  - build_auth_url()      → redirect user to Google's consent screen
  - exchange_code()       → swap auth code for access + refresh tokens
  - get_credentials()     → return valid Credentials (auto-refreshes if expired)
  - revoke_credentials()  → logout / clear tokens from session
"""

import json
from flask import session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
import config


# ── Helper: build a Flow object ────────────────────────────────────────────────

def _build_flow() -> Flow:
    """Create an OAuth Flow from client secrets in config."""
    client_config = {
        "web": {
            "client_id":     config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
            "auth_uri":      "https://accounts.google.com/o/oauth2/auth",
            "token_uri":     "https://oauth2.googleapis.com/token",
            "redirect_uris": [config.OAUTH_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=config.GMAIL_SCOPES,
        redirect_uri=config.OAUTH_REDIRECT_URI,
    )
    return flow


# ── Step 1: Build the URL the user clicks ─────────────────────────────────────

def build_auth_url() -> str:
    """
    Returns the Google consent-screen URL.
    Also stores the OAuth state token in the Flask session for CSRF protection.
    """
    flow = _build_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",      # get a refresh_token
        include_granted_scopes="true",
        prompt="consent",           # force consent so we always get refresh_token
    )
    session["oauth_state"] = state
    return auth_url


# ── Step 2: Exchange the code Google sends back ────────────────────────────────

def exchange_code(request_url: str) -> dict:
    """
    Called inside /oauth/callback.
    `request_url` is the full URL of the callback request (including ?code=...&state=...).
    Returns a plain dict of token data that we store in the session.
    """
    flow = _build_flow()
    flow.fetch_token(authorization_response=request_url)

    creds = flow.credentials
    token_data = {
        "token":         creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri":     creds.token_uri,
        "client_id":     creds.client_id,
        "client_secret": creds.client_secret,
        "scopes":        list(creds.scopes) if creds.scopes else config.GMAIL_SCOPES,
    }
    session["google_token"] = token_data
    return token_data


# ── Step 3: Get valid Credentials for API calls ────────────────────────────────

def get_credentials() -> Credentials | None:
    """
    Loads token from session and returns a valid Credentials object.
    Auto-refreshes with the refresh_token if the access_token is expired.
    Returns None if the user is not logged in.
    """
    token_data = session.get("google_token")
    if not token_data:
        return None

    creds = Credentials(
        token=         token_data.get("token"),
        refresh_token= token_data.get("refresh_token"),
        token_uri=     token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=     token_data.get("client_id"),
        client_secret= token_data.get("client_secret"),
        scopes=        token_data.get("scopes", config.GMAIL_SCOPES),
    )

    # Auto-refresh if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Persist the new access token back into the session
        token_data["token"] = creds.token
        session["google_token"] = token_data

    return creds


# ── Step 4: Revoke / logout ────────────────────────────────────────────────────

def revoke_credentials() -> None:
    """Clears token data from the session (local logout only)."""
    session.pop("google_token", None)
    session.pop("oauth_state", None)
    session.pop("auramail_state", None)
