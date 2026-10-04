(() => {
  if(embeddedPanel)return;
  const Math84=window.TI84Math,storage='afterglow-ti84-v1';
  const standard={xmin:-10,xmax:10,ymin:-10,ymax:10};
  let state={equations:['sin(X)','0.1X^2-2','','','','','','','',''],enabled:[true,true,true,true,true,true,true,true,true,true],window:{...standard},angle:'RAD',ans:0,variables:{},history:[],tableStart:-2,tableStep:1};
  try{
    const saved=JSON.parse(localStorage.getItem(storage));
    if(saved&&Array.isArray(saved.equations)&&saved.equations.length===10&&saved.equations.every(s=>typeof s==='string'&&s.length<=256)&&Math84.windowValid(saved.window)){
      state.equations=saved.equations;state.window=saved.window;state.angle=saved.angle==='DEG'?'DEG':'RAD';
      if(Array.isArray(saved.enabled)&&saved.enabled.length===10)state.enabled=saved.enabled.map(Boolean);
      if(Number.isFinite(saved.ans))state.ans=saved.ans;
      if(saved.variables&&typeof saved.variables==='object')for(const [k,v] of Object.entries(saved.variables))if(/^[A-Z]$/.test(k)&&Number.isFinite(v))state.variables[k]=v;
      if(Array.isArray(saved.history))state.history=saved.history.filter(h=>typeof h.expression==='string'&&h.expression.length<=256&&typeof h.result==='string'&&h.result.length<100).slice(-20);
      if(Number.isFinite(saved.tableStart)&&Number.isFinite(saved.tableStep)&&saved.tableStep>0){state.tableStart=saved.tableStart;state.tableStep=saved.tableStep;}
    }
  }catch{}
  let view='graph',shift=false,alpha=false,powered=true,entry='',selected=0,traceX=0,target=null,menuItems=[],menuIndex=0;
  const dial=document.createElement('section');dial.id='ti84-clock';dial.hidden=true;dial.tabIndex=0;dial.setAttribute('aria-label','TI-84 Plus graphing calculator');
  const keys=[
    ['math','MATH','TEST','A'],['apps','APPS','ANGLE','B'],['prgm','PRGM','DRAW','C'],['vars','VARS','DISTR',''],['clear','CLEAR','',''],
    ['reciprocal','x⁻¹','MATRIX','D'],['sin','SIN','SIN⁻¹','E'],['cos','COS','COS⁻¹','F'],['tan','TAN','TAN⁻¹','G'],['power','^','π','H'],
    ['square','x²','√','I'],[',',',','EE','J'],['(','(','{','K'],[')',')','}','L'],['/','÷','e','M'],
    ['log','LOG','10ˣ','N'],['7','7','u','O'],['8','8','v','P'],['9','9','w','Q'],['*','×','[','R'],
    ['ln','LN','eˣ','S'],['4','4','L₄','T'],['5','5','L₅','U'],['6','6','L₆','V'],['-','−',']','W'],
    ['store','STO→','RCL','X'],['1','1','L₁','Y'],['2','2','L₂','Z'],['3','3','L₃','θ'],['+','+','MEM','"'],
    ['on','ON','OFF',''],['0','0','CATALOG',' '],['.','.','i',':'],['negative','(−)','ANS','?'],['enter','ENTER','ENTRY','']
  ];
  const button=(id,label,second='',letter='',className='')=>`<div class="ti-key-slot ${className}"><span class="ti-legends"><i>${second}</i><em>${letter}</em></span><button type="button" data-ti-key="${id}" aria-label="${label}">${label}</button></div>`;
  dial.innerHTML=`<div class="ti-case"><div class="ti-brand"><b>TI-84 Plus</b><button type="button" class="ti-expand" aria-label="Expand TI-84">⛶</button></div><div class="ti-display-bezel"><div class="ti-screen"><div class="ti-screen-heading"><span class="ti-view-label"></span><span class="ti-mode-label"></span></div><div class="ti-screen-body"></div></div><span class="ti-maker">TEXAS INSTRUMENTS</span></div>
    <div class="ti-softkeys">${[['y','Y=','STAT PLOT'],['window','WINDOW','TBLSET'],['zoom','ZOOM','FORMAT'],['trace','TRACE','CALC'],['graph','GRAPH','TABLE']].map(k=>button(...k)).join('')}</div>
    <div class="ti-navigation"><div class="ti-nav-left">${button('second','2nd','','','ti-second')}${button('mode','MODE','QUIT')}${button('delete','DEL','INS')}${button('alpha','ALPHA','A-LOCK','','ti-alpha')}${button('x','X,T,θ,n','LINK')}${button('stat','STAT','LIST')}</div><div class="ti-arrows">${[['up','▲'],['left','◀'],['right','▶'],['down','▼']].map(([id,label])=>`<button type="button" data-ti-key="${id}" aria-label="${id[0].toUpperCase()+id.slice(1)}">${label}</button>`).join('')}</div></div>
    <div class="ti-keypad">${keys.map(k=>button(...k,/^\d$|^\.$|^negative$/.test(k[0])?'ti-number':/[+*/-]|enter/.test(k[0])?'ti-operation':'')).join('')}</div>
    <div class="ti-bottom"><a href="https://education.ti.com/download/en/ed-tech/C4D11EB6D86B47D19CD768E54A967441/6CC4C5AED5004F808892046AD33D4A35/TI84Plus_guidebook_EN.pdf" target="_blank" rel="noopener noreferrer">MANUAL ↗</a><button type="button" class="ti-help">QUICK GUIDE</button></div>
    <svg class="ti-scuffs" viewBox="0 0 350 700" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#cec6b5" stroke-width=".5" opacity=".35"><path d="M9 44l3 27m-3 4l2 32m3 188l-5 45m10 167l-5 37m324-454l3 17m-5 96l5 31m-9 82l5 53m-10 187l4 28M40 683l57 4m-54-9l29 4m171 1l61-7M19 236l6 3m-9 201l8-10M265 45l18-2m-9 5l22-5"/><path d="M38 105l62-11m-49 15l12-3M255 169l32-9m-7 7l17-6" opacity=".3"/></g></svg></div><p class="ti-status" role="status">Y= edits equations · GRAPH draws them · ⛶ enlarges the keys</p>`;
  $('clock').after(dial);
  const body=dial.querySelector('.ti-screen-body'),status=dial.querySelector('.ti-status'),modal=document.createElement('dialog');
  modal.className='ti-expanded';modal.setAttribute('aria-label','Expanded TI-84');modal.innerHTML='<button type="button" class="ti-close">Close calculator ×</button><div class="ti-expanded-body"></div>';document.body.append(modal);
  function save(){try{localStorage.setItem(storage,JSON.stringify(state));}catch{}}
  function message(text){status.textContent=text;}
  function env(){return {...state.variables,Ans:state.ans};}
  function compile(i){return Math84.compile(state.equations[i],state.angle);}
  function enabled(){return state.equations.map((e,i)=>e.trim()&&state.enabled[i]?i:-1).filter(i=>i>=0);}
  function header(){dial.querySelector('.ti-view-label').textContent=powered?({home:'HOME',y:'Y=',window:'WINDOW',table:'TABLE',tblset:'TABLE SETUP',graph:'FUNCTION',trace:'TRACE',mode:'MODE',menu:'SELECT',stat:'STAT',help:'QUICK GUIDE'})[view]:'';dial.querySelector('.ti-mode-label').textContent=powered?[alpha?'A':shift?'2nd':'',state.angle].filter(Boolean).join(' '):'';dial.dataset.shift=alpha?'alpha':shift?'second':'';dial.querySelector('[data-ti-key="second"]').setAttribute('aria-pressed',String(shift));dial.querySelector('[data-ti-key="alpha"]').setAttribute('aria-pressed',String(alpha));}
  function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
  function input(value,label,oninput){const e=document.createElement('input');e.type='text';e.value=value;e.maxLength=256;e.autocomplete='off';e.spellcheck=false;e.setAttribute('aria-label',label);e.addEventListener('focus',()=>target=e);e.addEventListener('input',()=>oninput(e.value));return e;}
  function row(label,e){const r=element('label',undefined,'ti-field');r.append(element('span',label),e);return r;}
  function render(next=view){view=next;target=null;menuIndex=0;body.replaceChildren();body.className='ti-screen-body ti-view-'+view;header();if(!powered)return;
    if(view==='home'){
      const history=element('div',undefined,'ti-history');for(const h of state.history.slice(-3)){const r=element('div');r.append(element('span',h.expression),element('b',h.result));history.append(r);}body.append(history);
      const e=input(entry,'Calculation',v=>entry=v);e.placeholder='2+2';body.append(row('›',e));target=e;
    }else if(view==='y'){
      state.equations.forEach((expression,i)=>{const r=element('div',undefined,'ti-equation'),check=document.createElement('input');check.type='checkbox';check.checked=state.enabled[i];check.setAttribute('aria-label','Plot Y'+(i+1));check.onchange=()=>{state.enabled[i]=check.checked;save();};const e=input(expression,'Y'+(i+1)+' expression',v=>{state.equations[i]=v;save();});e.onfocus=()=>{selected=i;target=e;};r.append(check,row('Y'+(i+1)+'=',e));body.append(r);});target=body.querySelectorAll('input[type=text]')[selected]||body.querySelector('input[type=text]');
    }else if(view==='window'||view==='tblset'){
      const data=view==='window'?state.window:{Start:state.tableStart,Step:state.tableStep};
      for(const [name,value] of Object.entries(data)){const e=input(String(value),view==='window'?name:'Table '+name,()=>{});e.dataset.setting=name;body.append(row(name+'=',e));}target=body.querySelector('input');message('Edit values, then press ENTER or GRAPH to apply.');
    }else if(view==='graph'||view==='trace'){draw();}
    else if(view==='table'){table();}
    else if(view==='mode'){
      body.append(element('p','ANGLE'));for(const mode of ['RAD','DEG']){const b=element('button',(state.angle===mode?'● ':'○ ')+mode);b.type='button';b.onclick=()=>{state.angle=mode;save();render('mode');};body.append(b);}body.append(element('p','FUNCTION · REAL · FLOAT'));message('Radian or degree mode applies to calculations and graphs.');
    }else if(view==='menu'){menuItems.forEach(([label,action],i)=>{const b=element('button',(i+1)+': '+label);b.type='button';b.onclick=action;body.append(b);});}
    else if(view==='stat'){
      const e=input('', 'Statistics values',()=>{});e.placeholder='1,2,3,4';body.append(element('p','1-VAR STATS'),row('L1=',e));target=e;const b=element('button','Calculate');b.type='button';b.onclick=stats;body.append(b);message('Enter comma-separated values, then ENTER.');
    }else if(view==='help'){
      body.append(element('p','Y= → enter sin(X) → GRAPH. TRACE + arrows explores a curve. 2nd GRAPH opens TABLE. MODE switches radians/degrees. 2nd MODE returns HOME. ⛶ opens bigger keys.'));
      body.append(element('p','Browser recreation: real-valued arithmetic and function graphs. No Z80 emulation, TI-BASIC, games, matrices, complex numbers or external apps.'));
    }
  }
  function applySettings(){
    if(view!=='window'&&view!=='tblset')return true;
    const data={};for(const e of body.querySelectorAll('[data-setting]')){try{data[e.dataset.setting]=Math84.compile(e.value,state.angle)(state.variables.X||0,env());}catch{message('Invalid '+e.dataset.setting);return false;}}
    if(view==='window'){if(!Math84.windowValid(data)){message('Minimums must be below maximums; use a finite window within ±1e12.');return false;}state.window=data;}
    else{if(!Number.isFinite(data.Start)||!Number.isFinite(data.Step)||data.Step<=0){message('Table step must be positive and finite.');return false;}state.tableStart=data.Start;state.tableStep=data.Step;}
    save();return true;
  }
  function draw(){
    body.replaceChildren();const w=state.window,W=192,H=112,px=x=>(x-w.xmin)/(w.xmax-w.xmin)*W,py=y=>H-(y-w.ymin)/(w.ymax-w.ymin)*H;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Function graph from X '+Math84.format(w.xmin)+' to '+Math84.format(w.xmax));svg.classList.add('ti-graph');
    const path=(d,attrs={})=>{const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',d);for(const [k,v] of Object.entries(attrs))p.setAttribute(k,v);svg.append(p);};
    const nice=span=>{const p=10**Math.floor(Math.log10(span/8)),f=span/8/p;return (f>5?10:f>2?5:f>1?2:1)*p;};
    const dx=nice(w.xmax-w.xmin),dy=nice(w.ymax-w.ymin);let grid='';
    for(let i=Math.ceil(w.xmin/dx);i<=Math.floor(w.xmax/dx)&&i<Math.ceil(w.xmin/dx)+25;i++)grid+=`M${px(i*dx)} 0V${H}`;
    for(let i=Math.ceil(w.ymin/dy);i<=Math.floor(w.ymax/dy)&&i<Math.ceil(w.ymin/dy)+25;i++)grid+=`M0 ${py(i*dy)}H${W}`;
    path(grid,{opacity:'.17','stroke-width':'.4'});if(w.xmin<=0&&w.xmax>=0)path(`M${px(0)} 0V${H}`,{'stroke-width':'.7'});if(w.ymin<=0&&w.ymax>=0)path(`M0 ${py(0)}H${W}`,{'stroke-width':'.7'});
    const errors=[];const active=enabled();
    for(const i of active){try{const segments=Math84.sample(compile(i),w,env());for(const segment of segments)path(segment.map(([x,y],j)=>(j?'L':'M')+px(x).toFixed(3)+' '+py(y).toFixed(3)).join(''),{'stroke-width':i===selected?'1.2':'.8','stroke-dasharray':i%3===1?'3 1':i%3===2?'1 1':'none'});}catch(e){errors.push('Y'+(i+1)+': '+e.message);}}
    const readout=element('div',undefined,'ti-graph-readout');
    if(view==='trace'&&active.length){
      if(!active.includes(selected))selected=active[0];traceX=Math.max(w.xmin,Math.min(w.xmax,traceX));let y=NaN;try{y=compile(selected)(traceX,env());}catch{}
      if(Number.isFinite(y)&&y>=w.ymin&&y<=w.ymax)path(`M${px(traceX)-3} ${py(y)}h6M${px(traceX)} ${py(y)-3}v6`,{'stroke-width':'1'});
      readout.textContent='Y'+(selected+1)+' X='+Math84.format(traceX)+' Y='+Math84.format(y);
    }else readout.textContent='X ['+Math84.format(w.xmin)+','+Math84.format(w.xmax)+']  Y ['+Math84.format(w.ymin)+','+Math84.format(w.ymax)+']';
    svg.addEventListener('pointerdown',e=>{const r=svg.getBoundingClientRect();traceX=w.xmin+(e.clientX-r.left)/r.width*(w.xmax-w.xmin);view='trace';header();draw();});
    body.append(svg,readout);if(errors.length)message(errors.join(' · '));else message(active.length?active.map(i=>'Y'+(i+1)+'='+state.equations[i]).join(' · '):'No equations selected. Press Y= to add one.');
  }
  function table(){
    const active=enabled().slice(0,2),t=element('table'),head=element('tr');['X',...active.map(i=>'Y'+(i+1))].forEach(label=>head.append(element('th',label)));t.append(head);
    const functions=active.map(i=>{try{return compile(i);}catch{return ()=>NaN;}});
    for(let j=0;j<6;j++){const x=state.tableStart+j*state.tableStep,r=element('tr');r.append(element('td',Math84.format(x)));for(const fn of functions){let y;try{y=fn(x,env());}catch{y=NaN;}r.append(element('td',Math84.format(y)));}t.append(r);}body.append(t);message('↑/↓ changes rows · 2nd WINDOW sets start and step · first two selected functions');
  }
  let menuEditor=null;
  function insert(text){
    if(view==='menu'&&menuEditor){const restore=menuEditor;render(restore.view);target=body.querySelectorAll('input[type=text]')[restore.index];target?.setSelectionRange(restore.start,restore.end);menuEditor=null;}
    if(!['home','y','window','tblset','stat'].includes(view))render('home');
    if(!target?.isConnected)target=body.querySelector('input[type=text]');if(!target)return;
    const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;
    if(target.value.length-(end-start)+text.length>256){message('256 characters maximum');return;}
    target.setRangeText(text,start,end,'end');target.dispatchEvent(new Event('input',{bubbles:true}));target.focus({preventScroll:true});
  }
  function erase(clear=false){if(!target?.isConnected){if(view==='graph'||view==='trace'){render('home');return;}target=body.querySelector('input[type=text]');}if(!target)return;if(clear){target.value='';target.dispatchEvent(new Event('input',{bubbles:true}));}else {const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;target.setRangeText('',start===end?Math.max(0,start-1):start,end,'end');target.dispatchEvent(new Event('input',{bubbles:true}));}target.focus({preventScroll:true});}
  function calculate(){
    if(view==='window'||view==='tblset'){if(applySettings())render(view==='window'?'graph':'table');return;}
    if(view==='y'){if(selected<9){selected++;target=body.querySelectorAll('input[type=text]')[selected];target.focus();}return;}
    if(view==='stat'){stats();return;}
    if(view==='menu'){menuItems[menuIndex]?.[1]();return;}
    if(view!=='home'){render('home');return;}
    const source=entry.trim()||state.history.at(-1)?.expression;if(!source)return;
    try{const parts=source.split('→');if(parts.length>2||parts.length===2&&!/^[A-Z]$/.test(parts[1].trim()))throw Error('STO needs one letter, A–Z');const value=Math84.compile(parts[0],state.angle)(state.variables.X||0,env());if(!Number.isFinite(value))throw Error('DOMAIN: no finite real result');state.ans=value;if(parts.length===2)state.variables[parts[1].trim()]=value;state.history.push({expression:source,result:Math84.format(value)});state.history=state.history.slice(-20);entry='';save();render('home');message('ENTER repeats the last expression · 2nd ENTER recalls it');}
    catch(e){message(e.message);}
  }
  function menu(items){menuEditor=target?.isConnected?{view,index:[...body.querySelectorAll('input[type=text]')].indexOf(target),start:target.selectionStart,end:target.selectionEnd}:null;menuItems=items;render('menu');}
  function zoom(factor){const w=state.window,cx=(w.xmin+w.xmax)/2,cy=(w.ymin+w.ymax)/2,rx=(w.xmax-w.xmin)*factor/2,ry=(w.ymax-w.ymin)*factor/2,next={xmin:cx-rx,xmax:cx+rx,ymin:cy-ry,ymax:cy+ry};if(!Math84.windowValid(next)){message('Zoom limit reached');return;}state.window=next;save();render('graph');}
  function zoomMenu(){menu([['Zoom In',()=>zoom(.5)],['Zoom Out',()=>zoom(2)],['ZStandard',()=>{state.window={...standard};save();render('graph');}],['ZTrig',()=>{state.window={xmin:state.angle==='RAD'?-2*Math.PI:-360,xmax:state.angle==='RAD'?2*Math.PI:360,ymin:-2,ymax:2};save();render('graph');}],['ZoomFit',()=>{const ys=[];for(const i of enabled()){try{const fn=compile(i);for(let j=0;j<=192;j++){const y=fn(state.window.xmin+j*(state.window.xmax-state.window.xmin)/192,env());if(Number.isFinite(y)&&Math.abs(y)<1e10)ys.push(y);}}catch{}}if(!ys.length){message('No finite values to fit');return;}let min=Math.min(...ys),max=Math.max(...ys);const pad=(max-min)*.1||1;const w={...state.window,ymin:min-pad,ymax:max+pad};if(Math84.windowValid(w)){state.window=w;save();render('graph');}}]]);}
  function stats(){try{const e=body.querySelector('input');const values=e.value.split(',').map(s=>{if(!s.trim())throw Error('Enter comma-separated numbers');return Math84.compile(s,state.angle)(0,env());});if(values.length>200||!values.every(Number.isFinite))throw Error('Use up to 200 finite values');const n=values.length,mean=values.reduce((a,b)=>a+b,0)/n,variance=values.reduce((a,b)=>a+(b-mean)**2,0);body.replaceChildren();[['n',n],['x̄',mean],['Σx',values.reduce((a,b)=>a+b,0)],['σx',Math.sqrt(variance/n)],['Sx',n>1?Math.sqrt(variance/(n-1)):NaN]].forEach(([k,v])=>body.append(element('div',k+'='+Math84.format(v))));target=null;message('STAT starts a new sample list.');}catch(e){message(e.message);}}
  function arrow(key){
    if(view==='trace'){const active=enabled();if(key==='left'||key==='right')traceX+=(key==='left'?-1:1)*(state.window.xmax-state.window.xmin)/95;else if(active.length)selected=active[(Math.max(0,active.indexOf(selected))+(key==='up'?-1:1)+active.length)%active.length];draw();}
    else if(view==='graph'){view='trace';header();draw();}
    else if(view==='table'){state.tableStart+=(key==='up'?-1:key==='down'?1:0)*state.tableStep;save();render('table');}
    else if(view==='menu'){menuIndex=(menuIndex+(key==='up'?-1:1)+menuItems.length)%menuItems.length;body.querySelectorAll('button')[menuIndex]?.focus();}
    else if(target?.isConnected){if(key==='left'||key==='right'){const p=Math.max(0,Math.min(target.value.length,(target.selectionStart??0)+(key==='left'?-1:1)));target.setSelectionRange(p,p);target.focus({preventScroll:true});}else {const inputs=[...body.querySelectorAll('input[type=text]')],index=inputs.indexOf(target);target=inputs[Math.max(0,Math.min(inputs.length-1,index+(key==='up'?-1:1)))];target?.focus();}}
  }
  function key(id){
    if(id==='on'){powered=!powered||!shift;shift=false;alpha=false;render();return;}if(!powered)return;
    if(id==='second'){shift=!shift;alpha=false;header();return;}if(id==='alpha'){alpha=!alpha;shift=false;header();return;}
    const secondary=shift,letter=alpha;shift=false;alpha=false;header();
    if(letter){const k=keys.find(k=>k[0]===id);if(k?.[3]&&/^[A-Z ]$/.test(k[3]))insert(k[3]);else message('Use an A–Z key for a variable.');return;}
    if(secondary){
      const snippets={sin:'asin(',cos:'acos(',tan:'atan(',square:'sqrt(',power:'pi',log:'10^(',ln:'exp(',negative:'Ans',',':'E', '/':'e'};
      if(Object.hasOwn(snippets,id)){insert(snippets[id]);return;}
      if(id==='mode'){render('home');return;}if(id==='graph'){if(applySettings())render('table');return;}if(id==='window'){if(applySettings())render('tblset');return;}if(id==='enter'){entry=state.history.at(-1)?.expression||'';render('home');return;}
      if(id==='trace'){menu([['Value / trace',()=>render('trace')],['Zero in window',()=>{try{const i=enabled()[0];if(i===undefined)throw Error('Select an equation first');traceX=Math84MathZero(i);selected=i;render('trace');message('Zero: X='+Math84.format(traceX));}catch(e){message(e.message);}}]]);return;}
      if(id==='0'){menu(['sqrt','abs','ln','log','sin','cos','tan','asin','acos','atan','exp'].map(name=>[name,()=>insert(name+'(')]));return;}
      message('That secondary function is not included in this browser edition.');return;
    }
    if(view==='menu'&&/^[1-9]$/.test(id)){menuItems[Number(id)-1]?.[1]();return;}
    if(['y','window','graph','trace'].includes(id)){if(applySettings())render(id);return;}
    if(['up','down','left','right'].includes(id)){arrow(id);return;}
    switch(id){
      case 'zoom':if(applySettings())zoomMenu();return;
      case 'mode':render('mode');return;
      case 'stat':render('stat');return;
      case 'clear':erase(true);return;
      case 'delete':erase();return;
      case 'enter':calculate();return;
      case 'math':menu([['abs(',()=>insert('abs(')],['sqrt(',()=>insert('sqrt(')],['cube',()=>insert('^3')],['factorial !',()=>insert('!')],['nCr(',()=>insert('nCr(')],['nPr(',()=>insert('nPr(')],['int(',()=>insert('int(')],['round(',()=>insert('round(')]]);return;
      case 'vars':menu([['Ans',()=>insert('Ans')],['X',()=>insert('X')],['π',()=>insert('pi')],...Object.entries(state.variables).slice(0,5).map(([k,v])=>[k+'='+Math84.format(v),()=>insert(k)])]);return;
      case 'apps':case 'prgm':message('Apps and TI-BASIC need an emulator; this edition does calculations and graphs.');return;
      case 'store':insert('→');return;
      case 'x':insert('X');return;
      case 'square':insert('^2');return;
      case 'reciprocal':insert('^(-1)');return;
      case 'power':insert('^');return;
      case 'negative':insert('-');return;
      case 'sin':case 'cos':case 'tan':case 'log':case 'ln':insert(id+'(');return;
      default:if(/^[0-9.+*/(),-]$/.test(id))insert(id);
    }
  }
  function Math84MathZero(i){return Math84.zero(compile(i),state.window.xmin,state.window.xmax,env());}
  dial.querySelectorAll('[data-ti-key]').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();dial.focus({preventScroll:true});});button.addEventListener('click',()=>key(button.dataset.tiKey));});
  dial.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('.ti-bottom,.ti-expand'))return;
    if(e.key==='Enter'){e.preventDefault();calculate();return;}
    if(e.key==='Escape'){e.preventDefault();shift=false;alpha=false;render('home');return;}
    if(e.target.tagName==='INPUT')return;
    if(e.key.startsWith('Arrow')){e.preventDefault();arrow(e.key.slice(5).toLowerCase());return;}
    if(e.key==='Backspace'){e.preventDefault();erase();return;}
    if(/^[0-9a-zA-Z.+*/^(),! -]$/.test(e.key)){e.preventDefault();insert(e.key);}
  });
  dial.querySelector('.ti-help').onclick=()=>render('help');
  dial.querySelector('.ti-expand').onclick=()=>{modal.querySelector('.ti-expanded-body').append(dial);modal.showModal();dial.querySelector('.ti-expand').hidden=true;};
  modal.querySelector('.ti-close').onclick=()=>modal.close();modal.addEventListener('close',()=>{$('clock').after(dial);dial.querySelector('.ti-expand').hidden=false;dial.querySelector('.ti-expand').focus();});
  window.TI84Face={dial,home:()=>render('home')};render();
})();
