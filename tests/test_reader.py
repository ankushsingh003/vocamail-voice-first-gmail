"""
tests/test_reader.py — Speech Output & Narration Unit Tests
============================================================
Verifies that email dictionaries and help text are formatted into
clean, natural, easy-to-listen-to spoken English sentences (gmail/reader.py).

How to run:
    python -m unittest tests/test_reader.py
"""

import unittest
from gmail.reader import _format_email_line, get_help_text


class TestGmailReader(unittest.TestCase):
    """Verifies that email data turns into friendly spoken audio sentences."""

    def test_format_unread_email_line(self):
        """Verifies unread emails are flagged clearly in speech."""
        email = {
            "from": "GitHub <notifications@github.com>",
            "subject": "PR merged into main",
            "snippet": "Your pull request #42 has been successfully merged.",
            "unread": True,
        }
        line = _format_email_line(email, 0)
        self.assertIn("Email 1", line)
        self.assertIn("GitHub", line)
        self.assertIn("PR merged into main", line)
        self.assertIn("Unread", line)

    def test_format_read_email_line(self):
        """Verifies read emails do not say 'Unread' unnecessarily."""
        email = {
            "from": "Alex Morgan",
            "subject": "Lunch today?",
            "snippet": "Hey, want to grab lunch at 1pm?",
            "unread": False,
        }
        line = _format_email_line(email, 2)
        self.assertIn("Email 3", line)
        self.assertNotIn("Unread", line)

    def test_help_text_content(self):
        """Verifies the spoken help message covers all core voice features."""
        help_text = get_help_text()
        self.assertIn("read my inbox", help_text)
        self.assertIn("compose email", help_text)
        self.assertIn("search for", help_text)
        self.assertIn("archive email", help_text)
        self.assertIn("delete email", help_text)
        self.assertIn("Space", help_text)


if __name__ == "__main__":
    unittest.main()
