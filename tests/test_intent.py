import unittest
from core.intent import detect_intent


class TestIntentDetection(unittest.TestCase):
    def test_read_inbox_commands(self):
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

    def test_read_specific_email_digit(self):
        res = detect_intent("read email 2")
        self.assertEqual(res["intent"], "read_email")
        self.assertEqual(res["params"]["email_index"], 1)

    def test_read_specific_email_ordinal(self):
        res = detect_intent("read the third email")
        self.assertEqual(res["intent"], "read_email")
        self.assertEqual(res["params"]["email_index"], 2)

    def test_compose_with_email_address_and_subject(self):
        res = detect_intent("compose email to alice@example.com about project update")
        self.assertEqual(res["intent"], "compose")
        self.assertEqual(res["params"]["recipient"], "alice@example.com")
        self.assertIn("project update", res["params"]["subject"])

    def test_compose_with_name_only(self):
        res = detect_intent("send email to John Smith")
        self.assertEqual(res["intent"], "compose")
        self.assertEqual(res["params"]["recipient"], "John Smith")

    def test_search_by_keyword(self):
        res = detect_intent("search for amazon receipts")
        self.assertEqual(res["intent"], "search")
        self.assertIn("receipts", res["params"]["query"])

    def test_find_by_sender(self):
        res = detect_intent("find emails from GitHub")
        self.assertEqual(res["intent"], "search")
        self.assertIn("github", res["params"]["query"].lower())

    def test_archive_command(self):
        res = detect_intent("archive email 1")
        self.assertEqual(res["intent"], "archive")
        self.assertEqual(res["params"]["email_index"], 0)

    def test_trash_command(self):
        res = detect_intent("delete email 3")
        self.assertEqual(res["intent"], "trash")
        self.assertEqual(res["params"]["email_index"], 2)

    def test_mark_as_read_command(self):
        res = detect_intent("mark email 1 as read")
        self.assertEqual(res["intent"], "mark_read")
        self.assertEqual(res["params"]["email_index"], 0)

    def test_add_calendar_command(self):
        for phrase in ["add to calendar", "add meeting to calendar", "put on calendar"]:
            with self.subTest(phrase=phrase):
                res = detect_intent(phrase)
                self.assertEqual(res["intent"], "add_calendar")

    def test_join_meeting_command(self):
        for phrase in ["join meeting", "join zoom", "open zoom", "join call"]:
            with self.subTest(phrase=phrase):
                res = detect_intent(phrase)
                self.assertEqual(res["intent"], "join_meeting")

    def test_set_reminder_command(self):
        for phrase in ["set reminder", "set a reminder", "remind me about invoice"]:
            with self.subTest(phrase=phrase):
                res = detect_intent(phrase)
                self.assertEqual(res["intent"], "set_reminder")

    def test_confirmation_words(self):
        for word in ["yes", "send it", "confirm"]:
            with self.subTest(word=word):
                res = detect_intent(word)
                self.assertEqual(res["intent"], "confirm")

    def test_cancellation_words(self):
        for word in ["cancel", "stop", "abort"]:
            with self.subTest(word=word):
                res = detect_intent(word)
                self.assertEqual(res["intent"], "cancel")

    def test_briefing_commands(self):
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
        res = detect_intent("what can you do")
        self.assertEqual(res["intent"], "help")

    def test_logout_command(self):
        res = detect_intent("sign out")
        self.assertEqual(res["intent"], "logout")

    def test_empty_and_unknown_input(self):
        self.assertEqual(detect_intent("")["intent"], "unknown")
        self.assertEqual(detect_intent("xyz123nonsenseqwerty")["intent"], "unknown")


if __name__ == "__main__":
    unittest.main()
