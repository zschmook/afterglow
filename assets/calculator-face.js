/* Casio module 463-inspired controls. The LCD and 16-key legends share C1/C2 modes. */
(() => {
  if(embeddedPanel)return;
  const dial=document.createElement('div');dial.id='calculator-clock';dial.hidden=true;
  dial.setAttribute('role','group');dial.setAttribute('aria-label','Calculator watch');
  // Each key: ordinary, F1, F2, and C2 INV function, in the reference layout.
  const keys=[
    ['7','sign','sign','DEC'],['8','reciprocal','factorial','BIN'],['9','sqrt','square','OCT'],['/','MR','DEG','HEX'],
    ['4','log','pow10','E'],['5','ln','exp','F'],['6','^','root','XOR'],['*','Min','RAD','AND'],
    ['1','sin','asin','B'],['2','cos','acos','C'],['3','tan','atan','D'],['-','M-','GRA','NEG'],
    ['0','DMS','DEL','A'],['.','EXP','pi','EXP'],['=','(',')','='],['+','M+','%','OR']
  ];
  const names={'/':'÷','*':'×','-':'−','sign':'+/−',reciprocal:'1/x',factorial:'x!',sqrt:'√',square:'x²',pow10:'10ˣ',exp:'eˣ','^':'xʸ',root:'x¹/ʸ',asin:'sin⁻¹',acos:'cos⁻¹',atan:'tan⁻¹',DMS:'° ′ ″',DEL:'←',pi:'π'};
  const label=key=>names[key]||key;
  const accessible={'/':'Divide','*':'Multiply','-':'Subtract','+':'Add','=':'Equals','.':'Decimal point',sign:'Change sign',reciprocal:'Reciprocal',sqrt:'Square root',square:'Square',factorial:'Factorial','^':'Power',root:'Nth root',Min:'Store memory',MR:'Recall memory','M+':'Add to memory','M-':'Subtract from memory',DEL:'Delete digit',pi:'Pi','(':'Open parenthesis',')':'Close parenthesis',DMS:'Degrees to degrees minutes seconds'};
  dial.innerHTML=`<div class="cw-case">
    <div class="cw-bezel">
      <div class="cw-brand"><b>CASIO</b><span>CFX-400</span></div>
      <div class="cw-lcd">
        <div class="cw-indicators"><span id="cw-mode">TIME</span><span id="cw-angle"></span><span id="cw-memory"></span><span id="cw-layer"></span></div>
        <div id="cw-context" class="cw-context"></div>
        <output id="cw-display" aria-label="Current time">0</output>
        <div id="cw-live-time" class="cw-live-time"></div>
      </div>
      <div class="cw-caption">SCIENTIFIC CALCULATOR</div>
    </div>
    <div class="cw-controls"><button type="button" id="cw-clear" title="Clear entry; press again to clear calculation">C / AC</button><button type="button" id="cw-mode-key" title="Time → scientific → base-n → alarm → stopwatch">MODE</button><button type="button" id="cw-f1" aria-pressed="false">F1 / LIGHT</button><button type="button" id="cw-f2" aria-pressed="false">F2 / INV</button></div>
    <div class="cw-key-bezel"><div class="cw-keypad">
      ${keys.map((row,i)=>`<button type="button" data-index="${i}"><span class="cw-key-top"><small>${label(row[1])}</small><em>${label(row[2])}</em></span><span class="cw-key-bottom"><strong>${label(row[0])}</strong><small>${label(row[3])}</small></span></button>`).join('')}
    </div></div>
    <div id="cw-help" class="cw-bottom">MODE → SCIENTIFIC CALCULATOR</div>
  </div>`;
  $('clock').after(dial);
  const calculator=new window.WatchCalculator();let mode='time',layer=0,lastTime='',lastDate='',stamp='',cleared=false,lastAction=Date.now();
  let stopwatchStart=null,stopwatchElapsed=0,split=null;
  const modes=['time','sci','base','alarm','stopwatch'];
  const output=$('cw-display');
  const segmentShapes=['3,1 17,1 19,3 17,5 3,5 1,3','17,5 20,3 20,17 18,19 16,17','18,21 20,23 20,37 17,35 16,23','3,35 17,35 19,37 17,39 3,39 1,37','0,23 2,21 4,23 3,35 0,37','0,3 3,5 4,17 2,19 0,17','3,18 17,18 19,20 17,22 3,22 1,20'];
  const segments={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg','-':'g',A:'abcefg',B:'cdefg',C:'adef',D:'bcdeg',E:'adefg',F:'aefg',e:'abdefg',r:'eg',o:'cdeg'};
  let lastDisplay='';
  function showLCD(value){
    if(value===lastDisplay)return;lastDisplay=value;output.setAttribute('aria-label',(mode==='time'?'Current time: ':'Display: ')+value);
    output.replaceChildren();
    const text=document.createElement('span');text.className='cw-readable';text.textContent=value;output.append(text);
    const screen=document.createElement('span');screen.className='cw-segments';screen.setAttribute('aria-hidden','true');
    for(const char of value){
      if(char===' '){const gap=document.createElement('span');gap.className='cw-space';screen.append(gap);continue;}
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',char==='.'||char===':'?'0 0 7 40':'0 0 22 40');
      if(char==='.'||char===':')svg.innerHTML=char==='.'?'<circle cx="3" cy="37" r="2"/>':'<circle cx="3" cy="13" r="2"/><circle cx="3" cy="28" r="2"/>';
      else if(segments[char])svg.innerHTML=segmentShapes.map((p,i)=>`<polygon points="${p}" opacity="${segments[char].includes('abcdefg'[i])?1:.07}"/>`).join('');
      else svg.innerHTML=`<text x="1" y="32" font-size="24" font-family="monospace">${char==='<'?'':char}</text>`;
      screen.append(svg);
    }
    output.append(screen);output.classList.toggle('cw-binary',value.length>18);
  }
  function activeKey(i){return keys[i][mode==='base'?(layer?3:0):layer];}
  function render(){
    const calc=mode==='sci'||mode==='base';
    $('cw-mode').textContent=({time:'TIME',sci:'C1',base:'C2',alarm:'AL',stopwatch:'ST'})[mode];
    $('cw-angle').textContent=mode==='sci'?calculator.angle:mode==='base'?({2:'BIN',8:'OCT',10:'DEC',16:'HEX'})[calculator.base]:'';
    $('cw-memory').textContent=calculator.memory?'M':'';$('cw-layer').textContent=layer?(mode==='base'?'INV':'F'+layer):'';
    $('cw-context').textContent=mode==='time'?lastDate:mode==='alarm'?'PRESS C/AC TO SET':mode==='stopwatch'?(split!==null?'SPLIT':stopwatchStart!==null?'RUNNING':'STOPPED'):calculator.context||'0';
    if(calc)showLCD(calculator.display);
    else if(mode==='time')showLCD(lastTime.replace(/\s*[AP]M$/i,''));
    else if(mode==='alarm')showLCD('AL');
    $('cw-live-time').textContent=mode==='time'?(preferences.clock24?'24H':lastTime.match(/[AP]M$/i)?.[0]||''):lastTime;
    output.setAttribute('aria-live',calc?'polite':'off');
    $('cw-f1').setAttribute('aria-pressed',String(['time','base','alarm'].includes(mode)?dial.classList.contains('cw-lit'):mode==='stopwatch'?split!==null:layer===1));
    $('cw-f2').setAttribute('aria-pressed',String(mode==='time'?preferences.clock24:mode==='stopwatch'?stopwatchStart!==null:mode==='base'?layer>0:layer===2));
    dial.dataset.layer=mode==='base'&&layer?'inv':String(layer);
    $('cw-clear').textContent=mode==='alarm'?'SET':mode==='time'?'12 / 24H':'C / AC';
    $('cw-f1').textContent=['time','base','alarm'].includes(mode)?'LIGHT':mode==='stopwatch'?'SPLIT / RESET':'F1';
    $('cw-f2').disabled=mode==='alarm';
    $('cw-f2').textContent=mode==='time'?'12 / 24H':mode==='stopwatch'?'START / STOP':mode==='base'?'INV':'F2';
    $('cw-help').textContent=({time:'MODE → SCIENTIFIC CALCULATOR',sci:'F1 / F2 SELECT THE UPPER KEY LEGENDS',base:'INV SELECTS BASES & LOGIC',alarm:'USES YOUR DASHBOARD ALARM',stopwatch:'F2 START / STOP · F1 SPLIT / RESET'})[mode];
    for(const button of dial.querySelectorAll('[data-index]')){
      const key=activeKey(+button.dataset.index);
      button.disabled=!calc||(mode==='base'&&(key==='EXP'||key==='.'||(/^[0-9A-F]$/.test(key)&&parseInt(key,16)>=calculator.base)));
      button.setAttribute('aria-label',accessible[key]||label(key));button.title=accessible[key]||label(key);
    }
  }
  function press(key){if(mode!=='sci'&&mode!=='base')return;calculator.press(key);cleared=false;lastAction=Date.now();render();}
  function changeMode(){
    mode=modes[(modes.indexOf(mode)+1)%modes.length];layer=0;cleared=false;
    if(mode==='sci'||mode==='base')calculator.setProgrammer(mode==='base');render();
  }
  function formatSwitch(){preferences.clock24=!preferences.clock24;savePreferences();$('clock-format').value=preferences.clock24?'24':'12';stamp='';}
  dial.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||!dial.contains(button))return;event.stopPropagation();lastAction=Date.now();
    if(button.dataset.index!==undefined){press(activeKey(+button.dataset.index));return;}
    if(button.id==='cw-mode-key'){changeMode();return;}
    if(mode==='time'){if(button.id==='cw-f1'){const lit=dial.classList.toggle('cw-lit');button.setAttribute('aria-pressed',String(lit));}else formatSwitch();return;}
    if(button.id==='cw-f1'&&['base','alarm'].includes(mode)){const lit=dial.classList.toggle('cw-lit');button.setAttribute('aria-pressed',String(lit));return;}
    if(mode==='alarm'){if(button.id==='cw-clear')$('open-alarm').click();return;}
    if(mode==='stopwatch'){
      if(button.id==='cw-f2'){if(stopwatchStart===null)stopwatchStart=performance.now();else {stopwatchElapsed+=performance.now()-stopwatchStart;stopwatchStart=null;}}
      else if(button.id==='cw-clear'){stopwatchStart=null;stopwatchElapsed=0;split=null;}
      else if(button.id==='cw-f1'){if(stopwatchStart===null){stopwatchElapsed=0;split=null;}else split=split===null?stopwatchElapsed+performance.now()-stopwatchStart:null;}
      render();return;
    }
    if(button.id==='cw-clear'){calculator.press(cleared?'AC':'CE');cleared=true;layer=0;}
    else {layer=mode==='base'?(layer?0:1):layer===(button.id==='cw-f1'?1:2)?0:(button.id==='cw-f1'?1:2);cleared=false;}
    render();
  });
  // Only capture calculator typing while a watch control is focused.
  dial.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey||!['sci','base'].includes(mode))return;
    let key=event.key;if(key==='Enter'||key===' ')return; // Keep native button activation.
    if(key==='Escape')key='AC';else if(key==='Backspace'||key==='Delete')key='DEL';
    if(!/^[0-9A-Fa-f.+*/%=^()\-]$/.test(key)&&key!=='AC'&&key!=='DEL')return;
    event.preventDefault();event.stopPropagation();press(/^[a-f]$/.test(key)?key.toUpperCase():key);
  });
  window.CalculatorFace={dial,tick(now,h,m,s,digital,timeZone){
    if(dial.hidden||preferences.centerContent!=='clock'||$('clock-panel').classList.contains('show-calendar'))return;
    if(['sci','base'].includes(mode)&&Date.now()-lastAction>=300000){mode='time';layer=0;render();}
    if(mode==='stopwatch'){
      const ms=split??(stopwatchElapsed+(stopwatchStart===null?0:performance.now()-stopwatchStart));
      const cs=Math.floor(ms/10),sec=Math.floor(cs/100)%60,min=Math.floor(cs/6000)%60,hours=Math.floor(cs/360000);
      showLCD(`${String(hours).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')} ${String(cs%100).padStart(2,'0')}`);
    }
    const key=[Math.floor(now.getTime()/1000),digital,timeZone].join('|');if(key===stamp)return;stamp=key;
    const parts=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const part=name=>parts.find(p=>p.type===name)?.value||'';
    lastDate=`${part('weekday').toUpperCase()}    ${part('month')}-${part('day')}`;
    lastTime=digital.replace(/\s*([AP]M)$/i,`:${String(Math.floor(s)).padStart(2,'0')} $1`);
    if(!/[AP]M$/i.test(digital))lastTime=digital+':'+String(Math.floor(s)).padStart(2,'0');
    if(mode==='time')render();else $('cw-live-time').textContent=lastTime;
  }};
  render();
})();
