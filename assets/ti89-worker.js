/* SPDX-License-Identifier: GPL-2.0-or-later */
'use strict';
importScripts('/assets/vendor/ti68k/ti68k.js','/assets/ti89-engine.js?v=1');
let core=null,paused=true,queue=[],held=[],remaining=0,bootTicks=0;
const fail=e=>postMessage({type:'error',message:String(e?.message||e)});
function release(){core?.release();queue=[];held=[];remaining=0;}
function tick(){
  if(!core||paused)return;
  try{
    if(!remaining){
      if(held.length){held.forEach(k=>core.key(k,false));remaining=held.some(k=>[8,39,47,31,23,15,38,40,46].includes(k))?12:6;held=[];}
      else if(queue.length){held=queue.shift();held.forEach(k=>core.key(k,true));remaining=6;}
    }
    if(remaining)remaining--;
    for(let i=0;i<3;i++)core.tick();
    if(++bootTicks===150)postMessage({type:'ready'});
    const pixels=core.frame();postMessage({type:'frame',pixels,on:core.on()},[pixels.buffer]);
  }catch(e){paused=true;release();fail(e);}
}
onmessage=({data})=>{
  try{
    if(data.type==='load'){
      if(core)throw Error('ROM already loaded.');
      core=AfterglowTI89.create(data.rom);postMessage({type:'loaded'});setInterval(tick,1000/30);
    }else if(data.type==='pause'){paused=!!data.paused;if(paused)release();}
    else if(data.type==='keys'&&core&&!paused&&bootTicks>=150){
      const codes=data.codes;
      if(Array.isArray(codes)&&codes.length>0&&codes.length<=3&&codes.every(k=>Number.isInteger(k)&&((k>=0&&k<=48)||k===80))&&queue.length<80)queue.push([...new Set(codes)]);
    }
  }catch(e){fail(e);}
};
