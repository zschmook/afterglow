"""Build costumed SVG weather faces from the bundled MIT Meteocons variants."""
from pathlib import Path
from copy import deepcopy
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/weather-icons/faces'
DESTINATION = ROOT / 'assets/weather-icons/halloween'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)


def fragment(body):
    return ET.fromstring(f'<g xmlns="{NS}" id="Halloween-costume" stroke-linecap="round" stroke-linejoin="round">{body}</g>')


WITCH = '''
<path d="M47 44 60 11Q65 23 79 19L74 29 82 44Z" fill="#39234e" stroke="#a889cd" stroke-width="1.3"/>
<path d="m50 36 28 1 3 7-34 1Z" fill="#ff9b45"/>
<rect x="62" y="36" width="8" height="7" rx="1" fill="#ffd57f" stroke="#39234e" stroke-width="1.5"/>
<path d="M36 45Q62 36 91 45Q91 51 65 50Q38 51 36 45Z" fill="#39234e" stroke="#a889cd" stroke-width="1.3"/>
<path d="m68 24 2 3 3-2" fill="none" stroke="#c9b3d3"/>'''

HORNS = '''
<path d="M39 52Q27 44 34 25Q38 39 50 42Z M80 43Q90 37 93 23Q101 43 91 54Z" fill="#ef665d" stroke="#9b303e" stroke-width="1.4"/>
<path d="M36 34 40 43M92 32 89 44" stroke="#ffaca0" stroke-width="1.8"/>'''

PIRATE = '''
<path d="M48 48Q61 33 80 45L88 53 45 55Z" fill="#b13f69" stroke="#79304e" stroke-width="1.2"/>
<path d="m83 48 13-2-3 7 9 5-14 1Z" fill="#b13f69" stroke="#79304e"/>
<path d="m32 59 62 12" stroke="#392b42" stroke-width="2"/>
<path d="M67 60Q76 57 82 63L79 71Q72 76 67 68Z" fill="#292032" stroke="#a38ab5" stroke-width="1"/>
<path d="m61 44 8 5m0-5-8 5" stroke="#fff0da" stroke-width="1.5"/>
<circle cx="65" cy="44" r="2.5" fill="#fff0da"/>'''

VAMPIRE = '''
<path d="M37 78 27 68 31 89 48 87M88 87 101 68 99 90Z" fill="#792b50" stroke="#bd6491" stroke-width="1.3"/>
<path d="m57 76 3 8 3-7m4 0 3 7 3-8" fill="#fffaf2" stroke="#5d446e" stroke-width=".8"/>
<path d="M54 45Q65 36 79 44L68 48 64 54 61 47Z" fill="#302138"/>
<path d="m48 58 9 2m14 0 9-2" stroke="#5d446e" stroke-width="2"/>'''

MUMMY = '''
<path d="M37 56Q62 48 88 57M29 74Q65 69 99 76M37 84 88 79M57 44 68 51" stroke="#d7c4a0" stroke-width="5" fill="none"/>
<path d="m39 54 3 4m16-7 2 5m18-2-1 5M45 72l2 5m27-5-1 4" stroke="#ad997c" stroke-width="1"/>
<path d="M49 61Q64 57 80 62L79 69Q62 66 49 69Z" fill="#392c43"/>
<circle cx="55" cy="64" r="2" fill="#ffad55"/><circle cx="73" cy="64" r="2" fill="#ffad55"/>
<path d="m87 77 10 14-5 7" stroke="#d7c4a0" stroke-width="4" fill="none"/>'''

GHOST = '''
<path d="M43 79Q40 71 43 57Q45 40 64 40Q84 40 86 58L89 84 80 80 73 85 65 81 56 85 49 81Z" fill="#fffaf2" stroke="#d5c3e4" stroke-width="1.2"/>
<ellipse cx="56" cy="62" rx="3" ry="5" fill="#513a61"/><ellipse cx="73" cy="62" rx="3" ry="5" fill="#513a61"/>
<ellipse cx="64" cy="75" rx="3" ry="4" fill="#513a61"/>
<ellipse cx="49" cy="71" rx="3" ry="1.8" fill="#efbad5"/><ellipse cx="81" cy="71" rx="3" ry="1.8" fill="#efbad5"/>'''

