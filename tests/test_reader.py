import unittest
from gmail.reader import _format_email_line, get_help_text


class TestGmailReader(unittest.TestCase):
    def test_format_unread_email_line(self):
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
        help_text = get_help_text()
        self.assertIn("read my inbox", help_text)
        self.assertIn("compose email", help_text)
        self.assertIn("search for", help_text)
        self.assertIn("archive email", help_text)
        self.assertIn("delete email", help_text)
        self.assertIn("Space", help_text)


if __name__ == "__main__":
    unittest.main()
