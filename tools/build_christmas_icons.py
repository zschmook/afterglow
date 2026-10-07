"""Build animated Christmas weather faces from the bundled MIT Meteocons art."""
import xml.etree.ElementTree as ET
from build_halloween_icons import NS, ROOT, SOURCE, find, remove, add_snowfall, SNOW_MOTION

DESTINATION = ROOT / 'assets/weather-icons/christmas'


def ornament(body, id='Christmas-costume'):
    return ET.fromstring(f'<g xmlns="{NS}" id="{id}" stroke-linecap="round" stroke-linejoin="round">{body}</g>')


SANTA = '''
<path d="M44 43Q49 18 66 17Q86 17 91 33L82 39Q79 26 68 27L77 44Z" fill="#c74c53" stroke="#8e323d" stroke-width="1.2"/>
<path d="M48 38Q62 33 79 39L80 46Q61 41 45 46Z" fill="#fff4df" stroke="#d8d8c5" stroke-width="1.2"/>
<path d="M47 40 48 44m6-5 0 4m6-5 0 4m6-4 0 4m6-3 0 4" stroke="#e4dece"/>
<circle cx="87" cy="37" r="6" fill="#fff4df" stroke="#d8d8c5"/>
<path d="M57 25Q64 21 70 23" fill="none" stroke="#ed9090" stroke-width="1.5"/>'''

ELF = '''
<path d="M45 43 61 16Q66 27 82 26L76 32 82 45Z" fill="#417c59" stroke="#28523d" stroke-width="1.2"/>
<path d="m48 35 31 1 3 8-10-2-7 5-7-5-13 3Z" fill="#c94f55" stroke="#963640"/>
<circle cx="81" cy="26" r="3.5" fill="#f2cf77" stroke="#a78746"/>
<path d="m62 22 2 5m2 3 5 2" stroke="#78ad85" stroke-width="1.5"/>
<path d="M34 60 26 54Q23 66 37 70M92 61 101 54Q104 66 92 71" fill="#e6c79d" stroke="#a98368" stroke-width="1"/>'''

REINDEER = '''
<path d="M45 49 40 32 37 19M40 32 29 26 27 18M39 29 45 23 44 15M81 49 87 32 91 19M87 33 98 26 100 18M89 29 82 23 83 15" fill="none" stroke="#986f48" stroke-width="4"/>
<path d="M39 48Q26 40 29 52Q31 58 41 56M86 49Q101 40 99 52Q97 58 87 57" fill="#cda77a" stroke="#986f48" stroke-width="1.2"/>
<ellipse cx="64" cy="73" rx="5" ry="4" fill="#d9545c" stroke="#a53642" stroke-width="1"/>
<ellipse cx="62" cy="71.5" rx="1.5" ry="1" fill="#ffc7b5"/>'''

SCARF = '''
<path d="M33 82Q62 90 95 82L94 88Q63 96 33 89Z" fill="#c74c53" stroke="#8e323d" stroke-width="1"/>
<path d="m82 87 9 0 4 17-10 1Z" fill="#c74c53" stroke="#8e323d"/>
<path d="m40 84 1 6m10-4 1 6m10-4 1 6m10-5 2 5m11 3 7-2m-5 7 2 0m2 0 2 0m2 0 2 0" stroke="#f7dfa5" stroke-width="2"/>'''

SNOWMAN = '''
<path d="m49 43 2-24 25 0 2 24Z" fill="#34434b" stroke="#1e2d35" stroke-width="1.2"/>
<path d="m50 34 27 0 1 8-29 0Z" fill="#c74c53"/>
<path d="M39 43Q63 39 87 43L86 47Q63 44 40 47Z" fill="#34434b" stroke="#1e2d35"/>
<path d="m73 36 2-5 5 2-2 4m-6-1-4-3-2 4 5 3" fill="#51825a" stroke="#31533f"/>
<circle cx="74" cy="37" r="2" fill="#d96864"/>'''

UMBRELLA = '''
<path d="M64 13V17" stroke="#785743" stroke-width="2"/>
<path d="M33 40Q37 15 64 16Q91 15 96 40Q85 32 79 41Q70 33 64 41Q55 33 49 41Q40 32 33 40Z" fill="#c74c53" stroke="#8e323d" stroke-width="1.2"/>
<path d="M64 17Q54 24 49 40M64 17Q73 25 79 40" fill="none" stroke="#f3d899" stroke-width="1.5"/>
<path d="M64 17V41" stroke="#f3d899"/>
<path d="M96 39V53Q96 62 89 58" fill="none" stroke="#785743" stroke-width="2"/>
<path d="m40 30 2-3 2 3-2 3Zm43 0 2-3 2 3-2 3Z" fill="#f3d899"/>'''

