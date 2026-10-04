/* HP 12C-inspired RPN calculator. Independent implementation; no ROM or emulator code.
 * Uses IEEE-754 arithmetic, not the original machine's BCD rounding.
 * Reference: HP 12C User's Guide, https://h10032.www1.hp.com/ctg/Manual/c00363319.pdf
 */
class HP12Calculator {
  constructor() {
    this.stack=[0,0,0,0]; this.lastX=0; this.entry=null; this.lift=true; this.financialInput=false;
    this.fin={n:0,i:0,PV:0,PMT:0,FV:0}; this.memory=Array(20).fill(0);
    this.flows=[]; this.begin=false; this.dmy=false; this.decimals=2;
    this.error=''; this.message='RPN · 2 ENTER 3 + → 5';
  }
  get x(){return this.stack[0];} set x(v){this.stack[0]=v;}
  get y(){return this.stack[1];}
  get display(){
    if(this.error)return 'Error';
    if(this.entry!==null)return this.entry.replace('e',' E');
    if(this.decimals===null||Math.abs(this.x)>=1e10||(this.x!==0&&Math.abs(this.x)<1e-9))return this.x.toExponential(6).replace('e',' E');
    const digits=Math.max(0,10-Math.max(1,Math.floor(Math.log10(Math.abs(this.x)||1))+1));
    return this.x.toLocaleString('en-US',{minimumFractionDigits:Math.min(this.decimals,digits),maximumFractionDigits:Math.min(this.decimals,digits)});
  }
  valid(v){if(!Number.isFinite(v)||Math.abs(v)>=1e100)throw Error('Result out of range or invalid input');return v;}
  push(){this.stack=[this.x,this.x,this.y,this.stack[2]];}
  finish(){this.entry=null;}
  result(v){this.valid(v);this.lastX=this.x;this.x=v;this.finish();this.lift=true;this.financialInput=true;}
  recall(v){this.valid(v);if(this.lift)this.push();this.x=v;this.finish();this.lift=true;this.financialInput=true;}
  binary(fn){const v=this.valid(fn(this.y,this.x));this.lastX=this.x;this.stack=[v,this.stack[2],this.stack[3],this.stack[3]];this.finish();this.lift=true;this.financialInput=true;}
  digit(key){
    this.financialInput=true;
    if(this.entry===null){if(this.lift)this.push();this.entry='';this.lift=false;}
    const parts=this.entry.split('e');
    if(key==='.') {if(parts.length>1||parts[0].includes('.'))return;this.entry=(this.entry||'0')+'.';}
    else if(parts.length>1){if(parts[1].replace('-','').length>=2)return;this.entry+=key;}
    else {if(parts[0].replace(/[-.]/g,'').length>=10)return;this.entry+=key;}
    this.x=Number(this.entry.replace(/e-?$/,'e0'))||0;
  }
  press(key){
    const before=this.snapshot();
    try{
      if(this.error){this.error='';this.message='';if(key==='CLx')return;}
      this.execute(key);this.valid(this.x);
    }catch(e){this.restore(before);this.error=e.message;this.message=e.message;}
    return this.display;
  }
  execute(key){
    if(/^[0-9.]$/.test(key)){this.digit(key);return;}
    if(Object.hasOwn(this.fin,key)){
      if(this.financialInput){this.fin[key]=this.x;this.finish();this.lift=true;this.message=key+' stored';}
      else this.solve(key);
      this.financialInput=false;
      return;
    }
    switch(key){
      case 'ENTER':this.push();this.finish();this.lift=false;break;
      case 'CLx':this.x=0;this.finish();this.lift=false;break;
      case 'CHS':
        if(this.entry!==null){const p=this.entry.split('e'),i=p.length-1;p[i]=p[i].startsWith('-')?p[i].slice(1):'-'+p[i];this.entry=p.join('e');this.x=Number(this.entry.replace(/e-?$/,'e0'))||0;}
        else this.x=-this.x;this.financialInput=true;break;
      case 'EEX':if(this.entry===null){if(this.lift)this.push();this.entry='1';this.x=1;}if(!this.entry.includes('e'))this.entry=(this.entry||'1')+'e';this.lift=false;this.financialInput=true;break;
      case 'BACK':if(this.entry!==null){this.entry=this.entry.slice(0,-1);this.x=Number(this.entry.replace(/e-?$/,'e0'))||0;}break;
      case '+':this.binary((a,b)=>a+b);break;
      case '-':this.binary((a,b)=>a-b);break;
      case '*':this.binary((a,b)=>a*b);break;
      case '/':this.binary((a,b)=>a/b);break;
      case 'power':this.binary((a,b)=>Math.pow(a,b));break;
      case 'swap':[this.stack[0],this.stack[1]]=[this.y,this.x];this.finish();this.lift=true;break;
      case 'roll':this.stack=[this.y,this.stack[2],this.stack[3],this.x];this.finish();this.lift=true;break;
      case 'LASTx':this.recall(this.lastX);break;
      case '%':this.result(this.y*this.x/100);break;
      case 'delta%':this.result((this.x-this.y)/this.y*100);break;
      case '%T':this.result(this.x/this.y*100);break;
      case 'sqrt':this.result(Math.sqrt(this.x));break;
      case 'reciprocal':this.result(1/this.x);break;
      case 'ln':this.result(Math.log(this.x));break;
      case 'exp':this.result(Math.exp(this.x));break;
      case 'INTG':this.result(Math.trunc(this.x));break;
      case 'FRAC':this.result(this.x-Math.trunc(this.x));break;
      case 'factorial':{if(!Number.isInteger(this.x)||this.x<0||this.x>69)throw Error('Factorial requires an integer from 0 to 69');let v=1;for(let j=2;j<=this.x;j++)v*=j;this.result(v);break;}
      case 'RND':this.result(Number(this.x.toFixed(this.decimals??6)));break;
      case '12x':this.result(this.x*12);this.fin.n=this.x;this.financialInput=false;break;
      case '12/':this.result(this.x/12);this.fin.i=this.x;this.financialInput=false;break;
      case 'BEG':this.begin=true;this.finish();break;
      case 'END':this.begin=false;this.finish();break;
      case 'DMY':this.dmy=true;this.finish();break;
      case 'MDY':this.dmy=false;this.finish();break;
      case 'clearFIN':this.fin={n:0,i:0,PV:0,PMT:0,FV:0};this.finish();this.financialInput=false;this.message='Financial registers cleared';break;
      case 'clearREG':{const b=this.begin,d=this.dmy,p=this.decimals;Object.assign(this,new HP12Calculator());this.begin=b;this.dmy=d;this.decimals=p;this.message='Registers cleared';break;}
      case 'CF0':this.flows=[{value:this.x,count:1}];this.fin.n=0;this.finish();this.lift=true;this.message='Initial cash flow stored';break;
      case 'CFj':if(!this.flows.length)this.flows=[{value:0,count:1}];if(this.flows.length>=21)throw Error('20 cash-flow groups maximum');this.flows.push({value:this.x,count:1});this.fin.n=this.flows.length-1;this.finish();this.lift=true;this.message='Cash-flow group '+this.fin.n+' stored';break;
      case 'Nj':if(!this.flows.length||!Number.isInteger(this.x)||this.x<1||this.x>99)throw Error('Store a cash flow first; repetitions must be 1–99');this.flows.at(-1).count=this.x;this.finish();this.lift=true;break;
      case 'NPV':this.result(this.npv(this.fin.i/100));this.message='NPV at '+this.fin.i+'% per period';break;
      case 'IRR':{const flows=this.expanded();if(!flows.some(v=>v>0)||!flows.some(v=>v<0))throw Error('IRR needs positive and negative cash flows');const r=HP12Calculator.root(i=>this.npv(i),this.fin.i/100);this.result(r*100);this.fin.i=this.x;this.message='IRR % per period · multiple roots may exist';break;}
      case 'AMORT':this.amortize();break;
      case 'INT':{const {n,i,PV}=this.fin;const a=-PV*i/100*n/360,b=-PV*i/100*n/365;this.lastX=this.x;this.stack=[this.valid(a),-PV,this.valid(b),this.stack[3]];this.finish();this.lift=true;this.message='360-day interest · R↓ twice for 365-day';break;}
      case 'SL':case 'SOYD':case 'DB':this.depreciate(key);break;
      case 'DATE':this.dateAdd();break;
      case 'DAYS':this.daysBetween();break;
      case 'sigma+':case 'sigma-':this.statsAdd(key==='sigma+'?1:-1);break;
      case 'clearSTATS':for(let j=1;j<=6;j++)this.memory[j]=0;this.finish();this.message='Statistics cleared';break;
      case 'mean':case 'sd':case 'weighted':case 'estimateX':case 'estimateY':this.stats(key);break;
      default:throw Error('Function not available in this edition');
    }
  }
  store(register,operator=''){
    const v=Object.hasOwn(this.fin,register)?this.fin:this.memory;
    if(!Object.hasOwn(v,register))throw Error('Invalid register');
    const old=v[register],x=this.x;
    v[register]=this.valid(operator==='+'?old+x:operator==='-'?old-x:operator==='*'?old*x:operator==='/'?old/x:x);
    this.finish();this.lift=true;this.message='Stored '+register;
  }
  recallRegister(register){const v=Object.hasOwn(this.fin,register)?this.fin:this.memory;if(!Object.hasOwn(v,register))throw Error('Invalid register');this.recall(v[register]);this.message='Recalled '+register;}
  factors(n,i){
    if(n<0||!Number.isInteger(n))throw Error('Use whole payment periods; odd-period TVM is not supported');
    if(i<=-1)throw Error('Periodic interest must exceed −100%');
    const growth=Math.exp(n*Math.log1p(i)),annuity=(i===0?n:Math.expm1(n*Math.log1p(i))/i)*(this.begin?1+i:1);
    return {growth,annuity};
  }
  solve(key){
    let {n,i,PV,PMT,FV}=this.fin;i/=100;let v;
    if(key==='i'){
      this.factors(n,0);if(n===0)throw Error('Set a positive number of periods');
      v=HP12Calculator.root(rate=>{const f=this.factors(n,rate);return PV+PMT*f.annuity/f.growth+FV/f.growth;},i)*100;
    }else if(key==='n'){
      if(i<=-1)throw Error('Periodic interest must exceed −100%');
      if(i===0)v=-(PV+FV)/PMT;
      else {const p=PMT*(this.begin?1+i:1)/i;v=Math.log((p-FV)/(PV+p))/Math.log1p(i);}
      if(v<0)throw Error('No positive payment count for these cash flows');
      v=Math.ceil(v-1e-9);
    }else {const f=this.factors(n,i);if(key==='PV')v=-(FV+PMT*f.annuity)/f.growth;if(key==='PMT')v=-(FV+PV*f.growth)/f.annuity;if(key==='FV')v=-(PV*f.growth+PMT*f.annuity);}
    this.result(v);this.fin[key]=v;this.message=key+' solved · '+(this.begin?'BEGIN':'END')+' payments';
  }
  static root(fn,guess=0.1){
    // Search in log(1+rate), then bisect. Pick the bracket nearest the supplied guess.
    const points=[...Array.from({length:481},(_,j)=>-12+j*.075),Math.log1p(Math.max(-.99999,guess)),0].sort((a,b)=>a-b);
    let previous=null;const brackets=[];
    for(const u of points){const r=Math.expm1(u);let v;try{v=fn(r);}catch{previous=null;continue;}if(!Number.isFinite(v)){previous=null;continue;}if(v===0)return r;if(previous&&Math.sign(v)!==Math.sign(previous.v))brackets.push([previous.u,u]);previous={u,v};}
    if(!brackets.length)throw Error('No convergent solution for these cash flows');
    const target=Math.log1p(Math.max(-.99999,guess));brackets.sort((a,b)=>Math.abs((a[0]+a[1])/2-target)-Math.abs((b[0]+b[1])/2-target));
    let [lo,hi]=brackets[0],flo=fn(Math.expm1(lo));
    for(let j=0;j<100;j++){const mid=(lo+hi)/2,fm=fn(Math.expm1(mid));if(fm===0)return Math.expm1(mid);if(Math.sign(fm)===Math.sign(flo)){lo=mid;flo=fm;}else hi=mid;}
    return Math.expm1((lo+hi)/2);
  }
  expanded(){if(!this.flows.length)throw Error('Enter CF0 and at least one CFj');return this.flows.flatMap(f=>Array(f.count).fill(f.value));}
  npv(rate){if(rate<=-1)throw Error('Periodic interest must exceed −100%');const a=this.expanded();let result=0;for(let j=a.length-1;j>=0;j--)result=a[j]+result/(1+rate);return this.valid(result);}
  amortize(){
    const count=this.x;if(!Number.isInteger(count)||count<1||count>100000)throw Error('Enter 1–100,000 payments to amortize');
    const round=v=>Number(v.toFixed(this.decimals??2));let pv=round(this.fin.PV),interest=0,principal=0;const pmt=round(this.fin.PMT);
    for(let j=0;j<count;j++){const charge=this.begin&&this.fin.n===0&&j===0?0:round(-pv*this.fin.i/100),paid=round(pmt-charge);interest+=charge;principal+=paid;pv=round(pv+paid);}
    this.lastX=count;this.stack=[round(interest),round(principal),count,this.stack[3]];this.fin.PV=pv;this.fin.n+=count;this.finish();this.lift=true;this.message='X interest · Y principal · PV remaining balance';
  }
  depreciate(method){
    const year=this.x,{n,PV,FV,i}=this.fin;
    if(!Number.isInteger(n)||n<1||n>100000||!Number.isInteger(year)||year<1||year>n||PV<FV||FV<0)throw Error('Set life n, cost PV, salvage FV, and a valid year');
    let remaining=PV,value=0;
    for(let j=1;j<=year;j++){value=method==='SL'?(PV-FV)/n:method==='SOYD'?(PV-FV)*(n-j+1)/(n*(n+1)/2):remaining*i/100/n;value=Math.max(0,Math.min(value,remaining-FV));remaining-=value;}
    this.result(value);this.stack[1]=remaining-FV;this.message='X depreciation · Y remaining depreciable value';
  }
  parseDate(value){
    const [a,b]=Math.abs(value).toFixed(6).split('.'),first=Number(a),second=Number(b.slice(0,2)),year=Number(b.slice(2)),month=this.dmy?second:first,day=this.dmy?first:second;
    const d=new Date(Date.UTC(year,month-1,day));if(year<1583||year>4046||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)throw Error('Invalid date: use '+(this.dmy?'DD.MMYYYY':'MM.DDYYYY'));return d;
  }
  encodeDate(d){return Number((this.dmy?d.getUTCDate():d.getUTCMonth()+1)+'.'+String(this.dmy?d.getUTCMonth()+1:d.getUTCDate()).padStart(2,'0')+d.getUTCFullYear());}
  dateAdd(){const d=this.parseDate(this.y);if(!Number.isInteger(this.x))throw Error('Enter a whole number of days');d.setUTCDate(d.getUTCDate()+this.x);if(d.getUTCFullYear()<1583||d.getUTCFullYear()>4046)throw Error('Date out of range');this.binary(()=>this.encodeDate(d));this.message=d.toISOString().slice(0,10)+' · '+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getUTCDay()];}
  daysBetween(){const a=this.parseDate(this.y),b=this.parseDate(this.x);this.binary(()=>(b-a)/86400000);this.stack[1]=(b.getUTCFullYear()-a.getUTCFullYear())*360+(b.getUTCMonth()-a.getUTCMonth())*30+Math.min(30,b.getUTCDate())-Math.min(30,a.getUTCDate());this.message='X actual days · Y 30/360 days';}
  statsAdd(sign){const x=this.x,y=this.y,m=this.memory;if(sign<0&&m[1]<=0)throw Error('No samples to remove');const changes=[1,x,x*x,y,y*y,x*y];changes.forEach((v,j)=>this.valid(m[j+1]+sign*v));changes.forEach((v,j)=>m[j+1]+=sign*v);this.lastX=x;this.x=m[1];this.finish();this.lift=false;this.message=m[1]+' samples · R1–R6 contain sums';}
  stats(key){
    const [,n,sx,sxx,sy,syy,sxy]=this.memory;if(n<1)throw Error('Enter samples with Σ+ first');
    const vx=sxx-sx*sx/n,vy=syy-sy*sy/n,cov=sxy-sx*sy/n;let x,y;
    if(key==='mean'){x=sx/n;y=sy/n;}
    if(key==='weighted'){x=sxy/sx;}
    if(key==='sd'){if(n<2)throw Error('At least two samples required');x=Math.sqrt(Math.max(0,vx)/(n-1));y=Math.sqrt(Math.max(0,vy)/(n-1));}
    if(key==='estimateY'){x=sy/n+cov/vx*(this.x-sx/n);y=cov/Math.sqrt(vx*vy);}
    if(key==='estimateX'){x=sx/n+vx/cov*(this.x-sy/n);y=cov/Math.sqrt(vx*vy);}
    this.valid(x);if(y!==undefined)this.valid(y);this.result(x);if(y!==undefined)this.stack[1]=y;this.message=key.startsWith('estimate')?'X estimate · Y correlation':key==='weighted'?'Weighted mean (X weights, Y values)':'X and Y statistics';
  }
  snapshot(){return JSON.parse(JSON.stringify({stack:this.stack,lastX:this.lastX,entry:this.entry,lift:this.lift,financialInput:this.financialInput,fin:this.fin,memory:this.memory,flows:this.flows,begin:this.begin,dmy:this.dmy,decimals:this.decimals,message:this.message}));}
  restore(s){
    if(!s||!Array.isArray(s.stack)||s.stack.length!==4||!s.stack.every(Number.isFinite)||!Array.isArray(s.memory)||s.memory.length!==20||!s.memory.every(Number.isFinite)||!s.fin||!['n','i','PV','PMT','FV'].every(k=>Number.isFinite(s.fin[k]))||!Array.isArray(s.flows)||s.flows.length>21||!s.flows.every(f=>Number.isFinite(f.value)&&Number.isInteger(f.count)&&f.count>=1&&f.count<=99)||!Number.isFinite(s.lastX)||!(s.decimals===null||Number.isInteger(s.decimals)&&s.decimals>=0&&s.decimals<=9))return false;
    this.stack=[...s.stack];this.memory=[...s.memory];this.fin=Object.fromEntries(['n','i','PV','PMT','FV'].map(k=>[k,s.fin[k]]));this.flows=s.flows.map(f=>({value:f.value,count:f.count}));this.lastX=s.lastX;this.entry=typeof s.entry==='string'&&/^-?\d*\.?\d*(e-?\d{0,2})?$/.test(s.entry)&&s.entry.length<=16?s.entry:null;this.lift=!!s.lift;this.financialInput=!!s.financialInput;this.begin=!!s.begin;this.dmy=!!s.dmy;this.decimals=s.decimals;this.message=typeof s.message==='string'?s.message.slice(0,180):'';return true;
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports=HP12Calculator;
if(typeof window!=='undefined')window.HP12Calculator=HP12Calculator;
