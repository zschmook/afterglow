/* One playback controller per dashboard, shared by every radio card. */
(() => {
  const storageKey = 'dashboard-radio';
  const webURL = value => {
    try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; }
    catch { return false; }
  };
  function catalogStations(data) {
    const ids = new Set(), streams = new Set();
    return (Array.isArray(data?.stations) ? data.stations : []).filter(s => {
      const p = s.location;
      if (!s.id || typeof s.name !== 'string' || !webURL(s.stream) || !s.streamCheckedAt ||
          !p?.verified || !webURL(p.source) || !p.city || !p.region ||
          !Number.isFinite(p.lat) || Math.abs(p.lat) > 90 ||
          !Number.isFinite(p.lon) || Math.abs(p.lon) > 180 || ids.has(s.id) || streams.has(s.stream)) return false;
      ids.add(s.id); streams.add(s.stream); return true;
    });
  }
  function distance(place, station) {
    if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lon)) return Infinity;
    const rad = x => x * Math.PI / 180, p = station.location;
    const a = Math.sin(rad(p.lat - place.lat) / 2) ** 2 + Math.cos(rad(place.lat)) *
      Math.cos(rad(p.lat)) * Math.sin(rad(p.lon - place.lon) / 2) ** 2;
    return 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  }
  function scheduledProgram(schedule, now = Date.now(), hour12 = true) {
    if (!schedule || !(now < Date.parse(schedule.expiresAt)) || now < Date.parse(schedule.checkedAt)) return '';
    try {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:schedule.timezone,
        weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(now).map(p => [p.type,p.value]));
      const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday);
      const minute = day * 1440 + Number(parts.hour) * 60 + Number(parts.minute);
      const events = schedule.blocks.flatMap(block => block.days.flatMap(day => block.shows.map(([time,title]) => ({
        minute:day * 1440 + Number(time.split(':')[0]) * 60 + Number(time.split(':')[1]), title
      })))).sort((a,b) => a.minute - b.minute);
      // Duplicate adjacent weeks so overnight shows retain their real start/end.
      const timeline = [-10080,0,10080].flatMap(offset => events.map(e => ({...e,minute:e.minute+offset})));
      const next = timeline.findIndex(e => e.minute > minute);
      if (next < 1) return '';
      const show = timeline[next-1], end = timeline[next];
      const time = value => {
        const total = ((value % 1440) + 1440) % 1440, hours = Math.floor(total/60), minutes = total%60;
        return hour12 ? (hours%12 || 12) + (minutes ? ':' + String(minutes).padStart(2,'0') : '') + (hours<12?' AM':' PM')
          : String(hours).padStart(2,'0') + ':' + String(minutes).padStart(2,'0');
      };
      const zone = new Intl.DateTimeFormat('en-US',{timeZone:schedule.timezone,timeZoneName:'short'}).formatToParts(now).find(p=>p.type==='timeZoneName').value;
      return 'Scheduled: ' + show.title + ' · ' + time(show.minute) + '–' + time(end.minute) + ' ' + zone;
    } catch { return ''; }
  }
  function customStation(station) {
    if (!station?.custom || !String(station.id).startsWith('custom:') || !webURL(station.stream)) return null;
    return {id:String(station.id).slice(0,100), name:String(station.name || 'Custom stream').slice(0,240),
      stream:station.stream, custom:true, hls:station.hls===true, mpegts:station.mpegts===true,
      number:String(station.number || '').slice(0,30), group:String(station.group || '').slice(0,120),
      genre:'Custom playlist', callSign:'M3U'};
  }
  function createController({storage, makeAudio = () => new Audio(), fetchCatalog,
    startMedia = (media, station) => { media.src = station.stream; return media.play(); }, disposeMedia = () => {},
    later = setTimeout, cancel = clearTimeout} = {}) {
    let saved = {};
    try { saved = JSON.parse(storage?.getItem(storageKey) || '{}') || {}; } catch {}
    let custom = customStation(saved.customStation);
    let state = {stations: custom ? [custom] : [], loaded: false, loading: false, catalogError: '', stationId: saved.stationId || null,
      favorites: Array.isArray(saved.favorites) ? [...new Set(saved.favorites.filter(x => typeof x === 'string'))] : [],
      volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.5,
      muted: saved.muted === true,
      phase: 'idle', message: '', nowPlaying: ''};
    let audio = null, timeout = null, loading = null;
    const listeners = new Set();
    const snapshot = () => ({...state, favorites: [...state.favorites], stations: [...state.stations]});
    const emit = () => { for (const listener of listeners) listener(snapshot()); };
    const persist = () => { try { storage?.setItem(storageKey, JSON.stringify({stationId: state.stationId,
      favorites: state.favorites, volume: state.volume, muted: state.muted, customStation:custom})); } catch {} };
    function release() {
      cancel(timeout); timeout = null;
      const old = audio; audio = null;
      if (old) { disposeMedia(old); old.pause(); old.removeAttribute('src'); old.load(); }
    }
    function fail(current, message) {
      if (current !== audio) return;
      release(); state.phase = 'error'; state.message = message; state.nowPlaying = ''; emit();
    }
    function watch(current) {
      cancel(timeout);
      timeout = later(() => fail(current, 'This station is taking too long. Try again or choose another.'), 20000);
    }
    function play(id) {
      const station = state.stations.find(s => s.id === id);
      if (!station) return false;
      release(); state.stationId = id; state.phase = 'connecting'; state.message = 'Connecting…'; state.nowPlaying = ''; persist();
      const current = audio = makeAudio(station);
      current.preload = 'none'; current.volume = state.volume; current.muted = state.muted;
      current.addEventListener('playing', () => {
        if (current !== audio) return;
        cancel(timeout); state.phase = 'playing'; state.message = station.custom ? 'Playing' : 'Live stream'; emit();
      });
      current.addEventListener('waiting', () => {
        if (current !== audio) return;
        state.phase = 'connecting'; state.message = 'Buffering…'; watch(current); emit();
      });
      current.addEventListener('error', () => fail(current, 'Couldn’t play this station. Try again or choose another.'));
      current.addEventListener('ended', () => {
        if (current !== audio) return;
        if (!station.custom) return fail(current, 'The stream ended. Press Play to reconnect.');
        release(); state.phase = 'stopped'; state.message = 'Finished'; state.nowPlaying = ''; emit();
      });
      current.addEventListener('pause', () => {
        if (current !== audio || current.relocating) return;
        release(); state.phase = 'stopped'; state.message = 'Stopped'; state.nowPlaying = ''; emit();
      });
      watch(current); emit();
      try { Promise.resolve(startMedia(current, station)).catch(error => fail(current, error?.name === 'NotAllowedError'
        ? 'Press Play to allow audio in this browser.' : 'Couldn’t play this station. Try again or choose another.')); }
      catch { fail(current, 'Audio playback is unavailable. Try another station.'); }
      return true;
    }
    function stop() { release(); state.phase = 'stopped'; state.message = 'Stopped'; state.nowPlaying = ''; emit(); }
    async function load() {
      if (state.loaded) return snapshot();
      if (loading) return loading;
      state.loading = true; state.catalogError = ''; emit();
      loading = (async () => {
        try {
          const stations = catalogStations(await fetchCatalog());
          if (!stations.length) throw Error('empty catalog');
          state.stations = [...stations, ...(custom ? [custom] : [])];
          state.loaded = true;
          if (!state.stations.some(s => s.id === state.stationId)) state.stationId = null;
          state.favorites = state.favorites.filter(id => state.stations.some(s => s.id === id));
        } catch { state.catalogError = 'Station list unavailable. Try again.'; }
        finally { state.loading = false; loading = null; emit(); }
        return snapshot();
      })();
      return loading;
    }
    return {snapshot, load, play, stop,
      playCustom(station) {
        const candidate = customStation(station); if (!candidate) return false;
        custom = candidate; state.stations = [...state.stations.filter(s => !s.custom), custom];
        return play(custom.id);
      },
      mute() { state.muted = !state.muted; if (audio) audio.muted = state.muted; persist(); emit(); },
      nowPlaying(id, text) {
        if (id !== state.stationId || !['playing', 'connecting'].includes(state.phase)) return;
        const value = typeof text === 'string' ? text.slice(0, 240) : '';
        if (value !== state.nowPlaying) { state.nowPlaying = value; emit(); }
      },
      subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
      volume(value) {
        if (!Number.isFinite(value)) return;
        state.volume = Math.max(0, Math.min(1, value)); if (audio) audio.volume = state.volume; persist(); emit();
      },
      favorite(id) {
        if (!state.stations.some(s => s.id === id)) return;
        state.favorites = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id];
        persist(); emit();
      }
    };
  }
  window.RadioCore = {catalogStations, distance, scheduledProgram, createController};
})();
