import unittest
from core.action_detector import (
    extract_meeting_link,
    extract_invoice_info,
    extract_meeting_proposal,
    build_google_calendar_url,
    detect_all_action_items,
)


class TestActionDetector(unittest.TestCase):
    def test_extract_zoom_link(self):
        text = "Join our team sync here: https://zoom.us/j/987654321?pwd=abcd See you there!"
        result = extract_meeting_link(text)
        self.assertIsNotNone(result)
        self.assertEqual(result["platform"], "Zoom")
        self.assertIn("zoom.us/j/987654321", result["url"])

    def test_extract_meet_link(self):
        text = "Google meet link: https://meet.google.com/abc-defg-hij"
        result = extract_meeting_link(text)
        self.assertIsNotNone(result)
        self.assertEqual(result["platform"], "Google Meet")
        self.assertEqual(result["url"], "https://meet.google.com/abc-defg-hij")

    def test_extract_teams_link(self):
        text = "Teams call: https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz"
        result = extract_meeting_link(text)
        self.assertIsNotNone(result)
        self.assertEqual(result["platform"], "Teams")

    def test_extract_invoice_info(self):
        text = "Your invoice of $45.00 is due on Nov 15, 2026. Please submit payment."
        result = extract_invoice_info(text)
        self.assertIsNotNone(result)
        self.assertEqual(result["amount"], "$45.00")
        self.assertIn("Nov 15", result["due_date"])

    def test_extract_meeting_proposal(self):
        text = "Are you available Friday at 4:00 PM IST to discuss the project?"
        result = extract_meeting_proposal(text)
        self.assertIsNotNone(result)
        self.assertIn("Friday", result["date_str"])
        self.assertIn("4:00 PM IST", result["date_str"])

    def test_build_calendar_url(self):
        url = build_google_calendar_url("Design Review", details="Sync notes", location="https://zoom.us/j/123")
        self.assertTrue(url.startswith("https://calendar.google.com/calendar/render?action=TEMPLATE"))
        self.assertIn("Design+Review", url)
        self.assertIn("zoom.us", url)

    def test_detect_all_action_items(self):
        body = "Hi Alex, please join Friday at 4:00 PM IST via https://zoom.us/j/123456. Also note invoice total $45.00 is due Nov 15."
        res = detect_all_action_items(subject="Sync & Invoice", sender="Maya Patel <maya@test.com>", body=body)
        self.assertTrue(res["meeting"]["detected"])
        self.assertTrue(res["invoice"]["detected"])
        self.assertIsNotNone(res["meeting_link"])
        self.assertEqual(res["meeting_link"]["platform"], "Zoom")


if __name__ == "__main__":
    unittest.main()

