import unittest
from unittest.mock import patch
from app import app, COPILOT_OUT_OF_SCOPE_MSG, COPILOT_GREETING_MSG


class TestCopilotDomain(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    @patch("app.get_credentials")
    @patch("app.list_inbox")
    def test_copilot_rejects_gibberish(self, mock_list, mock_creds):
        mock_creds.return_value = object()
        mock_list.return_value = []
        res = self.client.post("/api/copilot/chat", json={"query": "huewbfebfj"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("ok"))
        self.assertTrue(data.get("out_of_domain"))
        self.assertEqual(data.get("answer"), COPILOT_OUT_OF_SCOPE_MSG)

    @patch("app.get_credentials")
    @patch("app.list_inbox")
    def test_copilot_rejects_off_topic_cooking(self, mock_list, mock_creds):
        mock_creds.return_value = object()
        mock_list.return_value = []
        res = self.client.post("/api/copilot/chat", json={"query": "how do I bake chocolate cookies"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("ok"))
        self.assertTrue(data.get("out_of_domain"))
        self.assertEqual(data.get("answer"), COPILOT_OUT_OF_SCOPE_MSG)

    @patch("app.get_credentials")
    @patch("app.list_inbox")
    def test_copilot_accepts_greeting(self, mock_list, mock_creds):
        mock_creds.return_value = object()
        mock_list.return_value = []
        res = self.client.post("/api/copilot/chat", json={"query": "Hello there"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("ok"))
        self.assertEqual(data.get("answer"), COPILOT_GREETING_MSG)

    @patch("app.get_credentials")
    @patch("app.list_inbox")
    def test_copilot_accepts_email_query(self, mock_list, mock_creds):
        mock_creds.return_value = object()
        mock_list.return_value = [
            {"from": "Google <no-reply@google.com>", "subject": "Security Alert", "snippet": "New sign-in", "is_unread": True}
        ]
        res = self.client.post("/api/copilot/chat", json={"query": "Summarize my unread mail"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("ok"))
        self.assertIn("unread email", data.get("answer", ""))


if __name__ == "__main__":
    unittest.main()
