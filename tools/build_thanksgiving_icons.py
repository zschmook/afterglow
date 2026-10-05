"""Build Thanksgiving / Fall weather faces from the bundled MIT artwork."""
import xml.etree.ElementTree as ET
from build_halloween_icons import NS, ROOT, SOURCE, find, remove, add_snowfall, SNOW_MOTION

DESTINATION = ROOT / 'assets/weather-icons/thanksgiving'


def ornament(body, id='Harvest-costume'):
    return ET.fromstring(f'<g xmlns="{NS}" id="{id}" stroke-linecap="round" stroke-linejoin="round">{body}</g>')


PILGRIM = '''
<path d="M49 44 54 19Q66 15 76 19L81 44Z" fill="#46322a" stroke="#ad8865" stroke-width="1.2"/>
<path d="m51 34 27 0 2 8H49Z" fill="#bc703b"/>
<rect x="61" y="34" width="10" height="8" rx="1" fill="#eec474" stroke="#46322a" stroke-width="1.5"/>
<path d="M35 44Q62 40 94 44L91 49Q64 47 37 49Z" fill="#46322a" stroke="#ad8865" stroke-width="1.2"/>'''

STRAW = '''
<path d="M46 44 52 25Q67 19 80 26L84 44Z" fill="#dfb16a" stroke="#a97740" stroke-width="1.2"/>
<path d="m49 36 32 1 2 6-36 1Z" fill="#986548"/>
<path d="M31 46Q64 37 98 46L92 51 89 49 85 53 82 50 76 53 72 50 66 54 60 51 54 54 50 51 45 53 41 50 35 52Z" fill="#e8c184" stroke="#a97740"/>
<path d="m55 26 0 7m6-9 1 9m7-9 2 9m6-7 2 8m-35 10 5 0m39 0 5 1" stroke="#c79853"/>
<path d="m44 71 5 5m-6-2 5-2m-2-1 0 5M81 74l4-3m-1-1 1 5" stroke="#976049" stroke-width="1.2"/>'''

SCARF = '''
<path d="M33 82Q62 91 95 81L94 88Q64 99 33 89Z" fill="#a45240" stroke="#753b31" stroke-width="1"/>
<path d="m83 87 9 0 4 18-10 1Z" fill="#a45240" stroke="#753b31"/>
<path d="m40 85 0 6m9-4 0 6m11-4 0 6m12-5 1 6m11-8 1 6m1 4 8-2m-7 8 2 0m2 0 2 0m2 0 2 0" stroke="#edc384" stroke-width="1.5"/>'''

KNIT = '''
<path d="M53 44Q52 23 68 23Q83 23 84 43Z" fill="#8a9c72" stroke="#61734f" stroke-width="1.2"/>
<path d="M52 43Q68 38 85 43L85 49Q68 44 52 49Z" fill="#d6c79d" stroke="#9d906d"/>
<path d="m59 38 0-7m5 6 0-9m6 9 0-9m6 10 0-7m-19 13 0 4m6-5 0 4m6-4 0 4m6-3 0 3m6-2 0 3" stroke="#e8dec0" stroke-width="1"/>
<circle cx="69" cy="23" r="5" fill="#d6c79d" stroke="#9d906d"/>'''

UMBRELLA = '''
<path d="M64 13V17" stroke="#714a34" stroke-width="2"/>
<path d="M33 40Q37 15 64 16Q91 15 96 40Q85 32 79 41Q70 33 64 41Q55 33 49 41Q40 32 33 40Z" fill="#eab766" stroke="#92542e" stroke-width="1.2"/>
<path d="M64 17Q54 24 49 40M64 17Q73 25 79 40" fill="none" stroke="#b77a3e" stroke-width="1.3"/>
<path d="M64 17V41" stroke="#b77a3e"/>
<path d="M96 39V53Q96 62 89 58" fill="none" stroke="#714a34" stroke-width="2"/>'''

