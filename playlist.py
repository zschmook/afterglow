"""Bounded, standalone M3U loading. No IPTV service or provider integration."""
import hashlib
import http.client
import ipaddress
import re
import socket
import ssl
import time
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote

MAX_BYTES = 2 * 1024 * 1024
MAX_ENTRIES = 2000
CONNECT_TIMEOUT = 8
FETCH_TIMEOUT = 30


def web_url(value):
    if not isinstance(value, str) or len(value) > 4096 or re.search(r'[\x00-\x20\x7f]', value):
        raise ValueError('Enter a valid HTTP or HTTPS playlist URL.')
    try:
        url = urlsplit(value)
        if url.scheme not in ('http', 'https') or not url.hostname or url.username or url.password:
            raise ValueError()
        if url.port is not None and not 1 <= url.port <= 65535:
            raise ValueError()
        return urlunsplit((url.scheme, url.netloc, url.path or '/', url.query, ''))
    except ValueError:
        raise ValueError('Enter a valid HTTP or HTTPS playlist URL.') from None


def parse_m3u(text, source):
    source = web_url(source)
    text = text.lstrip('\ufeff').strip()
    if not text or text.startswith('<'):
        raise ValueError('That URL did not return an M3U playlist.')
    entries, seen, skipped, title, attributes = [], set(), 0, '', {}

    def entry(url, name='', hls=False):
        parsed = urlsplit(url)
        return {'id': 'custom:' + hashlib.sha256(url.encode()).hexdigest()[:24],
                'name': (name or unquote(parsed.path.rsplit('/', 1)[-1]) or parsed.hostname)[:240],
                'stream': url, 'custom': True, 'hls': hls or parsed.path.lower().endswith('.m3u8'),
                'mpegts': not hls and parsed.path.lower().endswith(('.ts', '.m2ts', '/mpegts')),
                'number': attributes.get('tvg-chno', '')[:30],
                'group': attributes.get('group-title', '')[:120],
                'genre': 'Custom playlist', 'callSign': 'M3U'}

    # An HLS manifest is one stream; its segments/variants are not separate stations.
    if any(line.strip().startswith('#EXT-X-') for line in text.splitlines()):
        return {'entries': [entry(source, hls=True)], 'skipped': 0, 'url': source}
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.upper().startswith('#EXTINF:'):
            fields = re.split(r',(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)', line, maxsplit=1)
            attributes = dict(re.findall(r'([\w-]+)="([^"]*)"', fields[0]))
            title = fields[1].strip() if len(fields) == 2 else attributes.get('tvg-name', '')
            continue
        if line.startswith('#'):
            continue
        try:
            if not re.match(r'(?i)^https?://|^[./]|[/\\.]', line):
                # A relative media filename is also valid without an EXTM3U header.
                if not re.search(r'\.[a-zA-Z0-9]{2,5}(?:[?#]|$)', line):
                    raise ValueError()
            url = web_url(urljoin(source, line))
            if url not in seen:
                if len(entries) >= MAX_ENTRIES:
                    raise ValueError('Playlist is too large; use at most 2,000 entries.')
                entries.append(entry(url, title)); seen.add(url)
        except ValueError as error:
            if str(error).startswith('Playlist is too large'):
                raise
            skipped += 1
        title = ''
        attributes = {}
    if not entries:
        raise ValueError('No HTTP or HTTPS media URLs were found in this playlist.')
    return {'entries': entries, 'skipped': skipped, 'url': source}


def destination(url):
    parsed = urlsplit(web_url(url))
    port = parsed.port or (443 if parsed.scheme == 'https' else 80)
    addresses = socket.getaddrinfo(parsed.hostname, port, type=socket.SOCK_STREAM)
    for _, _, _, _, address in addresses:
        ip = ipaddress.ip_address(address[0])
        ip = ip.ipv4_mapped if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped else ip
        if ip.is_link_local or ip.is_multicast or ip.is_unspecified or (ip.is_reserved and not ip.is_loopback):
            raise ValueError('This address cannot be used for a playlist.')
    # Connect to the validated address, avoiding a second DNS lookup/rebinding.
    addresses.sort(key=lambda item: item[0] != socket.AF_INET)
    return parsed, port, addresses[0][4][0]


def fetch_playlist(url):
    url = web_url(url)
    deadline = time.monotonic() + FETCH_TIMEOUT

    def remaining():
        budget = deadline - time.monotonic()
        if budget <= 0:
            raise TimeoutError()
        return budget

    for _ in range(5):
        parsed, port, address = destination(url)
        timeout = min(CONNECT_TIMEOUT, remaining())
        connection = http.client.HTTPConnection(address, port, timeout=timeout)
        try:
            connection.connect()
            if parsed.scheme == 'https':
                connection.sock = ssl.create_default_context().wrap_socket(connection.sock, server_hostname=parsed.hostname)
            # A connected server may need time to assemble a large channel list.
            # Keep connection failures short, but allow the full remaining fetch budget.
            transport = connection.sock
            transport.settimeout(remaining())
            connection.request('GET', urlunsplit(('', '', parsed.path or '/', parsed.query, '')),
                               headers={'Host': parsed.netloc, 'User-Agent': 'TouchscreenConsole/0.1',
                                        'Accept': 'application/vnd.apple.mpegurl,audio/x-mpegurl,text/plain,*/*',
                                        'Accept-Encoding': 'identity'})
            transport.settimeout(remaining())
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                target = response.getheader('Location')
                if not target:
                    raise ValueError('The playlist redirected without a destination.')
                url = web_url(urljoin(url, target))
                continue
            if response.status != 200:
                raise ValueError(f'The playlist server returned HTTP {response.status}.')
            if int(response.getheader('Content-Length', '0')) > MAX_BYTES:
                raise ValueError('Playlist is too large; the limit is 2 MiB.')
            data = bytearray()
            while not response.isclosed():
                transport.settimeout(remaining())
                chunk = response.read1(min(65536, MAX_BYTES + 1 - len(data)))
                if not chunk:
                    break
                data.extend(chunk)
                if len(data) > MAX_BYTES:
                    raise ValueError('Playlist is too large; the limit is 2 MiB.')
            try:
                text = data.decode('utf-8-sig')
            except UnicodeDecodeError:
                text = data.decode('cp1252', errors='replace')
            return parse_m3u(text, url)
        finally:
            connection.close()
    raise ValueError('The playlist redirected too many times.')
