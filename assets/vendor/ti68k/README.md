# TI-68k emulator used by the TI-89 face

`ti68k.js` is `js/v12.js` from [gbraad/ti89-simulator](https://github.com/gbraad/ti89-simulator), pinned at commit `babdb7decdcc932ef346bba48cb2c89d3ace4dd3`. Original authors: Patrick Davidson, Lionel Debroux, Xavier Andréani, and Adrien Bertrand. The upstream copyright and GPL-2.0-or-later notice are preserved. Full license: [LICENSE.txt](LICENSE.txt).

Afterglow modifications, October 4, 2026:

- Restore the upstream hardware sleep/wake-mask register writes and LCD-enable register callbacks that were commented out in this fork.
- Preserve bit 1 of the ON-key input when software acknowledges interrupt 6. An acknowledgment previously overwrote the physically held key, preventing normal power-off behavior.

All modified emulator source is shipped here. The adjacent Afterglow adapter, worker, face JavaScript and CSS are also GPL-2.0-or-later. There is no generated binary or build step for this emulator.

`assets/ti89-engine.js` decodes the user's big-endian ROM and adapts the native 160×100 framebuffer and keyboard matrix. `assets/ti89-worker.js` runs it away from the dashboard UI, serializes touch/keyboard inputs, and pauses execution when hidden. `assets/ti89-face.js` supplies a separate keypad, ROM import, browser ROM storage, expanded view and the official manual link. The existing TI-84 uses its own emulator and storage.

Only a classic TI-89 2 MiB ROM (model ID 3) is accepted. Install your own at `assets/ti89-roms/ti89.rom`, or use **Import ROM**. Firmware directories are excluded from Git and Docker. Upstream `calcrom.js` and its bundled snapshot/firmware are intentionally not included.

## Verification

```text
node tests/check-ti89-worker.cjs
node tests/check-ti89-rom.cjs "calc roms/ti89.rom"
```

The worker test needs no ROM and checks hidden CPU suspension, key chords, boot gating, queue clearing and power-key release. The integration test boots the locally supplied classic ROM, verifies framebuffer results for `2+2`, `factor(x^2-1)`, and a parabola, then checks OFF/ON retains history. Expected framebuffer regions were visually checked against that ROM; other OS versions may render differently. With no path, the ROM test only checks invalid-image rejection.

Browser checks cover the actual touch keypad, keyboard letters, expanded view, panel switching and reload. No service restart is needed for these static assets.

## Current limits

The ROM persists in IndexedDB when available; calculator RAM does **not** survive a page reload or ROM replacement. Switching faces retains the current session. This face has no program-file import/export or link-cable controls yet. LCD contrast is fixed for legibility, and hardware timing/grayscale is approximate. Native TI menus, arithmetic, symbolic algebra and graphs run from the user's ROM; not every ROM application or peripheral is verified.

Key legends and shortcuts follow TI's [TI-89 / TI-92 Plus guidebook](https://education.ti.com/download/en/ed-tech/2110B5BC591D44E1AF4C28F00A6614B6/0470DB419F2144349E4032AFE3C0DD7E/8992bookeng.pdf), especially printed pages 16 and 39. Diamond F1 opens Y=, Diamond F3 opens GRAPH, and Diamond F5 opens TABLE.
