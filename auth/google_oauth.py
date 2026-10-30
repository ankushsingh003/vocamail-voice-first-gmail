"""
auth/google_oauth.py — Google Sign-In & Security Badge Manager (OAuth 2.0)
===========================================================================
How Google OAuth works in plain English:
Imagine you visit a secure building. Instead of giving the receptionist your house keys,
the front desk calls Google. Google asks you: "Is it okay if this app reads your emails?"
When you say yes, Google gives our app a temporary digital badge (Access Token).
Whenever our app wants to check your emails, it shows Google this digital badge!

This file handles the 4 steps of that conversation:
  1. build_auth_url()     -> Generates the link to send you to Google's sign-in page.
  2. exchange_code()      -> Takes the secret note Google sends back and trades it for badge keys.
  3. get_credentials()    -> Retrieves your active badge (and automatically gets a fresh one if it expired).
  4. revoke_credentials() -> Throws away the badge when you click "Sign Out".
"""

import json
from flask import session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
import config


# ---------------------------------------------------------------------------
# Helper: The Handshake Configurator (_build_flow)
# ---------------------------------------------------------------------------
# This prepares the official Google library with our App's ID, Secret, and Redirect URL.
# It makes sure both Google and our Flask app are speaking the same security protocol.
def _build_flow() -> Flow:
    """Create an OAuth Flow object configured with our app credentials."""
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


# ---------------------------------------------------------------------------
# Step 1: Send the User to Google's Sign-In Screen (build_auth_url)
# ---------------------------------------------------------------------------
# When the user clicks the big "Sign in with Google" button, we call this function.
# It creates a special Google URL with:
# - access_type="offline" : Tells Google "Give us a refresh token so the user
#   doesn't have to log in again every 60 minutes".
# - prompt="consent"      : Always asks for permission clearly.
# - state                 : A randomized security code stored in Flask's session
#   to prevent fake/hacked redirects (CSRF protection).
def build_auth_url() -> str:
    """
    Builds the web address where the user logs into Google and approves permissions.
    """
    flow = _build_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",      # ask for a refresh_token for background token renewal
        include_granted_scopes="true",
        prompt="consent",           # ensures Google issues a refresh token
    )
    session["oauth_state"] = state   # remember this code to verify when Google returns
    return auth_url


# ---------------------------------------------------------------------------
# Step 2: Trade the Google Approval Ticket for Real Access Keys (exchange_code)
# ---------------------------------------------------------------------------
# After you click "Allow" on Google's website, Google bounces your browser back to:
# http://localhost:5000/oauth/callback?code=XXXXX
# That 'code' is a one-time ticket. This function sends that ticket to Google's
# server in the background and exchanges it for the actual Access Token & Refresh Token.
# We then tuck those tokens safely into the user's encrypted Flask session.
def exchange_code(request_url: str) -> dict:
    """
    Swaps Google's temporary authorization code for real access and refresh tokens.
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
    # Save the keys inside the user's private session on the server
    session["google_token"] = token_data
    return token_data


# ---------------------------------------------------------------------------
# Step 3: Get Ready-to-Use Credentials (with Auto-Renewal!) (get_credentials)
# ---------------------------------------------------------------------------
# Every time the voice assistant needs to read or send an email, it calls this function.
# Google access badges automatically expire after 1 hour for security.
# The brilliant thing here: if the badge expired, this function uses the
# "refresh_token" to quietly ask Google for a brand-new badge in under 1 second,
# without disturbing the user or asking them to log in again!
def get_credentials() -> Credentials | None:
    """
    Returns valid Google credentials from the session.
    Automatically refreshes the badge if it has expired.
    Returns None if the user hasn't logged in yet.
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

    # If the badge has expired, ask Google for a fresh one automatically
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Save the new badge back to session so it stays fresh
        token_data["token"] = creds.token
        session["google_token"] = token_data

    return creds


# ---------------------------------------------------------------------------
# Step 4: Sign Out / Throw Away the Keys (revoke_credentials)
# ---------------------------------------------------------------------------
# When the user says "sign out" or clicks the Logout button, we wipe all stored
# badges and conversation memory from the session. The user is now safely logged out.
def revoke_credentials() -> None:
    """
    Clears all saved Google tokens and conversation memory from the user's session.
    """
    session.pop("google_token", None)
    session.pop("oauth_state", None)
    session.pop("auramail_state", None)
