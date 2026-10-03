/* Local synthesized alerts: no downloads, network requests, or media-player changes. */
class AfterglowAlertSound {
 constructor(onStateChange=()=>{}) {
  this.context=null;
  this.master=null;
  this.volume=0.6;
  this.wanted=[];
  this.voices=new Set();
  this.repeat=null;
  this.generation=0;
  this.onStateChange=onStateChange;
 }
 get state() {
  if(!this.volume)return 'muted';
  if(!(window.AudioContext||window.webkitAudioContext))return 'unsupported';
  return this.context?.state==='running'?'ready':'blocked';
 }
 async unlock() {
  try {
   if(!this.context) {
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return false;
    this.context=new Context();
    this.master=this.context.createGain();
    this.master.gain.value=this.volume*0.18;
    this.master.connect(this.context.destination);
    this.context.onstatechange=()=>this.refresh();
   }
   if(this.context.state!=='running')await this.context.resume();
   this.refresh();
   return this.context.state==='running';
  } catch {
   this.onStateChange();
   return false;
  }
 }
 setVolume(volume) {
  if(!Number.isFinite(volume))return;
  this.volume=Math.max(0,Math.min(1,volume));
  if(this.master)this.master.gain.setValueAtTime(this.volume*0.18,this.context.currentTime);
  if(!this.volume)this.stop();
  this.refresh();
 }
 sync(kinds) {
  const wanted=['alarm','timer'].filter(kind=>kinds.includes(kind));
  if(wanted.join()===this.wanted.join())return;
  this.stop();
  this.wanted=wanted;
  this.refresh();
 }
 stop() {
  this.generation++;
  if(this.repeat!==null)clearInterval(this.repeat);
  this.repeat=null;
  for(const voice of this.voices) {
   try{voice.oscillator.stop();}catch{}
   voice.oscillator.disconnect();
   voice.envelope.disconnect();
  }
  this.voices.clear();
 }
 refresh() {
  if(this.state!=='ready')this.stop();
  else if(this.wanted.length&&this.repeat===null) {
   this.stop();
   const play=()=>{
    if(this.state!=='ready'){this.refresh();return;}
    this.wanted.forEach((kind,index)=>this.pattern(kind,index*1.35));
   };
   play();
   this.repeat=setInterval(play,3500);
  }
  this.onStateChange();
 }
 async preview(kind) {
  if(this.wanted.length)return;
  this.stop();
  const generation=this.generation;
  if(await this.unlock()&&generation===this.generation&&!this.wanted.length&&this.volume)
   this.pattern(kind);
 }
 stopPreview() { if(!this.wanted.length)this.stop(); }
 pattern(kind,delay=0) {
  const notes=kind==='alarm'?[[740,0],[740,0.28],[740,0.56],[988,0.84]]:[[880,0],[1175,0.25],[1568,0.5]];
  for(const [frequency,offset] of notes) {
   const start=this.context.currentTime+0.025+delay+offset;
   const duration=kind==='alarm'?0.19:0.42;
   const oscillator=this.context.createOscillator(),envelope=this.context.createGain();
   oscillator.type=kind==='alarm'?'triangle':'sine';
   oscillator.frequency.value=frequency;
   envelope.gain.setValueAtTime(0,start);
   envelope.gain.linearRampToValueAtTime(1,start+0.012);
   envelope.gain.exponentialRampToValueAtTime(0.001,start+duration);
   oscillator.connect(envelope);
   envelope.connect(this.master);
   const voice={oscillator,envelope};
   this.voices.add(voice);
   oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();this.voices.delete(voice);};
   oscillator.start(start);
   oscillator.stop(start+duration+0.02);
  }
 }
}
