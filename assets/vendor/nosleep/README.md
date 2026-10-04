# NoSleep video fallback

The tiny silent WebM and MP4 recordings are decoded from the embedded media in [NoSleep.js v0.12.0](https://github.com/richtr/NoSleep.js/tree/v0.12.0), used under its included MIT license. `sources.json` records their source and checksums. No third-party JavaScript runs in this integration.

Afterglow tries the native Screen Wake Lock API on secure origins. When that API is unavailable (including ordinary HTTP LAN URLs), an optional local video loop provides a best-effort fallback. Successful playback does not prove that a particular Android device will keep its external display awake. No external stream, audio, or ongoing internet connection is needed.
