const fs=require('fs'),vm=require('vm'),assert=require('assert');
class E{constructor(){this.children=[];this.classList={toggle(){}};}setAttribute(k,v){this[k]=v;}append(...v){this.children.push(...v);}replaceChildren(...v){this.children=v;}addEventListener(){}querySelector(){return null;}contains(){return false;}showModal(){this.open=true;}close(){this.open=false;}}
const ids=new Map(),requests=[],intervals=[];let fail=false;
const state={on:true,dimmable:true,brightness:50,color_capable:true,color:'#ffffff'};
const ctx={document:{activeElement:null},clearInterval(){},setInterval:(fn,ms)=>intervals.push({fn,ms}),$:id=>{if(!ids.has(id))ids.set(id,new E());return ids.get(id);},element:(tag,cls,text)=>Object.assign(new E(),{tag,className:cls,textContent:text}),fetch:async(path,opts)=>{requests.push({path,opts});if(path.endsWith('devices'))return {ok:true,json:async()=>({lights:[{name:'Desk',device_id:'abc'}],outlets:[]})};return {ok:!fail,json:async()=>fail?{error:'Offline'}:{...state,...(opts.body?JSON.parse(opts.body):{})}};},encodeURIComponent};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/home.js','utf8'),ctx);
(async()=>{
 await vm.runInContext('loadHome()',ctx);await new Promise(setImmediate);
 assert.equal(ids.get('home-grid').children.length,1);assert.equal(ids.get('home-grid').children[0].children[0].textContent,'Bulbs');
 const card=ids.get('home-grid').children[0].children[1].children[0],head=card.children[0],power=card.children[1],dialog=card.children[3];
 assert(!card.children.some(x=>x.className==='device-options'));
 assert.equal(power.textContent,'Turn off');assert(requests.every(r=>!r.opts.method));
 head.onclick();assert(dialog.open);assert.equal(dialog.children[2].children.length,2);
 await power.onclick();assert.equal(power.textContent,'Turn on');assert.equal(dialog.children[1].textContent,'Turn on');
 assert.deepEqual(JSON.parse(requests.at(-1).opts.body),{on:false});
 await ids.get('home-discover').onclick();await new Promise(setImmediate);
 assert(requests.some(r=>r.path.endsWith('/discover')&&r.opts.method==='POST'));
 assert(requests.filter(r=>r.path.endsWith('/devices')).length===2);
 assert.equal(intervals.length,0);ids.get('open-home').onclick();await new Promise(setImmediate);assert.equal(intervals[0].ms,900000);
 const before=requests.length;intervals[0].fn();await new Promise(setImmediate);assert(requests.length>before);assert(requests.slice(before).every(r=>!r.opts.method));
 fail=true;await power.onclick();assert.equal(power.textContent,'Turn on');assert.equal(card.children[2].textContent,'Offline');assert(!power.disabled);
 console.log('PASS: read-only load, settings modal, quick toggle synchronization, failure recovery (mock devices only)');
})().catch(e=>{console.error(e);process.exitCode=1});
