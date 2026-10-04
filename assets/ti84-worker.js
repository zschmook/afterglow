'use strict';
importScripts('/assets/vendor/wabbitemu/core.js');
let core,ready=false,paused=true,timer=null,keys=[],pressed=null,keyTicks=0,bootTicks=0;
const sendError=e=>postMessage({type:'error',message:String(e?.message||e)});
function release(){if(pressed!==null&&core)core._ag_key(pressed,0);pressed=null;keys=[];keyTicks=0;}
function frame(){const p=core._ag_frame(),pixels=core.HEAPU8.slice(p,p+6144);postMessage({type:'frame',pixels,on:!!core._ag_on()},[pixels.buffer]);}
function tick(){
  if(!ready||paused)return;
  try{
    if(++bootTicks===30)keys.unshift(128);
    // MathPrint screen transitions need time before the next queued tap.
    if(keyTicks===0){if(pressed!==null){core._ag_key(pressed,0);keyTicks=[0x64,0x63,0x62,0x61,0x60,0x66,0x37].includes(pressed)?20:4;pressed=null;}else if(keys.length){pressed=keys.shift();core._ag_key(pressed,1);keyTicks=8;}}
    if(keyTicks>0)keyTicks--;
    core._ag_tick(Math.round(core._ag_rate()/30));frame();
  }catch(e){paused=true;release();sendError(e);}
}
onmessage=async({data})=>{
  try{
    if(data.type==='load'){
      if(core)throw Error('Start a new worker to load another ROM.');
      if(!(data.rom instanceof ArrayBuffer)||![1048576,2097152].includes(data.rom.byteLength))throw Error('Choose a classic TI-84 Plus (1 MB) or Plus SE (2 MB) ROM. CE ROMs use different hardware.');
      core=await AfterglowZ80({locateFile:name=>'/assets/vendor/wabbitemu/'+name,print:()=>{},printErr:()=>{}});
      const p=core._ag_init(data.rom.byteLength===1048576?3:4);if(!p)throw Error('Calculator initialization failed.');
      core.HEAPU8.set(new Uint8Array(data.rom),p);ready=true;postMessage({type:'loaded'});timer=setInterval(tick,1000/30);
    }else if(data.type==='pause'){paused=!!data.paused;if(paused)release();}
    else if(data.type==='key'&&ready&&!paused&&Number.isInteger(data.code)&&data.code>=0&&data.code<=128&&(data.code&15)<8&&keys.length<50)keys.push(data.code);
  }catch(e){sendError(e);}
};
