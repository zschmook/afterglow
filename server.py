"""Small dashboard server with cached, fixed upstream feeds."""
from system_stats import snapshot as system_snapshot
from playlist import fetch_playlist
import media_relay
import home_devices
import argparse
import json
import copy
import os
import re
import math
import time
import threading
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).parent



HOME_STATES = {}
HOME_STATE_LOCK = threading.Lock()


def refresh_home_states():
    devices = home_request('/api/home/devices')
    for kind in ('lights', 'outlets'):
        for device in devices.get(kind, []):
            device_id = device.get('device_id', '')
            if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', device_id):
                continue
            try:
                home_request(f'/api/home/{kind}/{device_id}/state', fresh=True)
            except Exception:
                with HOME_STATE_LOCK:
                    HOME_STATES.pop(f'/api/home/{kind}/{device_id}/state', None)


def home_refresh_worker():
    while True:
        started = time.monotonic()
        try:
            refresh_home_states()
        except Exception as error:
            print('Home background refresh unavailable:', type(error).__name__, flush=True)
        time.sleep(max(1, 900 - (time.monotonic() - started)))


def home_request(path, method='GET', body=None, fresh=False):
    if path in ('/api/home/devices', '/api/home/discover'):
        if method != ('GET' if path.endswith('/devices') else 'POST'):
            raise ValueError('Unsupported device operation')
        if path.endswith('/devices'):
            return {'lights': home_devices.lights(), 'outlets': home_devices.outlets()}
        result = home_devices.discover_devices()
        with HOME_STATE_LOCK:
            HOME_STATES.clear()
        return result
    match = re.fullmatch(r'/api/home/(lights|outlets)/([A-Za-z0-9_-]{1,100})/(state|control)', path)
    if not match or method != ('GET' if match[3] == 'state' else 'POST'):
        raise ValueError('Unsupported device operation')
    if method == 'GET' and path.endswith('/state') and not fresh:
        with HOME_STATE_LOCK:
            cached = HOME_STATES.get(path)
            if cached and time.monotonic() - cached[0] < 900:
                return cached[1]
    reader, controller = ((home_devices.light_state, home_devices.control_light)
                          if match[1] == 'lights' else
                          (home_devices.outlet_state, home_devices.control_outlet))
    result = reader(match[2]) if method == 'GET' else controller(match[2], body)
    if path.endswith('/state') or path.endswith('/control'):
        state_path = path.removesuffix('/control') + '/state' if path.endswith('/control') else path
        with HOME_STATE_LOCK:
            HOME_STATES[state_path] = (time.monotonic(), result)
    return result
def zip_coordinates(zip_code):
    if not re.fullmatch(r'[0-9]{5}', zip_code):
        raise ValueError('Enter a five-digit US ZIP code.')
    with urlopen(Request('https://api.zippopotam.us/us/' + zip_code,
                         headers={'User-Agent': 'TouchscreenConsole/0.1'}), timeout=12) as response:
        place = json.load(response)['places'][0]
    lat, lon = float(place['latitude']), float(place['longitude'])
    if not math.isfinite(lat) or not math.isfinite(lon) or abs(lat) > 90 or abs(lon) > 180:
        raise RuntimeError('Invalid location response')
    result = {'zip': zip_code, 'name': place['place name'] + ', ' + place['state abbreviation'], 'lat': lat, 'lon': lon}
    return result


def lookup_zip(zip_code):
    result = zip_coordinates(zip_code)
    weather = fetch_feed('weather', (result['lat'], result['lon'])).get('data') or {}
    if weather.get('timezone'):
        result['timezone'] = weather['timezone']
    return result


CACHE = {}
RETRY_AFTER = {}
NEWS_FEEDS = {
    'news': ('LNP', 'local'), 'wgal': ('WGAL', 'local'),
    'national': ('Washington Post', 'national'), 'world': ('Washington Post', 'world'),
    'npr_national': ('NPR', 'national'), 'cbs_national': ('CBS', 'national'),
    'bbc_world': ('BBC', 'world'), 'guardian_world': ('Guardian', 'world'), 'npr_world': ('NPR', 'world'),
}
SOURCES = {
    'alerts': ('https://api.weather.gov/alerts/active', 60),
    'quotes': ('https://zenquotes.io/api/quotes', 3600),
    'weather': ('https://api.open-meteo.com/v1/forecast?latitude=40.0379&longitude=-76.3055&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=5', 600),
    'news': ('https://lancasteronline.com/search/?f=rss&t=article&c=news/local&l=100&s=start_time&sd=desc', 600),
    'wgal': ('https://www.wgal.com/local-news-rss', 600),
    'national': ('https://feeds.washingtonpost.com/rss/national', 600),
    'world': ('https://feeds.washingtonpost.com/rss/world', 600),
    'radar': ('https://api.rainviewer.com/public/weather-maps.json', 300),
    'sports': ('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', 60),
    'ncaa_fbs': ('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=1000', 60),
    'ncaa_fcs': ('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=81&limit=1000', 60),
}
SOURCES.update({
    'npr_national': ('https://feeds.npr.org/1003/rss.xml', 600),
    'cbs_national': ('https://www.cbsnews.com/latest/rss/us', 600),
    'bbc_world': ('https://feeds.bbci.co.uk/news/world/rss.xml', 600),
    'guardian_world': ('https://www.theguardian.com/world/rss', 600),
    'npr_world': ('https://feeds.npr.org/1004/rss.xml', 600),
})
SPORTS_FEEDS = {'nfl': ('sports',), 'ncaa': ('ncaa_fbs', 'ncaa_fcs'),
                **{key: (key,) for key in ('mlb','nba','nhl','wnba','ncaam','ncaaw','mls')}}
