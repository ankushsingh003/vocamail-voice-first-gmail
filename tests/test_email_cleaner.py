import base64
import unittest
from gmail.client import _clean_email_text, _extract_body_parts


class TestEmailCleaner(unittest.TestCase):
    def test_clean_excessive_newlines(self):
        raw = "Header\n\n\n\n\n\n\n\n\nBody content\n\n\n\n\n\nFooter"
        cleaned = _clean_email_text(raw)
        self.assertEqual(cleaned, "Header\n\nBody content\n\nFooter")

    def test_strip_zero_width_spaces(self):
        raw = "Reddit\u200b\u200c\u200d\ufeff\n\n\nPost Title"
        cleaned = _clean_email_text(raw)
        self.assertEqual(cleaned, "Reddit\n\nPost Title")

    def test_extract_body_parts_multipart(self):
        html_content = "<div><p>Formatted HTML</p></div>"
        plain_content = "Plain\n\n\n\nText"
        payload = {
            "mimeType": "multipart/alternative",
            "parts": [
                {
                    "mimeType": "text/plain",
                    "body": {"data": base64.urlsafe_b64encode(plain_content.encode("utf-8")).decode("utf-8")}
                },
                {
                    "mimeType": "text/html",
                    "body": {"data": base64.urlsafe_b64encode(html_content.encode("utf-8")).decode("utf-8")}
                }
            ]
        }
        plain, html = _extract_body_parts(payload)
        self.assertEqual(plain, "Plain\n\nText")
        self.assertEqual(html, html_content)


if __name__ == "__main__":
    unittest.main()
