(() => {
  if (embeddedPanel && embeddedPanel !== 'radio') return;
  const core = window.RadioCore;
  const node = (tag, cls, text) => {
    const el = document.createElement(tag); el.className = cls || '';
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const active = state => ['playing', 'connecting'].includes(state.phase);
  const stationPlace = station => station.custom ? 'Custom playlist' : station.location.city + ', ' + station.location.region;
  const distanceText = (place, station) => {
    const miles = core.distance(place, station);
    return Number.isFinite(miles) ? 'About ' + Math.round(miles) + ' mi' : '';
  };
  const sorted = (stations, place) => [...stations].sort((a, b) =>
    (core.distance(place, a) - core.distance(place, b) || 0) || a.name.localeCompare(b.name));
  function badge(station, large = false) {
    const el = node('span', 'radio-badge' + (large ? ' radio-badge-large' : ''), station?.callSign?.replace(/-FM$/, '') || 'FM');
    if (station?.logo?.startsWith('https://')) {
      const image = node('img'); image.alt = ''; image.loading = 'eager'; image.referrerPolicy = 'no-referrer'; image.hidden = true;
      image.onload = () => { image.hidden = false; }; image.onerror = () => image.remove(); image.src = station.logo; el.append(image);
    }
    return el;
  }
  let service;
  if (embeddedPanel === 'radio' && parent !== window && parent.radioService) {
    service = parent.radioService;
  } else {
    let storage; try { storage = localStorage; } catch {}
    service = core.createController({storage,
      makeAudio: station => station.custom ? window.CustomM3U.createMedia(station) : new Audio(),
      startMedia: (media, station) => station.custom ? window.CustomM3U.startMedia(media, station) : (media.src = station.stream, media.play()),
      disposeMedia: media => window.CustomM3U?.disposeMedia(media),
      fetchCatalog: async () => {
      const response = await fetch('/assets/radio-stations.json', {signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw Error('catalog unavailable');
      return response.json();
    }});
    service.place = () => preferences.place;
    window.radioService = service;

    let scheduleRequest;
    const schedules = () => scheduleRequest ||= fetch('/assets/radio-schedules.json', {signal:AbortSignal.timeout(7000)})
      .then(response => response.ok ? response.json() : {}).catch(() => { scheduleRequest = null; return {}; });

    // Triton's documented public history feed permits browser CORS requests.
    // A history entry is only called "now playing" during its reported duration.
    let metadataKey = '', metadataTimer, metadataRequest;
    service.subscribe(state => {
      const station = state.stations.find(s => s.id === state.stationId);
      const key = active(state) ? station?.id || '' : '';
      if (key === metadataKey) return;
      metadataKey = key; clearInterval(metadataTimer); metadataRequest?.abort();
      if (!key || station.custom) return;
      const match = station.stream.match(/^https:\/\/playerservices\.streamtheworld\.com\/api\/livestream-redirect\/([A-Z0-9]+)\.(?:mp3|aac)$/);
      let busy = false;
      const update = async () => {
        if (busy) return;
        busy = true; const request = metadataRequest = new AbortController();
        const timeout = setTimeout(() => request.abort(), 7000);
        let fallback = '';
        try {
          fallback = core.scheduledProgram((await schedules())[key], Date.now(), !preferences.clock24);
          if (!match) {
            if (metadataKey === key && !request.signal.aborted) service.nowPlaying(key, fallback);
            return;
          }
          const response = await fetch('https://np.tritondigital.com/public/nowplaying?mountName=' + match[1] + '&numberToFetch=1&eventType=track', {signal:request.signal,credentials:'omit'});
          if (!response.ok) throw Error('metadata unavailable');
          const xml = new DOMParser().parseFromString(await response.text(), 'text/xml');
          const event = xml.querySelector('nowplaying-info');
          const properties = Object.fromEntries([...xml.querySelectorAll('property')].map(p => [p.getAttribute('name'), p.textContent.trim()]));
          const start = Number(properties.cue_time_start || Number(event?.getAttribute('timestamp')) * 1000);
          const duration = String(properties.cue_time_duration || '').split(':').reduce((total,n) => total * 60 + Number(n), 0);
          const age = Date.now() - start;
          const fresh = Number.isFinite(start) && age >= -30000 && age < (duration > 0 ? Math.min(duration + 45, 1800) : 300) * 1000;
          if (metadataKey === key && !request.signal.aborted) service.nowPlaying(key, fresh && properties.cue_title
            ? [properties.track_artist_name, properties.cue_title].filter(Boolean).join(' — ') : fallback);
        } catch { if (metadataKey === key && metadataRequest === request) service.nowPlaying(key, fallback); }
        finally { clearTimeout(timeout); busy = false; }
      };
      update(); metadataTimer = setInterval(update, 20000);
    });

    const dialog = node('dialog', 'radio-browser'); dialog.id = 'radio-browser';
    dialog.setAttribute('aria-labelledby', 'radio-browser-title');
    dialog.innerHTML = `<div class="radio-browser-heading"><div><span class="eyebrow">FIND YOUR FREQUENCY</span><h2 id="radio-browser-title">Radio stations</h2><p id="radio-browser-location"></p></div><button id="radio-browser-close" aria-label="Close radio stations">×</button></div>
      <div class="radio-browser-tools"><label class="radio-search-label"><span class="visually-hidden">Search stations</span><input id="radio-search" type="search" placeholder="Station, city, or genre…" autocomplete="off"></label><select id="radio-radius" aria-label="Distance from your ZIP"><option value="0">Any distance</option><option value="50">Within 50 miles</option><option value="100">Within 100 miles</option><option value="250">Within 250 miles</option></select><button id="radio-favorites-only" aria-pressed="false">☆ Favorites</button></div>
      <div id="radio-browser-results" class="radio-browser-results" role="list" aria-label="Radio stations"></div><p id="radio-browser-empty" role="status" hidden></p>
      <div class="radio-browser-foot"><span id="radio-result-count" role="status"></span><button id="radio-set-location">Set location</button><a href="https://www.radio-browser.info/" target="_blank" rel="noopener">Radio Browser</a></div>`;
    document.body.append(dialog);
    const find = id => dialog.querySelector('#' + id);
    let favoritesOnly = false, resultSignature = '', lastState = service.snapshot(), returnFocus = null;
    const results = find('radio-browser-results');
    function renderBrowser(state, force = false) {
      lastState = state;
      if (!dialog.open) return;
      const place = service.place(), query = find('radio-search').value.trim().toLowerCase();
      const radius = place ? Number(find('radio-radius').value) : 0;
      find('radio-browser-location').textContent = place ? 'Nearest to ' + place.name + (place.zip ? ' · ' + place.zip : '') : 'Set your ZIP to put nearby stations first.';
      find('radio-radius').disabled = !place;
      find('radio-set-location').textContent = place ? 'Change ZIP' : 'Set location';
      const matches = sorted(state.stations.filter(s => !s.custom), place).filter(s => (!favoritesOnly || state.favorites.includes(s.id)) &&
        (!radius || core.distance(place, s) <= radius) &&
        (!query || [s.name, s.callSign, s.genre, stationPlace(s)].join(' ').toLowerCase().includes(query)));
      const signature = JSON.stringify([matches.map(s => s.id), state.favorites, state.stationId, state.phase, place]);
      if (force || signature !== resultSignature) {
        const focus = results.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
        const scroll = results.scrollTop;
        results.replaceChildren(...matches.map(s => {
          const row = node('div', 'radio-station-row'); row.setAttribute('role', 'listitem');
          const selected = state.stationId === s.id, playing = selected && active(state);
          row.classList.toggle('radio-station-selected', selected);
          const choose = node('button', 'radio-station-choose'); choose.dataset.focusKey = 'play-' + s.id;
          choose.setAttribute('aria-label', 'Play ' + s.name + ', ' + stationPlace(s));
          const text = node('span', 'radio-station-info');
          text.append(node('strong', '', s.name), node('small', '', stationPlace(s) + (place ? ' · ' + distanceText(place, s) : '')),
            node('span', 'radio-station-genre', s.genre));
          choose.append(badge(s), text, node('span', 'radio-row-play', playing ? '▮▮' : '▶'));
          choose.onclick = () => { service.play(s.id); dialog.close(); };
          const favorite = node('button', 'radio-star', state.favorites.includes(s.id) ? '★' : '☆');
          favorite.dataset.focusKey = 'favorite-' + s.id;
          favorite.setAttribute('aria-label', (state.favorites.includes(s.id) ? 'Remove ' : 'Add ') + s.name + (state.favorites.includes(s.id) ? ' from favorites' : ' to favorites'));
          favorite.setAttribute('aria-pressed', String(state.favorites.includes(s.id)));
          favorite.onclick = () => service.favorite(s.id);
          row.append(choose, favorite); return row;
        }));
        results.scrollTop = scroll;
        if (focus) [...results.querySelectorAll('[data-focus-key]')].find(e => e.dataset.focusKey === focus)?.focus({preventScroll:true});
        resultSignature = signature;
      }
      const empty = find('radio-browser-empty');
      empty.hidden = matches.length > 0;
      empty.textContent = state.catalogError || (state.loading ? 'Loading stations…' : favoritesOnly ? 'No favorites match. Star a station in All stations to save it.' : 'No stations match. Try another search or a larger distance.');
      find('radio-result-count').textContent = state.catalogError ? 'Station list unavailable' : `${matches.length} stations · approximate distance to station’s city`;
    }
    service.openBrowser = () => {
      returnFocus = document.activeElement;
      if (!dialog.open) dialog.showModal();
      renderBrowser(service.snapshot(), true); service.load(); find('radio-search').focus();
    };
    find('radio-browser-close').onclick = () => dialog.close();
    dialog.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); dialog.close(); } });
    dialog.addEventListener('close', () => returnFocus?.focus({preventScroll:true}));
    find('radio-search').oninput = () => { results.scrollTop = 0; renderBrowser(lastState); };
    find('radio-radius').onchange = () => { results.scrollTop = 0; renderBrowser(lastState); };
    find('radio-favorites-only').onclick = e => {
      favoritesOnly = !favoritesOnly; e.currentTarget.setAttribute('aria-pressed', String(favoritesOnly));
      e.currentTarget.textContent = favoritesOnly ? '★ Favorites' : '☆ Favorites';
      results.scrollTop = 0; renderBrowser(lastState);
    };
    find('radio-set-location').onclick = () => { dialog.close(); openLocation(); };
    service.subscribe(renderBrowser);
    // This control survives the radio card being removed or replaced.
    const mini = node('div', 'radio-mini'); mini.hidden = true;
    mini.setAttribute('role', 'group'); mini.setAttribute('aria-label', 'Radio playback');
    const miniName = node('button', 'radio-mini-name'), viewport = node('span', 'radio-mini-viewport');
    const ticker = node('span', 'radio-mini-ticker'), miniToggle = node('button', 'radio-mini-toggle');
    const muteButton = node('button', 'radio-mini-mute');
    muteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="radio-sound-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="radio-muted-cross" d="m15 9 6 6m0-6-6 6"/></svg>';
    const volumePopup = node('div', 'radio-mini-volume-popup'); volumePopup.id = 'radio-mini-volume';
    volumePopup.setAttribute('popover', 'auto'); volumePopup.setAttribute('role', 'dialog'); volumePopup.setAttribute('aria-label', 'Playback volume');
    const volumeLevel = node('output', 'radio-mini-volume-level');
    const volumeSlider = node('input', 'radio-mini-volume-slider');
    volumeSlider.type = 'range'; volumeSlider.min = '0'; volumeSlider.max = '100'; volumeSlider.step = '1';
    volumeSlider.setAttribute('aria-label', 'Playback volume'); volumeSlider.setAttribute('aria-orientation', 'vertical');
    const quickMute = node('button', 'radio-mini-quick-mute'); quickMute.innerHTML = muteButton.innerHTML;
    quickMute.onclick = () => service.mute();
    volumeSlider.oninput = () => {
      const value = Number(volumeSlider.value) / 100;
      service.volume(value);
      if (value > 0 && service.snapshot().muted) service.mute();
    };
    volumePopup.append(volumeLevel, volumeSlider, quickMute);
    muteButton.setAttribute('popovertarget', volumePopup.id);
    muteButton.setAttribute('aria-haspopup', 'dialog'); muteButton.setAttribute('aria-expanded', 'false');
    function positionVolume() {
      const bounds = muteButton.getBoundingClientRect();
      volumePopup.style.left = Math.max(8, Math.min(innerWidth - 80, bounds.x + bounds.width / 2 - 36)) + 'px';
      volumePopup.style.bottom = Math.max(8, innerHeight - bounds.top + 8) + 'px';
    }
    volumePopup.addEventListener('beforetoggle', event => { if (event.newState === 'open') positionVolume(); });
    volumePopup.addEventListener('toggle', event => {
      const open = event.newState === 'open'; muteButton.setAttribute('aria-expanded', String(open));
      if (open) volumeSlider.focus({preventScroll:true});
    });
    window.addEventListener('resize', positionVolume);
    window.addEventListener('scroll', () => { if (volumePopup.matches(':popover-open')) volumePopup.hidePopover(); }, {passive:true});
    miniName.onclick = () => {
      const state = service.snapshot(), station = state.stations.find(s => s.id === state.stationId);
      if (station?.custom) window.CustomM3U.openPlayer(); else service.openBrowser();
    };
    miniToggle.onclick = () => { const state = service.snapshot(); if (active(state)) service.stop(); else service.play(state.stationId); };
    viewport.append(ticker); miniName.append(viewport); mini.append(miniName, muteButton, miniToggle, volumePopup);
    document.querySelector('footer').append(mini);
    function measureTicker() {
      const overflow = Math.max(0, ticker.scrollWidth - viewport.clientWidth);
      ticker.style.setProperty('--radio-scroll-distance', '-' + overflow + 'px');
      ticker.style.setProperty('--radio-scroll-duration', Math.max(8, overflow / 28 + 4) + 's');
      ticker.classList.toggle('radio-mini-scrolls', overflow > 2);
    }
    const tickerResize = new ResizeObserver(measureTicker); tickerResize.observe(viewport); tickerResize.observe(ticker);
    service.subscribe(state => {
      const station = state.stations.find(s => s.id === state.stationId);
      mini.hidden = !station;
      const detail = state.phase === 'playing' ? state.nowPlaying || (station?.custom ? 'Playing' : 'Live radio') : state.message || 'Ready to play';
      const caption = '♫ ' + [station?.name || 'Radio', station && stationPlace(station), detail].filter(Boolean).join('  ·  ');
      if (ticker.textContent !== caption) { ticker.textContent = caption; requestAnimationFrame(measureTicker); }
      miniName.title = caption;
      miniName.setAttribute('aria-label', 'Open radio: ' + (station?.name || 'Radio'));
      miniToggle.textContent = active(state) ? '■' : '▶';
      miniToggle.setAttribute('aria-label', active(state) ? 'Stop radio' : 'Start radio');
      miniToggle.title = active(state) ? 'Stop radio' : 'Start live radio';
      muteButton.setAttribute('aria-label', state.muted ? 'Volume · muted' : 'Volume');
      muteButton.dataset.muted = String(state.muted || state.volume === 0); muteButton.title = 'Volume';
      quickMute.setAttribute('aria-label', state.muted ? 'Unmute' : 'Mute'); quickMute.title = state.muted ? 'Unmute' : 'Mute';
      quickMute.setAttribute('aria-pressed', String(state.muted));
      volumeSlider.value = String(Math.round(state.volume * 100)); volumeLevel.value = volumeSlider.value + '%';
      volumeSlider.setAttribute('aria-valuetext', volumeSlider.value + '%' + (state.muted ? ', muted' : ''));
      mini.classList.toggle('radio-mini-error', state.phase === 'error');
      if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.playbackState = state.phase === 'playing' ? 'playing' : 'paused';
        if (station) navigator.mediaSession.metadata = new MediaMetadata({title: station.name, artist: stationPlace(station), album: 'Live radio'});
      }
    });
    if ('mediaSession' in navigator) {
      for (const action of ['pause', 'stop']) { try { navigator.mediaSession.setActionHandler(action, () => service.stop()); } catch {} }
      try { navigator.mediaSession.setActionHandler('play', () => service.play(service.snapshot().stationId)); } catch {}
    }
    window.addEventListener('storage', e => { if (e.key === 'dashboard-preferences') renderBrowser(service.snapshot(), true); });
    // Restore the last station's transport even when no corner currently shows Radio.
    if (service.snapshot().stationId) service.load();
  }

  if (embeddedPanel !== 'radio') return;
  const card = document.querySelector('.radio');
  card.innerHTML = `<div class="panel-heading"><h2>ON THE AIR</h2><span class="radio-live-label">RADIO</span></div>
    <div class="radio-current"><div class="radio-current-badge"></div><div class="radio-current-text"><h3></h3><p class="radio-current-place"></p><p class="radio-current-genre"></p></div><button class="radio-current-favorite radio-star" aria-label="Favorite station" hidden>☆</button></div>
    <p class="radio-playback-status" role="status"></p><div class="radio-controls"><button class="radio-toggle" aria-label="Start radio" title="Start radio">▶</button><label class="radio-volume"><span>Volume <output></output></span><input type="range" min="0" max="100" step="1" aria-label="Radio volume"></label></div>
    <div class="radio-card-bottom"><button class="radio-browse">Browse stations <span aria-hidden="true">↗</span></button></div>`;
  const q = selector => card.querySelector(selector);
  q('.radio-toggle').onclick = () => {
    const state = service.snapshot();
    if (active(state)) service.stop(); else if (state.stationId) service.play(state.stationId); else service.openBrowser();
  };
  q('.radio-browse').onclick = () => service.openBrowser();
  q('.radio-volume input').oninput = e => service.volume(Number(e.target.value) / 100);
  q('.radio-current-favorite').onclick = () => service.favorite(service.snapshot().stationId);
  let currentId;
  const unsubscribe = service.subscribe(state => {
    const station = state.stations.find(s => s.id === state.stationId), place = service.place();
    if (currentId !== (station?.id || null)) { q('.radio-current-badge').replaceChildren(badge(station, true)); currentId = station?.id || null; }
    q('.radio-current h3').textContent = station?.name || 'Find your station';
    q('.radio-current h3').title = station?.name || '';
    q('.radio-current-place').textContent = station ? stationPlace(station) : 'A little music. A little company.';
    q('.radio-current-genre').textContent = station ? station.genre : 'Browse the dial';
    q('.radio-live-label').textContent = state.phase === 'playing' ? 'LIVE' : state.phase === 'connecting' ? 'TUNING IN' : 'RADIO';
    card.classList.toggle('radio-is-playing', state.phase === 'playing');
    q('.radio-playback-status').textContent = state.catalogError || (state.phase === 'playing' && state.nowPlaying) || state.message || (state.loading ? 'Loading stations…' : station ? 'Ready when you are' : '');
    q('.radio-playback-status').title = q('.radio-playback-status').textContent;
    q('.radio-playback-status').classList.toggle('radio-error', state.phase === 'error' || !!state.catalogError);
    const favorite = q('.radio-current-favorite'); favorite.hidden = !station;
    favorite.textContent = state.favorites.includes(station?.id) ? '★' : '☆';
    favorite.setAttribute('aria-pressed', String(state.favorites.includes(station?.id)));
    favorite.setAttribute('aria-label', (state.favorites.includes(station?.id) ? 'Remove from' : 'Add to') + ' favorites');
    q('.radio-toggle').textContent = active(state) ? '■' : '▶';
    const action = active(state) ? 'Stop radio' : state.phase === 'error' ? 'Retry radio' : 'Start radio';
    q('.radio-toggle').setAttribute('aria-label', action); q('.radio-toggle').title = action;
    q('.radio-toggle').disabled = !state.loaded;
    q('.radio-volume input').value = Math.round(state.volume * 100); q('.radio-volume output').textContent = Math.round(state.volume * 100) + '%';
  });
  window.addEventListener('pagehide', unsubscribe, {once:true});
  service.load();
})();
