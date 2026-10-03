import json
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import media_relay
import server


class MediaRelayTests(unittest.TestCase):
    def test_tickets_relay_redirects_and_source_errors(self):
        body = b'\x47' + b'\x00' * 187
        class Source(BaseHTTPRequestHandler):
            def log_message(self, *_): pass
            def do_GET(self):
                if self.path == '/redirect':
                    self.send_response(302); self.send_header('Location', '/video.ts'); self.end_headers(); return
                self.send_response(200)
                self.send_header('Content-Type', 'text/html' if self.path == '/error' else 'video/mp2t')
                self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
        class API(server.Handler):
            def log_message(self, *_): pass
        source = ThreadingHTTPServer(('127.0.0.1', 0), Source)
        api = ThreadingHTTPServer(('127.0.0.1', 0), API)
        for host in (source, api): threading.Thread(target=host.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{api.server_port}'
        origin = f'http://127.0.0.1:{source.server_port}'
        try:
            def ticket(path):
                request = Request(base+'/api/media', data=json.dumps({'url':origin+path}).encode(), headers={'Content-Type':'application/json','Origin':base})
                with urlopen(request) as response: return json.load(response)['url']
            path = ticket('/redirect')
            self.assertNotIn(str(source.server_port), path)
            with urlopen(base+path) as response:
                self.assertEqual(response.read(), body)
                self.assertEqual(response.headers.get_content_type(), 'video/mp2t')
            with self.assertRaises(HTTPError) as error: urlopen(base+path)
            self.assertEqual(error.exception.code, 404, 'Tickets are one-use')
            path = ticket('/error')
            with self.assertRaises(HTTPError) as error: urlopen(base+path)
            self.assertEqual(error.exception.code, 502)
            request = Request(base+'/api/media', data=b'{}', headers={'Content-Type':'application/json','Origin':'https://elsewhere.example'})
            with self.assertRaises(HTTPError) as error: urlopen(request)
            self.assertEqual(error.exception.code, 403)
            with urlopen(base+'/api/media/status') as response:
                self.assertEqual(json.load(response)['active_streams'], 0)
        finally:
            for host in (source, api): host.shutdown(); host.server_close()

    def test_private_metadata_targets_and_expired_tickets(self):
        with patch.object(media_relay, 'destination', side_effect=ValueError('Blocked')):
            with self.assertRaises(ValueError): media_relay.issue_ticket('http://169.254.169.254/video.ts')
        with patch.object(media_relay, 'destination', return_value=None):
            with patch.object(media_relay.time, 'monotonic', return_value=0):
                media_relay.issue_ticket('http://localhost/old.ts')
            with patch.object(media_relay.time, 'monotonic', return_value=301):
                media_relay.issue_ticket('http://localhost/new.ts')
            self.assertTrue(all(value[0] != 'http://localhost/old.ts' for value in media_relay._tickets.values()))


if __name__ == '__main__': unittest.main()
