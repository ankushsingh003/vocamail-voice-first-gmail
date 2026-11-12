import unittest
from core.rag_search import (
    is_conversational_query,
    expand_search_query,
    synthesize_inbox_rag,
)


class TestIsConversationalQuery(unittest.TestCase):
    def test_question_mark_detected(self):
        self.assertTrue(is_conversational_query("What was the flight number?"))

    def test_question_starter_what(self):
        self.assertTrue(is_conversational_query("What did the lawyer say about the contract"))

    def test_question_starter_who(self):
        self.assertTrue(is_conversational_query("Who emailed me about the internship"))

    def test_question_starter_when(self):
        self.assertTrue(is_conversational_query("When is the contract deadline"))

    def test_intent_keyword_flight(self):
        self.assertTrue(is_conversational_query("flight number for my trip to Mumbai"))

    def test_intent_keyword_booking(self):
        self.assertTrue(is_conversational_query("hotel booking confirmation in my mail"))

    def test_intent_keyword_tracking(self):
        self.assertTrue(is_conversational_query("tracking number for my order"))

    def test_plain_keyword_not_question(self):
        self.assertFalse(is_conversational_query("Stripe"))

    def test_gmail_filter_not_question(self):
        self.assertFalse(is_conversational_query("label:unread"))

    def test_short_name_not_question(self):
        self.assertFalse(is_conversational_query("Acme"))

    def test_empty_string(self):
        self.assertFalse(is_conversational_query(""))

    def test_none_equivalent_empty(self):
        self.assertFalse(is_conversational_query("   "))


class TestExpandSearchQuery(unittest.TestCase):
    def test_flight_expands(self):
        result = expand_search_query("What was the flight number for my trip to Mumbai")
        self.assertIn("flight OR airline OR booking OR ticket", result)
        self.assertIn("Mumbai", result)

    def test_internship_expands(self):
        result = expand_search_query("Who emailed me about the internship assignment")
        self.assertIn("internship OR assignment OR interview", result)

    def test_hotel_expands(self):
        result = expand_search_query("What was my hotel booking")
        self.assertIn("hotel OR reservation", result)

    def test_invoice_expands(self):
        result = expand_search_query("Show me the invoice from Acme")
        self.assertIn("invoice OR receipt OR bill", result)

    def test_tracking_expands(self):
        result = expand_search_query("What is the tracking number for my delivery")
        self.assertIn("tracking OR shipment OR delivery", result)

    def test_stopwords_stripped(self):
        result = expand_search_query("What was the flight to Mumbai")
        self.assertNotIn("what", result.lower())
        self.assertNotIn(" the ", result)
        self.assertNotIn(" was ", result)

    def test_empty_returns_empty(self):
        self.assertEqual(expand_search_query(""), "")


class TestSynthesizeInboxRag(unittest.TestCase):
    def _make_email(self, **kwargs):
        defaults = {
            "id": "test_id_1",
            "subject": "Air India Booking Confirmation",
            "from": "Air India <bookings@airindia.in>",
            "date": "Oct 28",
            "snippet": "Dear Passenger, your flight AI 805 departs at 6:45 AM Terminal 2 Mumbai.",
            "body": "Dear Passenger, your flight AI 805 departs at 6:45 AM Terminal 2 Mumbai.",
        }
        defaults.update(kwargs)
        return defaults

    def test_no_emails_returns_no_answer(self):
        result = synthesize_inbox_rag("What is my flight number?", [])
        self.assertFalse(result["has_answer"])
        self.assertIsNone(result["citation"])

    def test_flight_extraction_fallback(self):
        email = self._make_email()
        result = synthesize_inbox_rag("What was the flight number for my trip to Mumbai?", [email])
        self.assertTrue(result["has_answer"])
        answer = result["answer"]
        self.assertIn("AI 805", answer)
        citation = result["citation"]
        self.assertIsNotNone(citation)
        self.assertEqual(citation["id"], "test_id_1")

    def test_citation_has_required_fields(self):
        email = self._make_email()
        result = synthesize_inbox_rag("What was the flight number?", [email])
        if result["citation"]:
            self.assertIn("id", result["citation"])
            self.assertIn("subject", result["citation"])
            self.assertIn("sender", result["citation"])

    def test_internship_extraction_fallback(self):
        email = self._make_email(
            id="intern_msg_1",
            subject="Internship Offer - Software Engineer",
            from_="Acme Corp <hr@acme.com>",
            snippet="Congratulations! We are pleased to offer you a software engineering internship.",
            body="Congratulations! We are pleased to offer you a software engineering internship.",
        )
        email["from"] = "Acme Corp <hr@acme.com>"
        result = synthesize_inbox_rag("Who emailed me about the internship?", [email])
        self.assertTrue(result["has_answer"])

    def test_contract_deadline_fallback(self):
        email = self._make_email(
            id="contract_1",
            subject="Contract Deadline Reminder",
            from_="Legal Team <legal@firm.com>",
            snippet="Please sign the contract by November 20.",
            body="Please sign the contract by November 20.",
        )
        email["from"] = "Legal Team <legal@firm.com>"
        result = synthesize_inbox_rag("What is the contract deadline?", [email])
        self.assertTrue(result["has_answer"])
        self.assertIn("November 20", result["answer"])

    def test_answer_string_not_empty(self):
        email = self._make_email()
        result = synthesize_inbox_rag("What was the flight number?", [email])
        self.assertIsInstance(result["answer"], str)
        self.assertGreater(len(result["answer"]), 0)


if __name__ == "__main__":
    unittest.main()
