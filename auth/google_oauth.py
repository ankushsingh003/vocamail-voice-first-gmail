import json
from flask import session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
import config


def _build_flow(state: str | None = None, code_verifier: str | None = None) -> Flow:
    client_config = {
        "web": {
            "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [config.OAUTH_REDIRECT_URI],
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=config.GMAIL_SCOPES,
        redirect_uri=config.OAUTH_REDIRECT_URI,
        state=state,
    )

    if code_verifier:
        flow.code_verifier = code_verifier
        if hasattr(flow, "_oauth2session") and flow._oauth2session is not None:
            flow._oauth2session._client.code_verifier = code_verifier

    return flow


def build_auth_url() -> str:
    flow = _build_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    session["oauth_state"] = state

    code_verifier = getattr(flow, "code_verifier", None)
    if code_verifier:
        session["oauth_code_verifier"] = code_verifier

    return auth_url


def exchange_code(request_url: str) -> dict:
    state = session.get("oauth_state")
    code_verifier = session.get("oauth_code_verifier")

    flow = _build_flow(state=state, code_verifier=code_verifier)
    flow.fetch_token(authorization_response=request_url)

    creds = flow.credentials
    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else config.GMAIL_SCOPES,
    }
    session["google_token"] = token_data
    return token_data


def get_credentials() -> Credentials | None:
    token_data = session.get("google_token")
    if not token_data:
        return None

    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=token_data.get("scopes", config.GMAIL_SCOPES),
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_data["token"] = creds.token
        session["google_token"] = token_data

    return creds


def revoke_credentials() -> None:
    session.pop("google_token", None)
    session.pop("oauth_state", None)
    session.pop("oauth_code_verifier", None)
    session.pop("code_verifier", None)
    session.pop("vocamail_state", None)
