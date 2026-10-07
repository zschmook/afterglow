const {chromium}=require('playwright'),assert=require('assert');

(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
 try{
  const page=await browser.newPage({viewport:{width:128,height:128},reducedMotion:'no-preference'});
  const conditions=['clear-day','clear-night','overcast','partly-cloudy-day','partly-cloudy-night','rain','drizzle','partly-cloudy-day-rain','partly-cloudy-night-rain','fog','snow','thunderstorms'];
  for(const name of conditions){
   const response=await page.goto(`http://localhost:10000/assets/weather-icons/christmas/${name}.svg`);
   assert.equal(response.status(),200,`${name}: served`);
   assert(await page.locator('svg > title').textContent(),`${name}: accessible title`);
   assert(await page.evaluate(()=>document.getAnimations().some(animation=>animation.playState==='running')),`${name}: animation running`);
   if(name==='thunderstorms')assert.equal(await page.locator('.christmas-bulb').count(),5);
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>document.getAnimations().length===0);
   const precipitation=page.locator('.christmas-drop,.seasonal-snowflake,.christmas-bulb');
   assert(await precipitation.evaluateAll(elements=>elements.every(element=>Number(getComputedStyle(element).opacity)===1)),`${name}: reduced motion retains precipitation and lights`);
   await page.emulateMedia({reducedMotion:'no-preference'});
  }
  console.log('PASS: all 12 Christmas assets load, animate, and respect reduced motion without hiding precipitation or lights');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