SMILE = '''<circle cx="54" cy="65" r="2.4" fill="#513a61"/><circle cx="74" cy="65" r="2.4" fill="#513a61"/>
<path d="M56 75Q64 84 72 75" stroke="#513a61" stroke-width="2.7" fill="none"/>
<ellipse cx="46" cy="73" rx="4" ry="2" fill="#ed9fc3"/><ellipse cx="82" cy="73" rx="4" ry="2" fill="#ed9fc3"/>'''

MOTION = '''
.halloween-bob{animation:halloween-bob 3s ease-in-out infinite}
.halloween-rays{transform-origin:64px 64px;animation:halloween-rays 12s linear infinite}
.halloween-moon{transform-origin:64px 64px;animation:halloween-moon 4s ease-in-out infinite}
.candy-fall{animation:candy-fall 2.6s linear infinite;transform:translateY(var(--rest))}
@keyframes halloween-bob{50%{transform:translateY(-3px)}}
@keyframes halloween-rays{to{transform:rotate(360deg)}}
@keyframes halloween-moon{50%{transform:rotate(5deg)}}
@keyframes candy-fall{0%{transform:translateY(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(35px);opacity:0}}
@media(prefers-reduced-motion:reduce){.halloween-bob,.halloween-rays,.halloween-moon,.candy-fall{animation:none}.candy-fall{opacity:1}}
'''

SNOW_MOTION = '''
.seasonal-snowflake{transform:translateY(var(--snow-rest));transform-box:fill-box;transform-origin:center;animation:seasonal-snowfall 2.8s linear infinite}
@keyframes seasonal-snowfall{0%{transform:translate(0,6px) rotate(0deg);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translate(var(--snow-drift),34px) rotate(70deg);opacity:0}}
@media(prefers-reduced-motion:reduce){.seasonal-snowflake{animation:none;opacity:1}}
'''


def find(root, id):
    return next((el for el in root.iter() if el.get('id') == id), None)


def remove(root, element):
    if element is None:
        return
    for parent in root.iter():
        if element in list(parent):
            parent.remove(element)
            return


def add_snowfall(root):
    """Keep six flakes visible below the costume, with staggered fall and drift."""
    group = find(root, 'Snowflakes')
    originals = list(group)
    for i, source in enumerate(originals + originals):
        flake = source if i < len(originals) else deepcopy(source)
        flake.set('id', f'Snowflake {i + 1}')
        flake.set('class', 'seasonal-snowflake')
        flake.set('fill', '#c2e8f5')
        flake.set('opacity', '1')
        flake.set('style', f'animation-delay:-{i * .45}s;--snow-rest:{8 + (i * 7) % 23}px;--snow-drift:{(-4, 3, -2)[i % 3]}px')
        if i >= len(originals):
            group.append(flake)


def candy_rain(root, drizzle=False, thunder=False):
    group = ET.SubElement(find(root, 'Sky'), f'{{{NS}}}g', {'id': 'Candy-rain'})
    positions = [(42, 0), (64, .8)] if thunder else [(43, 0), (64, .8), (85, 1.6)]
    if not drizzle:
        positions += [(x, delay + 1.3) for x, delay in positions[:2]]
    for i, (x, delay) in enumerate(positions):
        anchor = ET.SubElement(group, f'{{{NS}}}g', {'transform': f'translate({x} 88)'})
        candy = fragment(f'''
<path d="m-4-2-5-2v8l5-2m8-4 5-2v8l-5-2" fill="{['#ffad55','#c699f4','#acd979'][i % 3]}" stroke="#5d446e" stroke-width=".7"/>
<rect x="-4" y="-3" width="8" height="10" rx="3" fill="{['#ffad55','#c699f4','#acd979'][i % 3]}" stroke="#5d446e" stroke-width=".7"/>
<path d="m-2-2 4 7M-3 2l2 4" stroke="#fff0da" stroke-width="1.3"/>''')
        candy.attrib = {'class': 'candy-fall', 'style': f'animation-delay:-{delay}s;--rest:{7 + (i % 2) * 15}px'}
        anchor.append(candy)


