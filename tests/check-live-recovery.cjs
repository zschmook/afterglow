const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
function setup(){
 const timers=new Map(),media=[];let sequence=0,now=0;
 const context={window:{},URL,Date:{now:()=>now},setTimeout,clearTimeout};vm.createContext(context);
 vm.runInContext(fs.readFileSync('assets/radio-core.js','utf8'),context);
 const service=context.window.RadioCore.createController({
  makeAudio(){const item={events:{},volume:0,addEventListener(n,f){this.events[n]=f;},emit(n){this.events[n]?.();},pause(){this.emit('pause');},removeAttribute(){},load(){this.disposed=true;}};media.push(item);return item;},
  startMedia(){},later(fn,delay){const id=++sequence;timers.set(id,{fn,delay});return id;},cancel(id){timers.delete(id);},
 });
 const live={custom:true,id:'custom:live',name:'Web Picker',stream:'http://picker:9999/guide/play/manual/alpha'};
 const run=()=>{assert.equal(timers.size,1);const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();return timer.delay;};
 return {service,media,timers,live,run,setNow(value){now=value;}};
}
test('Web Picker disconnects reconnect with saved volume and mute, ignoring stale events',()=>{
 const s=setup();s.service.volume(.3);s.service.mute();s.service.playCustom(s.live);const first=s.media[0];first.emit('playing');first.emit('error');
 assert.equal(s.service.snapshot().phase,'connecting');assert(first.disposed);assert(first.recovering);assert.equal(s.run(),1000);
 assert.equal(s.media[1].volume,.3);assert.equal(s.media[1].muted,true);first.emit('error');assert.equal(s.media.length,2);
 s.media[1].emit('playing');assert.equal(s.service.snapshot().phase,'playing');assert.equal(s.timers.size,0);
});
test('waiting and stalled events cannot postpone recovery indefinitely',()=>{
 const s=setup();s.service.playCustom(s.live);s.media[0].emit('playing');s.media[0].emit('waiting');const timer=[...s.timers.keys()][0];
 s.media[0].emit('waiting');s.media[0].emit('stalled');assert.equal([...s.timers.keys()][0],timer);assert.equal(s.run(),20000);assert.equal(s.run(),1000);
});
test('live EOF reconnects, Stop cancels the retry',()=>{
 const s=setup();s.service.playCustom(s.live);s.media[0].emit('playing');s.media[0].emit('ended');assert.equal(s.timers.size,1);
 s.service.stop();assert.equal(s.timers.size,0);assert.equal(s.service.snapshot().phase,'stopped');
});
test('channel switches cancel recovery and old events cannot stop new playback',()=>{
 const s=setup();s.service.playCustom(s.live);s.media[0].emit('playing');s.media[0].emit('error');
 s.service.playCustom({...s.live,id:'custom:next',stream:'http://picker:9999/guide/play/manual/bravo'});
 s.media[1].emit('playing');s.media[0].emit('ended');assert.equal(s.timers.size,0);assert.equal(s.service.snapshot().stationId,'custom:next');
});
test('repeated live failures stop after three attempts even when briefly playing',()=>{
 const s=setup();s.service.playCustom(s.live);s.media[0].emit('playing');
 for(const delay of [1000,2000,4000]){s.media.at(-1).emit('error');assert.equal(s.run(),delay);s.media.at(-1).emit('playing');}
 s.media.at(-1).emit('error');assert.equal(s.service.snapshot().phase,'error');assert.equal(s.timers.size,0);assert.equal(s.media.length,4);
});
test('stable playback restores the retry budget',()=>{
 const s=setup();s.service.playCustom(s.live);s.media[0].emit('playing');s.media[0].emit('error');s.run();s.media[1].emit('playing');
 s.setNow(31000);s.media[1].emit('error');assert.equal(s.run(),1000);
});
test('finite files finish and initial connection failures do not loop',()=>{
 const s=setup();s.service.playCustom({...s.live,stream:'http://example.test/clip.mp4'});s.media[0].emit('playing');s.media[0].emit('ended');
 assert.equal(s.service.snapshot().phase,'stopped');assert.equal(s.timers.size,0);
 s.service.playCustom(s.live);s.media[1].emit('error');assert.equal(s.service.snapshot().phase,'error');assert.equal(s.timers.size,0);
});
