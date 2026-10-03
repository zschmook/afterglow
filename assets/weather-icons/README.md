# Weather icon candidates

Downloaded October 2, 2026 for later selection. The dashboard uses the Meteocons fill style. Downloading these assets did not execute upstream package scripts.

| Folder | Contents | License / attribution |
| --- | --- | --- |
| `meteocons/` | @meteocons/svg 0.1.0: 1,900 SVG files across fill, flat, line, and monochrome styles | MIT, Bas Milius. Keep the included LICENSE. |
| `amcharts/` | 54 SVG files, including animated and static variants | CC BY 4.0. Credit amCharts when used; license included. |
| `weather-icons/` | Erik Flowers' full source distribution, including 222 SVGs, icon fonts, and CSS | Upstream README records SIL OFL 1.1 for icons, MIT for code, CC BY 3.0 for documentation. Preserve upstream notices. |

## Original sources and previews

- Meteocons: https://bas.dev/work/meteocons and https://github.com/basmilius/meteocons
- amCharts: https://www.amcharts.com/free-animated-svg-weather-icons/
- Weather Icons: https://erikflowers.github.io/weather-icons/ and https://github.com/erikflowers/weather-icons

`downloads.json` records archive URLs, SHA-256 hashes, and extracted file counts. The Meteocons LICENSE was fetched separately from its upstream repository because its npm archive omitted it.

## Dashboard expressions

`faces/` contains local SVG variants made by `tools/build_weather_faces.py`: smiling sun and fair-weather clouds, sad rain clouds with animated teardrops, and an angry grey thundercloud with bushy eyebrows, reading glasses, and a tiny raised golf club. Faces and the club sit inside the moving cloud/sun groups, preserving the original motion. The thundercloud swings at its lightning bolt every eight seconds, then briefly shows a cartoon skull and ribs in two pulses. The new tear and golf/shock animations respect reduced-motion preferences. The original Meteocons artwork and MIT license remain in `meteocons/`. Current, hourly, and five-day weather use the same icon mapping.
