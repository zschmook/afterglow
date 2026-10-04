// Original Mixkit recordings, served locally. See alarm-sounds/sources.json.
const afterglowAlarmSounds={
 facility:'Facility alarm sound',digital:'Digital clock digital alarm buzzer',
 vintage:'Vintage warning alarm',emergency:'Emergency alert alarm',classic:'Classic alarm'
};
class AfterglowAlertSound {
 constructor(onStateChange=()=>{}) {
  this.context=null;this.master=null;this.volume=0.6;this.wanted=[];
  this.voices=new Set();this.buffers=new Map();this.generation=0;
  this.starting=false;this.loading=0;this.error=false;this.previewing=false;
  this.onStateChange=onStateChange;
 }
 get state() {
  if(!this.volume)return 'muted';
  if(!(window.AudioContext||window.webkitAudioContext))return 'unsupported';
  if(this.error)return 'error';
  if(this.loading)return 'loading';
  return this.context?.state==='running'?'ready':'blocked';
 }
 async unlock() {
  try {
   if(!this.context) {
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return false;
    this.context=new Context();this.master=this.context.createGain();
    this.master.gain.value=this.volume*0.65;
    this.master.connect(this.context.destination);
    this.context.onstatechange=()=>this.refresh();
   }
   if(this.context.state!=='running')await this.context.resume();
   this.refresh();return this.context.state==='running';
  } catch {this.onStateChange();return false;}
 }
 async load(kind) {
  if(!Object.hasOwn(afterglowAlarmSounds,kind))throw new Error('Unknown alert sound');
  if(!this.buffers.has(kind)) {
   this.loading++;this.onStateChange();
   const request=(async()=>{
    const response=await fetch('/assets/alarm-sounds/'+kind+'.wav',{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Alert recording unavailable');
    return await this.context.decodeAudioData(await response.arrayBuffer());
   })();
   this.buffers.set(kind,request);
   request.catch(()=>this.buffers.delete(kind)).finally(()=>{this.loading--;this.onStateChange();});
  }
  return this.buffers.get(kind);
 }
 async prepare(kind) {
  this.error=false;
  try {
   if(!await this.unlock())return false;
   await this.load(kind);return true;
  } catch {this.error=true;return false;}
  finally {this.onStateChange();}
 }
 setVolume(volume) {
  if(!Number.isFinite(volume))return;
  this.volume=Math.max(0,Math.min(1,volume));
  if(this.master)this.master.gain.setValueAtTime(this.volume*0.65,this.context.currentTime);
  if(!this.volume)this.stop();
  this.refresh();
 }
 sync(kinds) {
  const wanted=Object.keys(afterglowAlarmSounds).filter(kind=>kinds.includes(kind));
  if(wanted.join()===this.wanted.join())return;
  this.stop();this.wanted=wanted;this.error=false;this.refresh();
 }
 stop() {
  this.generation++;this.starting=false;this.previewing=false;
  for(const voice of this.voices){try{voice.stop();}catch{}voice.disconnect();}
  this.voices.clear();
 }
 refresh() {
  if(!this.volume||this.context?.state!=='running')this.stop();
  else if(this.wanted.length&&!this.starting&&!this.voices.size&&!this.error)void this.startRinging();
  this.onStateChange();
 }
 async startRinging() {
  this.starting=true;
  const generation=this.generation;
  try {
   const buffers=await Promise.all(this.wanted.map(kind=>this.load(kind)));
   if(generation!==this.generation||!this.volume||this.context.state!=='running')return;
   for(const buffer of buffers)this.play(buffer,true);
  } catch {if(generation===this.generation)this.error=true;}
  finally {if(generation===this.generation)this.starting=false;this.onStateChange();}
 }
 play(buffer,loop) {
  const voice=this.context.createBufferSource();voice.buffer=buffer;voice.loop=loop;
  voice.connect(this.master);this.voices.add(voice);
  voice.onended=()=>{voice.disconnect();this.voices.delete(voice);if(!this.voices.size)this.previewing=false;this.onStateChange();};
  voice.start();
 }
 async preview(kind) {
  if(this.wanted.length)return;
  this.stop();const generation=this.generation;this.error=false;
  try {
   if(!await this.unlock())return;
   const buffer=await this.load(kind);
   if(generation===this.generation&&!this.wanted.length&&this.volume){this.play(buffer,false);this.previewing=true;}
  } catch {if(generation===this.generation)this.error=true;}
  finally {this.onStateChange();}
 }
 stopPreview() {if(!this.wanted.length){this.stop();this.onStateChange();}}
}
