// Clock/date boundaries and missing-weather behavior, without starting a browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const nodes=new Map();
function node(){return {attrs:{},textContent:'',classes:new Set(),setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]},hasAttribute(k){return k in this.attrs},removeAttribute(k){delete this.attrs[k]},after(){},classList:{contains(){return false},toggle(){}}};}
const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
const context={document:{createElementNS:node},window:{},embeddedPanel:false,$,Intl,Date,Math,Number,
  preferences:{place:{name:'Lititz'},centerContent:'clock',clock24:false},latestWeatherFeed:null,
  weatherInfo:()=>['Clear','clear-night'],iconPath:n=>`/icons/${n}.svg`,zoneLabel:()=> 'EDT'};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/sport-face.js'),'utf8'),context);
const face=context.window.SportFace;face.dial.removeAttribute('hidden');
face.tick(new Date('2026-10-04T03:59:00Z'),23+59/60,59,0,'11:59 PM','America/New_York');
assert.equal($('sp-date-badge').textContent,'03');
assert(!/id="sp-(date|digital|period)"/.test(face.dial.innerHTML));
assert.equal($('sp-progress-label').textContent,'99%');
face.tick(new Date('2026-10-04T04:00:00Z'),0,0,0,'12:00 AM','America/New_York');
assert.equal($('sp-date-badge').textContent,'04');assert.equal($('sp-progress-label').textContent,'0%');
assert.equal($('sp-hours').textContent,'00');assert.equal($('sp-24-hand').getAttribute('transform'),'rotate(-130)');
context.preferences.clock24=true;
face.tick(new Date('2026-10-04T04:00:00Z'),0,0,0,'00:00','America/New_York');
assert(face.dial.getAttribute('aria-label').includes('00:00'));
face.tick(new Date('2026-10-04T04:00:00Z'),18,0,0,'18:00','Pacific/Honolulu');
assert.equal($('sp-date-badge').textContent,'03');assert.equal($('sp-progress-label').textContent,'75%');
face.updateWeather({data:{current:{temperature_2m:0,wind_speed_10m:0,relative_humidity_2m:0,weather_code:0,is_day:0}}});
assert.equal($('sp-temperature').textContent,'0°F');assert.equal($('sp-wind').textContent,'0 MPH');assert.equal($('sp-humidity').textContent,'0%');
assert.equal($('sp-weather').getAttribute('visibility'),'visible');
face.updateWeather({data:{current:{temperature_2m:null,relative_humidity_2m:null}},stale:true});
assert.equal($('sp-temperature').textContent,'—');assert.equal($('sp-humidity').textContent,'—');
assert.equal($('sp-weather').getAttribute('visibility'),'hidden');
face.updateWeather(null);assert.equal($('sp-wind').textContent,'—');
const last=$('sp-hour').getAttribute('transform');face.dial.setAttribute('hidden','');
face.tick(new Date(),1,2,3,'1:02','UTC');assert.equal($('sp-hour').getAttribute('transform'),last);
console.log('Sport face: midnight, timezone, 12/24-hour, zero/missing weather, and hidden-face checks passed.');