for key, route in {'mlb':'baseball/mlb','nba':'basketball/nba','nhl':'hockey/nhl',
                   'wnba':'basketball/wnba','ncaam':'basketball/mens-college-basketball',
                   'ncaaw':'basketball/womens-college-basketball','mls':'soccer/usa.1'}.items():
    SOURCES[key] = (f'https://site.api.espn.com/apis/site/v2/sports/{route}/scoreboard' +
                    ('?groups=50&limit=1000' if key in ('ncaam','ncaaw') else ''), 60)


def selected_sports(query):
    requested = query.get('leagues', ['nfl,ncaa'])[0].split(',')
    if not requested or len(requested) > len(SPORTS_FEEDS) or any(key not in SPORTS_FEEDS for key in requested):
        raise ValueError('Choose supported sports leagues.')
    return list(dict.fromkeys(requested))


LOCKS = {key: threading.Lock() for key in SOURCES}
SOURCES['weather'] = (SOURCES['weather'][0] + '&hourly=temperature_2m,precipitation_probability,weather_code,is_day&timeformat=unixtime', 600)


def unavailable(cached):
    if cached:
        return {**cached, 'stale': True}
    return {'data': None, 'fetched': None, 'stale': True, 'error': 'Feed temporarily unavailable'}


def combine_publishers(publishers):
    # Preserve source availability independently; time filtering happens in the client.
    combined, seen = [], set()
    lists = [feed.get('data') or [] for _, feed in publishers]
    for i in range(max((len(items) for items in lists), default=0)):
        for items in lists:
            if i < len(items) and items[i].get('url') and items[i]['url'] not in seen:
                combined.append(items[i])
                seen.add(items[i]['url'])
    return {'data': combined or None, 'stale': any(feed['stale'] for _, feed in publishers),
            'sources': {name: {'available': bool(feed.get('data')), 'stale': feed['stale']}
                        for name, feed in publishers}}


def combine_news(lnp, wgal):
    return combine_publishers([('LNP', lnp), ('WGAL', wgal)])


def combine_college(fbs, fcs):
    events = {}
    for feed in (fbs, fcs):
        for event in (feed.get('data') or {}).get('events', []):
            events[event['id']] = event
    ordered = sorted(events.values(), key=lambda event: (
        {'in': 0, 'pre': 1, 'post': 2}.get(event.get('status', {}).get('type', {}).get('state'), 3),
        event.get('date', '')))
    return {'data': {'events': ordered} if any(feed.get('data') for feed in (fbs, fcs)) else None,
            'stale': fbs['stale'] or fcs['stale']}

