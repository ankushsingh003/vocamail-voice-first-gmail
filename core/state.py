"""
core/state.py — The Voice Assistant's Short-Term Memory
======================================================
Think of this file like a notepad the voice assistant keeps on its desk.

Because you're talking in steps (e.g. Turn 1: "Write email" -> Turn 2: "To John"
-> Turn 3: "Subject meeting"), the assistant needs to remember what it asked you
a few seconds ago. Without this memory, every time you pressed the mic button,
it would have completely forgotten who you are and what you were doing!

We store this notepad inside Flask's secure user session under the key "vocamail_state".
"""

from flask import session

# ---------------------------------------------------------------------------
# Default Blank Notepad (What the memory looks like when you first start)
# ---------------------------------------------------------------------------
# - mode: What the assistant is currently doing.
#         'idle'       -> waiting for any command
#         'composing'  -> in the middle of writing an email
#         'reading'    -> reading an email out loud to you
#         'confirming' -> waiting for you to say "yes" or "no"
#         'searching'  -> reviewing search results
# - compose_step: Which question in the email compose flow are we on?
#         'recipient'  -> waiting for the person's name / email
#         'subject'    -> waiting for email topic
#         'body'       -> waiting for the main message
#         'confirm'    -> "Are you sure you want to send this?"
# - draft: A temporary folder holding the pieces of the email you're dictating.
# - inbox_cache: A list of the latest emails we pulled from Gmail so we don't
#   keep re-downloading them every two seconds.
# - current_index: Which email in the list you are currently listening to (e.g. Email #1).
_DEFAULT_STATE: dict = {
    "mode":          "idle",
    "compose_step":  None,
    "draft":         {"to": None, "subject": None, "body": None},
    "inbox_cache":   [],
    "current_index": 0,
}


def get_state() -> dict:
    """
    Grab the current notepad from memory.
    If the user just arrived for the first time, give them a fresh blank notepad.
    """
    if "vocamail_state" not in session:
        session["vocamail_state"] = _DEFAULT_STATE.copy()
    return session["vocamail_state"]


def set_state(state: dict) -> None:
    """
    Save the updated notepad back into Flask's session memory so it's
    preserved for the user's next voice turn.
    """
    session["vocamail_state"] = state


def reset_state() -> dict:
    """
    Wipe the notepad clean back to 'idle'.
    Call this whenever an email has been sent, or when the user says "cancel" or "stop".
    """
    state = _DEFAULT_STATE.copy()
    state["draft"] = {"to": None, "subject": None, "body": None}
    session["vocamail_state"] = state
    return state


def update_state(**kwargs) -> dict:
    """
    A handy shortcut to change just one or two things on the notepad without
    having to rewrite the whole thing.
    Example: update_state(mode="reading", current_index=2)
    """
    state = get_state()
    state.update(kwargs)
    set_state(state)
    return state
