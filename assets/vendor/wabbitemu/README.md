# Afterglow TI-84 core

MIT-licensed Wabbitemu source from [sputt/wabbitemu](https://github.com/sputt/wabbitemu/tree/48c2dc0e6d1d87bb5cf9611efbeb0d048b19c422), revision `48c2dc0e6d1d87bb5cf9611efbeb0d048b19c422`. See `LICENSE.txt`.

`source/` contains the unchanged C files and headers used for this browser build. `bridge.c` is the Afterglow adapter: classic TI-84 Plus/Plus SE initialization, bounded CPU stepping, the key matrix, and a 96×64 monochrome framebuffer. A bounded virtual link cable transfers validated single-program `.8xp` files using RTS/ACK/CTS/DATA/EOT; the TI OS allocates the program. Link-port audio callbacks are intentionally empty. The included color-LCD implementation is an upstream link dependency; CE/CSE devices are not supported by the UI.

`core.js` and `core.wasm` are generated with Emscripten **3.1.64**, `-O2`, using `tools/build-ti84.py --emcc <path-to-emcc>`. On Windows supply `emcc.bat`. Activate a portable SDK before rebuilding. The build uses `_LINUX`/`_ANDROID` portability declarations and defines Microsoft's `__pragma` and SAL annotations as empty. No OS installation or running server restart is needed for the generated assets.

No Texas Instruments firmware is included. A user can import a 1 MiB classic TI-84 Plus or 2 MiB Plus SE ROM. An optional local installation at `/assets/ti84-roms/ti84plus.rom` is served to clients of that dashboard, including LAN phones; the directory is gitignored. Imported ROMs are saved in IndexedDB in that browser and are not uploaded. Calculator RAM starts fresh on page reload. Switching center panels pauses execution without resetting RAM.

The core runs in a dedicated Worker at the calculator's emulated clock rate, with a 30 Hz display. Hiding the face, switching center content, opening the calendar, or hiding the document pauses it and releases queued keys. The browser recreation is an explicitly separate Demo mode.

## Local DrugWars installation

The dashboard loads an optional `assets/ti84-programs/DRUGWARS.8xp` after each fresh ROM boot. That folder is excluded from Git and Docker images. The local game was obtained from [DaSovietPotato/Drugwars-TI-84](https://github.com/DaSovietPotato/Drugwars-TI-84/blob/main/DRUGWARS.8xp), Git blob `b32d23a399b46d6f216af1fa09c7a49c0976563e`, SHA-256 `43782482e13c5648b8acf10baf242f5323a37be7eb5d7ed1b12d279fe9cf3f95`. Its title identifies it as J.M.'s Drugwar Simulation, version 2.00. The game is not bundled with the source.

Select **Play DrugWars**, or **PRGM → DRUGWARS → ENTER → ENTER**. ENTER advances its introduction; number keys answer menus. ON interrupts a running TI-BASIC program. Reloading reinstalls the program but resets game progress, like the rest of calculator RAM. The launch shortcut assumes the fresh emulator's only installed program is DRUGWARS.

`node tests/check-ti84-program.cjs <local-rom> <local-8xp>` checks rejection of malformed files, successful OS link transfer, and the installed game's title/menu. It requires the above local game file; neither ROM nor program is downloaded by the test.

Validation: original TI-84 Plus OS 2.55MP boot, arithmetic and graphing with a local supplied ROM; no firmware files or ROM-derived screenshots are committed. `tests/check-ti84-rom.cjs <local-rom-path>` checks boot, key matrix response and LCD changes. `tests/check-ti84.cjs` checks the independent demo parser and graph sampling.
