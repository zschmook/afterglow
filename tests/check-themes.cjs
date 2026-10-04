const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
  const context=await browser.newContext({viewport:{width:1920,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/dashboard*',r=>r.fulfill({json:{weather:{data:null},alerts:{data:{features:[]}},news:{local:{data:[]},national:{data:[]},world:{data:[]}},sports:{nfl:{data:{events:[]}},ncaa:{data:{events:[]}}}}}));
  await context.addInitScript(()=>{if(!localStorage.getItem('theme-test')){localStorage.setItem('theme-test','yes');localStorage.setItem('panel-layout',JSON.stringify({scores:'quotes'}));}});
  await page.goto('http://localhost:10000/');await page.waitForFunction(()=>window.radioService);
  assert.equal(await page.getAttribute('html','data-theme'),'midnight');
  const child=page.frames().find(f=>f!==page.mainFrame());await child.waitForSelector('html[data-theme="midnight"]');
  await child.evaluate(()=>window.themeSentinel='still-mounted');
  await page.evaluate(()=>window.mediaIdentity=window.radioService);
  await page.click('#settings');
  await page.selectOption('#display-theme','hearth');
  await child.waitForSelector('html[data-theme="hearth"]');
  assert.equal(await child.evaluate(()=>window.themeSentinel),'still-mounted');
  assert(await page.evaluate(()=>window.mediaIdentity===window.radioService));
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(36, 30, 25)');
  await page.click('#close-settings');await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.target?.classList?.contains('panel')).map(a=>a.finished)));await page.screenshot({path:'research/theme-hearth.png'});
  await page.reload();assert.equal(await page.getAttribute('html','data-theme'),'hearth');
  await page.click('#settings');assert.equal(await page.inputValue('#display-theme'),'hearth');
  await page.selectOption('#display-theme','midnight');await page.click('#close-settings');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(13, 23, 34)');
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.target?.classList?.contains('panel')).map(a=>a.finished)));await page.screenshot({path:'research/theme-midnight.png'});
  await page.click('#settings');await page.selectOption('#display-theme','afterglow');
  assert.equal(await page.getAttribute('html','data-theme'),'afterglow');
  await page.selectOption('#display-theme','hearth');await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'research/theme-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: theme selection, palettes, persistence, embedded theme changes without reload, media-controller preservation, and mobile fit');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
