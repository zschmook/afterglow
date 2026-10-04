(() => {
  if (embeddedPanel) return;
  const service = window.radioService, cards = new Map();
  const active = state => ['playing','connecting'].includes(state.phase);
  const safe = value => { try { const u=new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } };
  const clean = entries => (Array.isArray(entries) ? entries : []).slice(0,2000)
    .filter(s => s?.custom && typeof s.id==='string' && s.id.startsWith('custom:') && safe(s.stream))
    .map(s => ({id:s.id,name:String(s.name || 'Custom stream').slice(0,240),stream:s.stream,custom:true,hls:s.hls===true,
      mpegts:s.mpegts===true,number:String(s.number || '').slice(0,30),group:String(s.group || '').slice(0,120)}));
  let saved={}; try { saved=JSON.parse(localStorage.getItem('dashboard-m3u') || '{}') || {}; } catch {}
  let playlist={url:safe(saved.url)?saved.url:'',entries:clean(saved.entries)}, loading=false, error='', notice='';
  let request, media=null, hostCard=null, hlsLibrary, tsLibrary, changingChannel=false;
  const dock=document.createElement('div');dock.hidden=true;document.body.append(dock);
  const dialog=document.createElement('dialog');dialog.className='m3u-expanded';dialog.id='m3u-expanded';
  dialog.setAttribute('aria-labelledby','m3u-expanded-title');
  dialog.innerHTML='<div class="dialog-heading"><h2 id="m3u-expanded-title">Custom stream</h2><button class="m3u-collapse" aria-label="Collapse video" title="Return to card">×</button></div><div class="m3u-large-stage"></div><div class="m3u-expanded-controls"><button class="m3u-toggle" aria-label="Start media">▶</button><button class="m3u-mute" aria-label="Mute media"></button><span class="m3u-player-status" role="status"></span></div>';
  document.body.append(dialog);
  const expandedSelect=document.createElement('select');expandedSelect.className='m3u-select';
  expandedSelect.setAttribute('aria-label','Choose channel');
  dialog.querySelector('.m3u-expanded-controls').insertBefore(expandedSelect,dialog.querySelector('.m3u-mute'));
  expandedSelect.onchange=()=>chooseChannel(expandedSelect.value,hostCard);
  const largeStage=dialog.querySelector('.m3u-large-stage');
  const largeMessage=stageMessage(largeStage);
  const largePlayer=fullscreenPlayer(largeStage,dialog.querySelector('.m3u-expanded-controls'));
  const speaker='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="m3u-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="m3u-silent" d="m15 9 6 6m0-6-6 6"/></svg>';
  dialog.querySelector('.m3u-mute').innerHTML=speaker;
  dialog.querySelector('.m3u-mute').onclick=()=>service.mute();
  dialog.querySelector('.m3u-toggle').onclick=()=>toggle(hostCard);
  dialog.querySelector('.m3u-collapse').onclick=()=>dialog.close();

  function fullscreenElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function updateFullscreenButtons() {
    for(const button of document.querySelectorAll('.m3u-fullscreen')){
      const player=button.closest('.m3u-player'),full=fullscreenElement();
      const expanded=!!full&&(full===player||player.contains(full));
      button.setAttribute('aria-pressed',String(expanded));
      button.setAttribute('aria-label',expanded?'Exit video fullscreen':'Fullscreen video');
      button.title=expanded?'Exit fullscreen':'Fullscreen video';
    }
  }
  async function exitVideoFullscreen() {
    if(document.exitFullscreen)await document.exitFullscreen();
    else if(document.webkitExitFullscreen)await document.webkitExitFullscreen();
  }
  function fullscreenPlayer(stage,controls) {
    // Fullscreen an ordinary element: browsers cannot fullscreen a dialog itself.
    const player=document.createElement('div');player.className='m3u-player';
    stage.before(player);player.append(stage,controls);
    const button=document.createElement('button');button.type='button';button.className='m3u-fullscreen';
    button.setAttribute('aria-label','Fullscreen video');button.setAttribute('aria-pressed','false');button.title='Fullscreen video';
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path class="m3u-fullscreen-enter" d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/><path class="m3u-fullscreen-exit" d="M4 9h5V4m11 5h-5V4M9 20v-5H4m11 5v-5h5"/></svg>';
    stage.append(button);
    button.onclick=async()=>{
      try {
        const full=fullscreenElement();
        if(full===player||(full&&player.contains(full)))await exitVideoFullscreen();
        else if(player.requestFullscreen)await player.requestFullscreen();
        else if(player.webkitRequestFullscreen)await player.webkitRequestFullscreen();
        else if(media&&stage.contains(media)&&media.webkitEnterFullscreen)media.webkitEnterFullscreen();
        else throw Error('Fullscreen unavailable');
        updateFullscreenButtons();
      }catch{notice='Fullscreen is unavailable in this browser.';render();}
    };
    player.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&fullscreenElement()===player){
        event.preventDefault();event.stopPropagation();exitVideoFullscreen().catch(()=>{});
      }
    });
    return player;
  }
  document.addEventListener('fullscreenchange',updateFullscreenButtons);
  document.addEventListener('webkitfullscreenchange',updateFullscreenButtons);

  function stageMessage(stage) {
    const placeholder=document.createElement('div');placeholder.className='m3u-placeholder';
    placeholder.setAttribute('role','status');placeholder.setAttribute('aria-live','polite');placeholder.setAttribute('aria-atomic','true');
    placeholder.innerHTML='<span class="m3u-spinner" aria-hidden="true" hidden></span><span class="m3u-stage-label"></span><span class="m3u-stage-detail" hidden></span>';
    stage.append(placeholder);
    return {stage,placeholder,spinner:placeholder.querySelector('.m3u-spinner'),label:placeholder.querySelector('.m3u-stage-label'),detail:placeholder.querySelector('.m3u-stage-detail')};
  }
  function renderStage(ui,state,selected,expanded=false) {
    const isCustom=selected?.custom, connecting=isCustom&&state.phase==='connecting';
    const ownVideo=!!media&&ui.stage.contains(media)&&media.videoWidth>0;
    const streamError=isCustom&&state.phase==='error';
    let text='',detail='',busy=false;
    if(loading){text='Loading playlist…';detail='Finding channels';busy=true;}
    else if(connecting){text=media?.hasPlayed&&state.message==='Buffering…'?'Buffering…':'Connecting…';detail=selected.name;busy=true;}
    else if(error&&!media){text='Playlist unavailable';detail=error;}
    else if(streamError){text='Stream unavailable';detail='Try again or choose another channel.';}
    else if(media&&isCustom){text=ownVideo?'':!expanded&&dialog.open?'Playing in expanded view':media.videoWidth?'Playing in another card':'♪ '+selected.name;}
    else text=playlist.entries.length?'Choose a stream below':'Set your playlist URL in Settings → Media';
    ui.stage.setAttribute('aria-busy',String(busy));
    ui.placeholder.hidden=!text;ui.spinner.hidden=!busy;
    ui.placeholder.classList.toggle('m3u-loading',busy);
    ui.label.textContent=text;ui.detail.textContent=detail;ui.detail.hidden=!detail;
  }

  function moveMedia(target) {
    if (!media || media.parentElement===target) return;
    const current=media, resume=!current.paused;
    current.relocating=true;
    if (target.moveBefore && current.isConnected) target.moveBefore(current,null);
    else target.append(current);
    requestAnimationFrame(async()=>{
      if (resume && media===current && !current.cancelled && active(service.snapshot())) {
        try { await current.play(); } catch {}
      }
      current.relocating=false;
    });
  }
  function cardStage() { return cards.get(hostCard)?.stage || cards.values().next().value?.stage || dock; }
  dialog.addEventListener('close',()=>{
    if(fullscreenElement()===largePlayer)exitVideoFullscreen().catch(()=>{});
    moveMedia(cardStage());render();
  });
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){
    event.preventDefault();
    if(fullscreenElement()===largePlayer)exitVideoFullscreen().catch(()=>{});
    else dialog.close();
  }});

  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (!hlsLibrary) hlsLibrary=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='/assets/vendor/hls/hls-1.6.13.min.js';
      script.onload=()=>resolve(window.Hls);script.onerror=()=>{script.remove();hlsLibrary=null;reject(Error('HLS unavailable'));};
      document.head.append(script);
    });
    return hlsLibrary;
  }
  function loadTs() {
    if(window.mpegts)return Promise.resolve(window.mpegts);
    if(!tsLibrary)tsLibrary=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='/assets/vendor/mpegts/mpegts-1.8.0.min.js';
      script.onload=()=>resolve(window.mpegts);script.onerror=()=>{script.remove();tsLibrary=null;reject(Error('MPEG-TS unavailable'));};
      document.head.append(script);
    });
    return tsLibrary;
  }
  function chooseChannel(id,card) {
    const item=playlist.entries.find(s=>s.id===id);if(!item)return;
    hostCard=card;changingChannel=true;
    try{service.playCustom(item);}finally{changingChannel=false;}
  }
  function populateChannels(select,selected) {
    if(select.playlistEntries!==playlist.entries){
      select.replaceChildren(new Option('Choose channel…',''));
      const groups=new Map();
      for(const item of playlist.entries){
        let parent=select;
        if(item.group){
          if(!groups.has(item.group)){
            const group=document.createElement('optgroup');group.label=item.group;select.append(group);groups.set(item.group,group);
          }
          parent=groups.get(item.group);
        }
        parent.append(new Option((item.number?item.number+' · ':'')+item.name,item.id));
      }
      select.playlistEntries=playlist.entries;
    }
    select.disabled=!playlist.entries.length;
    select.value=playlist.entries.some(s=>s.id===selected?.id)?selected.id:'';
  }
  function toggle(card) {
    const state=service.snapshot(), selected=state.stations.find(s=>s.id===state.stationId);
    if (active(state) && selected?.custom) service.stop();
    else {
      hostCard=cards.has(card)?card:hostCard;
      const entry=playlist.entries.find(s=>s.id===cards.get(card)?.select.value) || (selected?.custom?selected:null);
      if(entry)service.playCustom(entry);else cards.get(card)?.select.focus();
    }
  }
  function openPlayer(card) {
    if (cards.has(card)) hostCard=card;
    const state=service.snapshot(), selected=state.stations.find(s=>s.id===state.stationId);
    if (!selected?.custom) return;
    dialog.querySelector('h2').textContent=selected.name;
    if(!dialog.open)dialog.showModal();
    moveMedia(largeStage);render();
  }
  async function loadPlaylist(url, card) {
    if(!safe(url)){error='Enter an HTTP or HTTPS playlist URL.';render();return;}
    request?.abort();const current=request=new AbortController();
    loading=true;error='';notice='';render();
    const timeout=setTimeout(()=>current.abort(),35000);
    try {
      const response=await fetch('/api/playlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:current.signal});
      if(response.status===404)throw Error('Playlist loading needs the updated dashboard server.');
      const result=await response.json();
      if(!response.ok)throw Error(result.error || 'Could not load that playlist.');
      const entries=clean(result.entries);if(!entries.length)throw Error('No playable URLs were found.');
      playlist={url,entries};if(card)hostCard=card;
      notice=result.skipped?result.skipped+' unsupported entries skipped.':'';
      try {localStorage.setItem('dashboard-m3u',JSON.stringify(playlist));}
      catch {notice='Loaded. This playlist is too large to remember in this browser.';}
      for(const ui of cards.values()){ui.signature='';}
      const settingsInput=document.getElementById('m3u-settings-url');
      if(settingsInput)settingsInput.value=url;
    } catch(e) {if(request===current)error=e.name==='AbortError'?'Playlist request timed out. Try again.':e.message;}
    finally {clearTimeout(timeout);if(request===current){loading=false;render();}}
  }
  function render() {
    const state=service.snapshot(), selected=state.stations.find(s=>s.id===state.stationId), isCustom=selected?.custom;
    const running=isCustom&&active(state);
    const message=isCustom&&state.phase==='connecting'&&!media?.hasPlayed?'Connecting…':state.message;
    const status=error || (loading?'Loading playlist…':isCustom&&state.phase==='error'?'Could not play this stream. Its format or access settings may not work in this browser.':notice || (isCustom?message:'') || '');
    const settingsStatus=document.getElementById('m3u-settings-status');
    if(settingsStatus)settingsStatus.textContent=error || (loading?'Loading playlist…':notice || (playlist.entries.length?playlist.entries.length+' channels saved in this browser.':'Enter an M3U playlist URL.'));
    for(const [card,ui] of cards){
      populateChannels(ui.select,selected);
      ui.count.textContent=playlist.entries.length?playlist.entries.length+' ENTRIES':'M3U';
      ui.status.textContent=status;ui.status.title=status;ui.status.classList.toggle('radio-error',!!error||state.phase==='error');
      ui.toggle.textContent=running?'■':'▶';ui.toggle.disabled=!isCustom&&!ui.select.value;
      ui.toggle.setAttribute('aria-label',running?'Stop media':'Start media');ui.toggle.title=running?'Stop media':'Start media';
      ui.mute.setAttribute('aria-pressed',String(state.muted));ui.mute.setAttribute('aria-label',state.muted?'Unmute media':'Mute media');
      renderStage(ui,state,selected);
      ui.stage.classList.toggle('m3u-audio',!!media&&!media.videoWidth);
    }
    renderStage(largeMessage,state,selected,true);
    populateChannels(expandedSelect,selected);
    dialog.querySelector('.m3u-toggle').textContent=running?'■':'▶';
    dialog.querySelector('.m3u-toggle').setAttribute('aria-label',running?'Stop media':'Start media');
    dialog.querySelector('.m3u-mute').setAttribute('aria-pressed',String(state.muted));
    dialog.querySelector('.m3u-mute').setAttribute('aria-label',state.muted?'Unmute media':'Mute media');
    dialog.querySelector('.m3u-player-status').textContent=status;
  }
  window.CustomM3U={
    loadPlaylist,
    mount(card){
      card.innerHTML='<div class="panel-heading"><h2>CUSTOM M3U</h2><span class="m3u-count">M3U</span></div><div class="m3u-stage"></div><div class="m3u-controls"><button class="m3u-toggle" aria-label="Start media">▶</button><select class="m3u-select" aria-label="Choose playlist entry"></select><button class="m3u-mute" aria-label="Mute media"></button></div><p class="m3u-status" role="status"></p>';
      const q=s=>card.querySelector(s),ui={...stageMessage(q('.m3u-stage')),select:q('.m3u-select'),toggle:q('.m3u-toggle'),mute:q('.m3u-mute'),status:q('.m3u-status'),count:q('.m3u-count')};
      fullscreenPlayer(ui.stage,q('.m3u-controls'));
      cards.set(card,ui);
      ui.select.onchange=()=>chooseChannel(ui.select.value,card);
      ui.toggle.onclick=()=>toggle(card);ui.mute.innerHTML=speaker;ui.mute.onclick=()=>service.mute();
      if(!hostCard||!cards.has(hostCard)){hostCard=card;if(!dialog.open)moveMedia(ui.stage);}
      render();
    },
    unmount(card){
      const ui=cards.get(card);if(!ui)return;
      cards.delete(card);if(hostCard===card)hostCard=cards.keys().next().value||null;
      if(media&&ui.stage.contains(media))moveMedia(cardStage());render();
    },
    createMedia(station){
      const current=document.createElement('video');current.className='m3u-video';current.playsInline=true;current.hidden=true;
      current.setAttribute('aria-label',station.name);current.dataset.stationId=station.id;
      current.request=new AbortController();media=current;(dialog.open?largeStage:cardStage()).append(current);
      current.addEventListener('loadedmetadata',()=>{current.hidden=!current.videoWidth;if(media===current)render();});
      current.addEventListener('playing',()=>{current.hasPlayed=true;});
      dialog.querySelector('h2').textContent=station.name;
      return current;
    },
    async startMedia(current,station){
      if(!station.hls && (station.mpegts || /\.(?:ts|m2ts)$|\/mpegts$/i.test(new URL(station.stream).pathname))){
        const ts=await loadTs();if(current.cancelled)return;
        if(!ts.getFeatureList().mseLivePlayback)throw Error('MPEG-TS is unsupported');
        const response=await fetch('/api/media',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({url:station.stream}),signal:current.request.signal});
        if(!response.ok)throw Error('Could not open stream');
        const result=await response.json();if(current.cancelled)return;
        if(typeof result.url!=='string'||!/^\/api\/media\/[\w-]+$/.test(result.url))throw Error('Invalid stream response');
        ts.LoggingControl.enableAll=false;
        const player=current.ts=ts.createPlayer({type:'mpegts',isLive:true,url:result.url},
          {enableWorker:false,lazyLoad:false,autoCleanupSourceBuffer:true,autoCleanupMaxBackwardDuration:15,autoCleanupMinBackwardDuration:5});
        player.on(ts.Events.ERROR,()=>{if(!current.cancelled)current.dispatchEvent(new Event('error'));});
        player.attachMediaElement(current);player.load();
      }else if(station.hls){
        const Hls=await loadHls();if(current.cancelled)return;
        if(Hls.isSupported()){
          const hls=current.hls=new Hls({maxBufferLength:20,backBufferLength:0});
          hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal&&!current.cancelled)current.dispatchEvent(new Event('error'));});
          hls.loadSource(station.stream);hls.attachMedia(current);
        }else if(current.canPlayType('application/vnd.apple.mpegurl'))current.src=station.stream;
        else throw Error('HLS is unsupported');
      }else current.src=station.stream;
      if(!current.cancelled)return current.play();
    },
    disposeMedia(current){
      current.cancelled=true;current.request?.abort();current.hls?.destroy();current.ts?.destroy();
      if(media===current){media=null;current.remove();if(dialog.open&&!changingChannel)dialog.close();}
    },
    openPlayer
  };
  service.subscribe(render);
  const settingsInput=document.getElementById('m3u-settings-url');
  if(settingsInput)settingsInput.value=playlist.url;
})();
