const {chromium}=require('playwright'),assert=require('assert');

(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
  const page=await browser.newPage({viewport:{width:256,height:256},reducedMotion:'no-preference'});
  for(const theme of ['halloween','thanksgiving','christmas']){
   await page.goto(`http://localhost:10000/assets/weather-icons/${theme}/snow.svg?v=14`);
   await page.waitForSelector('.seasonal-snowflake');
   const initial=await page.locator('.seasonal-snowflake').evaluateAll(flakes=>flakes.map(flake=>{
    const style=getComputedStyle(flake),matrix=new DOMMatrix(style.transform);
    return {animation:style.animationName,y:matrix.f};
   }));
   assert.equal(initial.length,6,`${theme}: six snowflakes`);
   assert(initial.every(flake=>flake.animation==='seasonal-snowfall'),`${theme}: snowfall enabled`);
   await page.waitForFunction(positions=>[...document.querySelectorAll('.seasonal-snowflake')].every((flake,i)=>
    Math.abs(new DOMMatrix(getComputedStyle(flake).transform).f-positions[i])>2
   ),initial.map(flake=>flake.y),{timeout:5000});
   assert(await page.locator('.seasonal-snowflake').evaluateAll(flakes=>flakes.filter(flake=>Number(getComputedStyle(flake).opacity)>.5).length>=4),`${theme}: visible flakes during motion`);

   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>[...document.querySelectorAll('.seasonal-snowflake')].every(flake=>getComputedStyle(flake).animationName==='none'));
   const still=await page.locator('.seasonal-snowflake').evaluateAll(flakes=>flakes.map(flake=>{
    const style=getComputedStyle(flake),rect=flake.getBoundingClientRect();
    return {transform:style.transform,opacity:Number(style.opacity),bottom:rect.bottom,top:rect.top};
   }));
   assert(still.every(flake=>flake.opacity===1&&flake.top>0&&flake.bottom<256),`${theme}: reduced-motion flakes remain visible and unclipped`);
   const nextFrame=await page.evaluate(()=>document.timeline.currentTime+220);
   await page.waitForFunction(time=>document.timeline.currentTime>=time,nextFrame);
   assert.deepEqual(await page.locator('.seasonal-snowflake').evaluateAll(flakes=>flakes.map(flake=>getComputedStyle(flake).transform)),still.map(flake=>flake.transform),`${theme}: reduced motion stays still`);
   await page.emulateMedia({reducedMotion:'no-preference'});
  }
  console.log('PASS: all three seasonal snow animations advance, keep flakes visible, and respect reduced motion');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
