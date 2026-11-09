"""
tests/test_intent.py — Voice Intent Recognition Unit Tests
===========================================================
Think of this file like a quality inspector testing VocaMail's ears.

Before shipping our code, this test suite speaks different phrases
to the intent detector (core/intent.py) and verifies that it correctly
understands every single command, extracts numbers and emails properly,
and gracefully ignores gibberish.

How to run:
    python -m unittest tests/test_intent.py
"""

import unittest
from core.intent import detect_intent


class TestIntentDetection(unittest.TestCase):
    """Verifies that user voice commands map to the right action."""

    # -----------------------------------------------------------------------
    # 1. Inbox Reading Tests
    # -----------------------------------------------------------------------
    def test_read_inbox_commands(self):
        """Checks various ways people ask to check their inbox."""
        phrases = [
            "read my inbox",
            "check my emails",
            "what's new",
            "show emails",
            "check inbox please",
        ]
        for phrase in phrases:
            with self.subTest(phrase=phrase):
                res = detect_intent(phrase)
                self.assertEqual(res["intent"], "read_inbox")

    # -----------------------------------------------------------------------
    # 2. Specific Email Reading Tests (with index extraction)
    # -----------------------------------------------------------------------
    def test_read_specific_email_digit(self):
        """Verifies 'read email 2' extracts email_index = 1 (0-based)."""
        res = detect_intent("read email 2")
        self.assertEqual(res["intent"], "read_email")
        self.assertEqual(res["params"]["email_index"], 1)

    def test_read_specific_email_ordinal(self):
        """Verifies 'read the third email' extracts email_index = 2."""
        res = detect_intent("read the third email")
        self.assertEqual(res["intent"], "read_email")
        self.assertEqual(res["params"]["email_index"], 2)

    # -----------------------------------------------------------------------
    # 3. Email Composing Tests (with recipient & subject extraction)
    # -----------------------------------------------------------------------
    def test_compose_with_email_address_and_subject(self):
        """Verifies recipient email and subject are extracted in one sentence."""
        res = detect_intent("compose email to alice@example.com about project update")
        self.assertEqual(res["intent"], "compose")
        self.assertEqual(res["params"]["recipient"], "alice@example.com")
        self.assertIn("project update", res["params"]["subject"])

    def test_compose_with_name_only(self):
        """Verifies recipient name is extracted when no email is given."""
        res = detect_intent("send email to John Smith")
        self.assertEqual(res["intent"], "compose")
        self.assertEqual(res["params"]["recipient"], "John Smith")

    # -----------------------------------------------------------------------
    # 4. Search Tests
    # -----------------------------------------------------------------------
    def test_search_by_keyword(self):
        """Verifies search query is cleanly extracted."""
        res = detect_intent("search for amazon receipts")
        self.assertEqual(res["intent"], "search")
        self.assertIn("receipts", res["params"]["query"])

    def test_find_by_sender(self):
        """Verifies 'find emails from' maps to search."""
        res = detect_intent("find emails from GitHub")
        self.assertEqual(res["intent"], "search")
        self.assertIn("github", res["params"]["query"].lower())

    # -----------------------------------------------------------------------
    # 5. Email Management Action Tests (Archive, Delete, Mark as Read)
    # -----------------------------------------------------------------------
    def test_archive_command(self):
        """Verifies archiving email with index extraction."""
        res = detect_intent("archive email 1")
        self.assertEqual(res["intent"], "archive")
        self.assertEqual(res["params"]["email_index"], 0)

    def test_trash_command(self):
        """Verifies deleting email with index extraction."""
        res = detect_intent("delete email 3")
        self.assertEqual(res["intent"], "trash")
        self.assertEqual(res["params"]["email_index"], 2)

    def test_mark_as_read_command(self):
        """Verifies marking email as read."""
        res = detect_intent("mark email 1 as read")
        self.assertEqual(res["intent"], "mark_read")
        self.assertEqual(res["params"]["email_index"], 0)

    # -----------------------------------------------------------------------
    # 6. Confirmation & Cancellation Tests
    # -----------------------------------------------------------------------
    def test_confirmation_words(self):
        """Verifies confirmation responses during multi-turn compose."""
        for word in ["yes", "send it", "confirm"]:
            with self.subTest(word=word):
                res = detect_intent(word)
                self.assertEqual(res["intent"], "confirm")

    def test_cancellation_words(self):
        """Verifies cancel words abort cleanly."""
        for word in ["cancel", "stop", "abort"]:
            with self.subTest(word=word):
                res = detect_intent(word)
                self.assertEqual(res["intent"], "cancel")

    # -----------------------------------------------------------------------
    # 7. System Commands & Unknown Input Tests
    # -----------------------------------------------------------------------
    def test_briefing_commands(self):
        """Verifies morning executive briefing voice triggers."""
        phrases = [
            "give me my morning briefing",
            "morning briefing",
            "vocamail briefing",
            "play briefing",
        ]
        for phrase in phrases:
            with self.subTest(phrase=phrase):
                res = detect_intent(phrase)
                self.assertEqual(res["intent"], "briefing")

    def test_help_command(self):
        """Verifies help intent."""
        res = detect_intent("what can you do")
        self.assertEqual(res["intent"], "help")

    def test_logout_command(self):
        """Verifies sign out intent."""
        res = detect_intent("sign out")
        self.assertEqual(res["intent"], "logout")

    def test_empty_and_unknown_input(self):
        """Verifies empty or nonsense audio returns unknown gracefully."""
        self.assertEqual(detect_intent("")["intent"], "unknown")
        self.assertEqual(detect_intent("xyz123nonsenseqwerty")["intent"], "unknown")


if __name__ == "__main__":
    unittest.main()

