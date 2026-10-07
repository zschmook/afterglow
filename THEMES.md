# Dashboard themes

## Initial choice

Start with **Bootswatch Vapor**, selected October 2, 2026.

- Preview: https://bootswatch.com/vapor/
- Direction: purple, pink, and cyan retro-neon styling, paired with animated weather icons.
- Apply the styling to the user's clock-centered layout: weather and forecast on the left, large analog clock in the middle, news and Twitter/sports on the right.
- Preserve readable text, comfortable touch targets, adaptive scaling, and smooth transitions.

This records the design choice only; no theme or application framework has been installed. Keep theme styling separate from widget behavior so switching later is straightforward.

## Alternatives to retain

| Theme | Preview | Direction |
| --- | --- | --- |
| Bootswatch Cyborg | https://bootswatch.com/cyborg/ | Black surfaces with blue accents; a clean instrument-panel appearance. |
| Bootswatch Quartz | https://bootswatch.com/quartz/ | Translucent panels and colorful gradients. |
| daisyUI Synthwave | https://daisyui.com/docs/themes/ | An alternative retro-neon palette. |
| daisyUI Night | https://daisyui.com/docs/themes/ | Dark blue-toned palette. |
| daisyUI Dim | https://daisyui.com/docs/themes/ | Muted dark palette. |
| daisyUI Retro | https://daisyui.com/docs/themes/ | Warm vintage palette. |

Other sources researched: the broader [Bootswatch collection](https://bootswatch.com/) and [Tabler](https://tabler.io/admin-template). Tabler was not part of the final theme shortlist.

## Built-in theme selection

Settings → Display offers Midnight (navy / ice blue), Hearth (walnut / amber), Afterglow (the original purple neon palette), Halloween (deep plum / pumpkin orange), Thanksgiving / Fall (copper, cranberry, sage, and harvest gold), and Christmas (evergreen, cranberry, and warm gold). Midnight is the default. The choice is stored in browser preferences and applies before rendering, including embedded panels. Theme changes preserve playback and do not change the selected watch face. Specialty watch faces retain their own finishes; the Classic clock follows the dashboard palette. Seasonal decorations are static and do not intercept taps.

Halloween also selects a local set of 12 costumed weather faces: witches, devils, pirates, a vampire, a mummy, and a ghost. Rain, drizzle, and showers fall as wrapped candies; snowflakes and lightning remain recognizable. Current conditions, hourly weather, forecasts, and the Sport watch face switch immediately with the theme. The icons respect reduced motion. Artwork and regeneration instructions are in `assets/weather-icons/halloween/README.md`.

Thanksgiving / Fall adds autumn foliage, a small maple leaf, a cream Classic dial, and 12 matching animated weather faces. The set includes a turkey sun, pilgrim and scarecrow hats, knit caps and scarves, a gold umbrella, and a pumpkin storm cloud. Rain uses blue drops. Motion respects reduced motion; theme switching updates every weather view immediately. Artwork and regeneration instructions are in `assets/weather-icons/thanksgiving/README.md`.

Christmas adds evergreen garland and ornaments, holly beside the clock heading, and an ivory Classic dial with green and cranberry hands. Its 12 animated weather faces include Santa, reindeer, elves, a gingerbread cloud, a snowman, and a storm cloud with Christmas lights. Blue rain and falling snow remain recognizable. The set respects reduced motion and switches immediately in every weather view. See `assets/weather-icons/christmas/README.md` for artwork and regeneration instructions.
