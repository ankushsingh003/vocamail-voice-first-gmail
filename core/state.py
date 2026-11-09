from flask import session

_DEFAULT_STATE: dict = {
    "mode": "idle",
    "compose_step": None,
    "draft": {"to": None, "subject": None, "body": None},
    "inbox_cache": [],
    "current_index": 0,
}


def get_state() -> dict:
    if "vocamail_state" not in session:
        session["vocamail_state"] = _DEFAULT_STATE.copy()
    return session["vocamail_state"]


def set_state(state: dict) -> None:
    session["vocamail_state"] = state


def reset_state() -> dict:
    state = _DEFAULT_STATE.copy()
    state["draft"] = {"to": None, "subject": None, "body": None}
    session["vocamail_state"] = state
    return state


def update_state(**kwargs) -> dict:
    state = get_state()
    state.update(kwargs)
    set_state(state)
    return state
