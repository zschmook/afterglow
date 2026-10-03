"""Add dashboard expressions to the existing SVG weather artwork."""
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/weather-icons/meteocons/fill'
TARGET = ROOT / 'assets/weather-icons/faces'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)


def tag(parent, name, **attrs):
    return ET.SubElement(parent, '{' + NS + '}' + name, {k.replace('_', '-'): str(v) for k, v in attrs.items()})


def face(parent, *, sad=False, sun=False, angry=False):
    ink = '#664015' if sun else '#46516F'
    if angry:
        ink = '#202B40'
    group = tag(parent, 'g', id='Weather-face', fill='none', stroke=ink, stroke_width=2.8, stroke_linecap='round', stroke_linejoin='round')
    if angry:
        tag(group, 'path', d='M49 64 60 67 Q56 73 50 69Z M68 67 79 64 78 69 Q72 73 68 67Z', fill='#F3F7FE', stroke_width=1.5)
        for x in (56, 72):
            tag(group, 'circle', cx=x, cy=67.5, r=2, fill=ink, stroke='none')
        # Heavy, slightly shaggy eyebrows give the cute cloud a grumpy-grandpa scowl.
        tag(group, 'path', d='M47 55 51 56 52 54 56 58 58 57 62 64 48 60Z M81 55 77 56 76 54 72 58 70 57 66 64 80 60Z', fill='#D9E1ED', stroke=ink, stroke_width=1.3)
        tag(group, 'path', d='M55 81 Q64 70 73 81', stroke_width=3.4)
        tag(group, 'path', d='M62 56 63 59 M66 56 65 59', stroke_width=1.5)
        # Low reading glasses leave the bushy eyebrows and narrowed eyes visible.
        glasses = tag(group, 'g', id='Grandpa-glasses', stroke='#DFE6EF', stroke_width=1.4)
        tag(glasses, 'path', d='M43 65 48 68 M62 68 Q64 66 66 68 M80 68 85 65')
        for x in (48, 66):
            tag(glasses, 'rect', x=x, y=64.5, width=14, height=9, rx=3,
                fill='#DFF7FF', fill_opacity='.12')
        return
    eyes, eye_y = ((57, 71), 59) if sun else ((54, 74), 65)
    for x in eyes:
        tag(group, 'circle', cx=x, cy=eye_y, r=2.3, fill=ink, stroke='none')
    if sad:
        tag(group, 'path', d='M50 60 57 58 M71 58 78 60', stroke_width=2)
        tag(group, 'path', d='M56 78 Q64 70 72 78')
    elif sun:
        tag(group, 'path', d='M57 67 Q64 75 71 67')
    else:
        tag(group, 'path', d='M55 74 Q64 84 73 74')
        for x in (46, 82):
            tag(group, 'ellipse', cx=x, cy=73, rx=4, ry=2.2, fill='#F18AB7', fill_opacity='.45', stroke='none')


def tears(parent):
    group = tag(parent, 'g', id='Crying-rain', fill='#40B8EF', stroke='#157FC3', stroke_width='.6')
    for x, offset in ((54, 0), (74, .4)):
        column = tag(group, 'g', transform=f'translate({x} 69)')
        for delay, rest in ((offset, 7), (offset+.85, 30)):
            tag(column, 'path', d='M0 0 C-1.2 2.2-3 4-3 6 A3 3 0 0 0 3 6 C3 4 1.2 2.2 0 0Z',
                **{'class':'weather-tear', 'style':f'animation-delay:-{delay}s;--tear-rest:{rest}px'})


