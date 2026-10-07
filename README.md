## Radio card

Select **Radio** from any corner gear. The compact card has a station badge/logo, name, city, an icon-only Start/Stop button, volume, and **Browse stations** at the left. The larger browser supports station/city/genre search, favorites, and 50/100/250-mile filters using the configured ZIP. Choosing a station closes the browser and starts audio; the Radio card stays selected until you change it. Empty results, unavailable catalogs, connection timeouts, and playback failures have visible states.

Audio is owned by the main dashboard, shared by all copies of the Radio card. Replacing a card or opening Home/calendar keeps it playing. A scrolling strip beneath the center panel shows station, city, and available program/song information with speaker and Start/Stop icons. Tap the speaker to open a vertical volume slider above it, with the percentage and a Mute/Unmute button. Dragging above zero unmutes; tapping outside or pressing Escape closes the volume control. It keeps the selected station while stopped and after reload, even with no Radio corner. Stop releases the live stream; Start reconnects. Mute leaves playback running. Clicking the station text opens the browser. Volume, mute, favorites, and last station persist in this browser. Reloading never starts audio automatically.

Song information is requested only during playback from Triton's public CORS-enabled history API for compatible stations; old track entries are discarded. WITF additionally falls back to its [published weekly schedule](https://www.witf.org/programs/radio-schedule/), cached in `assets/radio-schedules.json`, showing “Scheduled,” the program and airtime in the station's timezone. This is a schedule, not confirmation of the broadcast. The reviewed snapshot expires November 3, 2026; expired schedules are hidden. The time format follows the clock setting. Other stations without metadata show live-stream status. Long text scrolls, with manual scrolling when reduced motion is enabled.

Future storage: a local SQLite database can hold station identities, regional coordinates, stream URLs, provider identifiers, cached schedules, source URLs, and verification/expiry times. Keep short-lived now-playing data separate from station records. That database and automatic schedule refresh are not implemented yet; the current catalog and WITF schedule are local JSON.

The catalog contains 31 reviewed streams: the original 18 Mid-Atlantic choices plus WBUR, C-SPAN Radio, WRTI Classical/Jazz, WBGO/WBGO TOO, KEXP, KCRW/Eclectic24, WNYC FM, WQXR, New Sounds, and Operavore. All 13 additions decoded and advanced playback in muted Chrome checks on October 7, 2026. This is a curated catalog, not a nationwide station directory. Stream candidates come from Radio Browser and station players; the additions use verified direct URLs, primarily published by the stations themselves, with stream-source links retained in the catalog. Reviewed station cities/studio regions and supporting source URLs are in `research/radio-locations.json`; ZIP centroids from Zippopotam.us supply approximate coordinates. These are regional distances, not transmitter distances or reception predictions. Unreviewed or missing locations are excluded. A nationwide FCC import is not implemented yet.

`tools/build_radio_catalog.py` joins that allowlist with the stream research, rechecks each audio response, geocodes each ZIP once, and atomically writes `assets/radio-stations.json`. Empty builds preserve the previous catalog. `tools/check_radio_playback.cjs` additionally checks decoded, advancing audio in an isolated muted Chrome session; all 18 streams passed on October 2, 2026. The regular browser regression uses synthetic audio so it doesn't depend on live broadcasts. Tests cover duplicate cards, replacing a playing card, favorites, search/distance filters, volume persistence, no autoplay, stale track metadata, and desktop/short-screen/mobile layout.