PUMPKIN = '''
<path d="M64 42Q61 31 69 27L73 31Q66 32 69 42Z" fill="#79945b" stroke="#536b3d"/>
<path d="M72 37Q77 25 90 31Q85 42 72 37Z" fill="#8caa65" stroke="#536b3d"/>
<path d="M45 53Q37 69 44 84M59 45Q53 59 54 68M82 52Q91 67 86 83M72 44Q79 58 78 67" fill="none" stroke="#c8783a" stroke-width="1.5" opacity=".65"/>'''

SMILE = '''
<circle cx="54" cy="65" r="2.4" fill="#654732"/><circle cx="74" cy="65" r="2.4" fill="#654732"/>
<path d="M56 75Q64 84 72 75" stroke="#654732" stroke-width="2.7" fill="none"/>
<ellipse cx="46" cy="73" rx="4" ry="2" fill="#de9b79"/><ellipse cx="82" cy="73" rx="4" ry="2" fill="#de9b79"/>'''

MOTION = '''
.harvest-bob{animation:harvest-bob 3.5s ease-in-out infinite}
.harvest-rays{transform-origin:64px 64px;animation:harvest-rays 16s linear infinite}
.harvest-moon{transform-origin:64px 64px;animation:harvest-moon 4s ease-in-out infinite}
.harvest-feathers{transform-origin:64px 64px;animation:harvest-feathers 4s ease-in-out infinite}
.harvest-drop{animation:harvest-rain 2s linear infinite;transform:translateY(var(--rest))}
@keyframes harvest-bob{50%{transform:translateY(-3px)}}
@keyframes harvest-rays{to{transform:rotate(360deg)}}
@keyframes harvest-moon{50%{transform:rotate(5deg)}}
@keyframes harvest-feathers{50%{transform:rotate(-4deg)}}
@keyframes harvest-rain{0%{transform:translateY(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(30px);opacity:0}}
@media(prefers-reduced-motion:reduce){.harvest-bob,.harvest-rays,.harvest-moon,.harvest-feathers,.harvest-drop{animation:none}.harvest-drop{opacity:1}}
'''


def rainfall(root, light=False, thunder=False):
    group = ET.SubElement(find(root, 'Sky'), f'{{{NS}}}g', {'id': 'Harvest-rain'})
    positions = [(43, 0), (63, .6)] if thunder else [(43, 0), (64, .6), (85, 1.2)]
    if not light:
        positions += [(x, delay + 1) for x, delay in positions[:2]]
    for i, (x, delay) in enumerate(positions):
        anchor = ET.SubElement(group, f'{{{NS}}}g', {'transform': f'translate({x} 88)'})
        ET.SubElement(anchor, f'{{{NS}}}path', {
            'd': 'M0 0Q-4 6-3 8Q0 12 3 8Q4 6 0 0Z',
            'fill': '#8ebfc6', 'stroke': '#527f88', 'stroke-width': '.7',
            'class': 'harvest-drop',
            'style': f'animation-delay:-{delay}s;--rest:{5 + (i % 2) * 13}px',
        })


def turkey_sun(root):
    sun = find(root, 'Sun')
    feathers = ornament('', 'Turkey-feathers')
    feathers.set('class', 'harvest-feathers')
    for i, angle in enumerate((-65, -43, -21, 0, 21, 43, 65)):
        ET.SubElement(feathers, f'{{{NS}}}ellipse', {
            'cx': '64', 'cy': '40', 'rx': '7', 'ry': '19',
            'fill': ['#ad583d', '#d79b46', '#829667'][i % 3],
            'stroke': '#795038', 'stroke-width': '1',
            'transform': f'rotate({angle} 64 66)',
        })
    sun.insert(0, feathers)
    face = find(root, 'Weather-face')
    face.clear()
    face.set('id', 'Weather-face')
    face.append(ornament('''<circle cx="57" cy="59" r="2.3" fill="#664015"/><circle cx="71" cy="59" r="2.3" fill="#664015"/>
<path d="m60 64 4 5 4-5Z" fill="#d87432" stroke="#88502e"/>
<path d="M69 66Q75 73 69 76Q65 72 69 66Z" fill="#b95040"/>
<path d="M57 70Q61 76 65 73" stroke="#664015" stroke-width="2" fill="none"/>''', 'Turkey-face'))


