// Fresh, muted headless browser; the user's playback/session is never touched.
const {chromium}=require('playwright'),assert=require('assert'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
  const context=await browser.newContext({viewport:{width:1920,height:720}});
  await context.addInitScript(()=>{
   if(!localStorage.getItem('m3u-test')){localStorage.setItem('m3u-test','1');localStorage.setItem('panel-layout',JSON.stringify({scores:'m3u'}));}
   window.mediaErrors=[];document.addEventListener('error',e=>{if(e.target instanceof HTMLMediaElement)mediaErrors.push(e.target.error?.message);},true);
   const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.loop=true;return play.call(this);};
  });
  const json={weather:{data:null},alerts:{data:{features:[]}},news:{local:{data:[]},national:{data:[]},world:{data:[]}},sports:{nfl:{data:{events:[]}},ncaa:{data:{events:[]}}}};
  await context.route('**/api/dashboard*',r=>r.fulfill({json}));
  const entries=[{id:'custom:video',name:'Test video',stream:'https://media.example/video.mp4',custom:true},
   {id:'custom:audio',name:'Test audio',stream:'https://media.example/audio.wav',custom:true},
   {id:'custom:broken',name:'Unavailable stream',stream:'https://media.example/missing.webm',custom:true},
   {id:'custom:markup',name:'<img src=x onerror=alert(1)>',stream:'https://media.example/other.webm',custom:true}];
  let releasePlaylist,releaseVideo;
  const playlistGate=new Promise(resolve=>releasePlaylist=resolve),videoGate=new Promise(resolve=>releaseVideo=resolve);
  await context.route('**/api/playlist',async r=>{
   const url=r.request().postDataJSON().url;
   if(url.includes('outdated'))return r.fulfill({status:404,json:{}});
   await playlistGate;
   await r.fulfill(url.includes('broken')?{status:400,json:{error:'No media URLs found.'}}:{json:{entries,skipped:0}});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:10000/',{waitUntil:'domcontentloaded'});
  await context.route('https://media.example/video.mp4',async r=>{await videoGate;await r.fulfill({contentType:'video/mp4',body:fs.readFileSync(path.join(__dirname,'fixtures/flower.mp4'))});});
  const wave=Buffer.alloc(44+8000*2);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(8000,24);wave.writeUInt32LE(16000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(wave.length-44,40);
  await context.route('https://media.example/audio.wav',r=>r.fulfill({contentType:'audio/wav',body:wave}));
  await context.route('https://media.example/missing.webm',r=>r.fulfill({status:404,body:'missing'}));
  const card=()=>page.locator('.slot-scores .m3u');
  const checkFullscreen=async(container,label)=>{
   const player=container.locator('.m3u-player'),button=player.locator('.m3u-fullscreen');
   const stage=await player.locator('.m3u-stage,.m3u-large-stage').boundingBox(),icon=await button.boundingBox();
   assert(icon.x>=stage.x&&icon.y>=stage.y&&icon.x+icon.width<=stage.x+stage.width&&icon.y+icon.height<=stage.y+stage.height,'Fullscreen sits inside the video');
   await player.locator('video').evaluate(v=>window.fullscreenMedia=v);
   await button.click();
   await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('m3u-player'));
   assert(await player.evaluate(p=>p===document.fullscreenElement));
   assert.equal(await button.getAttribute('aria-label'),'Exit video fullscreen');
   assert.equal(await page.locator('video').count(),1);
   assert(await player.locator('video').evaluate(v=>v===window.fullscreenMedia),'Fullscreen reuses the running decoder');
   const before=await page.evaluate(()=>fullscreenMedia.currentTime);
   await page.waitForFunction(t=>!fullscreenMedia.paused&&Math.abs(fullscreenMedia.currentTime-t)>.05,before);
   const bounds=await player.boundingBox(),size=page.viewportSize();
   assert(bounds.width>=size.width-1&&bounds.height>=size.height-1,JSON.stringify({label,bounds,size}));
   for(const control of ['.m3u-toggle','.m3u-select','.m3u-mute'])assert(await player.locator(control).isVisible());
   await page.screenshot({path:path.resolve('research/m3u-fullscreen-'+label+'.png')});
   await button.click();await page.waitForFunction(()=>!document.fullscreenElement?.classList.contains('m3u-player'));
   await page.waitForFunction(()=>[...document.querySelectorAll('.m3u-fullscreen')].every(b=>b.getAttribute('aria-pressed')==='false'));
   assert.equal(await button.getAttribute('aria-label'),'Fullscreen video');
   assert(await player.locator('video').evaluate(v=>v===window.fullscreenMedia&&!v.paused));
   await button.click();await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('m3u-player'));
   await button.press('Escape');await page.waitForFunction(()=>!document.fullscreenElement?.classList.contains('m3u-player'));
   assert(await player.locator('video').evaluate(v=>v===window.fullscreenMedia&&!v.paused),'Escape preserves playback');
  };
  await page.evaluate(url=>{void window.CustomM3U.loadPlaylist(url);},'https://example.com/outdated.m3u');
  await page.waitForFunction(()=>document.querySelector('.m3u-stage-label').textContent==='Playlist unavailable');
  assert(!(await card().locator('.m3u-spinner').isVisible()),'Errors do not leave a spinner running');
  await page.evaluate(url=>{void window.CustomM3U.loadPlaylist(url);},'https://example.com/list.m3u');
  assert(await card().locator('.m3u-spinner').isVisible());
  assert.equal(await card().locator('.m3u-stage').getAttribute('aria-busy'),'true');
  assert.equal(await card().locator('.m3u-stage-label').textContent(),'Loading playlist…');
  await card().screenshot({path:path.resolve('research/m3u-loading-playlist.png')});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await card().locator('.m3u-spinner').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  releasePlaylist();
  await page.waitForFunction(()=>document.querySelector('.m3u-select').options.length===5);
  assert(!(await card().locator('.m3u-spinner').isVisible()));
  assert.equal(await card().locator('.m3u-select img').count(),0,'Playlist labels are text');
  await card().locator('.m3u-select').selectOption('custom:video');
  assert(await card().locator('.m3u-spinner').isVisible());
  assert.equal(await card().locator('.m3u-stage-label').textContent(),'Connecting…');
  await page.evaluate(()=>window.CustomM3U.openPlayer());
  assert(await page.locator('#m3u-expanded .m3u-spinner').isVisible());
  await page.screenshot({path:path.resolve('research/m3u-loading-expanded.png')});
  await page.keyboard.press('Escape');releaseVideo();
  await page.waitForFunction(()=>radioService.snapshot().phase==='playing',null,{timeout:10000}).catch(async error=>{console.error(await page.evaluate(()=>({state:radioService.snapshot(),mediaErrors, videos:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,error:v.error?.message,ready:v.readyState,width:v.videoWidth}))})),errors);throw error;});
  await page.waitForFunction(()=>document.querySelector('.m3u-stage video')?.videoWidth>0);
  assert(!(await card().locator('.m3u-placeholder').isVisible()),'Loader clears when video plays');
  await card().locator('video').evaluate(v=>v.dispatchEvent(new Event('waiting')));
  assert.equal(await card().locator('.m3u-stage-label').textContent(),'Buffering…');
  assert(await card().locator('.m3u-spinner').isVisible());
  await card().locator('video').evaluate(v=>v.dispatchEvent(new Event('playing')));
  assert(!(await card().locator('.m3u-spinner').isVisible()));
  assert(!(await page.locator('#m3u-expanded').evaluate(e=>e.open)),'Video starts in the card');
  await page.evaluate(()=>window.originalMedia=document.querySelector('.m3u-stage video'));
  await checkFullscreen(card(),'corner');
  // Video fullscreen can nest inside the already-fullscreen dashboard.
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement===document.documentElement);
  await checkFullscreen(card(),'nested');
  assert(await page.evaluate(()=>document.fullscreenElement===document.documentElement));
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
  await page.screenshot({path:path.resolve('research/m3u-card-desktop.png')});
  await page.evaluate(()=>window.CustomM3U.openPlayer());
  assert(await page.locator('#m3u-expanded').evaluate(e=>e.open));
  assert(await page.locator('.m3u-large-stage video').evaluate(e=>e===window.originalMedia));
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing');
  await page.screenshot({path:path.resolve('research/m3u-expanded-desktop.png')});
  await checkFullscreen(page.locator('#m3u-expanded'),'expanded');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.slot-scores .m3u-stage video')===window.originalMedia);
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing');
  await page.locator('.radio-mini-mute').click();await page.locator('.radio-mini-quick-mute').click();await page.keyboard.press('Escape');assert(await page.evaluate(()=>originalMedia.muted));
  // Changing the corner preserves a single stream and the persistent controls.
  await page.locator('.slot-scores>.panel-gear').click();await page.locator('#panel-content').selectOption('quotes');
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing');
  await page.locator('.radio-mini-name').click();assert(await page.locator('#m3u-expanded').evaluate(e=>e.open));
  await page.keyboard.press('Escape');await page.locator('.radio-mini-toggle').click();
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'stopped');
  await page.locator('.slot-scores>.panel-gear').click();await page.locator('#panel-content').selectOption('m3u');
  assert(!(await card().locator('.m3u-spinner').isVisible()),'Stopped player does not show a loader');
  await card().locator('.m3u-toggle').click();await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
  await card().locator('.m3u-select').selectOption('custom:audio');await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
  assert(await card().locator('.m3u-placeholder').isVisible());
  assert((await card().locator('.m3u-placeholder').textContent()).includes('Test audio'));
  await page.evaluate(url=>{void window.CustomM3U.loadPlaylist(url);},'https://example.com/broken.m3u');
  await page.waitForFunction(()=>document.querySelector('.m3u-status').textContent==='No media URLs found.');
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing','Failed playlist load preserves playback');
  assert.equal(await card().locator('.m3u-select option').count(),5);
  await page.reload({waitUntil:'domcontentloaded'});await card().locator('.m3u-select option').nth(4).waitFor({state:'attached'});
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'idle','No autoplay after reload');
  assert.equal(await page.locator('#m3u-settings-url').inputValue(),'https://example.com/list.m3u');assert.equal(await card().locator('.m3u-form').count(),0);
  await card().locator('.m3u-select').selectOption('custom:broken');await page.waitForFunction(()=>radioService.snapshot().phase==='error');
  assert((await card().locator('.m3u-status').textContent()).includes('Could not play'));
  assert(!(await card().locator('.m3u-spinner').isVisible()));
  assert.equal(await card().locator('.m3u-stage-label').textContent(),'Stream unavailable');
  for(const size of [{width:1280,height:540},{width:1024,height:768},{width:390,height:844}]){
   await page.setViewportSize(size);
   const fit=await card().evaluate(e=>({h:e.clientHeight,sh:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth}));
   assert(fit.sh<=fit.h+2&&fit.sw<=fit.w+2,JSON.stringify({size,fit}));
  }
  await card().locator('.m3u-select').selectOption('custom:video');await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
  await page.evaluate(()=>window.CustomM3U.openPlayer());const box=await page.locator('#m3u-expanded').boundingBox();assert(box.x>=0&&box.x+box.width<=391);
  await page.keyboard.press('Escape');await page.setViewportSize({width:1920,height:720});
  await page.evaluate(()=>window.movingMedia=document.querySelector('.m3u-stage video'));
  const center=()=>page.locator('#center-media .m3u');
  const chooseCenter=async value=>{await page.locator('#clock-options').click();await page.locator('#center-content').selectOption(value);};
  const chooseCorner=async (slot,value)=>{await page.locator(`.slot-${slot}>.panel-gear`).click();await page.locator('#panel-content').selectOption(value);};
  const assertSinglePlayer=async selector=>{
   assert.equal(await page.locator('.m3u').count(),1,'Only one M3U card is allowed');
   assert.equal(await page.locator('video').count(),1,'Only one decoder/media element exists');
   assert(await page.locator(selector+' video').evaluate(v=>v===window.movingMedia),'Moving cards preserves the playing stream');
   assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing');
  };
  await chooseCenter('m3u');await assertSinglePlayer('#center-media');
  await checkFullscreen(center(),'center');
  assert(await page.locator('.slot-scores>.scores').isVisible(),'Previous corner returns to its regular card');
  for(const selector of ['#digital','#calendar-toggle','#open-alarm','#open-home'])assert(await page.locator(selector).isVisible());
  await page.locator('#calendar-toggle').click();
  assert(await page.locator('#calendar-view').isVisible());assert(!(await center().isVisible()));
  assert.equal(await page.locator('#calendar-back').getAttribute('aria-label'),'Return to Custom M3U');
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing');
  await page.locator('#calendar-back').click();await assertSinglePlayer('#center-media');
  await page.evaluate(()=>window.CustomM3U.openPlayer());
  assert(await page.locator('.m3u-large-stage video').evaluate(v=>v===window.movingMedia));
  await page.keyboard.press('Escape');await assertSinglePlayer('#center-media');
  await page.screenshot({path:path.resolve('research/m3u-center-desktop.png')});
  await chooseCenter('system');assert.equal(await page.locator('.m3u').count(),0);
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing');
  const continuesPlaying=async()=>{
   const before=await page.evaluate(()=>window.movingMedia.currentTime);
   await page.waitForFunction(previous=>!window.movingMedia.paused&&Math.abs(window.movingMedia.currentTime-previous)>.05,before,{timeout:3000});
  };
  await continuesPlaying();
  await chooseCenter('m3u');await assertSinglePlayer('#center-media');
  await center().locator('.m3u-select').selectOption('custom:audio');
  await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
  await page.evaluate(()=>window.movingMedia=document.querySelector('#center-media video'));
  await page.locator('#calendar-toggle').click();await continuesPlaying();
  await page.locator('#calendar-back').click();
  await chooseCenter('system');await continuesPlaying();
  await page.locator('.radio-mini-toggle').click();assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'stopped');
  await page.locator('.radio-mini-toggle').click();await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
  await page.evaluate(()=>window.movingMedia=document.querySelector('video'));
  await continuesPlaying();await chooseCenter('m3u');await assertSinglePlayer('#center-media');
  await center().locator('.m3u-select').selectOption('custom:video');await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
  await page.evaluate(()=>window.movingMedia=document.querySelector('#center-media video'));
  await chooseCorner('weather','m3u');await assertSinglePlayer('.slot-weather');
  assert.equal(await page.evaluate(()=>preferences.centerContent),'clock');
  assert(await page.locator('.clock-wrap').isVisible());
  await chooseCorner('news','m3u');await assertSinglePlayer('.slot-news');
  assert(await page.locator('.slot-weather>.weather').isVisible());
  await chooseCenter('m3u');await assertSinglePlayer('#center-media');
  for(const size of [{width:1280,height:540},{width:1024,height:768},{width:390,height:844}]){
   await page.setViewportSize(size);
   const fit=await center().evaluate(e=>({h:e.clientHeight,sh:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth}));
   assert(fit.sh<=fit.h+2&&fit.sw<=fit.w+2,JSON.stringify({center:true,size,fit}));
   const stage=await center().locator('.m3u-stage').boundingBox();assert(stage.height>=45);
   const controls=await center().locator('.m3u-controls').boundingBox(),clock=await page.locator('#calendar-toggle').boundingBox();
   assert(controls.y+controls.height<=clock.y,'Playback controls stay above the clock');
   assert(await page.locator('#open-alarm').isVisible());assert(await page.locator('#open-home').isVisible());
  }
  await page.locator('#clock-panel').screenshot({path:path.resolve('research/m3u-center-mobile.png')});
  // Older saved layouts may have duplicates; center wins without starting playback.
  await page.evaluate(()=>localStorage.setItem('panel-layout',JSON.stringify({weather:'m3u',news:'m3u'})));
  await page.reload({waitUntil:'domcontentloaded'});await center().waitFor();
  assert.equal(await page.locator('.m3u').count(),1);
  assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'idle');
  assert.equal(await page.locator('#center-content').inputValue(),'m3u');
  assert.equal(await center().locator('.m3u-select option').count(),5);
  // If the center is a clock, retain just the first saved M3U corner.
  await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('dashboard-preferences'));p.centerContent='clock';localStorage.setItem('dashboard-preferences',JSON.stringify(p));localStorage.setItem('panel-layout',JSON.stringify({weather:'m3u',news:'m3u'}));});
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.slot-weather .m3u').waitFor();
  assert.equal(await page.locator('.m3u').count(),1);
  assert.deepEqual(errors,[]);
  console.log('PASS: M3U loading, playback, errors, persistence, single-player moves between center/corners, calendar return, expand/collapse, clock controls, old-layout cleanup, and responsive center/corner layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
