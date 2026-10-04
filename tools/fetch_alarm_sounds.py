"""Install the five selected Mixkit recordings for a local dashboard."""
import hashlib
import json
from pathlib import Path
import urllib.request


def main():
    folder = Path(__file__).resolve().parents[1] / 'assets' / 'alarm-sounds'
    manifest = json.loads((folder / 'sources.json').read_text(encoding='utf-8'))
    for sound in manifest['sounds']:
        name = sound['file']
        if Path(name).name != name or not name.endswith('.wav'):
            raise ValueError('Invalid recording filename')
        target = folder / name
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == sound['sha256']:
            print('Already installed:', sound['name'])
            continue
        request = urllib.request.Request(sound['url'], headers={'User-Agent': 'Afterglow local sound installer'})
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read(sound['bytes'] + 1)
        if len(data) != sound['bytes'] or hashlib.sha256(data).hexdigest() != sound['sha256']:
            raise ValueError('Recording failed verification: ' + name)
        temp = target.with_suffix('.wav.part')
        try:
            temp.write_bytes(data)
            temp.replace(target)
        finally:
            temp.unlink(missing_ok=True)
        print('Installed:', sound['name'])


if __name__ == '__main__':
    main()
