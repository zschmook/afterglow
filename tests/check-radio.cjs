const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{},URL,setTimeout,clearTimeout};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('assets/radio-core.js','utf8'),ctx);
const {catalogStations,distance,scheduledProgram,createController}=ctx.window.RadioCore;
const schedule=JSON.parse(fs.readFileSync('assets/radio-schedules.json','utf8')).witf;
assert(scheduledProgram(schedule,Date.parse('2026-10-03T04:30:00Z')).includes('BBC World Service · 10 PM–5 AM EDT'));
assert(scheduledProgram(schedule,Date.parse('2026-10-03T09:00:00Z')).includes('Travel with Rick Steves · 5 AM–6 AM EDT'));
assert(scheduledProgram(schedule,Date.parse('2026-10-09T18:30:00Z'),false).includes('Science Friday · 14:00–16:00 EDT'));
assert(scheduledProgram(schedule,Date.parse('2026-10-05T05:30:00Z')).includes('BBC World Service · 8 PM–5 AM EDT'));
assert(scheduledProgram(schedule,Date.parse('2026-11-01T06:30:00Z')).includes('EST'));
assert.equal(scheduledProgram(schedule,Date.parse(schedule.expiresAt)),'','Expired schedules must not be presented as current');
const stations=['a','b'].map((id,i)=>({id,name:'Station '+id,stream:'https://stream.example/'+id,
  streamCheckedAt:'2026-10-02',location:{city:'City',region:'PA',lat:40+i,lon:-76,verified:true,source:'https://station.example/about'}}));
const junk=[{...stations[0],id:'no-location',location:{...stations[0].location,verified:false}},
  {...stations[0],id:'bad-url',stream:'javascript:alert(1)'},
  {...stations[0],id:'nan',location:{...stations[0].location,lat:NaN}}];
assert.equal(catalogStations({stations:[...stations,...junk,stations[0]]}).length,2);
assert.equal(distance(null,stations[0]),Infinity);assert.equal(distance({lat:40,lon:-76},stations[0]),0);
assert(distance({lat:40,lon:-76},stations[1])>60);
let audio=[],saved={},timer;
class Audio {
 constructor(){this.events={};this.promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});audio.push(this);}
 addEventListener(name,fn){this.events[name]=fn;}emit(name){this.events[name]?.();}
 play(){return this.promise;}pause(){this.paused=true;this.emit('pause');}
 removeAttribute(){this.src='';}load(){this.released=true;}
}
const options={storage:{getItem:k=>saved[k],setItem:(k,v)=>saved[k]=v},makeAudio:()=>new Audio(),
  fetchCatalog:async()=>({stations}),later:fn=>(timer=fn,1),cancel:()=>{timer=null;}};
(async()=>{
 const service=createController(options);let calls=0;const unsubscribe=service.subscribe(()=>calls++);
 await service.load();assert.equal(audio.length,0,'Loading does not autoplay');
 assert(!service.play('unknown'));service.favorite('b');service.volume(.3);
 assert.equal(service.snapshot().favorites[0],'b');assert.equal(service.snapshot().volume,.3);
 service.play('a');const first=audio[0];first.emit('playing');assert.equal(service.snapshot().phase,'playing');
 service.mute();assert(first.muted);assert(!first.released);assert.equal(first.volume,.3);assert.equal(service.snapshot().phase,'playing');
 service.nowPlaying('a','Artist — Song');assert.equal(service.snapshot().nowPlaying,'Artist — Song');
 service.nowPlaying('b','Wrong station');assert.equal(service.snapshot().nowPlaying,'Artist — Song');
 service.play('b');assert(first.released && first.paused);assert.equal(audio.length,2);assert.equal(service.snapshot().nowPlaying,'');
 assert(audio[1].muted,'Mute survives reconnecting to live audio');
 first.reject(new Error('old stream failed'));await Promise.resolve();await Promise.resolve();
 assert.equal(service.snapshot().stationId,'b');assert.equal(service.snapshot().phase,'connecting','Late failures cannot stop the new stream');
 audio[1].emit('playing');assert.equal(service.snapshot().phase,'playing');
 unsubscribe();const before=calls;service.volume(.8);assert.equal(calls,before,'Removed card subscriptions are detached');
 assert(!audio[1].released,'Removing a card does not stop playback');
 service.stop();assert(audio[1].released);assert.equal(service.snapshot().phase,'stopped');
 service.play('a');timer();assert.equal(service.snapshot().phase,'error');assert(audio[2].released);
 service.play('b');audio[3].reject(Object.assign(new Error(),{name:'NotAllowedError'}));await new Promise(setImmediate);
 assert(service.snapshot().message.includes('allow audio'));
 const fresh=createController(options);await fresh.load();assert.equal(audio.length,4,'Reload restores selection, not playback');
 assert.equal(fresh.snapshot().stationId,'b');assert.equal(fresh.snapshot().volume,.8);
 assert.equal(fresh.snapshot().muted,true,'Mute persists across reloads');fresh.mute();assert.equal(fresh.snapshot().muted,false);
 assert.equal(fresh.snapshot().favorites[0],'b');
 assert(!fresh.playCustom({custom:true,id:'custom:bad',stream:'javascript:alert(1)'}));
 assert(fresh.playCustom({custom:true,id:'custom:clip',stream:'https://example.com/clip.mp4',name:'Clip'}));
 const clip=audio.at(-1);clip.emit('playing');assert.equal(fresh.snapshot().message,'Playing');
 clip.emit('ended');assert.equal(fresh.snapshot().phase,'stopped');assert.equal(fresh.snapshot().message,'Finished');
 const restored=createController(options);await restored.load();assert.equal(restored.snapshot().stationId,'custom:clip');
 assert(restored.snapshot().stations.some(s=>s.id==='custom:clip'),'Custom media survives catalog restoration');
 const broken=createController({...options,fetchCatalog:async()=>{throw Error('offline');}});
 await broken.load();assert(broken.snapshot().catalogError);assert(!broken.snapshot().loading);
 console.log('PASS: location/URL filtering, deduplication, ZIP distance, single playback, rapid station changes, stale events, timeout, autoplay denial, persistence, subscription cleanup, offline catalog');
})().catch(error=>{console.error(error);process.exitCode=1;});
