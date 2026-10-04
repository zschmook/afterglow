// Native screen wake lock, with NoSleep's tiny local videos for HTTP browsers.
class AfterglowKeepAwake {
 constructor(onChange=()=>{}) {
  this.enabled=false;this.lock=null;this.video=null;this.busy=false;
  this.generation=0;this.status='off';this.onChange=onChange;
 }
 report(status){this.status=status;this.onChange(status);}
 async setEnabled(enabled){this.enabled=enabled;if(enabled)await this.request();else this.release('off');}
 release(status='paused'){
  this.generation++;this.busy=false;
  const lock=this.lock;this.lock=null;
  if(lock)void lock.release().catch(()=>{});
  if(this.video)this.video.pause();
  this.report(status);
 }
 async request(){
  if(!this.enabled||document.visibilityState!=='visible'||this.busy||this.lock)return;
  if(this.status==='video'&&this.video&&!this.video.paused)return;
  const generation=++this.generation;this.busy=true;this.report('starting');
  try{
   if(window.isSecureContext&&navigator.wakeLock){
    const lock=await navigator.wakeLock.request('screen');
    if(generation!==this.generation){await lock.release();return;}
    this.lock=lock;
    lock.addEventListener('release',()=>{if(this.lock===lock){this.lock=null;this.report(this.enabled?'paused':'off');}});
    this.report(lock.released?'paused':'native');
    if(lock.released)this.lock=null;
   }else{
    if(!this.video){
     const video=document.createElement('video');this.video=video;
     video.id='keep-awake-video';video.muted=true;video.defaultMuted=true;
     video.playsInline=true;video.loop=true;video.disablePictureInPicture=true;
     video.disableRemotePlayback=true;video.setAttribute('aria-hidden','true');
     video.setAttribute('tabindex','-1');
     for(const type of ['webm','mp4']){
      const source=document.createElement('source');source.src='/assets/vendor/nosleep/keep-awake.'+type;source.type='video/'+type;video.appendChild(source);
     }
     video.addEventListener('timeupdate',()=>{if(video.duration>1&&video.currentTime>0.5)video.currentTime=0;});
     video.addEventListener('pause',()=>{if(this.enabled&&this.status==='video')this.report('paused');});
     video.addEventListener('error',()=>{if(this.enabled)this.report('error');});
     document.body.appendChild(video);
    }
    await this.video.play();
    if(generation!==this.generation){if(!this.enabled||document.visibilityState!=='visible')this.video.pause();return;}
    this.report('video');
   }
  }catch{if(generation===this.generation)this.report('error');}
  finally{if(generation===this.generation)this.busy=false;}
 }
 visibilityChanged(){if(document.visibilityState!=='visible')this.release(this.enabled?'paused':'off');else void this.request();}
}

if(typeof embeddedPanel==='undefined'||!embeddedPanel){
 const toggle=document.getElementById('keep-awake');
 const status=document.getElementById('keep-awake-status');
 const retry=document.getElementById('keep-awake-retry');
 const messages={off:'Off',starting:'Starting…',native:'Screen wake lock active.',video:'Video workaround running. Check that your monitor stays awake.',paused:'Paused. Tap Resume to try again.',error:'Could not keep the display awake. Tap Resume to retry.'};
 const awake=new AfterglowKeepAwake(state=>{status.textContent=messages[state];retry.hidden=!['paused','error'].includes(state)||!awake.enabled;});
 try{toggle.checked=localStorage.getItem('dashboard-keep-awake')==='true';}catch{}
 toggle.onchange=()=>{try{localStorage.setItem('dashboard-keep-awake',String(toggle.checked));}catch{}void awake.setEnabled(toggle.checked);};
 retry.onclick=()=>void awake.request();
 document.addEventListener('visibilitychange',()=>awake.visibilityChanged());
 window.addEventListener('pagehide',()=>awake.release(awake.enabled?'paused':'off'));
 window.addEventListener('pageshow',()=>void awake.request());
 // A saved video fallback may need a fresh user gesture after reloading.
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{if(awake.status==='paused'||awake.status==='error')void awake.request();});
 void awake.setEnabled(toggle.checked);
}
