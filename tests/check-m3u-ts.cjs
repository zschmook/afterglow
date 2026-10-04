// Fresh muted browser and isolated servers. No production playback is touched.
const {chromium}=require('playwright'),assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'..');
(async()=>{
 const fixture=fs.readFileSync(path.join(__dirname,'fixtures/flower.ts'));
 let subscribers=0,requests=0,browser,backend,upstream;
 try{
  upstream=http.createServer((req,res)=>{
   if(req.url==='/channels.m3u'){
    res.end(`#EXTM3U\n#EXTINF:-1 tvg-chno="1" group-title="Test channels",Flower one\nhttp://127.0.0.1:${upstream.address().port}/one.ts\n#EXTINF:-1 tvg-chno="2" group-title="Test channels",Flower two\nhttp://127.0.0.1:${upstream.address().port}/two.ts\n`);return;
   }
   // Deliberately no CORS headers: the same-origin byte relay is required.
   requests++;subscribers++;res.writeHead(200,{'Content-Type':'video/mp2t'});
   let offset=0;
   const interval=setInterval(()=>{
    res.write(fixture.subarray(offset,offset+16384));offset+=16384;
    if(offset>=fixture.length)offset=0;
   },20);
   res.on('close',()=>{clearInterval(interval);subscribers--;});
  });
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  backend=spawn(path.join(root,'.venv/Scripts/python.exe'),['-u','-c',`import threading,sys,json
from functools import partial
from http.server import ThreadingHTTPServer
from server import Handler,ROOT
class Quiet(Handler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
print(json.dumps({'port':server.server_port}),flush=True)
sys.stdin.readline()
server.shutdown();server.server_close()
`],{cwd:root,stdio:['pipe','pipe','pipe'],windowsHide:true});
  const port=await new Promise((resolve,reject)=>{let text='';backend.stdout.on('data',data=>{text+=data;try{resolve(JSON.parse(text).port);}catch{}});backend.on('error',reject);backend.on('exit',code=>{if(!text)reject(Error('Backend exit '+code));});});
  const base=`http://127.0.0.1:${port}`;
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  await context.addInitScript(()=>localStorage.setItem('panel-layout',JSON.stringify({scores:'m3u'})));
  const dashboard={weather:{data:null},alerts:{data:{features:[]}},
    news:{local:{data:[]},national:{data:[]},world:{data:[]}},sports:{nfl:{data:{events:[]}},ncaa:{data:{events:[]}}}};
  await context.route('**/api/dashboard*',r=>r.fulfill({json:dashboard}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const card=page.locator('.slot-scores .m3u');
  await page.evaluate(url=>window.CustomM3U.loadPlaylist(url),process.env.M3U_TEST_URL || `http://127.0.0.1:${upstream.address().port}/channels.m3u`);
  await page.waitForFunction(()=>document.querySelector('.slot-scores .m3u-select').options.length>=3);
  if(process.env.M3U_TEST_URL){
   const channels=await card.locator('select').evaluate(s=>[...s.options].map(o=>({id:o.value,name:o.text})));
   const chosen=channels.find(o=>/^1 · /.test(o.name));assert(chosen,'Find channel 1 without starting Remote');
   await card.locator('select').selectOption(chosen.id);
   await page.waitForFunction(()=>radioService.snapshot().phase==='playing'&&document.querySelector('.m3u-stage video')?.currentTime>1,null,{timeout:25000})
    .catch(async error=>{console.error(await page.evaluate(()=>({phase:radioService.snapshot().phase,message:radioService.snapshot().message,videoError:document.querySelector('.m3u-stage video')?.error?.message})));throw error;});
   await page.screenshot({path:path.join(root,'research/m3u-live-card.png')});
   await page.locator('.radio-mini-name').click();await page.screenshot({path:path.join(root,'research/m3u-live-expanded.png')});
   await page.keyboard.press('Escape');await page.locator('.radio-mini-toggle').click();
   let active=1;
   for(let i=0;i<60&&active;i++){active=(await(await fetch(base+'/api/media/status')).json()).active_streams;if(active)await new Promise(r=>setTimeout(r,100));}
   assert.equal(active,0);assert.deepEqual(errors,[]);
   console.log(JSON.stringify({result:'PASS',channels:channels.length-1,selected:chosen.name,decoded:true,relayReleased:true}));
   return;
  }
  assert.equal(requests,0,'Loading channel names does not start a stream');
  const options=await card.locator('option').allTextContents();assert(options.includes('1 · Flower one'));
  assert.equal(await card.locator('optgroup').getAttribute('label'),'Test channels');
  const id1=await card.locator('option').nth(1).getAttribute('value'),id2=await card.locator('option').nth(2).getAttribute('value');
  await card.locator('select').selectOption(id1);
  await page.waitForFunction(()=>radioService.snapshot().phase==='playing'&&document.querySelector('.m3u-stage video')?.videoWidth>0,null,{timeout:15000});
  assert.equal(subscribers,1);
  await page.locator('.radio-mini-name').click();
  await page.locator('#m3u-expanded select').selectOption(id2);
  await page.waitForFunction(()=>radioService.snapshot().phase==='playing'&&document.querySelector('#m3u-expanded').open&&document.querySelector('.m3u-large-stage video')?.videoWidth>0);
  assert.equal(await page.locator('#m3u-expanded h2').textContent(),'Flower two');
  await page.keyboard.press('Escape');
  await page.locator('.radio-mini-toggle').click();
  await page.waitForFunction(()=>radioService.snapshot().phase==='stopped');
  for(let i=0;i<40&&subscribers;i++)await new Promise(r=>setTimeout(r,50));
  assert.equal(subscribers,0,'Stop closes upstream connections');
  assert.equal((await (await fetch(base+'/api/media/status')).json()).active_streams,0);
  assert.deepEqual(errors,[]);
  console.log('PASS: actual M3U parsing, numbered/grouped channels, MPEG-TS decoding through relay without upstream CORS, expanded channel switching, Stop releases both connections');
 }finally{
  await browser?.close();
  backend?.stdin.end('\n');
  upstream?.closeAllConnections();await new Promise(resolve=>upstream?upstream.close(resolve):resolve());
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
