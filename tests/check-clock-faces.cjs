// Isolated browser session and mocked feeds; never changes the user's dashboard.
const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
  const context=await browser.newContext({viewport:{width:1500,height:950}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const data={weather:{data:null},alerts:{data:{features:[]}},news:{local:{data:[]},national:{data:[]},world:{data:[]}},sports:{nfl:{data:{events:[]}},ncaa:{data:{events:[]}}}};
  await context.route('**/api/dashboard*',r=>r.fulfill({json:data}));
  await page.goto('http://localhost:10000/',{waitUntil:'domcontentloaded'});
  assert(await page.locator('#clock').isVisible());assert(!(await page.locator('#mechanical-clock').isVisible()));
  await page.locator('#clock-options').click();await page.locator('#clock-face').selectOption('mechanical');
  await page.locator('#close-clock-options').click();
  await page.locator('#mechanical-clock').waitFor({state:'visible'});
  assert(!(await page.locator('#clock').isVisible()));
  await page.waitForFunction(()=>document.querySelector('#mf-digital').textContent===document.querySelector('#digital').textContent);
  for(const [mechanical,classic] of [['mf-hour','hour-hand'],['mf-minute','minute-hand'],['mf-second','second-hand']]){
   assert(await page.evaluate(([a,b])=>document.getElementById(a).getAttribute('transform')===document.getElementById(b).getAttribute('transform'),[mechanical,classic]));
  }
  const gear=page.locator('#mechanical-clock .mf-gear').first(),balance=page.locator('#mechanical-clock .mf-balance').first();
  const initial=await gear.evaluate(e=>getComputedStyle(e).transform);
  await page.waitForFunction(initial=>getComputedStyle(document.querySelector('#mechanical-clock .mf-gear')).transform!==initial,initial);
  assert.equal(await balance.evaluate(e=>getComputedStyle(e).animationName),'mf-oscillate');
  await page.locator('#mechanical-clock').screenshot({path:path.resolve('research/mechanical-face.png')});
  await page.screenshot({path:path.resolve('research/mechanical-dashboard.png')});
  await page.reload({waitUntil:'domcontentloaded'});assert(await page.locator('#mechanical-clock').isVisible());
  await page.locator('#calendar-toggle').click();assert(!(await page.locator('#mechanical-clock').isVisible()));
  assert.equal(await gear.evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  await page.locator('#calendar-back').click();assert(await page.locator('#mechanical-clock').isVisible());
  await page.locator('#clock-options').click();await page.locator('#clock-format').selectOption('24');await page.locator('#close-clock-options').click();
  await page.waitForFunction(()=>/^\d{2}:\d{2}$/.test(document.querySelector('#mf-digital').textContent));
  await page.evaluate(()=>setZone('Pacific/Honolulu'));
  await page.waitForFunction(()=>document.querySelector('#mechanical-clock').getAttribute('aria-label').includes('Pacific/Honolulu'));
  assert.equal(await page.locator('#mf-day').textContent(),await page.evaluate(()=>new Date().toLocaleDateString('en-US',{timeZone:'Pacific/Honolulu',day:'numeric'})));
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await gear.evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#clock-options').click();await page.locator('#center-content').selectOption('system');
  assert(!(await page.locator('#mechanical-clock').isVisible()));assert.equal(await gear.evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  await page.locator('#clock-options').click();await page.locator('#center-content').selectOption('clock');
  assert(await page.locator('#mechanical-clock').isVisible());
  for(const size of [{width:1920,height:720},{width:1280,height:540},{width:1024,height:768},{width:390,height:844}]){
   await page.setViewportSize(size);
   const face=await page.locator('#mechanical-clock').boundingBox(),panel=await page.locator('#clock-panel').boundingBox();
   assert(face.x>=panel.x&&face.y>=panel.y&&face.x+face.width<=panel.x+panel.width+1&&face.y+face.height<=panel.y+panel.height+1,JSON.stringify({size,face,panel}));
   for(const id of ['digital','calendar-toggle','open-alarm','open-home'])assert(await page.locator('#'+id).isVisible());
   assert(await page.locator('#digital').evaluate(e=>{const r=e.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#calendar-toggle');}),'The clock face must not cover the digital time');
  }
  await page.locator('#clock-panel').screenshot({path:path.resolve('research/mechanical-mobile.png')});
  await page.locator('#clock-options').click();await page.locator('#clock-face').selectOption('aviation');await page.locator('#close-clock-options').click();
  await page.waitForFunction(()=>document.querySelector('#af-day').textContent!=='—');
  assert(await page.locator('#aviation-clock').isVisible());assert(!(await page.locator('#mechanical-clock').isVisible()));
  assert(!(await page.locator('#clock').isVisible()));
  for(const [aviation,classic] of [['af-hour','hour-hand'],['af-minute','minute-hand'],['af-second','second-hand']]){
   assert(await page.evaluate(([a,b])=>document.getElementById(a).getAttribute('transform')===document.getElementById(b).getAttribute('transform'),[aviation,classic]));
  }
  assert.equal(await page.locator('#af-day').textContent(),await page.evaluate(()=>new Date().toLocaleDateString('en-US',{timeZone:'Pacific/Honolulu',day:'numeric'})));
  assert(await page.evaluate(()=>{
   const angle=id=>Number(document.getElementById(id).getAttribute('transform').match(/rotate\(([-\d.]+)/)[1]);
   return angle('af-hours')===angle('hour-hand')/2&&angle('af-minutes')===angle('minute-hand')&&angle('af-seconds')===angle('second-hand');
  }));
  const second=await page.locator('#af-seconds').getAttribute('transform');
  await page.waitForFunction(old=>document.querySelector('#af-seconds').getAttribute('transform')!==old,second);
  await page.reload({waitUntil:'domcontentloaded'});assert(await page.locator('#aviation-clock').isVisible());
  await page.locator('#calendar-toggle').click();assert(!(await page.locator('#aviation-clock').isVisible()));
  await page.locator('#calendar-back').click();assert(await page.locator('#aviation-clock').isVisible());
  for(const size of [{width:390,height:844},{width:1280,height:540},{width:1500,height:950}]){
   await page.setViewportSize(size);
   assert(await page.locator('#digital').evaluate(e=>{const r=e.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#calendar-toggle');}));
   const face=await page.locator('#aviation-clock').boundingBox(),panel=await page.locator('#clock-panel').boundingBox();
   assert(face.x>=panel.x&&face.y>=panel.y&&face.x+face.width<=panel.x+panel.width+1&&face.y+face.height<=panel.y+panel.height+1);
   await page.locator('#clock-panel').screenshot({path:path.resolve(`research/aviation-panel-${size.width}.png`)});
  }
  await page.locator('#aviation-clock').screenshot({path:path.resolve('research/aviation-face.png')});
  await page.locator('#clock-options').click();await page.locator('#clock-face').selectOption('rectangular');await page.locator('#close-clock-options').click();
  await page.waitForFunction(()=>document.querySelector('#rf-second').hasAttribute('transform'));
  assert(await page.locator('#rectangular-clock').isVisible());
  assert(!(await page.locator('#aviation-clock').isVisible()));
  assert(await page.evaluate(()=>{
   const angle=id=>Number(document.getElementById(id).getAttribute('transform').match(/rotate\(([-\d.]+)/)[1]);
   return angle('rf-hour')===angle('hour-hand')&&angle('rf-minute')===angle('minute-hand')&&angle('rf-second')===angle('second-hand');
  }));
  assert.equal(await page.locator('#rf-brand').textContent(),'HAMILTON');
  const smallSecond=await page.locator('#rf-second').getAttribute('transform');
  await page.waitForFunction(old=>document.querySelector('#rf-second').getAttribute('transform')!==old,smallSecond);
  await page.reload({waitUntil:'domcontentloaded'});assert(await page.locator('#rectangular-clock').isVisible());
  await page.locator('#calendar-toggle').click();assert(!(await page.locator('#rectangular-clock').isVisible()));
  await page.locator('#calendar-back').click();assert(await page.locator('#rectangular-clock').isVisible());
  for(const size of [{width:390,height:844},{width:1280,height:540},{width:1500,height:950}]){
   await page.setViewportSize(size);
   assert(await page.locator('#digital').evaluate(e=>{const r=e.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#calendar-toggle');}));
   const face=await page.locator('#rectangular-clock').boundingBox(),panel=await page.locator('#clock-panel').boundingBox();
   assert(face.x>=panel.x&&face.y>=panel.y&&face.x+face.width<=panel.x+panel.width+1&&face.y+face.height<=panel.y+panel.height+1);
   await page.locator('#clock-panel').screenshot({path:path.resolve(`research/rectangular-panel-${size.width}.png`)});
  }
  await page.locator('#rectangular-clock').screenshot({path:path.resolve('research/rectangular-face.png')});
  await page.locator('#rectangular-clock').screenshot({path:path.resolve('research/hamilton-face.png')});
  await page.locator('#clock-options').click();await page.locator('#clock-face').selectOption('skeleton');await page.locator('#close-clock-options').click();
  await page.waitForFunction(()=>document.querySelector('#sf-hour').hasAttribute('transform'));
  assert(await page.locator('#skeleton-clock').isVisible());assert(!(await page.locator('#rectangular-clock').isVisible()));
  for(const [silver,classic] of [['sf-hour','hour-hand'],['sf-minute','minute-hand']]){
   assert(await page.evaluate(([a,b])=>document.getElementById(a).getAttribute('transform')===document.getElementById(b).getAttribute('transform'),[silver,classic]));
  }
  const silverGear=page.locator('#skeleton-clock .sf-gear').first(),silverBalance=page.locator('#skeleton-clock .sf-balance');
  const silverInitial=await silverGear.evaluate(e=>getComputedStyle(e).transform);
  await page.waitForFunction(old=>getComputedStyle(document.querySelector('#skeleton-clock .sf-gear')).transform!==old,silverInitial);
  const balanceInitial=await silverBalance.evaluate(e=>getComputedStyle(e).transform);
  await page.waitForFunction(old=>getComputedStyle(document.querySelector('#skeleton-clock .sf-balance')).transform!==old,balanceInitial);
  await page.reload({waitUntil:'domcontentloaded'});assert(await page.locator('#skeleton-clock').isVisible());
  await page.waitForFunction(()=>document.querySelector('#skeleton-clock').getAttribute('aria-label').includes(document.querySelector('#digital').textContent.trim()));
  await page.locator('#calendar-toggle').click();assert(!(await page.locator('#skeleton-clock').isVisible()));
  assert.equal(await silverGear.evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  await page.locator('#calendar-back').click();assert(await page.locator('#skeleton-clock').isVisible());
  assert.equal(await silverGear.evaluate(e=>getComputedStyle(e).animationPlayState),'running');
  for(const content of ['system','m3u']){
   await page.locator('#clock-options').click();await page.locator('#center-content').selectOption(content);
   assert(!(await page.locator('#skeleton-clock').isVisible()));
   assert.equal(await silverBalance.evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
   await page.locator('#clock-options').click();await page.locator('#center-content').selectOption('clock');
   assert(await page.locator('#skeleton-clock').isVisible());
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await silverGear.evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await silverBalance.evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const size of [{width:390,height:844},{width:1920,height:720},{width:1280,height:540},{width:1500,height:950}]){
   await page.setViewportSize(size);
   const face=await page.locator('#skeleton-clock').boundingBox(),panel=await page.locator('#clock-panel').boundingBox();
   assert(face.x>=panel.x&&face.y>=panel.y&&face.x+face.width<=panel.x+panel.width+1&&face.y+face.height<=panel.y+panel.height+1,JSON.stringify({size,face,panel}));
   for(const id of ['digital','calendar-toggle','open-alarm','open-home'])assert(await page.locator('#'+id).isVisible());
   assert(await page.locator('#digital').evaluate(e=>{const r=e.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#calendar-toggle');}));
   await page.locator('#clock-panel').screenshot({path:path.resolve(`research/skeleton-panel-${size.width}.png`)});
  }
  await page.locator('#skeleton-clock').screenshot({path:path.resolve('research/skeleton-face.png')});
  await page.locator('#clock-options').click();await page.locator('#clock-face').selectOption('classic');await page.locator('#close-clock-options').click();
  assert(await page.locator('#clock').isVisible());assert(!(await page.locator('#mechanical-clock').isVisible()));
  assert(!(await page.locator('#aviation-clock').isVisible()));
  assert(!(await page.locator('#rectangular-clock').isVisible()));
  assert(!(await page.locator('#skeleton-clock').isVisible()));
  assert.equal(await silverGear.evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  assert.deepEqual(errors,[]);
  console.log('PASS: face selection/persistence, animated gears/balances, synchronized hands and zoned date, 24-hour time, calendar/stats return, reduced motion, responsive layout, classic preserved');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