def fetch_feed(key, coordinates=None):
    url, ttl = SOURCES[key]
    cache_key = key
    if key == 'weather' and coordinates:
        lat, lon = coordinates
        url = re.sub(r'latitude=[^&]+&longitude=[^&]+', f'latitude={lat}&longitude={lon}', url)
        cache_key = f'weather:{lat}:{lon}' 
    if key == 'alerts':
        if coordinates is None:
            return {'data': None, 'stale': False, 'fetched': None}
        lat, lon = coordinates
        url += f'?point={lat},{lon}'
        cache_key = f'alerts:{lat}:{lon}'
    with LOCKS[key]:
        cached = CACHE.get(cache_key)
        if cached and time.time() - cached['fetched'] < ttl:
            return cached
        if time.time() < RETRY_AFTER.get(cache_key, 0):
            return unavailable(cached)
        try:
            with urlopen(Request(url, headers={'User-Agent': 'TouchscreenConsole/0.1 (personal dashboard)'}), timeout=12) as response:
                raw = response.read(4_000_000)
            if key in NEWS_FEEDS:
                doc = ET.fromstring(raw)
                publisher = NEWS_FEEDS[key][0]
                data = [{'title': item.findtext('title'), 'url': item.findtext('link'), 'date': item.findtext('pubDate'), 'source': publisher} for item in doc.findall('./channel/item')]
                if not data:
                    raise ValueError('Empty RSS feed')
            else:
                data = json.loads(raw)
                if key == 'alerts' and (not isinstance(data, dict) or not isinstance(data.get('features'), list)):
                    raise ValueError('Invalid NWS alerts response')
                if key == 'quotes':
                    if not isinstance(data, list):
                        raise ValueError('Invalid quote response')
                    data = [{'text': item['q'], 'author': item['a']} for item in data
                            if isinstance(item, dict) and isinstance(item.get('q'), str) and isinstance(item.get('a'), str)
                            and 0 < len(item['q']) <= 1600 and item['a'].strip()
                            and item['a'].lower() != 'zenquotes.io']
                    if not data:
                        raise ValueError('No quotes available')
            result = {'data': data, 'fetched': time.time(), 'stale': False}
            if len(CACHE) >= 128:
                oldest = min(CACHE, key=lambda k: CACHE[k]['fetched'])
                CACHE.pop(oldest, None)
            CACHE[cache_key] = result
            RETRY_AFTER.pop(cache_key, None)
            return result
        except Exception:
            if len(RETRY_AFTER) >= 128:
                RETRY_AFTER.clear()
            RETRY_AFTER[cache_key] = time.time() + 300
            return unavailable(cached)

TEAM_LOCATIONS = {}
TEAM_LOCATION_LOCK = threading.Lock()


def team_location(league, team_id):
    if league not in ('nfl', 'college-football') or not re.fullmatch(r'[0-9]{1,10}', str(team_id)):
        return None
    key = (league, str(team_id))
    with TEAM_LOCATION_LOCK:
        cached = TEAM_LOCATIONS.get(key)
        if cached and cached[0] > time.time():
            return cached[1]
    result = None
    try:
        url = f'https://sports.core.api.espn.com/v2/sports/football/leagues/{league}/teams/{team_id}?lang=en&region=us'
        with urlopen(Request(url, headers={'User-Agent': 'TouchscreenConsole/0.1'}), timeout=6) as response:
            team = json.load(response)
        address = team.get('venue', {}).get('address', {})
        postal = str(address.get('zipCode', ''))[:5]
        result = zip_coordinates(postal)
        result['name'] = team.get('displayName', result['name'])
    except Exception:
        pass
    with TEAM_LOCATION_LOCK:
        if len(TEAM_LOCATIONS) >= 512:
            TEAM_LOCATIONS.pop(next(iter(TEAM_LOCATIONS)))
        TEAM_LOCATIONS[key] = (time.time() + (604800 if result else 300), result)
    return result


def add_team_locations(sports):
    # Use each team's home location, including away teams and neutral-site games.
    result = copy.deepcopy(sports)
    targets = []
    for name, feed in result.items():
        if name not in ('nfl', 'ncaa'):
            continue
        league = 'nfl' if name == 'nfl' else 'college-football'
        for event in (feed.get('data') or {}).get('events', []):
            competition = (event.get('competitions') or [{}])[0]
            if (event.get('status') or competition.get('status', {})).get('type', {}).get('state') != 'in':
                continue
            for competitor in competition.get('competitors', []):
                team = competitor.get('team', {})
                if team.get('id'):
                    targets.append((league, team))
    with ThreadPoolExecutor(max_workers=6) as pool:
        locations = pool.map(lambda target: team_location(target[0], target[1]['id']), targets)
        for (_, team), location in zip(targets, locations):
            if location:
                team['homeLocation'] = location
    return result


