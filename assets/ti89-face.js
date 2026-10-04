/* SPDX-License-Identifier: GPL-2.0-or-later */
(() => {
  if(embeddedPanel)return;
  const dial=document.createElement('section');dial.id='ti89-clock';dial.hidden=true;dial.tabIndex=0;dial.setAttribute('aria-label','TI-89 graphing calculator');
  const key=(code,label,second='',letter='',tone='',diamond='')=>`<div class="t89-slot ${tone}"><span><i>${second}</i><em class="${diamond?'t89-diamond-legend':''}">${diamond||letter}</em></span><button type="button" data-t89-key="${code}" aria-label="${label}">${label}</button></div>`;
  const rows=[
    [46,'HOME','CUSTOM'],[38,'MODE','▶','','_'],[30,'CATALOG','i','','∞'],[22,'⌫','INS','','DEL'],[14,'CLEAR'],
    [45,'x','LN','','eˣ'],[37,'y','SIN','','SIN⁻¹'],[29,'z','COS','','COS⁻¹'],[21,'t','TAN','','TAN⁻¹'],[13,'^','π','','θ'],
    [44,'=','′','A'],[36,'(','{','B'],[28,')','}','C'],[20,',','[','D'],[12,'÷',']','E'],
    [43,'|','°','F'],[35,'7','∫','G'],[27,'8','d','H'],[19,'9',';','I'],[11,'×','√','J'],
    [42,'EE','∠','K'],[34,'4',':','L'],[26,'5','MATH','M'],[18,'6','MEM','N'],[10,'−','VAR-LINK','O'],
    [41,'STO→','RCL','P'],[33,'1','"','Q'],[25,'2',"'",'R'],[17,'3','UNITS','S'],[9,'+','CHAR','U'],
    [80,'ON','OFF'],[32,'0','&lt;','V'],[24,'.','&gt;','W'],[16,'(−)','ANS','','␣'],[8,'ENTER','ENTRY','','≈']
  ];
  dial.innerHTML=`<div class="t89-case"><div class="t89-brand"><b>TI-89</b><button type="button" class="t89-expand" aria-label="Expand TI-89">⛶</button></div><div class="t89-bezel"><span class="t89-maker">TEXAS INSTRUMENTS</span><canvas width="160" height="100" role="img" aria-label="TI-89 emulated LCD"></canvas><span class="t89-caption">ADVANCED GRAPHING CALCULATOR</span></div><div class="t89-softkeys">${[[47,'F1','F6','Y='],[39,'F2','F7','WINDOW'],[31,'F3','F8','GRAPH'],[23,'F4','','TBLSET'],[15,'F5','','TABLE']].map(([code,label,second,diamond])=>key(code,label,second,'','',diamond)).join('')}</div><div class="t89-navigation"><div class="t89-navkeys">${key(4,'2nd','','','t89-second')}${key(5,'⇧','', '', 't89-shift')}${key(48,'ESC','QUIT')}${key(6,'◆','','','t89-diamond')}${key(7,'alpha','A-LOCK')}${key(40,'APPS','↔')}</div><div class="t89-arrows">${[[0,'Up','▲'],[1,'Left','◀'],[3,'Right','▶'],[2,'Down','▼']].map(([code,name,label])=>`<button type="button" data-t89-key="${code}" aria-label="${name}">${label}</button>`).join('')}</div></div><div class="t89-keypad">${rows.map(([code,label,second='',letter='',diamond=''])=>key(code,label,second,letter,/^[0-9.]$/.test(label)?'t89-number':[8,9,10,11,12,13].includes(code)?'t89-operation':'',diamond)).join('')}</div><div class="t89-bottom"><a href="https://education.ti.com/download/en/ed-tech/2110B5BC591D44E1AF4C28F00A6614B6/0470DB419F2144349E4032AFE3C0DD7E/8992bookeng.pdf" target="_blank" rel="noopener noreferrer">MANUAL ↗</a><button type="button" class="t89-help">QUICK GUIDE</button></div><svg class="t89-scuffs" viewBox="0 0 350 720" preserveAspectRatio="none" aria-hidden="true"><g stroke="#b9bdad" stroke-width=".7" fill="none" opacity=".28"><path d="M11 52l3 29m-4 6l2 30m2 107l-3 55m3 197l-4 19m324-429l4 37m-3 9l2 21m-2 219l4 37M40 705l45 4m153-1l62-5M24 655l11 15m258-611l14-4M47 127l34-7m-27 12l12-3"/><path d="M89 19l31-3m154 691l22-4M339 433l-4 19" opacity=".6"/></g></svg></div><p class="t89-status" role="status">Select TI-89 to start your calculator.</p><div class="t89-tools"><button type="button" class="t89-load">Load installed ROM</button><button type="button" class="t89-import">Import ROM…</button><input type="file" accept=".rom,.bin" aria-label="Classic TI-89 ROM file" hidden></div>`;
  $('clock').after(dial);window.TI89Face={dial};
  const canvas=dial.querySelector('canvas'),ctx=canvas.getContext('2d'),image=ctx.createImageData(160,100),status=dial.querySelector('.t89-status');
  let worker=null,attempted=false,generation=0,loading=false,emulating=false;
  const message=text=>status.textContent=text;
  function visible(){return !document.hidden&&!dial.hidden&&dial.getClientRects().length>0;}
  function visibility(){worker?.postMessage({type:'pause',paused:!visible()});if(visible()&&!attempted){attempted=true;restore();}}
  async function stored(value){
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('afterglow-ti89',1);r.onupgradeneeded=()=>r.result.createObjectStore('rom');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    try{return await new Promise((resolve,reject)=>{const tx=db.transaction('rom',value?'readwrite':'readonly'),r=value?tx.objectStore('rom').put(value,'current'):tx.objectStore('rom').get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
  }
  function validate(rom){
    if(rom.byteLength!==2097152)throw Error('Choose a 2 MB classic TI-89 ROM.');
    const v=new DataView(rom),tag=v.getUint16(0x12000),p=tag===0x800f?0x12008:tag===0x800e?0x12006:0;
    if(!p||v.getUint16(p-2)!==0x8011||v.getUint8(p)!==3)throw Error('This is not a classic TI-89 ROM. TI-84, TI-92 and Titanium ROMs are different.');
  }
  async function start(rom,remember=true){
    validate(rom);const id=++generation;worker?.terminate();loading=true;emulating=false;message('Starting your TI-89…');
    worker=new Worker('/assets/ti89-worker.js?v=1');
    worker.onmessage=async({data})=>{
      if(id!==generation)return;
      if(data.type==='loaded'){emulating=true;message('TI-89 · booting the original software…');visibility();if(remember)try{await stored(rom);}catch{}}
      else if(data.type==='ready'){loading=false;message('TI-89 · HOME for calculations · ◆ then F1 for Y= · ◆ then F3 for GRAPH');}
      else if(data.type==='frame'){
        canvas.dataset.lcdOn=String(data.on);for(let i=0;i<16000;i++){const ink=data.pixels[i];image.data[i*4]=ink?32:180;image.data[i*4+1]=ink?43:191;image.data[i*4+2]=ink?30:151;image.data[i*4+3]=255;}ctx.putImageData(image,0,0);
      }else if(data.type==='error'){loading=false;emulating=false;message('TI-89: '+data.message);worker.terminate();}
    };
    worker.onerror=e=>{if(id!==generation)return;loading=false;emulating=false;message('TI-89 could not start: '+(e.message||'worker error'));worker.terminate();};
    worker.postMessage({type:'load',rom});visibility();
  }
  async function installed(){const r=await fetch('/assets/ti89-roms/ti89.rom',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Use Import ROM to choose your classic TI-89 ROM.');await start(await r.arrayBuffer());}
  async function restore(){try{const rom=await stored();if(rom){await start(rom,false);return;}}catch{}try{await installed();}catch(e){message(e.message);}}
  dial.querySelector('.t89-load').onclick=()=>installed().catch(e=>message(e.message));
  const file=dial.querySelector('input');dial.querySelector('.t89-import').onclick=()=>file.click();file.onchange=async()=>{const f=file.files[0];if(!f)return;try{if(f.size!==2097152)throw Error('Choose a 2 MB classic TI-89 ROM.');await start(await f.arrayBuffer());}catch(e){message(e.message);}file.value='';};
  function send(codes){if(emulating&&!loading)worker?.postMessage({type:'keys',codes});}
  dial.querySelectorAll('[data-t89-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();dial.focus({preventScroll:true});};b.onclick=()=>send([Number(b.dataset.t89Key)]);});
  const mapping={ArrowUp:0,ArrowLeft:1,ArrowDown:2,ArrowRight:3,Enter:8,Backspace:22,Delete:14,Escape:48,F1:47,F2:39,F3:31,F4:23,F5:15,'0':32,'1':33,'2':25,'3':17,'4':34,'5':26,'6':18,'7':35,'8':27,'9':19,'.':24,'+':9,'-':10,'*':11,'/':12,'^':13,'=':44,'(':36,')':28,',':20,'|':43,x:45,y:37,z:29,t:21};
  const letters={a:44,b:36,c:28,d:20,e:12,f:43,g:35,h:27,i:19,j:11,k:42,l:34,m:26,n:18,o:10,p:41,q:33,r:25,s:17,u:9,v:32,w:24};
  dial.onkeydown=e=>{if(e.target.closest('[data-t89-key]')&&['Enter',' '].includes(e.key))return;if(e.metaKey||e.ctrlKey||e.altKey||e.target.closest('.t89-tools,.t89-bottom,.t89-expand'))return;const k=e.key.length===1?e.key.toLowerCase():e.key;const codes=Object.hasOwn(mapping,k)?[mapping[k]]:Object.hasOwn(letters,k)?[7,letters[k]]:null;if(codes){e.preventDefault();if(!e.repeat)send(codes);}};
  dial.querySelector('.t89-help').onclick=()=>message('HOME: arithmetic and symbolic algebra. F2 opens Algebra (solve, factor). ◆ F1: Y=; ◆ F3: GRAPH. 2nd ON: off. ON: wake. Keyboard letters work. Reload resets calculator memory; your ROM stays saved.');
  const modal=document.createElement('dialog');modal.className='t89-expanded';modal.setAttribute('aria-label','Expanded TI-89');modal.innerHTML='<button type="button" class="t89-close">Close calculator ×</button><div class="t89-expanded-body"></div>';document.body.append(modal);
  dial.querySelector('.t89-expand').onclick=()=>{modal.querySelector('.t89-expanded-body').append(dial);modal.showModal();dial.querySelector('.t89-expand').hidden=true;visibility();};
  modal.querySelector('.t89-close').onclick=()=>modal.close();modal.addEventListener('close',()=>{$('clock').after(dial);dial.querySelector('.t89-expand').hidden=false;dial.querySelector('.t89-expand').focus();visibility();});
  new MutationObserver(visibility).observe($('clock-panel'),{attributes:true,subtree:true,attributeFilter:['hidden','class']});
  new ResizeObserver(visibility).observe(dial);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',e=>{if(e.persisted)worker?.postMessage({type:'pause',paused:true});else worker?.terminate();});window.addEventListener('pageshow',visibility);visibility();
})();