def build():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    costumes = {'clear-day': 'devil', 'clear-night': 'witch', 'overcast': 'witch',
                'partly-cloudy-day': 'pirate', 'partly-cloudy-night': 'vampire',
                'rain': 'pirate', 'drizzle': 'witch', 'partly-cloudy-day-rain': 'pirate',
                'partly-cloudy-night-rain': 'witch', 'fog': 'mummy', 'snow': 'ghost',
                'thunderstorms': 'devil'}
    for name, costume in costumes.items():
        root = ET.parse(SOURCE / f'{name}.svg').getroot()
        root.insert(0, ET.Comment(' Halloween costume variant of the bundled Meteocons faces. Original MIT license: ../meteocons/LICENSE. '))
        root.insert(1, ET.Element(f'{{{NS}}}title'))
        root[1].text = f'{name.replace("-", " ").title()} · {costume} costume'
        for el in list(root.iter()):
            if isinstance(el.tag, str) and el.tag.split('}')[-1] in ('animate', 'animateTransform', 'style'):
                remove(root, el)
        for id in ('Knit-nightcap', 'Winter-cap', 'Crying-rain', 'Grandpa-golf-swing', 'Grandpa-xray', 'Grandpa-sparks'):
            remove(root, find(root, id))
        for el in root.iter():
            if el.get('opacity') == '0':
                el.set('opacity', '1')
        weather_face = find(root, 'Weather-face')
        if name in ('rain', 'drizzle', 'partly-cloudy-day-rain', 'partly-cloudy-night-rain', 'thunderstorms'):
            weather_face.clear()
            weather_face.set('id', 'Weather-face')
            weather_face.append(fragment(SMILE))
            weather_face[0].attrib.pop('id')
            candy_rain(root, drizzle=name == 'drizzle', thunder=name == 'thunderstorms')
        host = next((parent for parent in root.iter() if weather_face in list(parent)), None) if weather_face is not None else find(root, 'Moon')
        body = {'witch': WITCH, 'devil': HORNS, 'pirate': PIRATE, 'vampire': VAMPIRE, 'mummy': MUMMY, 'ghost': GHOST}[costume]
        ornament = fragment(body)
        if name == 'clear-day':
            ornament.set('transform', 'translate(20 13) scale(.68)')
        elif name == 'clear-night':
            ornament.set('transform', 'translate(0 -6) scale(.85)')
            mouse = find(root, 'Mouse-nightcap')
            mouse.clear()
            mouse.set('id', 'Mouse-witch-hat')
            mouse.append(fragment(WITCH))
            mouse[0].set('transform', 'translate(-13 -12) scale(.18)')
            mouse[0].attrib.pop('id')
        host.append(ornament)
        if name == 'snow':
            add_snowfall(root)
        for id, cls in (('Clouds', 'halloween-bob'), ('Moon', 'halloween-moon')):
            el = find(root, id)
            if el is not None:
                el.set('class', cls)
        if name == 'clear-day':
            find(root, 'Rays').set('class', 'halloween-rays')
        style = ET.SubElement(root, f'{{{NS}}}style')
        style.text = MOTION + (SNOW_MOTION if name == 'snow' else '')
        ET.indent(root, space='  ')
        (DESTINATION / f'{name}.svg').write_text(ET.tostring(root, encoding='unicode') + '\n', encoding='utf-8')
    print(f'Built {len(costumes)} Halloween weather icons.')


if __name__ == '__main__':
    build()
