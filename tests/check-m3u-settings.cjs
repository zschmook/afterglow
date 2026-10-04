const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/playlist',route=>route.fulfill(route.request().postDataJSON().url.includes('broken')
   ?{status:400,json:{error:'Playlist unavailable.'}}
   :{json:{entries:[{id:'custom:test',name:'Independent channel',stream:'https://example.com/live.m3u8',custom:true,hls:true}]}}));
  await page.goto('http://localhost:10000/');
  await page.click('#settings');await page.click('#settings-media');
  await page.fill('#m3u-settings-url','https://example.com/independent.m3u');await page.click('#m3u-settings-save');
  await page.waitForFunction(()=>document.getElementById('m3u-settings-status').textContent.includes('1 channels'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-m3u')).url),'https://example.com/independent.m3u');
  assert.equal(await page.evaluate(()=>window.radioService.snapshot().phase),'idle');
  await page.fill('#m3u-settings-url','https://example.com/broken.m3u');await page.click('#m3u-settings-save');
  await page.waitForFunction(()=>document.getElementById('m3u-settings-status').textContent==='Playlist unavailable.');
  await page.reload();await page.click('#settings');await page.click('#settings-media');
  assert.equal(await page.inputValue('#m3u-settings-url'),'https://example.com/independent.m3u');
  assert.deepEqual(errors,[]);
  console.log('PASS: Settings playlist load, persistence, failed replacement recovery, and no automatic playback');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