def build():
    TARGET.mkdir(exist_ok=True)
    names = ('clear-day', 'partly-cloudy-day', 'partly-cloudy-night', 'overcast',
             'rain', 'drizzle', 'partly-cloudy-day-rain', 'partly-cloudy-night-rain', 'thunderstorms')
    for name in names:
        root = ET.parse(SOURCE / (name + '.svg')).getroot()
        root.insert(0, ET.Comment('Dashboard face variant of the bundled Meteocons artwork; original MIT license retained in ../meteocons/LICENSE.'))
        sun = name == 'clear-day'
        sad = name in ('rain', 'drizzle', 'partly-cloudy-day-rain', 'partly-cloudy-night-rain', 'thunderstorms')
        if sun:
            parent = next(node for node in root.iter() if node.get('id') == 'Sun')
        else:
            parent = next(node for node in root.iter() if any(child.get('stroke') == '#E6EFFC' and child.tag.endswith('path') for child in node))
        face(parent, sad=sad, sun=sun, angry=name == 'thunderstorms')
        if sad:
            # The drops start at the eyes and fall below the cloud in its own moving group.
            for node in root.iter():
                for child in list(node):
                    if child.get('id') == 'Precipitation':
                        node.remove(child)
            tears(parent)
            tag(root, 'style').text = '''
.weather-tear{transform:translateY(var(--tear-rest));animation:weather-tear-fall 1.7s cubic-bezier(.3,0,.7,1) infinite}
@keyframes weather-tear-fall{0%{transform:translateY(0);opacity:0}12%{opacity:1}80%{opacity:1}100%{transform:translateY(44px);opacity:0}}
@media(prefers-reduced-motion:reduce){.weather-tear{animation:none;opacity:1}}
'''
        if name == 'thunderstorms':
            cloud = next(node for node in parent if node.get('stroke') == '#E6EFFC')
            gradient_id = cloud.get('fill')[5:-1]
            gradient = next(node for node in root.iter() if node.get('id') == gradient_id)
            for stop, color in zip(gradient, ('#9AA7BB', '#66748F')):
                stop.set('stop-color', color)
            cloud.set('stroke', '#8593AA')
            # An 18px-tall raised golf club, carried along with the cloud's bounce.
            swing = tag(parent, 'g', id='Grandpa-golf-swing', **{'class':'grandpa-swing'})
            club = tag(swing, 'g', id='Grandpa-golf-club', transform='translate(99 51)', stroke_linecap='round', stroke_linejoin='round')
            tag(club, 'path', d='M0 25 Q6 28 7 18', stroke='#8593AA', stroke_width=2.5)
            tag(club, 'path', d='M7 18 13 3', stroke='#D9E1ED', stroke_width=1.5)
            tag(club, 'path', d='M13 3 17 0 Q20 0 20 2 L19 5 13 5Z', fill='#D9E1ED', stroke='#46516F', stroke_width='.8')
            tag(club, 'path', d='M7 18 8.5 14.2', stroke='#E4BCD9', stroke_width=2.4)
            lightning = next(node for node in root.iter() if node.get('id') == 'Lightning')
            lightning.set('transform', 'translate(18 14)')
            # One coordinated gag replaces the source bolt's unrelated flicker.
            for bolt in lightning:
                for child in list(bolt):
                    if child.tag.endswith('animate'):
                        bolt.remove(child)
            bones = tag(parent, 'g', id='Grandpa-xray', fill='#F2FFF9', stroke_linecap='round', stroke_linejoin='round')
            tag(bones, 'path', d='M53 58 C53 45 75 45 75 58 Q75 65 70 67 V71 H58 V67 Q53 65 53 58Z')
            for x in (59, 69):
                tag(bones, 'circle', cx=x, cy=58, r=3.2, fill='#273145')
            tag(bones, 'path', d='M64 62 61.8 65.5 H66.2Z', fill='#273145')
            tag(bones, 'path', d='M61 68 V71 M64 68 V71 M67 68 V71', stroke='#273145', stroke_width=1)
            tag(bones, 'path', d='M64 74 V85 M64 76 Q54 72 52 77 M64 76 Q74 72 76 77 M64 80 Q55 77 54 81 M64 80 Q73 77 74 81 M64 84 57 86 M64 84 71 86 M47 76 36 71 M81 76 91 70',
                fill='none', stroke='#F2FFF9', stroke_width=2.2)
            sparks = tag(root, 'g', id='Grandpa-sparks', fill='none', stroke='#FFF3A6', stroke_width=1.8, stroke_linecap='round', stroke_linejoin='round')
            tag(sparks, 'path', d='M86 98 V93 M91 101 96 99 M90 106 94 110 M82 106 79 110 M81 101 76 99 M31 49 26 43 29 40 24 34 M95 47 100 42 97 39 102 33')
            tag(root, 'style').text = '''
#Grandpa-xray,#Grandpa-sparks{opacity:0}
.grandpa-swing{transform-origin:98px 76px;animation:grandpa-swing 8s ease-in-out infinite}
#Cloud{transform-origin:64px 65px;animation:grandpa-jolt 8s linear infinite}
#Grandpa-xray{animation:grandpa-xray 8s step-end infinite}
#Weather-face,#Crying-rain{animation:grandpa-face 8s step-end infinite}
#Grandpa-sparks{animation:grandpa-sparks 8s ease-out infinite}
@keyframes grandpa-swing{0%,28%,76%,100%{transform:rotate(0)}35%{transform:rotate(-22deg)}46%{transform:rotate(160deg)}50%{transform:rotate(151deg)}55%{transform:rotate(160deg)}61%{transform:rotate(125deg)}}
@keyframes grandpa-jolt{0%,46%,59%,100%{transform:translate(0,0)}48%,54%{transform:translate(-1px,1px)}50%,56%{transform:translate(1px,-1px)}52%,58%{transform:translate(0,1px)}}
@keyframes grandpa-xray{0%,51%,59%,100%{opacity:0}47%,54%{opacity:1}}
@keyframes grandpa-face{0%,51%,59%,100%{opacity:1}47%,54%{opacity:0}}
@keyframes grandpa-sparks{0%,45%,60%,100%{opacity:0}47%,54%{opacity:1}51%{opacity:.15}}
@media(prefers-reduced-motion:reduce){.grandpa-swing,#Cloud,#Grandpa-xray,#Weather-face,#Crying-rain,#Grandpa-sparks{animation:none}}
'''
        ET.indent(root, space='  ')
        ET.ElementTree(root).write(TARGET / (name + '.svg'), encoding='utf-8', xml_declaration=False)
    print(f'Built {len(names)} expressive weather icons.')


if __name__ == '__main__':
    build()