References: [Radio Browser API](https://docs.radio-browser.info/), [Triton public track-history API](https://help.tritondigital.com/docs/using-the-triton-digital-12-hour-history-service), and per-station location sources in the catalog. Only static assets changed for this feature; the native service serves them on the existing port 10000.

## Custom M3U card

Enter your HTTP(S) playlist URL in **Settings → Media** and choose **Save and load playlist**. Choose **Custom M3U · audio & video** from a corner or center gear to show the player. Only one M3U card is allowed: choosing it elsewhere moves the existing player and restores the previous position's default card. The channel selector shows names, channel numbers, and groups from the playlist. Choose a channel to play it; loading a playlist never starts its first channel automatically. Tap the now-playing text beneath the center panel to open a larger view; closing it returns the same player to the card. The fullscreen icon inside the video’s lower-right corner fills the screen with the player and playback controls; tap it again or press Escape to return without restarting the stream. It is available in corner, center, and expanded views. The center retains its digital clock, calendar toggle, Alarm, and Home controls. Audio and video share Radio's single player, mute setting, and persistent bottom Start/Stop strip. Changing cards or opening the calendar preserves audio playback; the bottom strip remains available to mute, stop, or restart it. The last successful playlist, selected stream, and card position are remembered in this browser without autoplay on reload.

The loader is standalone: `playlist.py` fetches plain M3U/M3U8 text directly, reads optional EXTINF titles, channel numbers and groups, resolves relative URLs against the final playlist URL, removes duplicate URLs, and skips unsupported entries. It does not use the IPTV project, provider accounts, EPG, or the lighting service. Input is limited to 2 MiB / 2,000 entries, bounded redirects, and HTTP(S). Local/LAN playlist servers are supported. Playlist URLs go in a same-origin POST body instead of access-log query strings; playlist contents are treated as text, never HTML or commands. A failed load leaves the previous playlist and playback intact.

Browser-supported audio/video files and streams play directly. HLS uses locally bundled [hls.js 1.6.13](https://github.com/video-dev/hls.js/tree/v1.6.13), with its Apache-2.0 notice in `assets/vendor/hls/LICENSE`. A direct HLS manifest is treated as one stream, not a list of media segments. HLS sources must allow browser access, including CORS.

MPEG-TS entries ending in `.ts`, `.m2ts`, or `/mpegts` use locally bundled [mpegts.js 1.8.0](https://github.com/xqq/mpegts.js/tree/v1.8.0), with its Apache-2.0 license in `assets/vendor/mpegts/LICENSE`. A short-lived, single-use ticket opens a same-origin byte relay through the dashboard server, allowing sources without CORS headers. The browser transmuxes supported video/audio into its native player; the dashboard does not run FFmpeg or re-encode video. Unsupported codecs (including MPEG-2 video), DRM, and custom authentication headers are not supported. Stop, channel changes, or disconnects close the relay and its upstream connection. Relays are limited to four concurrent streams; `GET /api/media/status` reports their active count.

Validation: playlist/parser and same-origin endpoint tests use isolated local servers. Browser regression checks actual audio/video decoding, inline playback, expand/collapse continuity, card replacement, saved state, errors, and desktop/tablet/mobile layouts. A public HLS stream was also verified in muted Chrome. Additional tests cover channel metadata, real MPEG-TS decoding through an isolated byte relay, changing channels while expanded, and upstream cleanup on Stop. The M3U fetch endpoint requires restarting the native dashboard after this backend update, subject to the user's per-operation restart approval.

## Alarm and timer sounds

After **Set alarm** or **Start timer**, choose **Silent** or one of five Mixkit recordings: **Facility alarm sound**, **Digital clock digital alarm buzzer**, **Vintage warning alarm**, **Emergency alert alarm**, or **Classic alarm** in the sound picker, optionally preview it and adjust alert volume, then confirm. The timer starts counting when confirmed. Closing the picker cancels the pending change. Each alarm/timer remembers its own sound choice; the first choice defaults to Silent. Audible alerts repeat until dismissed or canceled, independently of radio/M3U volume, and simultaneous alerts remain independently dismissible through their Cancel controls. Preview plays the original recording once; Stop preview ends it immediately. The chosen recording is loaded before confirmation so missing audio cannot silently arm an audible alert.

Install recordings once with `python tools/fetch_alarm_sounds.py`. They then play locally without contacting Mixkit. Licensed WAV files are excluded from source control; see [recording provenance and license](assets/alarm-sounds/README.md).

Keep the dashboard open and the phone awake: browser alarms cannot reliably wake a locked/sleeping phone or run after the page closes. Device media volume still applies. After a reload, browsers may require a tap to enable sound again; visual alerts remain available. Frontend-only update: refresh the dashboard, with no service restart required.

## Future Android APK

Package the dashboard as an Android APK for a tablet or dedicated touchscreen. Leave out the system stats card on Android. Keep the responsive cards, clock/calendar, weather/news, alarms, radio, and custom M3U audio/video playback. This is a future idea only; no APK implementation has started. Packaging size and the approach to the Python feed/playlist backend still need evaluation.

## System stats card

Select **System stats** from any corner gear. CPU, RAM, the dashboard drive’s capacity, aggregate network transfer rates, uptime, and battery (when available) refresh every two seconds while visible. These are measurements from the server computer, not the viewing device. NVIDIA GPU utilization and dedicated memory use come from nvidia-smi when installed. Unsupported GPU counters are marked unavailable. Temperatures are not included yet.

The launcher prefers the project virtual environment. Its `psutil` dependency is installed there. On another Windows machine, create it with `python -m venv .venv`, then run `.venv/Scripts/python.exe -m pip install -r requirements.txt` before `bash run.sh`.

# Native Python launch (current)

The dashboard now runs directly on Windows. The old Docker container and its Compose network were removed during migration. Docker files remain as an optional alternative, not the active deployment.

From Git Bash:

```bash
cd /c/git/touchscreen-console
bash run.sh
```

Open http://localhost:10000 in the same browser to retain your existing settings. Keep the terminal open; press Ctrl+C to stop. Python 3.10+ and the dependencies in `requirements.txt` are required. Install them with `python -m pip install -r requirements.txt` using the Python environment that will run the dashboard. The launcher prefers the project virtual environment, then searches installed Python and the existing Codex Python runtime. Set `PYTHON` to an executable path to override it.

Optional arguments: `bash run.sh --port 10001` or `bash run.sh --host 127.0.0.1`. Default bind is 0.0.0.0, preserving access from other devices. Windows may prompt for firewall access. Home controls are built in. Open Home and select Find devices to discover supported Kasa bulbs and single outlets on the computer's local network. No M3U Picker installation or lighting URL is required. Device identities are saved locally in `data/home-devices.json` (excluded from Git); `AFTERGLOW_DATA_DIR` can override this directory. Newer Kasa/Tapo devices requiring account authentication are not supported by this LAN protocol.

There is no database. Preferences, location, panel layout, alarms and timers are browser local storage. Feed/device caches are in RAM and refill after restarting. Keep the same URL (including hostname and port) to preserve browser settings.

## Earlier project notes

# Touchscreen Console

A touch-friendly home dashboard for the coffee-table monitor, with layouts that adapt to other monitors, tablets, and phones.

## Planned experience

- Active mode: TV guide and playback controls, lights, and outlets.
- Idle mode: clock, local weather, and local news headlines; explore an optional Twitter/X pane depending on available feed access.
- Tap to leave idle mode and return to the controls. The wake-up tap should not activate a control underneath it.

## Layout priorities

- Adapt the layout to both viewport width and height instead of shrinking the whole interface.
- Use a horizontal arrangement for wide, short displays, a grid for conventional landscape displays, and stacked panels or navigation for portrait displays.
- Keep text readable and controls comfortably tappable; reduce visible content when space is limited.
- Provide a UI-size setting saved per browser/device. Pixel dimensions alone do not describe physical screen size or viewing distance.
- Support browser zoom and keyboard navigation as well as touch.

## Visual design and motion

- Start with **Vapor** styling. See [theme choices and alternatives](THEMES.md).
- Make it feel like a polished dedicated console, with a distinctive visual style, clear typography, and cohesive colors.
- Use smooth transitions between panels, controls, and idle mode; avoid abrupt layout jumps.
- Give touch interactions immediate visual feedback, with restrained motion that does not delay controls.
- Keep animations fluid on the actual connected device, not just a development desktop. Favor transform and opacity animations over expensive layout effects.
- Respect reduced-motion preferences and keep idle-mode headlines easy to read.
- Treat visual quality and responsive scaling as core requirements from the first prototype.

## Status

First dashboard pass is available at http://localhost:10000 when the Docker container is running.

Included: Vapor styling, animated Meteocons, a sweeping Eastern Time analog clock, Lancaster weather and five-day forecast, LancasterOnline RSS headlines, and NFL scores through ESPN. The X tab is a clearly labeled placeholder with a link to X; it does not consume a saved login. Device controls and automatic switching between idle and active modes are future work.

The gear button adjusts interface text size per browser; the fullscreen button uses the browser fullscreen API. The layout rearranges below 900px and 520px. Reduced-motion preferences disable panel transitions and use a ticking clock; upstream SVG weather animations still run.

## Running

Prepared update: the upper weather card has Overview, Hourly (next 12 hours), and Radar tabs. Swipe Overview/Hourly to move between views; radar gestures pan the map. Radar uses RainViewer's past frames with manual previous/next and play/pause controls, over OpenStreetMap tiles rendered by Leaflet. Radar metadata loads only when selected. Both weather and news tabs support arrow keys, Home, and End.

News categories: Local alternates LancasterOnline and WGAL local headlines; National and World use Washington Post's respective RSS feeds. Each story is an external link with a publisher label. Sources fail independently, preserve cached results, and back off for five minutes after failures. AP's legacy RSS endpoints returned 403. Reuters' legacy public endpoints failed; a Reuters-filtered Google News RSS feed was verified but is not configured as a source yet.

Checks for this update: five feed regression tests, a Node DOM smoke test for script startup, hourly rendering, category selection, and headline URLs. All seven upstream requests (weather, LNP, WGAL, WaPo national/world, radar, sports) succeeded from a temporary Docker container. Visual browser testing remains pending.

Optional Docker launch: `docker compose up -d --build` builds the Python dependencies and creates the `touchscreen-console` container with host networking on port 10000. Host networking lets Home discover devices on the host's LAN; it is available on Linux and supported Docker Desktop installations with host networking enabled. Device identities persist in the `home-data` volume. Native Python is the alternative when host networking is unavailable.

Current instructions in this chat require explicit approval for each interrupting restart, including the native dashboard on port 10000. Check active streams on the exact target port, report any unknown playback status and expected interruption, and obtain approval after preparation and testing. Older automatic-deployment notes are superseded. Never restart the M3U picker on 9998/9999 as part of a dashboard deployment.

Weather and news are cached for ten minutes, sports for one minute. Failed refreshes retain previously successful data and mark it cached. A cold-start upstream failure displays an unavailable message. LancasterOnline returned HTTP 429 during the initial container check; weather and sports succeeded.

Validation: Python and JavaScript syntax checked, icon filenames verified, live page and health endpoints verified. Browser visual QA remains pending because Chrome is unavailable to the browser tool on this machine.

Existing m3u picker controls may provide integration points. This is a separate application repository.

News list update: all available articles from the past 12 hours are shown newest first in scrollable category panels. No two-item pages or auto-rotation. LNP requests up to 100 items; other publisher feeds retain their upstream limits. Automatic refresh preserves scroll position. Articles without valid publication dates are excluded from the time window.

## Future work: work Outlook / Microsoft 365

Requested October 2, 2026; research only, deferred at the user's request. Target is the user's **work calendar**. Do not implement or connect an account yet.

Potential features: today's agenda, next meeting and countdown, calendar reminders using the clock alert, and links to open events in Outlook. Preferred approach: Microsoft Graph calendarView with delegated read-only calendar access (start with Calendars.ReadBasic), a Connect Outlook control in Settings, and periodic retrieval by the Docker backend. This requires an Entra app registration and user sign-in; company consent and access policies may require IT approval. Plan authenticated access to calendar data and protected token storage before implementation. Published ICS is an alternative only if company policy permits; the subscription URL grants access to its published details.

References:
- Calendar API: https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0
- Consent: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/user-admin-consent-overview
- Calendar publishing: https://support.microsoft.com/en-us/outlook/share-your-calendar-in-outlook-on-the-web

Stats now enumerate Windows hardware adapters via DXGI and match GPU Engine counters by adapter LUID. Utilization is the busiest engine after summing process use per engine. Settings in center/corner selectors toggle metrics and individual GPUs across all stats views. CPU model and Windows RAM/disk descriptors are shown where available; missing metadata is omitted.

## Additional news feeds — October 2, 2026

National now combines Washington Post, NPR National (`https://feeds.npr.org/1003/rss.xml`), and CBS US (`https://www.cbsnews.com/latest/rss/us`). World combines Washington Post, BBC World (`https://feeds.bbci.co.uk/news/world/rss.xml`), Guardian World (`https://www.theguardian.com/world/rss`), and NPR World (`https://feeds.npr.org/1004/rss.xml`). Each publisher has a Settings toggle, its own cache/backoff, and availability reporting. Existing source choices are preserved; added publishers default on. The 12-hour window, newest-first ordering, scrolling, and URL deduplication remain.

WITF research: `https://www.witf.org/feed/` returned RSS but its newest entries were July 24, 2026. Its regional/state category feed returned 404 after timing out; news post-type feeds and the regional category query returned 500. `/news/feed/` was an empty comments feed. WITF was not added because a working current local-news RSS endpoint could not be verified. Its regional news webpage remains available.

## Watch faces

Open the center gear and select **Mechanical · moving gears** under **Watch face** for the openwork steel-and-gold dial. Counter-rotating gear trains and twin oscillating balance wheels run behind skeleton hands. The dial shares the clock’s ZIP-derived time zone, 12/24-hour preference, and current date. Classic remains available and the choice is saved per browser. Calendar, timer, Alarm, and Home controls are preserved. Decorative motion pauses when the face or page is hidden and stops for reduced-motion preferences. No server restart is needed; refresh the page to load the new option.

The **Aviation · three subdials** face adds a dark instrument dial, cream seconds/minutes/24-hour subdials, metallic numerals, luminous hands, and a red seconds pointer. Its date window and all hands follow the selected dashboard time zone. Choose it under the center gear → Watch face; the choice is saved alongside Classic and Mechanical.

**Hamilton · rectangular** follows the user-provided watch photographs: an angular gold case, warm cream dial, painted-gold Arabic numerals, Hamilton lettering, dark rectangular minute track, faceted hands, and a rectangular small-seconds dial. It follows the dashboard time zone and saves the choice per browser. The original rectangular preference is retained, so existing selections update automatically after a page refresh.

**Silver skeleton · open movement** adds a pale silver chapter ring, faceted hour markers and hands, curved bridges, ruby bearings, and a large balance wheel at the lower left. The exposed gears turn at different speeds and the balance oscillates behind the timekeeping hands. Choose it under the center gear → Watch face. It uses the dashboard time zone and remembers the selection; decorative movement pauses when hidden and respects reduced-motion settings. Refresh to load this face; a service restart is not required.

## HP 12C financial calculator

Center gear → **Watch face → Financial calculator · HP 12C**. This independent browser implementation follows the classic gold/black layout, with a four-level RPN stack, one-shot gold/blue shifts, financial registers, 20 numbered memory registers, grouped cash flows, NPV/IRR, whole-period TVM, amortization, depreciation, statistics and date arithmetic. The toolbar includes the [original HP manual](https://h10032.www1.hp.com/ctg/Manual/c00363319.pdf), a quick guide with worked keystrokes, and an expanded view. Narrow screens can scroll the expanded keypad horizontally. The existing clock, alarm, calendar and Home controls remain available.

The stack, registers, cash flows, entry and display settings persist per browser under `afterglow-hp12c-v1`; storage failures do not prevent calculating. It is an adaptation, not a ROM emulator: programming and bond functions are disabled, fractional/odd-period TVM is rejected explicitly, and arithmetic uses JavaScript precision rather than HP BCD rounding. Cash-flow storage is separate from numbered registers; `g MEM` shows a register summary. IRR searches for a root near the stored interest guess and does not enumerate all possible roots.

Validation: `node tests/check-hp12c.cjs` covers RPN stack behavior, error recovery, continuous memory, all five TVM solutions, begin/end and zero interest, depreciation, statistics, dates and published manual examples (mortgage/amortization, NPV and IRR). This is a static asset update; reload the dashboard, with no server restart required.

## TI-89 graphing calculator

Center gear → **Watch face → Graphing calculator · TI-89** adds the classic charcoal TI-89 with a working keypad, native LCD, keyboard input, expanded view and an official manual link. It runs the original calculator software in a separate browser worker: symbolic algebra, graphing and the TI menus come from your ROM. Use **◆ then F1** for Y= and **◆ then F3** for GRAPH.

Install your own classic 2 MiB ROM at `assets/ti89-roms/ti89.rom`, or tap **Import ROM**. ROMs are excluded from Git and Docker; importing remembers the ROM in that browser when storage is available. Switching faces pauses the calculator and retains its current session. Reloading starts it fresh, so calculator RAM is not saved across reloads. Titanium and TI-92 ROMs are not supported by this face. Program import/export is not implemented yet.

Reload the dashboard to get the new face; no server restart is needed. Emulator source, GPL license, local patches and test commands are documented in [`assets/vendor/ti68k/README.md`](assets/vendor/ti68k/README.md).

## Keep display awake

Settings → Display → **Keep display awake** remembers the choice in this browser. HTTPS/localhost uses the native Screen Wake Lock API. Ordinary HTTP LAN URLs or browsers without that API use tiny local, silent NoSleep videos (MIT license in `assets/vendor/nosleep`). Native permission/power failures show a retry state rather than silently claiming success. The visible status distinguishes native wake lock from the video workaround.

Turning the option off releases the lock and pauses the video. Hiding the page releases it; returning retries. A saved choice may require a tap after a reload. The fallback does not use the radio/M3U player or its audio controls. Verify on the target phone/monitor: desktop browser playback tests cannot establish whether Android will honor it for an external display while the phone's own screen is off. Browser alarms cannot wake a sleeping phone; use the phone's native alarm when waking from sleep is required. No service restart is needed.
