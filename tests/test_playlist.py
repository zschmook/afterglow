import json
import socket
import sys
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import playlist
import server


class PlaylistTests(unittest.TestCase):
    def test_plain_urls_and_relative_entries(self):
        result = playlist.parse_m3u('\ufeff#EXTM3U\r\n#EXTINF:-1,Example\r\n../song.mp3\r\nhttps://media.example/live\r\nhttps://media.example/live', 'https://example.com/a/list.m3u')
        self.assertEqual(len(result['entries']), 2)
        self.assertEqual(result['entries'][0]['name'], 'Example')
        self.assertEqual(result['entries'][0]['stream'], 'https://example.com/song.mp3')

    def test_names_with_quoted_commas_and_untrusted_text(self):
        result = playlist.parse_m3u('#EXTM3U\n#EXTINF:-1 group-title="A,B",<img src=x onerror=alert(1)>\nhttps://example.com/a.mp4', 'https://example.com/a.m3u')
        self.assertEqual(result['entries'][0]['name'], '<img src=x onerror=alert(1)>')

    def test_hls_is_one_stream(self):
        result = playlist.parse_m3u('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nsegment.ts', 'https://example.com/live.m3u8')
        self.assertEqual(len(result['entries']), 1)
        self.assertTrue(result['entries'][0]['hls'])
        self.assertEqual(result['entries'][0]['stream'], 'https://example.com/live.m3u8')

    def test_channel_metadata_and_mpegts(self):
        result = playlist.parse_m3u('#EXTM3U\n#EXTINF:-1 tvg-chno="1" group-title="Local, News",WGAL\nhttp://localhost:9998/channel/1/mpegts\n#EXTINF:-1,Audio\nhttp://localhost/radio.mp3', 'http://localhost/list.m3u')
        first, second = result['entries']
        self.assertEqual((first['name'], first['number'], first['group']), ('WGAL', '1', 'Local, News'))
        self.assertTrue(first['mpegts'])
        self.assertFalse(second['mpegts'])
        self.assertEqual(second['group'], '')
        self.assertEqual(second['number'], '')

    def test_unsafe_urls_are_not_entries(self):
        result = playlist.parse_m3u('#EXTM3U\nfile:///etc/passwd\njavascript:alert(1)\nhttps://user:secret@example.com/a.mp3\nhttps://example.com/good.mp3', 'https://example.com/list.m3u')
        self.assertEqual(len(result['entries']), 1)
        self.assertEqual(result['skipped'], 3)
        for url in ('file:///tmp/list', 'https://user:secret@example.com', 'http://example.com/\nHeader:x'):
            with self.assertRaises(ValueError): playlist.web_url(url)

    def test_html_empty_and_entry_limits(self):
        for text in ('', '<html>Not found</html>', 'Not found'):
            with self.assertRaises(ValueError): playlist.parse_m3u(text, 'https://example.com/list.m3u')
        with patch.object(playlist, 'MAX_ENTRIES', 1):
            with self.assertRaises(ValueError): playlist.parse_m3u('https://example.com/a\nhttps://example.com/b', 'https://example.com/list.m3u')

    def test_blocks_metadata_and_validates_resolved_address(self):
        for address in ('169.254.169.254', '0.0.0.0', '224.0.0.1', '::ffff:169.254.169.254'):
            with patch.object(socket, 'getaddrinfo', return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, '', (address,80))]):
                with self.assertRaises(ValueError): playlist.destination('http://example.com/list')
        with patch.object(socket, 'getaddrinfo', return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1',80))]):
            self.assertEqual(playlist.destination('http://localhost/list')[2], '127.0.0.1')

    def test_fetch_and_api_on_isolated_servers(self):
        class Source(BaseHTTPRequestHandler):
            def log_message(self, *_): pass
            def do_GET(self):
                if self.path == '/redirect':
                    self.send_response(302); self.send_header('Location', '/dir/list.m3u'); self.end_headers(); return
                body = b'#EXTM3U\n#EXTINF:-1,Local audio\nsong.mp3\n'
                self.send_response(200); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
        class API(server.Handler):
            def log_message(self, *_): pass
        source = ThreadingHTTPServer(('127.0.0.1', 0), Source)
        api = ThreadingHTTPServer(('127.0.0.1', 0), API)
        for host in (source, api): threading.Thread(target=host.serve_forever, daemon=True).start()
        try:
            url = f'http://127.0.0.1:{source.server_port}/redirect'
            result = playlist.fetch_playlist(url)
            self.assertEqual(result['entries'][0]['stream'], f'http://127.0.0.1:{source.server_port}/dir/song.mp3')
            endpoint = f'http://127.0.0.1:{api.server_port}/api/playlist'
            request = Request(endpoint, data=json.dumps({'url':url}).encode(), headers={'Content-Type':'application/json'})
            with urlopen(request) as response: self.assertEqual(len(json.load(response)['entries']), 1)
            request.add_header('Origin', 'https://unrelated.example')
            with self.assertRaises(HTTPError) as error: urlopen(request)
            self.assertEqual(error.exception.code, 403)
            with patch.object(playlist, 'MAX_BYTES', 8):
                with self.assertRaises(ValueError): playlist.fetch_playlist(url)
            request = Request(endpoint, data=json.dumps({'url':url}).encode(), headers={'Content-Type':'application/json'})
            with patch.object(server, 'fetch_playlist', side_effect=TimeoutError):
                with self.assertRaises(HTTPError) as error: urlopen(request)
                self.assertEqual(error.exception.code, 504)
                self.assertIn('took too long', json.load(error.exception)['error'])
        finally:
            for host in (source, api): host.shutdown(); host.server_close()

    def test_slow_response_can_exceed_connection_timeout(self):
        class Source(BaseHTTPRequestHandler):
            def log_message(self, *_): pass
            def do_GET(self):
                time.sleep(.25)
                body = b'#EXTM3U\nhttp://example.com/one.mp3\n'
                self.send_response(200); self.send_header('Content-Length', str(len(body))); self.end_headers()
                try: self.wfile.write(body)
                except ConnectionError: pass
        source = ThreadingHTTPServer(('127.0.0.1', 0), Source)
        threading.Thread(target=source.serve_forever, daemon=True).start()
        try:
            with patch.object(playlist, 'CONNECT_TIMEOUT', .1), patch.object(playlist, 'FETCH_TIMEOUT', 2):
                result = playlist.fetch_playlist(f'http://127.0.0.1:{source.server_port}/list.m3u')
                self.assertEqual(len(result['entries']), 1)
            with patch.object(playlist, 'FETCH_TIMEOUT', .1):
                with self.assertRaises(TimeoutError): playlist.fetch_playlist(f'http://127.0.0.1:{source.server_port}/list.m3u')
        finally:
            source.shutdown(); source.server_close()

    def test_slow_body_cannot_extend_total_fetch_budget(self):
        class Source(BaseHTTPRequestHandler):
            def log_message(self, *_): pass
            def do_GET(self):
                self.send_response(200); self.end_headers()
                try:
                    for _ in range(30):
                        self.wfile.write(b'# comment\n'); self.wfile.flush(); time.sleep(.04)
                except ConnectionError: pass
        source = ThreadingHTTPServer(('127.0.0.1', 0), Source)
        threading.Thread(target=source.serve_forever, daemon=True).start()
        try:
            with patch.object(playlist, 'FETCH_TIMEOUT', .25):
                start = time.monotonic()
                with self.assertRaises(TimeoutError): playlist.fetch_playlist(f'http://127.0.0.1:{source.server_port}/slow.m3u')
                self.assertLess(time.monotonic() - start, 1)
        finally:
            source.shutdown(); source.server_close()


if __name__ == '__main__': unittest.main()