SMILE = '''
<circle cx="54" cy="65" r="2.4" fill="#40546a"/><circle cx="74" cy="65" r="2.4" fill="#40546a"/>
<path d="M56 76Q64 84 72 76" stroke="#40546a" stroke-width="2.7" fill="none"/>
<ellipse cx="46" cy="73" rx="4" ry="2" fill="#efb1ae"/><ellipse cx="82" cy="73" rx="4" ry="2" fill="#efb1ae"/>'''

SANTA_FACE = '''
<circle cx="54" cy="65" r="2.4" fill="#40546a"/><circle cx="74" cy="65" r="2.4" fill="#40546a"/>
<ellipse cx="46" cy="72" rx="4" ry="2" fill="#efb1ae"/><ellipse cx="82" cy="72" rx="4" ry="2" fill="#efb1ae"/>
<path d="M50 76Q49 92 64 94Q79 91 78 76Q72 83 64 79Q57 83 50 76Z" fill="#fff9ed" stroke="#d9e3e7" stroke-width="1"/>
<path d="M64 74Q60 68 55 75L50 75Q56 83 64 77Q71 83 78 75L73 75Q69 68 64 74Z" fill="#fff9ed" stroke="#d9e3e7" stroke-width=".8"/>
<ellipse cx="64" cy="72" rx="3.5" ry="2.5" fill="#e8a6a0"/>
<path d="M61 82Q64 85 67 82" stroke="#bf756d" stroke-width="1.5" fill="none"/>'''

SNOWMAN_FACE = '''
<circle cx="54" cy="64" r="2.5" fill="#34434b"/><circle cx="74" cy="64" r="2.5" fill="#34434b"/>
<path d="M61 69 77 72 61 75Z" fill="#e79343" stroke="#b16b34" stroke-width="1"/>
<circle cx="56" cy="78" r="1.6" fill="#34434b"/><circle cx="61" cy="81" r="1.6" fill="#34434b"/><circle cx="67" cy="81" r="1.6" fill="#34434b"/><circle cx="72" cy="78" r="1.6" fill="#34434b"/>'''

GINGERBREAD = '''
<path d="M29 70Q34 68 38 71M41 53Q46 51 51 54M61 43Q69 42 76 46M94 68Q98 69 99 74M39 84Q43 82 47 85M81 84Q85 82 90 84" fill="none" stroke="#fff0d3" stroke-width="2.5"/>
<circle cx="54" cy="65" r="2.5" fill="#fff0d3"/><circle cx="74" cy="65" r="2.5" fill="#fff0d3"/>
<path d="M56 75Q64 83 72 75" stroke="#fff0d3" stroke-width="2.5" fill="none"/>
<ellipse cx="46" cy="73" rx="3" ry="2" fill="#dd7770"/><ellipse cx="82" cy="73" rx="3" ry="2" fill="#dd7770"/>
<path d="m54 85 10 2 10-2-2 7-8-3-8 3Z" fill="#51825a" stroke="#31533f"/>
<circle cx="64" cy="88" r="2" fill="#d96864"/>'''

MOTION = '''
.christmas-bob{animation:christmas-bob 3.5s ease-in-out infinite}
.christmas-rays{transform-origin:64px 64px;animation:christmas-rays 16s linear infinite}
.christmas-moon{transform-origin:64px 64px;animation:christmas-moon 4s ease-in-out infinite}
.christmas-drop{animation:christmas-rain 2.5s linear infinite;transform:translateY(var(--rest))}
.christmas-bulb{animation:christmas-glow 3s ease-in-out infinite}
@keyframes christmas-bob{50%{transform:translateY(-3px)}}
@keyframes christmas-rays{to{transform:rotate(360deg)}}
@keyframes christmas-moon{50%{transform:rotate(5deg)}}
@keyframes christmas-rain{0%{transform:translateY(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(30px);opacity:0}}
@keyframes christmas-glow{50%{opacity:.65}}
@media(prefers-reduced-motion:reduce){.christmas-bob,.christmas-rays,.christmas-moon,.christmas-drop,.christmas-bulb{animation:none}.christmas-drop,.christmas-bulb{opacity:1}}
'''


def rainfall(root, light=False, thunder=False):
    group = ET.SubElement(find(root, 'Sky'), f'{{{NS}}}g', {'id': 'Christmas-rain'})
    positions = [(43, 0), (63, .6)] if thunder else [(43, 0), (64, .6), (85, 1.2)]
    if not light:
        positions += [(x, delay + 1.25) for x, delay in positions[:2]]
    for i, (x, delay) in enumerate(positions):
        anchor = ET.SubElement(group, f'{{{NS}}}g', {'transform': f'translate({x} 90)'})
        ET.SubElement(anchor, f'{{{NS}}}path', {
            'd': 'M0 0Q-4 6-3 8Q0 12 3 8Q4 6 0 0Z',
            'fill': '#9ed5ee', 'stroke': '#5d9ebc', 'stroke-width': '.7',
            'class': 'christmas-drop',
            'style': f'animation-delay:-{delay}s;--rest:{5 + (i % 2) * 13}px',
        })