class Handler(SimpleHTTPRequestHandler):
    def home_response(self, path, method, body=None):
        try:
            payload = home_request(path, method, body)
            status = 200
        except ValueError as error:
            payload, status = {'error': str(error)}, 400
        except HTTPError as error:
            status = 400 if error.code == 400 else 502
            try:
                payload = json.load(error)
            except Exception:
                payload = {'error': 'The device service could not complete that request.'}
        except Exception:
            payload, status = {'error': 'Could not reach your home devices. Check their power and Wi-Fi connection.'}, 502
        raw = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        path = urlsplit(self.path).path
        if not path.startswith('/api/home/') and path not in ('/api/playlist', '/api/media'):
            self.send_error(404)
            return
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            self.send_error(403)
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= (8192 if path in ('/api/playlist', '/api/media') else 2048) or self.headers.get_content_type() != 'application/json':
                raise ValueError()
            body = json.loads(self.rfile.read(size))
        except (ValueError, json.JSONDecodeError):
            self.send_error(400)
            return
        if path in ('/api/playlist', '/api/media'):
            try:
                if not isinstance(body, dict):
                    raise ValueError('Enter a playlist URL.')
                payload = fetch_playlist(body.get('url')) if path == '/api/playlist' else {'url': media_relay.issue_ticket(body.get('url'))}
                status = 200
            except ValueError as error:
                payload, status = {'error': str(error)}, 400
            except TimeoutError:
                noun = 'playlist' if path == '/api/playlist' else 'stream'
                payload, status = {'error': f'The {noun} server took too long to respond. Try again.'}, 504
            except Exception:
                payload, status = {'error': 'Could not load that playlist. Check its URL and try again.'}, 502
            raw = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        self.home_response(path, 'POST', body)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/media/status':
            raw = json.dumps({'active_streams': media_relay.active_streams()}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        if path.startswith('/api/media/'):
            if self.headers.get('Sec-Fetch-Site') == 'cross-site':
                self.send_error(403)
                return
            media_relay.serve(self, path.rsplit('/', 1)[-1])
            return
        if path == '/api/system-stats':
            try:
                payload, status = system_snapshot(), 200
            except Exception:
                payload, status = {'error': 'System stats unavailable. Use bash run.sh with dependencies installed.'}, 503
            raw = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        if path == '/api/location':
            try:
                zip_code = parse_qs(urlsplit(self.path).query).get('zip', [''])[0]
                payload, status = lookup_zip(zip_code), 200
            except ValueError as error:
                payload, status = {'error': str(error)}, 400
            except HTTPError as error:
                payload, status = {'error': 'ZIP code not found.' if error.code == 404 else 'ZIP lookup unavailable. Try again.'}, 404 if error.code == 404 else 502
            except Exception:
                payload, status = {'error': 'ZIP lookup unavailable. Try again.'}, 502
            raw = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(raw)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(raw)
            return
        if path.startswith('/api/home/'):
            self.home_response(path, 'GET')
            return
        if path in ('/api/dashboard', '/api/radar', '/api/quotes'):
            if path in ('/api/radar', '/api/quotes'):
                feeds = fetch_feed('quotes' if path == '/api/quotes' else 'radar')
            else:
                try:
                    query = parse_qs(urlsplit(self.path).query)
                    leagues = selected_sports(query)
                    coordinates = (float(query['lat'][0]), float(query['lon'][0])) if 'lat' in query and 'lon' in query else None
                    if coordinates and (not all(math.isfinite(v) for v in coordinates) or abs(coordinates[0]) > 90 or abs(coordinates[1]) > 180):
                        raise ValueError()
                except ValueError:
                    self.send_error(400, 'Invalid coordinates')
                    return
                keys = ('alerts', 'weather', *(key for league in leagues for key in SPORTS_FEEDS[league]), *NEWS_FEEDS)
                with ThreadPoolExecutor(max_workers=8) as pool:
                    feeds = dict(zip(keys, pool.map(lambda key: ({'data': None, 'stale': False, 'fetched': None} if key in ('weather', 'alerts') and coordinates is None else fetch_feed(key, coordinates if key in ('weather', 'alerts') else None)), keys)))
                categories = {category: combine_publishers([(publisher, feeds[key]) for key, (publisher, group) in NEWS_FEEDS.items() if group == category]) for category in ('local', 'national', 'world')}
                for key in NEWS_FEEDS:
                    feeds.pop(key)
                feeds['news'] = categories
                sports = {}
                for league in leagues:
                    selected = [feeds.pop(key) for key in SPORTS_FEEDS[league]]
                    sports[league] = combine_college(*selected) if league == 'ncaa' else selected[0]
                feeds['sports'] = sports
                if coordinates:
                    feeds['sports'] = add_team_locations(feeds['sports'])
            body = json.dumps(feeds).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == '/health':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok')
            return
        if path.startswith('/assets/'):
            target = (ROOT / path.lstrip('/')).resolve()
            if not target.is_relative_to(ROOT / 'assets') or not target.is_file():
                self.send_error(404)
                return
        elif path not in ('/', '/index.html', '/app.js', '/style.css'):
            self.send_error(404)
            return
        super().do_GET()

def main():
    parser = argparse.ArgumentParser(description='Run the touchscreen dashboard without Docker.')
    parser.add_argument('--host', default=os.environ.get('HOST', '0.0.0.0'))
    parser.add_argument('--port', type=int, default=int(os.environ.get('PORT', '10000')))
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('--port must be between 1 and 65535')
    # Bind before starting background work, so a busy port exits cleanly.
    try:
        server = ThreadingHTTPServer((args.host, args.port), partial(Handler, directory=str(ROOT)))
    except OSError as error:
        parser.exit(1, f'Cannot listen on {args.host}:{args.port}: {error}\n')
    threading.Thread(target=home_refresh_worker, daemon=True, name='home-refresh').start()
    print(f'Dashboard: http://localhost:{args.port} — Ctrl+C to stop', flush=True)
    print('Home controls built in - open Home and choose Find devices.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping dashboard.', flush=True)
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
