(() => {
  if(embeddedPanel)return;
  const calc=new window.HP12Calculator(),storageKey='afterglow-hp12c-v1';
  try{calc.restore(JSON.parse(localStorage.getItem(storageKey)));}catch{}
  const dial=document.createElement('section');dial.id='hp12c-clock';dial.hidden=true;dial.setAttribute('aria-label','HP 12C financial calculator');
  // base label/action, gold label/action, blue label/action; null actions are visibly unavailable.
  const keys=[
    ['n','n','AMORT','AMORT','12×','12x'],['i','i','INT','INT','12÷','12/'],['PV','PV','NPV','NPV','CF₀','CF0'],['PMT','PMT','RND','RND','CFⱼ','CFj'],['FV','FV','IRR','IRR','Nⱼ','Nj'],['CHS','CHS','','','DATE','DATE'],['7','7','','','BEG','BEG'],['8','8','','','END','END'],['9','9','','','MEM','MEM'],['÷','/','','','',''],
    ['yˣ','power','PRICE',null,'√x','sqrt'],['1/x','reciprocal','YTM',null,'eˣ','exp'],['%T','%T','SL','SL','LN','ln'],['Δ%','delta%','SOYD','SOYD','FRAC','FRAC'],['%','%','DB','DB','INTG','INTG'],['EEX','EEX','','','ΔDYS','DAYS'],['4','4','','','D.MY','DMY'],['5','5','','','M.DY','MDY'],['6','6','','','x̄w','weighted'],['×','*','','','',''],
    ['R/S',null,'P/R',null,'PSE',null],['SST',null,'Σ','clearSTATS','BST',null],['R↓','roll','PRGM',null,'GTO',null],['x⇄y','swap','FIN','clearFIN','x≤y',null],['CLx','CLx','REG','clearREG','x=0',null],['ENTER','ENTER','PREFIX','PREFIX','LSTx','LASTx'],['1','1','','','x̂,r','estimateX'],['2','2','','','ŷ,r','estimateY'],['3','3','','','n!','factorial'],['−','-','','','',''],
    ['ON','ON','','','',''],['f','f','','','',''],['g','g','','','',''],['STO','STO','','','',''],['RCL','RCL','','','',''],['0','0','','','x̄','mean'],['.','.','','','s','sd'],['Σ+','sigma+','','','Σ−','sigma-'],['+','+','','','','']
  ];
  const names={n:'Number of periods',i:'Periodic interest',PV:'Present value',PMT:'Payment',FV:'Future value',CHS:'Change sign',ENTER:'Enter',CLx:'Clear X',roll:'Roll stack down',swap:'Swap X and Y',power:'Y to the power X',reciprocal:'Reciprocal','/':'Divide','*':'Multiply','-':'Subtract','+':'Add','sigma+':'Add statistical sample','sigma-':'Remove statistical sample',f:'Gold shift',g:'Blue shift',STO:'Store register',RCL:'Recall register',ON:'Power',AMORT:'Amortize',INT:'Simple interest',NPV:'Net present value',IRR:'Internal rate of return',CF0:'Initial cash flow',CFj:'Next cash flow',Nj:'Cash flow repetitions',clearFIN:'Clear financial registers',clearREG:'Clear all registers',clearSTATS:'Clear statistics',BEG:'Begin payments',END:'End payments',sqrt:'Square root',factorial:'Factorial'};
  dial.innerHTML=`<div class="hp-toolbar"><a href="https://h10032.www1.hp.com/ctg/Manual/c00363319.pdf" target="_blank" rel="noopener noreferrer">HP 12C MANUAL ↗</a><button type="button" class="hp-help">Quick guide</button><button type="button" class="hp-expand" aria-label="Expand calculator">⛶</button></div>
    <div class="hp-scroll"><div class="hp-case"><div class="hp-fascia"><div class="hp-lcd"><output class="hp-display" aria-live="polite" aria-label="Calculator display">0.00</output><div class="hp-indicators"></div></div><div class="hp-badge"><b>hp</b><span>12C</span></div><div class="hp-brand">HEWLETT·PACKARD<span>FINANCIAL CALCULATOR</span></div></div><div class="hp-keys">${keys.map((k,j)=>`<div class="hp-key-slot ${j===25?'hp-enter':''}" style="grid-row:${j===25?'3 / 5':Math.floor((j>34?j+1:j)/10)+1};grid-column:${(j>34?j+1:j)%10+1}"><span class="hp-gold ${k[3]===null?'hp-unavailable':''}">${k[2]}</span><button type="button" data-hp-key="${j}" class="${k[1]==='f'?'hp-f':k[1]==='g'?'hp-g':''}"><strong>${k[0]}</strong><small class="${k[5]===null?'hp-unavailable':''}">${k[4]}</small></button></div>`).join('')}</div></div></div><p class="hp-status" role="status"></p>`;
  $('clock').after(dial);
  const modal=document.createElement('dialog');modal.className='hp-expanded';modal.setAttribute('aria-label','Expanded financial calculator');
  modal.innerHTML='<button type="button" class="hp-close">Close calculator ×</button><div class="hp-expanded-body"></div>';document.body.append(modal);
  const help=document.createElement('dialog');help.className='hp-guide';help.setAttribute('aria-labelledby','hp-guide-title');
  help.innerHTML=`<div class="dialog-heading"><h2 id="hp-guide-title">Your HP 12C</h2><button type="button" aria-label="Close calculator guide">×</button></div><p><b>RPN:</b> type <kbd>2</kbd> <kbd>ENTER</kbd> <kbd>3</kbd> <kbd>+</kbd> to get 5. There is no equals key. ENTER copies X into Y; arithmetic combines Y and X.</p><p><b>Gold f / blue g:</b> press a shift, then the key with that colored legend. <kbd>f</kbd> + a digit sets decimal places. <kbd>STO</kbd>/<kbd>RCL</kbd> + 0–9 selects memory; use a dot before the digit for R10–R19. Financial registers work with STO/RCL too.</p><p><b>Monthly loan:</b> <kbd>f CLx</kbd> clears registers. Enter <kbd>30 g n</kbd>, <kbd>6 g i</kbd>, <kbd>200000 PV</kbd>, then <kbd>PMT</kbd>. Result: −1,199.10 per month. Cash paid out is negative. Interest is a percent per payment period.</p><p><b>Investments:</b> enter the initial amount with <kbd>g PV</kbd> (CF₀), then each payment with <kbd>g PMT</kbd> (CFⱼ); <kbd>g FV</kbd> sets its repetition count. Set <kbd>i</kbd>, then <kbd>f PV</kbd> for NPV or <kbd>f FV</kbd> for IRR. IRR can have multiple solutions.</p><p><b>Memory:</b> stack, financial registers and cash flows survive a reload on this browser. <kbd>g 9</kbd> shows the stack and financial registers. Click the calculator before using keyboard shortcuts: Enter, digits, arithmetic, Backspace, Escape to clear, F/G to shift.</p><p><b>This edition:</b> RPN arithmetic, whole-period TVM, cash flows, amortization, depreciation, statistics and dates. Bond pricing, programming and odd-period TVM are not implemented; their keys are dimmed. Arithmetic uses browser precision rather than original HP hardware rounding. Date results include a readable date below the display.</p><a href="https://h10032.www1.hp.com/ctg/Manual/c00363319.pdf" target="_blank" rel="noopener noreferrer">Open the original HP manual (PDF) ↗</a>`;
  document.body.append(help);help.querySelector('button').onclick=()=>help.close();
  let shift='',pending=null,powered=true;const output=dial.querySelector('.hp-display'),status=dial.querySelector('.hp-status');
  const segments={0:'abcdef',1:'bc',2:'abdeg',3:'abcdg',4:'bcfg',5:'acdfg',6:'acdefg',7:'abc',8:'abcdefg',9:'abcdfg','-':'g',E:'adefg',r:'eg',o:'cdeg'};
  const paths=['M3 2H15','M17 4V16','M17 20V32','M3 34H15','M1 20V32','M1 4V16','M3 18H15'];
  function lcd(value){
    output.replaceChildren();const readable=document.createElement('span');readable.className='hp-readable';readable.textContent=value;output.append(readable);
    const screen=document.createElement('span');screen.className='hp-segments';screen.setAttribute('aria-hidden','true');
    for(const char of value){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',/[,. ]/.test(char)?'0 0 7 37':'0 0 20 37');
      if(segments[char])svg.innerHTML=paths.map((p,j)=>`<path d="${p}" opacity="${segments[char].includes('abcdefg'[j])?1:.055}"/>`).join('');
      else if(char==='.'||char===',')svg.innerHTML='<circle cx="3" cy="34" r="1.5"/>'+(char===','?'<path d="M3 34L1 37"/>':'');
      screen.append(svg);
    }output.append(screen);
  }
  function action(k){if(shift==='f'&&/^\d$/.test(k[1]))return 'precision'+k[1];if(shift==='f'&&k[1]==='.')return 'scientific';return shift?k[shift==='f'?3:5]:k[1];}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(calc.snapshot()));}catch{}}
  function render(){
    lcd(powered?calc.display:'');
    dial.querySelector('.hp-indicators').textContent=powered?[shift,pending?(pending.mode+' '+(pending.operator||'')+(pending.dot?'.':'')):'',calc.begin?'BEGIN':'',calc.dmy?'D.MY':'',calc.error?'ERROR':''].filter(Boolean).join('   '):'';
    status.textContent=powered?calc.message:'Off · continuous memory retained';
    dial.dataset.shift=shift;
    dial.querySelectorAll('[data-hp-key]').forEach(button=>{const k=keys[Number(button.dataset.hpKey)],a=action(k);button.disabled=(!powered&&k[1]!=='ON')||a===null||a==='';button.setAttribute('aria-label',a===null?k[0]+' (not implemented)':names[a]||a||k[0]);button.title=a===null?'Not implemented in this edition':(names[a]||k[0]);if(['f','g'].includes(k[1])){button.disabled=!powered;button.setAttribute('aria-pressed',String(shift===k[1]));button.setAttribute('aria-label',names[k[1]]);}});
  }
  function handle(base){
    const key=keys.find(k=>k[1]===base);if(!powered&&base!=='ON')return;
    if(base==='ON'){powered=!powered;shift='';pending=null;render();return;}
    if(base==='f'||base==='g'){shift=shift===base?'':base;pending=null;render();return;}
    if(base==='STO'||base==='RCL'){pending={mode:base,dot:false,operator:''};shift='';calc.finish();render();return;}
    if(pending){
      if(base==='.'&&!pending.dot){pending.dot=true;render();return;}
      if(['+','-','*','/'].includes(base)&&pending.mode==='STO'){pending.operator=base;render();return;}
      if(/^\d$/.test(base)||Object.hasOwn(calc.fin,base)){
        const register=/^\d$/.test(base)?Number(base)+(pending.dot?10:0):base;
        try{calc.error='';pending.mode==='STO'?calc.store(register,pending.operator):calc.recallRegister(register);}catch(e){calc.error=e.message;calc.message=e.message;}
        pending=null;save();render();return;
      }
      pending=null;
    }
    const a=key?action(key):base;shift='';
    if(a===null||a===''){render();return;}
    if(a.startsWith('precision')){calc.decimals=Number(a.slice(-1));calc.finish();}
    else if(a==='scientific'){calc.decimals=null;calc.finish();}
    else if(a==='PREFIX')calc.message='Prefix cleared';
    else if(a==='MEM')calc.message=`X ${calc.x} · Y ${calc.y} · Z ${calc.stack[2]} · T ${calc.stack[3]} | `+Object.entries(calc.fin).map(([k,v])=>k+' '+Number(v.toPrecision(8))).join(' · ');
    else calc.press(a);
    save();render();
  }
  dial.querySelector('.hp-keys').addEventListener('click',e=>{const button=e.target.closest('[data-hp-key]');if(button)handle(keys[Number(button.dataset.hpKey)][1]);});
  dial.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.altKey||e.metaKey||e.target.closest('.hp-toolbar'))return;
    const map={Enter:'ENTER','=':'ENTER',Escape:'CLx',Backspace:'BACK',f:'f',F:'f',g:'g',G:'g'};
    const key=map[e.key]||(/^[0-9.+*/-]$/.test(e.key)?e.key:null);
    if(e.key==='Escape'){shift='';pending=null;}
    if(key){e.preventDefault();handle(key);}
  });
  dial.querySelector('.hp-help').onclick=()=>help.showModal();
  dial.querySelector('.hp-expand').onclick=()=>{modal.querySelector('.hp-expanded-body').append(dial);modal.showModal();dial.querySelector('.hp-expand').hidden=true;};
  modal.querySelector('.hp-close').onclick=()=>modal.close();
  modal.addEventListener('close',()=>{$('clock').after(dial);dial.querySelector('.hp-expand').hidden=false;dial.querySelector('.hp-expand').focus();});
  window.HP12Face={dial};render();
})();
