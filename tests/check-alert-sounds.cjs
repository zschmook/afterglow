const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness({blocked=false,missing=false}={}){
 const intervals=new Map(),voices=[];let id=0,resume;
 const param=()=>({value:0,setValueAtTime(value){this.value=value;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class AudioContext{
  state='suspended';currentTime=0;destination={};
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createOscillator(){const voice={frequency:param(),connect(){},disconnect(){},start(){this.started=true;},stop(time){if(time===undefined)this.stopped=true;}};voices.push(voice);return voice;}
  resume(){if(blocked)return new Promise(resolve=>resume=()=>{this.state='running';resolve();});this.state='running';return Promise.resolve();}
 }
 const context={window:missing?{}:{AudioContext},setInterval:f=>{intervals.set(++id,f);return id;},clearInterval:id=>intervals.delete(id)};
 vm.createContext(context);vm.runInContext(fs.readFileSync('assets/alert-sounds.js','utf8')+'\nthis.Sound=AfterglowAlertSound;',context);
 return {sound:new context.Sound(),intervals,voices,resume:()=>resume()};
}
(async()=>{
 const {sound,intervals,voices}=harness();
 sound.sync(['alarm']);assert.equal(voices.length,0,'restored alarms wait for a gesture');
 await sound.unlock();assert.equal(intervals.size,1);assert.equal(voices.length,4);
 sound.sync(['alarm']);assert.equal(voices.length,4,'UI ticks must not retrigger sound');
 [...intervals.values()][0]();assert.equal(voices.length,8,'ringing repeats');
 sound.sync([]);assert.equal(intervals.size,0);assert(voices.every(v=>v.stopped),'dismiss stops even scheduled future notes');
 await sound.preview('timer');assert.equal(intervals.size,0);assert.deepEqual(voices.slice(-3).map(v=>v.frequency.value),[880,1175,1568]);
 sound.stopPreview();assert(voices.every(v=>v.stopped));
 sound.sync(['silent']);assert.equal(intervals.size,0);
 sound.sync(['alarm','timer']);assert.equal(intervals.size,1);assert.equal(sound.voices.size,7);
 sound.sync(['timer']);assert.equal(sound.voices.size,3,'canceling alarm preserves timer');
 sound.setVolume(0);assert.equal(intervals.size,0);assert.equal(sound.voices.size,0);
 sound.setVolume(.4);assert.equal(intervals.size,1,'unmuting a ringing alert resumes it');
 sound.sync([]);
 const pending=harness({blocked:true});const preview=pending.sound.preview('alarm');pending.sound.stopPreview();pending.resume();await preview;assert.equal(pending.voices.length,0,'late resume must not restart canceled preview');
 const dismissed=harness({blocked:true});dismissed.sound.sync(['alarm']);const unlock=dismissed.sound.unlock();dismissed.sound.sync([]);dismissed.resume();await unlock;assert.equal(dismissed.voices.length,0,'late resume must not resurrect dismissed alarm');
 const unavailable=harness({missing:true});assert.equal(await unavailable.sound.unlock(),false);unavailable.sound.sync(['alarm']);assert.equal(unavailable.sound.state,'unsupported');
 console.log('PASS: audio unlock, repeat, immediate stop, previews, silent, simultaneous alerts, mute, late-resume races and unsupported browser');
})().catch(error=>{console.error(error);process.exitCode=1;});
