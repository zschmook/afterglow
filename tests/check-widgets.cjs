const fs=require('fs'),vm=require('vm'),assert=require('assert');
class E{constructor(){this.children=[];this.style={setProperty(){}};this.dataset={};this.classList={toggle(){}};this.value=100;}setAttribute(k,v){this[k]=v}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}addEventListener(){}matches(){return false}contains(){return false}focus(){} }
const ids=new Map([...fs.readFileSync('index.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new E()]));
const intervals=[];
const ctx={document:{getElementById:id=>{assert(ids.has(id),id);return ids.get(id)},createElement:()=>new E(),createElementNS:()=>new E(),documentElement:new E(),addEventListener(){},hidden:false},matchMedia:()=>({matches:false}),setTimeout(){},setInterval(fn,ms){intervals.push({fn,ms});return intervals.length;},clearInterval(){},fetch:()=>new Promise(()=>{}),localStorage:{getItem(){},setItem(){}},URL,Date,Intl,console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/preferences.js','utf8'),ctx);vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);vm.runInContext(fs.readFileSync('assets/widgets.js','utf8'),ctx);
vm.runInContext(`newsFeeds={local:{data:[{title:'local',url:'https://example.com',source:'WGAL',date:new Date().toUTCString()}]},national:{data:[{title:'national',url:'https://example.com/n',source:'Washington Post',date:new Date().toUTCString()}]},world:{data:[]}};selectNews('national');`,ctx);
assert.equal(ids.get('news-national')['aria-selected'],true);assert.equal(ids.get('news-items').children[0].href,'https://example.com/n');
vm.runInContext("selectWeather('hourly')",ctx);assert.equal(ids.get('weather-overview').hidden,true);assert.equal(ids.get('weather-hourly').hidden,false);
vm.runInContext(`renderHourly({time:[Math.floor((Date.now()+1800000)/3600000)*3600],temperature_2m:[70],weather_code:[0],is_day:[1],precipitation_probability:[20]})`,ctx);
assert.equal(ids.get('hourly-items').children.length,1);
vm.runInContext("selectNews('world')",ctx);assert.equal(ids.get('news-items').textContent,'No stories from enabled sources in the last 12 hours.');
console.log('PASS: script initialization, hourly tab, hourly rendering, category switch and headline URL');
vm.runInContext("sportsFeeds={nfl:{data:{events:[]},stale:false},ncaa:{data:{events:[]},stale:false}}; $('league').onchange({target:{value:'ncaa'}});",ctx);
assert.equal(ids.get('score-items').textContent,'No NCAA D1 games on the current scoreboard.');
console.log('PASS: NCAA league selection');
(async()=>{
 const urls=[];
 ctx.requestAnimationFrame=f=>f();
 ctx.L={tileLayer:(url)=>{urls.push(url);return {on(){},addTo(){}}}};
 ctx.fetch=async()=>({ok:true,json:async()=>({data:{host:'https://tilecache.rainviewer.com',radar:{past:[{time:1790980800,path:'/v2/radar/654624b1eae2'}]}}})});
 vm.runInContext('preferences.place={...defaultPlace};radarMap={invalidateSize(){},removeLayer(){}};',ctx);
 await vm.runInContext('loadRadar()',ctx);
 assert.equal(urls.length,1);
 assert(urls[0].includes('/v2/radar/654624b1eae2/256/'));
 assert(!ids.get('radar-time').textContent.includes('unavailable'));
 console.log('PASS: real hexadecimal radar frame creates tile layer');
 vm.runInContext("radarFrames=[{time:1,path:'/v2/radar/old'},{time:2,path:'/v2/radar/latest'}];radarIndex=0;radarTimer=123;",ctx);
 ids.get('radar-play').onclick();
 assert(urls.at(-1).includes('/latest/'));assert.equal(ids.get('radar-play').textContent,'Play');
 const timer=intervals.find(t=>t.ms===300000);assert(timer);
 let calls=0;ctx.fetch=async()=>{calls++;return {ok:true,json:async()=>({data:{host:'https://tilecache.rainviewer.com',radar:{past:[{time:4,path:'/v2/radar/newest'},{time:3,path:'/v2/radar/older'}]}}})};};
 vm.runInContext("weatherTab='radar'",ctx);timer.fn();await new Promise(setImmediate);
 assert.equal(calls,1);assert(urls.at(-1).includes('/newest/'));
 console.log('PASS: pause returns latest; five-minute refresh fetches and selects newest frame');
})().catch(e=>{console.error(e);process.exitCode=1});

vm.runInContext(`newsFeeds.local={data:[{title:'old',url:'https://example.com/old',date:new Date(Date.now()-13*3600000).toISOString()},...Array.from({length:8},(_,i)=>({title:'Story '+i,url:'https://example.com/'+i,date:new Date(Date.now()-i*60000).toISOString()})),{title:'undated',url:'https://example.com/undated'}]};selectNews('local');`,ctx);
assert.equal(ids.get('news-items').children.length,8);
assert.equal(ids.get('news-items').children[0].href,'https://example.com/0');
assert.equal(ids.get('news-count').textContent,'8 STORIES · LAST 12H');
console.log('PASS: full scrolling list, 12-hour cutoff, invalid date exclusion, newest-first order');

const realNow=Date.now;
try {
 const start=Date.parse('2026-10-02T23:00:00Z');
 const hourly={time:Array.from({length:14},(_,i)=>start/1000+i*3600),temperature_2m:Array(14).fill(70),weather_code:Array(14).fill(0),is_day:Array(14).fill(1),precipitation_probability:Array(14).fill(20)};
 ctx.hourlyFixture=hourly;
 Date.now=()=>start+29*60000+59000;
 vm.runInContext('renderHourly(hourlyFixture)',ctx);
 assert.equal(ids.get('hourly-items').children[0].children[0].textContent,'7 PM');
 Date.now=()=>start+30*60000;
 vm.runInContext('renderHourly(hourlyFixture)',ctx);
 assert.equal(ids.get('hourly-items').children[0].children[0].textContent,'8 PM');
 assert.equal(ids.get('hourly-items').children.length,12);
 console.log('PASS: hourly forecast advances at :30 and retains 12 hours');
}finally{Date.now=realNow;}

vm.runInContext("setZone('America/Los_Angeles')",ctx);
assert.equal(vm.runInContext("new Date('2026-10-03T02:00:00Z').toLocaleTimeString('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'})",ctx),'7:00 PM');
assert.equal(vm.runInContext("zoneLabel(new Date('2026-10-03T02:00:00Z'),'short')",ctx),'PDT');
assert.equal(vm.runInContext("zoneLabel(new Date('2026-12-03T02:00:00Z'),'short')",ctx),'PST');
vm.runInContext("setZone('invalid/zone')",ctx);assert.equal(vm.runInContext('zone',ctx),'America/Los_Angeles');
vm.runInContext("setZone('America/New_York')",ctx);
console.log('PASS: Pacific clock conversion, daylight saving labels, invalid zone rejection');

vm.runInContext(`sportsLeague='nfl';globalThis.sportsFixture={data:{events:[{id:'final',date:'2026-10-01T12:00Z',status:{type:{state:'post',shortDetail:'Final'}}},{id:'next',date:'2026-10-04T12:00Z',status:{type:{state:'pre'}}},{id:'live',date:'2026-10-02T12:00Z',status:{period:2,displayClock:'7:25',type:{state:'in',shortDetail:'7:25 - 2nd'}},competitions:[{competitors:[],venue:{fullName:'Test stadium'}}]}]}};renderSports(sportsFixture);`,ctx);
const rows=ids.get('score-items').children;
assert.equal(rows[0].textContent,'LIVE NOW');assert.equal(rows[2].textContent,'UPCOMING');assert.equal(rows[4].textContent,'FINAL');
assert(rows[1].children[1].children.some(p=>p.textContent==='Time remaining: 7:25'));
rows[1].open=true;rows[1].ontoggle();ids.get('score-items').scrollTop=75;
vm.runInContext('renderSports(sportsFixture)',ctx);
assert(ids.get('score-items').children[1].open);assert.equal(ids.get('score-items').scrollTop,75);
console.log('PASS: live-first ordering, expanded quarter/clock details, open state and scroll preserved');

vm.runInContext(`preferences.place={lat:40,lon:-76};globalThis.distanceFixture={data:{events:[{id:'far',date:'2026-10-02T10:00Z',status:{type:{state:'in'}},competitions:[{competitors:[{team:{abbreviation:'FAR',homeLocation:{lat:34,lon:-118}}}]}]},{id:'unknown',date:'2026-10-02T09:00Z',status:{type:{state:'in'}}},{id:'near',date:'2026-10-02T12:00Z',status:{type:{state:'in'}},competitions:[{competitors:[{team:{abbreviation:'HOME',homeLocation:{lat:34,lon:-118}}},{team:{abbreviation:'AWAY',homeLocation:{lat:40.1,lon:-76.1}}}]}]}]}};renderSports(distanceFixture);`,ctx);
assert.equal(ids.get('score-items').children[1].children[0].dataset.gameKey,'nfl:near');
assert.equal(ids.get('score-items').children[2].children[0].dataset.gameKey,'nfl:far');
assert.equal(ids.get('score-items').children[3].children[0].dataset.gameKey,'nfl:unknown');
vm.runInContext('preferences.place=null;renderSports(distanceFixture)',ctx);
assert.equal(ids.get('score-items').children[1].children[0].dataset.gameKey,'nfl:unknown');
console.log('PASS: closest away team sorts first, unknown locations last, chronological fallback without ZIP');
vm.runInContext('preferences.place={...defaultPlace}',ctx);

vm.runInContext('preferences.clock24=true;clock()',ctx);assert(!/AM|PM/.test(ids.get('digital').textContent));
vm.runInContext('preferences.clock24=false;clock()',ctx);assert(/AM|PM/.test(ids.get('digital').textContent));
console.log('PASS: digital clock 12/24-hour formatting');

vm.runInContext(`newsFeeds.national={data:[{title:'NPR story',url:'https://example.com/npr',source:'NPR',date:new Date().toISOString()},{title:'CBS story',url:'https://example.com/cbs',source:'CBS',date:new Date().toISOString()}],sources:{NPR:{available:true,stale:false},CBS:{available:true,stale:false}}};preferences.sources.NPR=false;selectNews('national');`,ctx);
assert.equal(ids.get('news-items').children.length,1);assert.equal(ids.get('news-items').children[0].href,'https://example.com/cbs');assert.equal(ids.get('news-publisher').textContent,'CBS');assert(!ids.get('news-status').textContent.includes('NPR'));console.log('PASS: mixed publishers respect source toggles in headlines and labels');
