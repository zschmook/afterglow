# Halloween weather faces

The Halloween theme uses these 12 costume variants for current conditions,
hourly weather, forecasts, and the Sport watch face. Other themes use the
regular weather faces. Weather labels and condition codes stay the same.

| Conditions | Costume |
| --- | --- |
| Clear day | Devil sun |
| Clear night | Witch moon and its little mouse |
| Overcast | Witch cloud |
| Partly cloudy day | Pirate cloud |
| Partly cloudy night | Vampire cloud |
| Rain / daytime showers | Pirate cloud with candy rain |
| Drizzle / nighttime showers | Witch cloud with candy rain |
| Fog | Mummy cloud |
| Snow | Ghost cloud with snowflakes |
| Thunderstorms | Devil cloud with lightning and candy rain |

Art is derived from the bundled Meteocons face variants, with the original
MIT notice retained in `../meteocons/LICENSE`. Costumes are local SVG artwork;
there are no remote image requests. Motion uses CSS and stops when reduced
motion is requested; static candy and snow remain visible.

Regenerate from the repository root with `python tools/build_halloween_icons.py`.
