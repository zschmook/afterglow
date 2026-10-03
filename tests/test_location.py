import io
import json
import unittest
from unittest.mock import patch
import server

class LocationTests(unittest.TestCase):
    def test_zip_preserves_leading_zero(self):
        raw = {'places': [{'place name': 'Test', 'state abbreviation': 'MA', 'latitude': '42', 'longitude': '-71'}]}
        with patch('server.urlopen', return_value=io.BytesIO(json.dumps(raw).encode())) as request, patch('server.fetch_feed', return_value={'data': {'timezone': 'America/New_York'}}):
            result = server.lookup_zip('02108')
        self.assertEqual(result['zip'], '02108')
        self.assertEqual(result['lat'], 42)
        self.assertEqual(result['timezone'], 'America/New_York')
        self.assertTrue(request.call_args.args[0].full_url.endswith('/02108'))

    def test_invalid_zip_never_requests_upstream(self):
        with patch('server.urlopen') as request:
            for value in ('', '1234', '123456', '../x', 'abcde'):
                with self.assertRaises(ValueError):
                    server.lookup_zip(value)
            request.assert_not_called()
