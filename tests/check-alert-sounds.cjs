const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness({blocked=false,missing=false,fail=false,delayed=false}={}){
 const voices=[],requests=[];let resume,deliver;
 class AudioContext{
  state='suspended';currentTime=0;destination={};
  createGain(){return {gain:{value:0,setValueAtTime(value){this.value=value;}},connect(){}};}
  createBufferSource(){const voice={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(voice);return voice;}
  async decodeAudioData(data){return {decoded:data};}
  resume(){if(blocked)return new Promise(resolve=>resume=()=>{this.state='running';resolve();});this.state='running';return Promise.resolve();}
 }
 const context={window:missing?{}:{AudioContext},AbortSignal,fetch:async url=>{
  requests.push(url);
  if(delayed)await new Promise(resolve=>deliver=resolve);
  return {ok:!fail,arrayBuffer:async()=>url};
 }};
 vm.createContext(context);vm.runInContext(fs.readFileSync('assets/alert-sounds.js','utf8')+'\nthis.Sound=AfterglowAlertSound;',context);
 return {sound:new context.Sound(),voices,requests,resume:()=>resume(),deliver:()=>deliver()};
}
(async()=>{
 const {sound,voices,requests}=harness();
 sound.sync(['classic']);assert.equal(voices.length,0,'restored alarms wait for a gesture');
 await sound.unlock();await flush();assert.equal(voices.length,1);assert.equal(voices[0].loop,true);
 sound.sync(['classic']);await flush();assert.equal(voices.length,1,'UI ticks must not retrigger playback');
 sound.sync([]);assert(voices.every(v=>v.stopped),'dismiss stops current playback');
 for(const kind of ['facility','digital','vintage','emergency','classic']){
  assert(await sound.prepare(kind));await sound.preview(kind);
  assert.equal(voices.at(-1).buffer.decoded,'/assets/alarm-sounds/'+kind+'.wav');
  assert.equal(voices.at(-1).loop,false,'preview plays once');
  sound.stopPreview();assert(voices.at(-1).stopped);
 }
 assert.equal(requests.length,5,'decoded recordings are cached');
 sound.sync(['silent']);await flush();assert.equal(sound.voices.size,0);
 sound.sync(['classic','digital']);await flush();assert.equal(sound.voices.size,2);
 sound.sync(['digital']);await flush();assert.equal(sound.voices.size,1,'canceling alarm preserves timer');
 assert.equal(voices.at(-1).buffer.decoded,'/assets/alarm-sounds/digital.wav');
 sound.setVolume(0);assert.equal(sound.voices.size,0);
 sound.setVolume(.4);await flush();assert.equal(sound.voices.size,1);
 sound.sync([]);
 const pending=harness({blocked:true});const preview=pending.sound.preview('classic');pending.sound.stopPreview();pending.resume();await preview;assert.equal(pending.voices.length,0,'late resume must not restart canceled preview');
 const late=harness({delayed:true});const downloading=late.sound.preview('facility');await flush();late.sound.stopPreview();late.deliver();await downloading;assert.equal(late.voices.length,0,'late download must not restart canceled preview');
 const dismissed=harness({delayed:true});dismissed.sound.sync(['classic']);await dismissed.sound.unlock();await flush();dismissed.sound.sync([]);dismissed.deliver();await flush();assert.equal(dismissed.voices.length,0,'late download must not resurrect dismissed alarm');
 const unavailable=harness({missing:true});assert.equal(await unavailable.sound.prepare('classic'),false);assert.equal(unavailable.sound.state,'unsupported');
 const failed=harness({fail:true});assert.equal(await failed.sound.prepare('classic'),false);assert.equal(failed.sound.state,'error');assert.equal(failed.voices.length,0);
 console.log('PASS: five distinct recordings, cache, unlock, looping, previews, immediate stop, simultaneous alerts, mute, loading races and unavailable audio');
})().catch(error=>{console.error(error);process.exitCode=1;});
