"""Merge reviewed station locations with public stream candidates; exclude failed checks.

Run from the repo: .venv/Scripts/python tools/build_radio_catalog.py
Only the explicit location allowlist is eligible; coordinates in the community
directory alone are not treated as verified locations. No running service changes.
"""
import concurrent.futures
import datetime
import json
import math
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
USER_AGENT = 'TouchscreenConsoleRadioCatalog/1.0'


def request(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': USER_AGENT}), timeout=15)


def build():
    locations = json.loads((ROOT / 'research/radio-locations.json').read_text(encoding='utf-8'))
    checks = {r['name']: r for r in json.loads((ROOT / 'research/radio-stream-checks.json').read_text(encoding='utf-8'))}
    raw = json.loads((ROOT / 'research/local-radio-candidates.json').read_text(encoding='utf-8'))
    candidates = [row for rows in raw.values() for row in rows]
    checked_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    def geocode(zip_code):
        with request('https://api.zippopotam.us/us/' + zip_code) as response:
            place = json.load(response)['places'][0]
        lat, lon = float(place['latitude']), float(place['longitude'])
        if not math.isfinite(lat) or not math.isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            raise ValueError('Invalid coordinates')
        return zip_code, (lat, lon)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        coordinates = dict(pool.map(geocode, sorted({s['zip'] for s in locations})))

    def station(location):
        check = checks.get(location['match'])
        if not check or not location.get('source'):
            return None
        try:
            with request(check['url']) as response:
                content_type = response.headers.get_content_type()
                if not content_type.startswith('audio/') or not response.read(2048):
                    raise ValueError('Not an audio response')
            lat, lon = coordinates[location['zip']]
            candidate = next((c for c in candidates if c.get('url') == check['url']), {})
            return {**{key: location[key] for key in ('id', 'name', 'callSign', 'preset', 'genre')},
                    'stream': check['url'], 'streamCheckedAt': checked_at, 'contentType': content_type,
                    'logo': candidate.get('favicon', ''), 'website': candidate.get('homepage', location.get('streamSource', location['source'])),
                    **({'streamSource': location['streamSource']} if location.get('streamSource') else {}),
                    'directoryId': candidate.get('stationuuid'),
                    'location': {'city': location['city'], 'region': location['region'], 'country': 'US',
                                 'lat': lat, 'lon': lon, 'verified': True, 'source': location['source'],
                                 'coordinateSource': 'https://api.zippopotam.us/us/' + location['zip'],
                                 'precision': 'city-region', 'verifiedAt': checked_at}}
        except Exception as error:
            print('Excluded', location['id'], type(error).__name__)
            return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        stations = [s for s in pool.map(station, locations) if s]
    if not stations:
        raise RuntimeError('No streams verified; existing catalog kept')
    payload = {'version': 1, 'checkedAt': checked_at, 'scope': 'Reviewed regional and US public/music radio catalog',
               'stations': stations}
    output = ROOT / 'assets/radio-stations.json'
    temp = output.with_suffix('.json.tmp')
    temp.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temp.replace(output)
    print(f'Saved {len(stations)} verified streams with reviewed locations to {output}')


if __name__ == '__main__':
    build()
