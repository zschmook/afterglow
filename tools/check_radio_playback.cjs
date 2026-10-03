// Probe browser decoding in an isolated, muted Chrome session. No user tabs/profile.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
(async()=>{
  const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/radio-stations.json'),'utf8'));
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
  const results=[];
  try{
    const queue=[...catalog.stations];
    await Promise.all(Array.from({length:3},async()=>{
      const page=await browser.newPage();await page.goto('http://localhost:10000/?panel=radio',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.radioService?.snapshot().loaded);
      while(queue.length){
        const station=queue.shift();
        const result=await page.evaluate(async s=>{
          // Same audio API used by the player; require decoded, advancing media time.
          const audio=new Audio(s.stream);audio.volume=0;
          return new Promise(resolve=>{
            let finished=false;const finish=result=>{if(finished)return;finished=true;clearTimeout(timeout);clearInterval(poll);audio.pause();audio.removeAttribute('src');audio.load();resolve({id:s.id,...result});};
            const timeout=setTimeout(()=>finish({ok:false,reason:'timeout'}),18000);
            const poll=setInterval(()=>{if(audio.currentTime>=1)finish({ok:true,seconds:audio.currentTime});},250);
            audio.onerror=()=>finish({ok:false,reason:'media error '+audio.error?.code});
            audio.play().catch(e=>finish({ok:false,reason:e.name}));
          });
        },station);
        results.push(result);console.log(JSON.stringify(result));
      }
      await page.close();
    }));
  }finally{await browser.close();}
  fs.writeFileSync(path.join(root,'research/radio-browser-playback-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
  console.log(`Decoded ${results.filter(r=>r.ok).length}/${results.length} station streams in Chrome`);
})().catch(error=>{console.error(error);process.exitCode=1;});
