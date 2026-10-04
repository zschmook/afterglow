# Afterglow TI-84 core

MIT-licensed Wabbitemu source from [sputt/wabbitemu](https://github.com/sputt/wabbitemu/tree/48c2dc0e6d1d87bb5cf9611efbeb0d048b19c422), revision `48c2dc0e6d1d87bb5cf9611efbeb0d048b19c422`. See `LICENSE.txt`.

`source/` contains the unchanged C files and headers used for this browser build. `bridge.c` is the Afterglow adapter: classic TI-84 Plus/Plus SE initialization, bounded CPU stepping, the key matrix, and a 96×64 monochrome framebuffer. Link-port audio callbacks are intentionally empty; PC link transfer and audio are not exposed. The included color-LCD implementation is an upstream link dependency; CE/CSE devices are not supported by the UI.

`core.js` and `core.wasm` are generated with Emscripten **3.1.64**, `-O2`, using `tools/build-ti84.py --emcc <path-to-emcc>`. On Windows supply `emcc.bat`. Activate a portable SDK before rebuilding. The build uses `_LINUX`/`_ANDROID` portability declarations and defines Microsoft's `__pragma` and SAL annotations as empty. No OS installation or running server restart is needed for the generated assets.

No Texas Instruments firmware is included. A user can import a 1 MiB classic TI-84 Plus or 2 MiB Plus SE ROM. An optional local installation at `/assets/ti84-roms/ti84plus.rom` is served to clients of that dashboard, including LAN phones; the directory is gitignored. Imported ROMs are saved in IndexedDB in that browser and are not uploaded. Calculator RAM starts fresh on page reload. Switching center panels pauses execution without resetting RAM.

The core runs in a dedicated Worker at the calculator's emulated clock rate, with a 30 Hz display. Hiding the face, switching center content, opening the calendar, or hiding the document pauses it and releases queued keys. The browser recreation is an explicitly separate Demo mode.

Validation: original TI-84 Plus OS 2.55MP boot, arithmetic and graphing with a local supplied ROM; no firmware files or ROM-derived screenshots are committed. `tests/check-ti84-rom.cjs <local-rom-path>` checks boot, key matrix response and LCD changes. `tests/check-ti84.cjs` checks the independent demo parser and graph sampling.
