const fs=require('fs'),vm=require('vm'),assert=require('assert');
class E{constructor(){this.children=[];this.dataset={};}setAttribute(k,v){this[k]=v;}append(...v){this.children.push(...v);}prepend(v){this.children.unshift(v);}before(){}remove(){this.removed=true;}showModal(){this.open=true;}close(){this.open=false;}}
const ids=new Map(),originals={},storage={},made=[];for(const t of ['weather','forecast','news','scores'])originals[t]=new E();
const ctx={window:{},embeddedPanel:null,preferences:{clock24:false},savePreferences(){storage.format=ctx.preferences.clock24;},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},document:{querySelector:s=>originals[s.split('.').at(-1)]},element:(tag,cls)=>{const e=Object.assign(new E(),{tag,className:cls});made.push(e);return e;},$:id=>{if(!ids.has(id))ids.set(id,new E());return ids.get(id);}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/panels.js','utf8'),ctx);
const slot=made.find(e=>e.className==='widget-slot slot-forecast');slot.children[1].onclick();ids.get('panel-content').onchange({target:{value:'weather'}});
assert(originals.forecast.hidden);assert.equal(slot.children[0].src,'/?panel=weather');assert(!originals.weather.hidden);
assert.equal(JSON.parse(storage['panel-layout']).forecast,'weather');
ids.get('panel-content').onchange({target:{value:'forecast'}});assert(!originals.forecast.hidden);assert(slot.children[0].removed);
ids.get('clock-format').onchange({target:{value:'24'}});assert.equal(storage.format,true);
console.log('PASS: duplicate selection, retained original, saved layout, restoring panel, saved 24-hour preference');
