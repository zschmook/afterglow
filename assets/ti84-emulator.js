(() => {
  if(!window.TI84Face)return;
  const {dial}=window.TI84Face,body=dial.querySelector('.ti-screen-body'),status=dial.querySelector('.ti-status');
  const codes={down:0x00,left:0x01,right:0x02,up:0x03,enter:0x10,'+':0x11,'-':0x12,'*':0x13,'/':0x14,power:0x15,clear:0x16,negative:0x20,'3':0x21,'6':0x22,'9':0x23,')':0x24,tan:0x25,vars:0x26,'.':0x30,'2':0x31,'5':0x32,'8':0x33,'(':0x34,cos:0x35,prgm:0x36,stat:0x37,'0':0x40,'1':0x41,'4':0x42,'7':0x43,',':0x44,sin:0x45,apps:0x46,x:0x47,store:0x51,ln:0x52,log:0x53,square:0x54,reciprocal:0x55,math:0x56,alpha:0x57,graph:0x60,trace:0x61,zoom:0x62,window:0x63,y:0x64,second:0x65,mode:0x66,delete:0x67,on:0x80};
  const tools=document.createElement('div');tools.className='ti-rom-tools';tools.innerHTML='<button type="button" class="ti-load-local">Load installed ROM</button><button type="button" class="ti-import">Import ROM…</button><button type="button" class="ti-demo">Demo mode</button><input class="ti-rom-file" type="file" accept=".rom,.bin" aria-label="TI-84 ROM file">';dial.append(tools);
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;canvas.className='ti-emu-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','TI-84 Plus emulated LCD');
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(96,64);
  const play=document.createElement('button');play.type='button';play.textContent='Play DrugWars';play.disabled=true;tools.prepend(play);
  play.onclick=()=>{if(!loading&&emulating){worker?.postMessage({type:'launch-game'});message('DrugWars · ENTER through the intro, then choose a menu number. ON interrupts the game.');dial.focus();}};
  let worker=null,emulating=false,loading=false,attempted=false,generation=0,bootTimer=null;
  function message(s){status.textContent=s;}
  function visible(){return !document.hidden&&!dial.hidden&&dial.getClientRects().length>0;}
  function visibility(){worker?.postMessage({type:'pause',paused:!visible()});if(visible()&&!attempted){attempted=true;restore();}}
  async function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('afterglow-ti84-rom',1);r.onupgradeneeded=()=>r.result.createObjectStore('rom');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function stored(value){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('rom',value?'readwrite':'readonly'),r=value?tx.objectStore('rom').put(value,'current'):tx.objectStore('rom').get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
  function showCanvas(){emulating=true;dial.classList.add('ti-emulating');body.replaceChildren(canvas);body.className='ti-screen-body';dial.dataset.shift='';}
  async function start(rom,remember=true){
    if(![1048576,2097152].includes(rom.byteLength))throw Error('Use a classic TI-84 Plus (1 MB) or Plus SE (2 MB) ROM. CE is different hardware.');
    const id=++generation;worker?.terminate();clearTimeout(bootTimer);worker=null;loading=true;play.disabled=true;showCanvas();message('Starting TI-84 Plus…');
    let program;
    try{const r=await fetch('/assets/ti84-programs/DRUGWARS.8xp',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(r.ok){const data=await r.arrayBuffer();if(data.byteLength>=76&&data.byteLength<=32768)program=data;}}catch{}
    if(id!==generation)return;
    worker=new Worker('/assets/ti84-worker.js?v=programs-1');
    worker.onmessage=({data})=>{
      if(id!==generation)return;
      if(data.type==='loaded'){message('Booting TI-84 Plus'+(program?' · installing DrugWars…':'…'));visibility();}
      else if(data.type==='booted'){loading=false;play.disabled=!data.gameInstalled;message(data.error||(data.gameInstalled?'DrugWars installed · Play DrugWars or PRGM → DRUGWARS → ENTER twice':'TI-84 Plus · ROM running · keys work like the original'));}
      else if(data.type==='frame'){canvas.dataset.lcdOn=String(data.on);for(let i=0;i<6144;i++){const ink=data.pixels[i];pixels.data[i*4]=ink?40:178;pixels.data[i*4+1]=ink?54:192;pixels.data[i*4+2]=ink?35:151;pixels.data[i*4+3]=255;}ctx.putImageData(pixels,0,0);}
      else if(data.type==='error'){loading=false;message('Emulator: '+data.message);}
    };
    worker.onerror=e=>{loading=false;message('Emulator could not start: '+(e.message||'worker load failed'));};
    worker.postMessage({type:'load',rom,program});visibility();
    if(remember)try{await stored(rom);}catch{message('ROM loaded for this visit; browser storage is unavailable.');}
  }
  async function installed(){const r=await fetch('/assets/ti84-roms/ti84plus.rom',{cache:'no-store'});if(!r.ok)throw Error('No installed ROM here. Use Import ROM to choose your file.');await start(await r.arrayBuffer());}
  async function restore(){try{const rom=await stored();if(rom){await start(rom,false);return;}}catch{}try{await installed();}catch{message('Demo mode · Import a classic TI-84 ROM to run its original software.');}}
  tools.querySelector('.ti-load-local').onclick=()=>installed().catch(e=>message(e.message));
  const file=tools.querySelector('input');tools.querySelector('.ti-import').onclick=()=>file.click();file.onchange=async()=>{const f=file.files[0];if(!f)return;try{if(![1048576,2097152].includes(f.size))throw Error('Choose a 1 MB TI-84 Plus or 2 MB Plus SE ROM.');await start(await f.arrayBuffer());}catch(e){message(e.message);}file.value='';};
  tools.querySelector('.ti-demo').onclick=()=>{generation++;worker?.terminate();worker=null;clearTimeout(bootTimer);loading=false;emulating=false;play.disabled=true;dial.classList.remove('ti-emulating');window.TI84Face.home();message('Demo mode · calculations and graphs · Load installed ROM for the original TI software');};
  dial.addEventListener('click',e=>{const b=e.target.closest('[data-ti-key]');if(!emulating||!b)return;e.preventDefault();e.stopImmediatePropagation();if(!loading)worker?.postMessage({type:'key',code:codes[b.dataset.tiKey]});},true);
  dial.addEventListener('keydown',e=>{
    if(!emulating||e.target.closest('.ti-rom-tools,.ti-bottom,.ti-expand'))return;
    const k=({'Enter':'enter','Backspace':'delete','Escape':'clear','ArrowUp':'up','ArrowDown':'down','ArrowLeft':'left','ArrowRight':'right','Shift':'second','F1':'y','F2':'window','F3':'zoom','F4':'trace','F5':'graph','^':'power','x':'x'})[e.key]||e.key;
    if(Object.hasOwn(codes,k)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&!loading)worker?.postMessage({type:'key',code:codes[k]});}
  },true);
  dial.querySelector('.ti-help').addEventListener('click',e=>{if(!emulating)return;e.preventDefault();e.stopImmediatePropagation();message('DrugWars: ENTER advances the intro; number keys choose menu options; ON interrupts. 2nd then MODE returns home. Reload reinstalls the game but resets progress and calculator RAM. MANUAL has the TI guide.');},true);
  new MutationObserver(visibility).observe(document.getElementById('clock-panel'),{attributes:true,subtree:true,attributeFilter:['hidden','class']});
  new ResizeObserver(visibility).observe(dial);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',()=>{worker?.terminate();});visibility();
})();
