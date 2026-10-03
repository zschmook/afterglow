const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ids=new Map();const node=()=>({value:'',classList:{toggle(){}},setAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;}});const storage={};let refreshed=0;
const ctx={$:id=>{if(!ids.has(id))ids.set(id,node());return ids.get(id);},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},document:{querySelectorAll:()=>[]},setZone(){},tabKeys(){},stopRadar(){},radarMap:null,weatherTab:'overview',refresh(){refreshed++;},selectNews(){},newsCategory:'local',sportsLeague:'nfl',sportsFeeds:{},renderSports(){}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/preferences.js','utf8'),ctx);assert.equal(vm.runInContext('preferences.place',ctx),null);
vm.runInContext(fs.readFileSync('assets/settings.js','utf8'),ctx);
assert.equal(ids.get('location-label').textContent,'SET LOCATION');ids.get('weather-set-location').onclick();assert(ids.get('display-dialog').open);assert(!ids.get('settings-panel-location').hidden);
(async()=>{
ctx.fetch=async()=>({ok:true,json:async()=>({name:'Lancaster, PA',zip:'17601',lat:40.04,lon:-76.3})});
ids.get('place-zip').value='17601';await ids.get('location-form').onsubmit({preventDefault(){}});assert.equal(refreshed,1);assert.equal(ids.get('display-dialog').open,false);assert.equal(JSON.parse(storage['dashboard-preferences']).place.zip,'17601');
ids.get('display-dialog').showModal();ctx.fetch=async()=>({ok:false,json:async()=>({error:'ZIP code not found.'})});ids.get('place-zip').value='00000';await ids.get('location-form').onsubmit({preventDefault(){}});assert.equal(ids.get('location-result').textContent,'ZIP code not found.');assert.equal(JSON.parse(storage['dashboard-preferences']).place.zip,'17601');assert(!ids.get('location-save').disabled);assert.equal(ids.get('display-dialog').open,true);
ids.get('source-lnp').checked=false;ids.get('source-lnp').onchange();assert.equal(JSON.parse(storage['dashboard-preferences']).sources.LNP,false);
ids.get('default-league').onchange({target:{value:'ncaa'}});assert.equal(ids.get('league').value,'ncaa');
vm.runInContext(fs.readFileSync('assets/preferences.js','utf8').replace('const defaultPlace','var defaultPlace').replace('let preferences','var preferences'),vm.createContext({localStorage:ctx.localStorage}));
console.log('PASS: unset location prompts, Location tab, ZIP lookup and failure recovery, source toggle and starting league');

})().catch(e=>{console.error(e);process.exitCode=1});