def build():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    costumes = {'clear-day': 'turkey sun', 'clear-night': 'pilgrim moon',
                'overcast': 'pilgrim cloud', 'partly-cloudy-day': 'scarecrow cloud',
                'partly-cloudy-night': 'cozy cloud', 'rain': 'umbrella cloud',
                'drizzle': 'knit cloud', 'partly-cloudy-day-rain': 'scarecrow showers',
                'partly-cloudy-night-rain': 'pilgrim showers', 'fog': 'scarf cloud',
                'snow': 'bundled-up cloud', 'thunderstorms': 'pumpkin storm'}
    for name, costume in costumes.items():
        root = ET.parse(SOURCE / f'{name}.svg').getroot()
        root.insert(0, ET.Comment(' Thanksgiving / Fall variant of the bundled Meteocons faces. Original MIT license: ../meteocons/LICENSE. '))
        title = ET.Element(f'{{{NS}}}title')
        title.text = f'{name.replace("-", " ").title()} · {costume}'
        root.insert(1, title)
        for el in list(root.iter()):
            if isinstance(el.tag, str) and el.tag.rsplit('}', 1)[-1] in ('style', 'animate', 'animateTransform'):
                remove(root, el)
        for id in ('Knit-nightcap', 'Winter-cap', 'Crying-rain', 'Grandpa-golf-swing', 'Grandpa-xray', 'Grandpa-sparks'):
            remove(root, find(root, id))
        for el in root.iter():
            if el.get('opacity') == '0':
                el.set('opacity', '1')
        face = find(root, 'Weather-face')
        host = next((parent for parent in root.iter() if face in list(parent)), None) if face is not None else find(root, 'Moon')
        wet = name in ('rain', 'drizzle', 'partly-cloudy-day-rain', 'partly-cloudy-night-rain', 'thunderstorms')
        if wet:
            face.clear()
            face.set('id', 'Weather-face')
            face.append(ornament(SMILE, 'Harvest-face'))
            rainfall(root, light=name == 'drizzle', thunder=name == 'thunderstorms')
        body = {'clear-night': PILGRIM, 'overcast': PILGRIM, 'partly-cloudy-day': STRAW,
                'partly-cloudy-night': KNIT + SCARF, 'rain': UMBRELLA, 'drizzle': KNIT,
                'partly-cloudy-day-rain': STRAW, 'partly-cloudy-night-rain': PILGRIM,
                'fog': SCARF, 'snow': KNIT + SCARF, 'thunderstorms': PUMPKIN}.get(name)
        if name == 'clear-day':
            turkey_sun(root)
            find(root, 'Rays').set('class', 'harvest-rays')
        else:
            costume_group = ornament(body)
            if name == 'clear-night':
                costume_group.set('transform', 'translate(0 -6) scale(.85)')
            if name == 'thunderstorms':
                # Ribs sit behind the face; the green stem stays above it.
                host.insert(list(host).index(face), costume_group)
                for el in root.iter():
                    if el.get('stop-color') in ('#9AA7BB', '#66748F'):
                        el.set('stop-color', '#ffc37b' if el.get('stop-color') == '#9AA7BB' else '#e39850')
            else:
                host.append(costume_group)
        for id, cls in (('Clouds', 'harvest-bob'), ('Moon', 'harvest-moon')):
            el = find(root, id)
            if el is not None:
                el.set('class', cls)
        if name == 'snow':
            add_snowfall(root)
        style = ET.SubElement(root, f'{{{NS}}}style')
        style.text = MOTION + (SNOW_MOTION if name == 'snow' else '')
        ET.indent(root, space='  ')
        (DESTINATION / f'{name}.svg').write_text(ET.tostring(root, encoding='unicode') + '\n', encoding='utf-8')
    print(f'Built {len(costumes)} Thanksgiving / Fall weather icons.')


if __name__ == '__main__':
    build()
