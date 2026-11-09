import unittest
from flask import Flask
from core.state import get_state, set_state, reset_state, update_state


class TestConversationState(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.secret_key = "test-secret-key"

    def test_default_state_initialization(self):
        with self.app.test_request_context("/"):
            state = get_state()
            self.assertEqual(state["mode"], "idle")
            self.assertIsNone(state["compose_step"])
            self.assertIsNone(state["draft"]["to"])
            self.assertIsNone(state["draft"]["subject"])
            self.assertIsNone(state["draft"]["body"])

    def test_update_state(self):
        with self.app.test_request_context("/"):
            update_state(mode="composing", compose_step="recipient")
            state = get_state()
            self.assertEqual(state["mode"], "composing")
            self.assertEqual(state["compose_step"], "recipient")

    def test_set_and_reset_state(self):
        with self.app.test_request_context("/"):
            custom_state = {
                "mode": "composing",
                "compose_step": "confirm",
                "draft": {"to": "friend@example.com", "subject": "Hello", "body": "World"},
                "inbox_cache": [],
                "current_index": 0,
            }
            set_state(custom_state)
            self.assertEqual(get_state()["draft"]["to"], "friend@example.com")

            reset = reset_state()
            self.assertEqual(reset["mode"], "idle")
            self.assertIsNone(reset["compose_step"])
            self.assertIsNone(reset["draft"]["to"])


if __name__ == "__main__":
    unittest.main()
