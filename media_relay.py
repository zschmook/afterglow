"""Short-lived media tickets and a byte relay for browser MPEG-TS playback.

No transcoding: the browser transmuxes the stream. Upstream connections are
released when playback stops, the client disconnects, or the source times out.
"""
import http.client
import secrets
import ssl
import threading
import time
from urllib.parse import urljoin, urlunsplit

from playlist import destination, web_url

_tickets = {}
_lock = threading.Lock()
_slots = threading.BoundedSemaphore(4)
_active = 0


def issue_ticket(url):
    url = web_url(url)
    # Validate the destination again when the ticket is actually consumed.
    destination(url)
    with _lock:
        now = time.monotonic()
        for key, (_, expires) in list(_tickets.items()):
            if expires <= now:
                del _tickets[key]
        if len(_tickets) >= 128:
            raise ValueError('Too many pending streams. Try again shortly.')
        token = secrets.token_urlsafe(24)
        _tickets[token] = (url, now + 300)
    return '/api/media/' + token


def active_streams():
    with _lock:
        return _active


def _open(url):
    for _ in range(5):
        parsed, port, address = destination(url)
        connection = http.client.HTTPConnection(address, port, timeout=12)
        try:
            connection.connect()
            if parsed.scheme == 'https':
                connection.sock = ssl.create_default_context().wrap_socket(connection.sock, server_hostname=parsed.hostname)
            connection.request('GET', urlunsplit(('', '', parsed.path or '/', parsed.query, '')),
                               headers={'Host': parsed.netloc, 'User-Agent': 'TouchscreenConsole/0.1',
                                        'Accept': 'video/mp2t,application/octet-stream,*/*', 'Accept-Encoding': 'identity'})
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                target = response.getheader('Location')
                if not target:
                    raise ValueError('Missing stream redirect destination.')
                url = web_url(urljoin(url, target))
                connection.close()
                continue
            if response.status != 200 or response.getheader('Content-Type', '').split(';')[0] in ('text/html', 'application/json'):
                raise ValueError('The stream source is unavailable.')
            return connection, response
        except Exception:
            connection.close()
            raise
    raise ValueError('Too many stream redirects.')


def serve(handler, token):
    global _active
    with _lock:
        ticket = _tickets.pop(token, None)
    if not ticket or ticket[1] <= time.monotonic():
        handler.send_error(404, 'Stream expired. Press Play to reconnect.')
        return
    if not _slots.acquire(blocking=False):
        handler.send_error(503, 'Too many active streams.')
        return
    connection = None
    started = False
    with _lock:
        _active += 1
    try:
        connection, response = _open(ticket[0])
        handler.send_response(200)
        handler.send_header('Content-Type', 'video/mp2t')
        handler.send_header('Cache-Control', 'no-store')
        handler.send_header('X-Content-Type-Options', 'nosniff')
        handler.send_header('Connection', 'close')
        handler.end_headers()
        handler.close_connection = True
        handler.connection.settimeout(12)
        started = True
        while chunk := response.read1(65536):
            handler.wfile.write(chunk)
            handler.wfile.flush()
    except (OSError, ValueError, http.client.HTTPException):
        if not started:
            try:
                handler.send_error(502, 'Could not open the stream. Try another channel.')
            except OSError:
                pass
    finally:
        if connection:
            connection.close()
        with _lock:
            _active -= 1
        _slots.release()
