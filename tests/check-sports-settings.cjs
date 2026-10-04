const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
  const page=await browser.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/dashboard*',r=>{
   const keys=new URL(r.request().url()).searchParams.get('leagues').split(',');requests.push(keys);
   return r.fulfill({json:{weather:{data:null},alerts:{data:{features:[]}},news:{local:{data:[]},national:{data:[]},world:{data:[]}},sports:Object.fromEntries(keys.map(k=>[k,{data:{events:[]}}]))}});
  });
  await page.goto('http://localhost:10000/');await page.click('#settings');await page.click('#settings-sports');
  assert.equal(await page.locator('#league option').count(),2);
  await page.check('#sports-enable-mlb');await page.check('#sports-enable-mls');
  await page.selectOption('#default-league','mls');
  await page.waitForFunction(()=>document.getElementById('score-items').textContent.includes('No MLS games'));
  assert.equal(await page.inputValue('#league'),'mls');
  await page.reload();await page.click('#settings');await page.click('#settings-sports');
  assert(await page.isChecked('#sports-enable-mls'));assert.equal(await page.inputValue('#default-league'),'mls');
  await page.uncheck('#sports-enable-mls');assert.equal(await page.inputValue('#league'),'nfl');
  await page.uncheck('#sports-enable-nfl');await page.uncheck('#sports-enable-ncaa');await page.click('#sports-enable-mlb');
  assert(await page.isChecked('#sports-enable-mlb'));
  assert.equal(await page.textContent('#sports-settings-status'),'Keep at least one league selected.');
  assert(requests.some(keys=>keys.includes('mls')));
  assert(requests.every(keys=>keys.every(k=>['nfl','ncaa','mlb','mls'].includes(k))));
  assert.equal(await page.evaluate(()=>sportsPeriod('mlb',7)),'Inning 7');
  assert.equal(await page.evaluate(()=>sportsPeriod('nhl',4)),'Overtime 1');
  assert.equal(await page.evaluate(()=>sportsPeriod('ncaam',2)),'Half 2');
  assert.equal(await page.evaluate(()=>sportsPeriod('mls',1)),'Half 1');
  await page.screenshot({path:'research/sports-settings.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: sports choices, starting league, persistence, removed-league fallback, last-league protection, selected-only requests, and period labels');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
