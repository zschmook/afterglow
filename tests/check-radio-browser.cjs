// Isolated headless browser; no existing browser profile or user playback is touched.
const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
function silentWave(){
 const samples=8000*60,buffer=Buffer.alloc(44+samples*2);
 buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);
 buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);
 buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);return buffer;
}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
 const context=await browser.newContext({viewport:{width:1920,height:720},hasTouch:true}),errors=[];
 await context.addInitScript(()=>{
   if(!localStorage.getItem('radio-test-initialized')){
     localStorage.setItem('radio-test-initialized','1');
     localStorage.setItem('dashboard-preferences',JSON.stringify({place:{name:'Lititz, PA',zip:'17543',lat:40.1573,lon:-76.3069,timezone:'America/New_York'}}));
     localStorage.setItem('panel-layout',JSON.stringify({scores:'radio'}));
   }
 });
 await context.route('**/api/dashboard*',route=>route.fulfill({json:{
   weather:{data:null},alerts:{data:{features:[]}},
   news:{local:{data:[]},national:{data:[]},world:{data:[]}},
   sports:{nfl:{data:{events:[]}},ncaa:{data:{events:[]}}}
 }}));
 await context.route('**/api/quotes',route=>route.fulfill({json:{data:[{text:'A quiet test.',author:'Test'}]}}));
 const schedules=structuredClone(require('../assets/radio-schedules.json'));
 schedules.witf.checkedAt=new Date(Date.now()-86400000).toISOString();
 schedules.witf.expiresAt=new Date(Date.now()+86400000).toISOString();
 await context.route('**/assets/radio-schedules.json',route=>route.fulfill({json:schedules}));
 let staleMetadata=false;
 await context.route('https://np.tritondigital.com/**',route=>route.fulfill({contentType:'text/xml',body:`<nowplaying-info-list><nowplaying-info timestamp="${Math.floor(Date.now()/1000)-(staleMetadata?86400:0)}"><property name="cue_title">Test song</property><property name="track_artist_name">Test artist</property><property name="cue_time_duration">3:30</property></nowplaying-info></nowplaying-info-list>`}));
 const wave=silentWave();
 const catalog=require('../assets/radio-stations.json');
 for(const station of catalog.stations)await context.route(station.stream,route=>route.fulfill({status:200,contentType:'audio/wav',body:wave}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:10000/',{waitUntil:'domcontentloaded'});
 const radio=()=>page.frameLocator('iframe[title="Radio"]').first();
 await radio().locator('.radio-toggle:not([disabled])').waitFor();
 await radio().locator('.radio-browse').click();
 assert(await page.locator('#radio-browser').evaluate(e=>e.open));
 assert.equal(await page.locator('.radio-station-row').count(),catalog.stations.length);
 await page.locator('#radio-search').fill('WITF');assert.equal(await page.locator('.radio-station-row').count(),1);
 await page.locator('.radio-station-row .radio-star').click();
 await page.locator('.radio-station-choose').click();
 await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
 await page.waitForFunction(()=>radioService.snapshot().nowPlaying==='Test artist — Test song');
 assert(!(await page.locator('#radio-browser').evaluate(e=>e.open)));
 assert.equal(await radio().locator('.radio-toggle').textContent(),'■');
 await radio().locator('.radio-volume input').fill('24');
 assert.equal(await page.evaluate(()=>radioService.snapshot().volume),.24);
 await radio().locator('.radio-browse').click();await page.locator('#radio-search').fill('');
 await page.screenshot({path:path.join(root,'research/radio-browser-desktop.png')});
 await page.locator('#radio-favorites-only').click();assert.equal(await page.locator('.radio-station-row').count(),1);
 await page.locator('#radio-favorites-only').click();
 await page.locator('#radio-radius').selectOption('50');assert((await page.locator('.radio-station-row').count())<catalog.stations.length);
 await page.locator('#radio-search').fill('station-that-does-not-exist');assert(await page.locator('#radio-browser-empty').isVisible());
 await page.keyboard.press('Escape');assert(!(await page.locator('#radio-browser').evaluate(e=>e.open)));
 await page.screenshot({path:path.join(root,'research/radio-card-desktop.png')});
 // Removing a card while playing keeps the sole parent audio and an accessible Stop.
 await page.locator('.slot-scores > .panel-gear').click();await page.locator('#panel-content').selectOption('quotes');
 assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing');
 assert(await page.locator('.radio-mini-toggle').isVisible());
 assert(!(await page.locator('#radio-mini-volume').isVisible()));
 await page.locator('.radio-mini-mute').click();
 const popup=page.locator('#radio-mini-volume'),slider=page.locator('.radio-mini-volume-slider');
 await popup.waitFor({state:'visible'});await page.waitForTimeout(180);
 const popupBox=await popup.boundingBox(),speakerBox=await page.locator('.radio-mini-mute').boundingBox();
 assert(popupBox.y+popupBox.height<=speakerBox.y,'Volume opens above the speaker');
 assert(Math.abs(popupBox.x+popupBox.width/2-speakerBox.x-speakerBox.width/2)<2,'Volume aligns with the speaker');
 // Pointer motion on the vertical track raises the actual shared player volume.
 const track=await slider.boundingBox();
 await page.mouse.move(track.x+track.width/2,track.y+track.height*.7);await page.mouse.down();
 await page.mouse.move(track.x+track.width/2,track.y+track.height*.3,{steps:8});await page.mouse.up();
 assert(await page.evaluate(()=>radioService.snapshot().volume>.6));
 await slider.fill('37');assert.equal(await page.evaluate(()=>radioService.snapshot().volume),.37);
 assert.equal(await page.locator('.radio-mini-volume-level').textContent(),'37%');
 await page.locator('.radio-mini-quick-mute').click();assert.equal(await page.evaluate(()=>radioService.snapshot().muted),true);
 await slider.fill('38');assert.equal(await page.evaluate(()=>radioService.snapshot().muted),false,'Moving the slider unmutes');
 await slider.press('ArrowUp');assert.equal(await page.evaluate(()=>radioService.snapshot().volume),.39);
 await slider.fill('24');
 await page.screenshot({path:path.join(root,'research/radio-volume-desktop.png')});
 await page.locator('.radio-mini-quick-mute').click();await page.keyboard.press('Escape');
 assert(!(await popup.isVisible()));assert.equal(await page.evaluate(()=>radioService.snapshot().muted),true);
 assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing');
 assert((await page.locator('.radio-mini-ticker').textContent()).includes('Harrisburg, PA'));
 await page.evaluate(()=>radioService.nowPlaying('witf','A longer program title to exercise the scrolling station information with a detailed description and upcoming news from around the region'));
 await page.locator('.radio-mini-scrolls').waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.radio-mini-ticker').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.screenshot({path:path.join(root,'research/radio-strip-desktop.png')});
 const clock=await page.locator('.clock-panel').boundingBox(),strip=await page.locator('.radio-mini').boundingBox();
 assert(Math.abs(clock.x-strip.x)<2&&Math.abs(clock.width-strip.width)<2,'Strip aligns with center panel');
 await page.locator('.radio-mini-toggle').click();assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'stopped');
 assert(await page.locator('.radio-mini').isVisible(),'Stopped station stays available');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.radio-mini:not([hidden])').waitFor();
 assert.equal(await page.locator('iframe[title="Radio"]').count(),0);
 assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'idle');
 await page.locator('.radio-mini-toggle').click();await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
 assert.equal(await page.evaluate(()=>radioService.snapshot().stationId),'witf');
 await page.locator('.radio-mini-mute').click();await page.locator('.radio-mini-quick-mute').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>radioService.snapshot().muted),false);
 await page.locator('.radio-mini-toggle').click();
 await page.locator('.slot-scores > .panel-gear').click();await page.locator('#panel-content').selectOption('radio');
 await radio().locator('.radio-toggle').waitFor();
 await page.locator('.slot-forecast > .panel-gear').click();await page.locator('#panel-content').selectOption('radio');
 await page.waitForFunction(()=>document.querySelectorAll('iframe[title="Radio"]').length===2);
 await radio().locator('.radio-toggle').click();await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
 const frames=page.frames().filter(f=>f.url().includes('panel=radio'));
 for(const frame of frames){await frame.locator('.radio-toggle').waitFor();assert.equal(await frame.locator('.radio-toggle').textContent(),'■');}
 staleMetadata=true;await radio().locator('.radio-toggle').click();await radio().locator('.radio-toggle').click();
 await page.waitForFunction(()=>radioService.snapshot().phase==='playing');await page.waitForTimeout(100);
 assert((await page.evaluate(()=>radioService.snapshot().nowPlaying)).startsWith('Scheduled:'),'Stale tracks fall back to the published schedule');
 await page.reload({waitUntil:'domcontentloaded'});await radio().locator('.radio-toggle:not([disabled])').waitFor();
 assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'idle');
 assert.equal(await page.evaluate(()=>radioService.snapshot().volume),.24);
 assert((await page.evaluate(()=>radioService.snapshot().favorites)).includes('witf'));
 for(const size of [{width:1920,height:540},{width:1280,height:720},{width:1280,height:540},{width:390,height:844}]){
   await page.setViewportSize(size);await page.waitForTimeout(150);
   const frame=page.frames().find(f=>f.url().includes('panel=radio'));
   const dimensions=await frame.evaluate(()=>{const c=document.querySelector('.radio');return {h:c.clientHeight,sh:c.scrollHeight,w:c.clientWidth,sw:c.scrollWidth};});
   assert(dimensions.sh<=dimensions.h+2,JSON.stringify({size,dimensions}));assert(dimensions.sw<=dimensions.w+2,JSON.stringify({size,dimensions}));
 }
 await radio().locator('.radio-browse').click();await page.locator('#radio-search').fill('');
 await page.screenshot({path:path.join(root,'research/radio-browser-mobile.png')});
 const rect=await page.locator('#radio-browser').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=391);
 await page.keyboard.press('Escape');await radio().locator('.radio-toggle').click();
 await page.waitForFunction(()=>radioService.snapshot().phase==='playing');
 assert(await page.locator('.radio-mini-toggle').isVisible());
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile footer must fit while playing');
 await page.locator('.radio-mini-mute').tap();await popup.waitFor({state:'visible'});await page.waitForTimeout(180);
 const mobilePopup=await popup.boundingBox(),touchTrack=await slider.boundingBox();
 assert(mobilePopup.x>=0&&mobilePopup.y>=0&&mobilePopup.x+mobilePopup.width<=390&&mobilePopup.y+mobilePopup.height<=844,'Volume popup fits the touch viewport');
 await page.touchscreen.tap(touchTrack.x+touchTrack.width/2,touchTrack.y+touchTrack.height*.8);
 const lowerVolume=await page.evaluate(()=>radioService.snapshot().volume);
 await page.touchscreen.tap(touchTrack.x+touchTrack.width/2,touchTrack.y+touchTrack.height*.2);
 assert(await page.evaluate(lower=>radioService.snapshot().volume>lower+.4,lowerVolume),'Touching higher on the track raises volume');
 await page.screenshot({path:path.join(root,'research/radio-volume-mobile.png')});
 await page.locator('#sync-status').tap();assert(!(await popup.isVisible()),'Outside tap dismisses volume');
 assert.equal(await page.evaluate(()=>radioService.snapshot().phase),'playing','Closing volume preserves playback');
 await page.locator('.radio-mini-toggle').click();
 await page.setViewportSize({width:1280,height:540});await page.evaluate(()=>scale(140));
 await page.waitForTimeout(250);await radio().locator('.radio-toggle:not([disabled])').waitFor();
 for(const frame of page.frames().filter(f=>f.url().includes('panel=radio'))){
   const fit=await frame.evaluate(()=>{const c=document.querySelector('.radio'),cs=getComputedStyle(c);return {h:c.clientHeight,sh:c.scrollHeight,w:c.clientWidth,padding:cs.padding,gap:cs.gap,children:[...c.children].map(e=>({class:e.className,h:e.getBoundingClientRect().height,y:e.offsetTop,mt:getComputedStyle(e).marginTop,mb:getComputedStyle(e).marginBottom,scroll:e.scrollHeight}))};});
   assert(fit.sh<=fit.h+2,'Large interface setting: '+JSON.stringify(fit));
 }
 await page.evaluate(()=>{localStorage.setItem('dashboard-preferences','{}');});
 await page.reload({waitUntil:'domcontentloaded'});await radio().locator('.radio-toggle:not([disabled])').waitFor();
 await radio().locator('.radio-browse').click();assert(await page.locator('#radio-radius').isDisabled());
 assert((await page.locator('#radio-browser-location').textContent()).includes('Set your ZIP'));
 assert.deepEqual(errors,[]);
 console.log('PASS: station browsing, shared playback, mute/start/stop, remembered station without a Radio card, scrolling/reduced motion, schedule fallback, desktop/short-screen/mobile layout, no browser exceptions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