def lights(host):
    group = ornament('<path d="M30 52Q64 65 99 53" fill="none" stroke="#31533f" stroke-width="1.5"/>', 'Christmas-lights')
    for i, (x, y) in enumerate(((36, 56), (50, 60), (64, 61), (78, 60), (92, 57))):
        ET.SubElement(group, f'{{{NS}}}path', {'d': f'M{x} {y-1}v3', 'stroke': '#31533f', 'stroke-width': '1.5'})
        ET.SubElement(group, f'{{{NS}}}ellipse', {
            'cx': str(x), 'cy': str(y+3), 'rx': '2', 'ry': '3',
            'fill': ['#eea1a1', '#f8d88a', '#98d3b4'][i % 3],
            'class': 'christmas-bulb', 'style': f'animation-delay:-{i*.5}s',
        })
    host.append(group)


def build():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    costumes = {'clear-day': 'Santa sun', 'clear-night': 'Santa moon',
                'overcast': 'Santa cloud', 'partly-cloudy-day': 'reindeer cloud',
                'partly-cloudy-night': 'elf cloud', 'rain': 'Christmas umbrella',
                'drizzle': 'elf drizzle', 'partly-cloudy-day-rain': 'reindeer showers',
                'partly-cloudy-night-rain': 'Santa showers', 'fog': 'gingerbread fog',
                'snow': 'snowman cloud', 'thunderstorms': 'Christmas lights storm'}
    for name, costume in costumes.items():
        root = ET.parse(SOURCE / f'{name}.svg').getroot()
        root.insert(0, ET.Comment(' Christmas variant of the bundled Meteocons faces. Original MIT license: ../meteocons/LICENSE. '))
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
        if face is not None:
            face.clear()
            face.set('id', 'Weather-face')
            body = SNOWMAN_FACE if name == 'snow' else SANTA_FACE if name in ('overcast', 'partly-cloudy-night-rain') else '' if name == 'fog' else SMILE
            face.append(ornament(body, 'Christmas-face'))
        wet = name in ('rain', 'drizzle', 'partly-cloudy-day-rain', 'partly-cloudy-night-rain', 'thunderstorms')
        if wet:
            rainfall(root, light=name == 'drizzle', thunder=name == 'thunderstorms')
        body = {'clear-day': SANTA, 'clear-night': SANTA, 'overcast': SANTA,
                'partly-cloudy-day': REINDEER, 'partly-cloudy-night': ELF + SCARF,
                'rain': UMBRELLA, 'drizzle': ELF, 'partly-cloudy-day-rain': REINDEER,
                'partly-cloudy-night-rain': SANTA, 'fog': GINGERBREAD,
                'snow': SNOWMAN + SCARF, 'thunderstorms': ''}[name]
        costume_group = ornament(body)
        if name == 'clear-day':
            costume_group.set('transform', 'translate(20 13) scale(.68)')
            find(root, 'Rays').set('class', 'christmas-rays')
        elif name == 'clear-night':
            costume_group.set('transform', 'translate(0 -6) scale(.85)')
        host.append(costume_group)
        if name == 'thunderstorms':
            lights(host)
        if name in ('fog', 'thunderstorms'):
            colors = {'#F3F7FE': '#dbaa70', '#E6EFFC': '#b97843'} if name == 'fog' else {'#9AA7BB': '#729d8c', '#66748F': '#3f6a59'}
            for el in root.iter():
                if el.get('stop-color') in colors:
                    el.set('stop-color', colors[el.get('stop-color')])
            find(root, 'Cloud_2').set('stroke', '#fff0d3' if name == 'fog' else '#a1c6b3')
        for id, cls in (('Clouds', 'christmas-bob'), ('Moon', 'christmas-moon')):
            el = find(root, id)
            if el is not None:
                el.set('class', cls)
        if name == 'snow':
            add_snowfall(root)
        style = ET.SubElement(root, f'{{{NS}}}style')
        style.text = MOTION + (SNOW_MOTION if name == 'snow' else '')
        ET.indent(root, space='  ')
        (DESTINATION / f'{name}.svg').write_text(ET.tostring(root, encoding='unicode') + '\n', encoding='utf-8')
    print(f'Built {len(costumes)} Christmas weather icons.')


if __name__ == '__main__':
    build()
