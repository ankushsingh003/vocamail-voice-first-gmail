"""
core/state.py
─────────────
Helpers for reading and writing the AuraMail conversation state
that lives in Flask's session under the key "auramail_state".

State shape:
  {
    "mode":         "idle" | "composing" | "reading" | "confirming" | "searching",
    "compose_step": None | "recipient" | "subject" | "body" | "confirm",
    "draft":        {"to": None, "subject": None, "body": None},
    "inbox_cache":  [],   ← list of dicts from gmail.client.list_inbox()
    "current_index": 0,
  }
"""

from flask import session

_DEFAULT_STATE: dict = {
    "mode":          "idle",
    "compose_step":  None,
    "draft":         {"to": None, "subject": None, "body": None},
    "inbox_cache":   [],
    "current_index": 0,
}


def get_state() -> dict:
    """Return the current conversation state, initialising if absent."""
    if "auramail_state" not in session:
        session["auramail_state"] = _DEFAULT_STATE.copy()
    return session["auramail_state"]


def set_state(state: dict) -> None:
    """Persist an updated state dict back into the session."""
    session["auramail_state"] = state


def reset_state() -> dict:
    """Reset to idle and return the clean state."""
    state = _DEFAULT_STATE.copy()
    state["draft"] = {"to": None, "subject": None, "body": None}
    session["auramail_state"] = state
    return state


def update_state(**kwargs) -> dict:
    """Merge keyword args into the current state and persist."""
    state = get_state()
    state.update(kwargs)
    set_state(state)
    return state
