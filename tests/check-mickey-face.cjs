const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-04T14:10:30Z'));
  await page.route('**/api/dashboard*',r=>r.fulfill({json:{weather:{data:null},alerts:{data:{features:[]}},news:{local:{data:[]},national:{data:[]},world:{data:[]}},sports:{nfl:{data:{events:[]}},ncaa:{data:{events:[]}}}}}));
  await page.goto('http://localhost:10000/');await page.click('#clock-options');await page.selectOption('#clock-face','mickey');await page.click('#close-clock-options');
  await page.waitForFunction(()=>document.getElementById('mc-minute').hasAttribute('transform'));
  assert(await page.locator('#mickey-clock').isVisible());assert(!(await page.locator('#clock').isVisible()));
  for(const [character,classic] of [['mc-hour','hour-hand'],['mc-minute','minute-hand'],['mc-second','second-hand']]){
   assert(await page.evaluate(([a,b])=>document.getElementById(a).getAttribute('transform')===document.getElementById(b).getAttribute('transform'),[character,classic]));
  }
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.target?.classList?.contains('panel')).map(a=>a.finished)));
  await page.locator('#mickey-clock').screenshot({path:'research/mickey-face.png'});
  await page.reload();assert(await page.locator('#mickey-clock').isVisible());
  await page.click('#calendar-toggle');assert(!(await page.locator('#mickey-clock').isVisible()));
  await page.click('#calendar-back');assert(await page.locator('#mickey-clock').isVisible());
  await page.evaluate(()=>setZone('Pacific/Honolulu'));
  await page.waitForFunction(()=>document.getElementById('mickey-clock').getAttribute('aria-label').includes('Pacific/Honolulu'));
  await page.click('#clock-options');await page.selectOption('#clock-format','24');await page.click('#close-clock-options');
  await page.waitForFunction(()=>document.getElementById('mickey-clock').getAttribute('aria-label').includes('04:10'));
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const size of [{width:1920,height:720},{width:1280,height:540},{width:390,height:844}]){
   await page.setViewportSize(size);
   const face=await page.locator('#mickey-clock').boundingBox(),panel=await page.locator('#clock-panel').boundingBox();
   assert(face.x>=panel.x&&face.y>=panel.y&&face.x+face.width<=panel.x+panel.width+1&&face.y+face.height<=panel.y+panel.height+1);
   assert(await page.locator('#digital').isVisible());
  }
  await page.locator('#clock-panel').screenshot({path:'research/mickey-mobile.png'});
  await page.click('#clock-options');await page.selectOption('#clock-face','classic');await page.click('#close-clock-options');
  assert(await page.locator('#clock').isVisible());assert(!(await page.locator('#mickey-clock').isVisible()));
  assert.deepEqual(errors,[]);
  console.log('PASS: Mickey hand angles, selection, persistence, calendar, timezone, time format, reduced motion, and responsive sizing');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
