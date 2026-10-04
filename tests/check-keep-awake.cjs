const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness({native=true,secure=true,delayed=false,denied=false}={}){
 const changes=[],locks=[],videos=[];let resolve;
 const document={visibilityState:'visible',body:{appendChild(){}},createElement(type){
  if(type==='source')return {};
  const video={paused:true,children:[],events:{},appendChild(source){this.children.push(source);},setAttribute(){},addEventListener(event,fn){this.events[event]=fn;},play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};videos.push(video);return video;
 }};
 const context={document,embeddedPanel:true,window:{isSecureContext:secure},navigator:native?{wakeLock:{async request(type){
  assert.equal(type,'screen');if(denied)throw Error('Denied');if(delayed)await new Promise(r=>resolve=r);
  const lock={released:false,addEventListener(event,fn){this.onrelease=fn;},async release(){this.released=true;this.onrelease?.();}};locks.push(lock);return lock;
 }}}:{}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('assets/keep-awake.js','utf8')+'\nthis.Controller=AfterglowKeepAwake;',context);
 return {awake:new context.Controller(state=>changes.push(state)),document,locks,videos,changes,resolve:()=>resolve()};
}
(async()=>{
 const h=harness();await h.awake.setEnabled(true);assert.equal(h.awake.status,'native');
 await h.awake.request();assert.equal(h.locks.length,1,'no duplicate wake locks');
 h.document.visibilityState='hidden';h.awake.visibilityChanged();assert(h.locks[0].released);assert.equal(h.awake.status,'paused');
 h.document.visibilityState='visible';h.awake.visibilityChanged();await flush();assert.equal(h.locks.length,2);
 await h.locks[1].release();assert.equal(h.awake.status,'paused');assert.equal(h.locks.length,2,'do not fight OS release in a retry loop');
 await h.awake.request();await h.awake.setEnabled(false);assert(h.locks[2].released);assert.equal(h.awake.status,'off');
 const late=harness({delayed:true});const pending=late.awake.setEnabled(true);await late.awake.setEnabled(false);late.resolve();await pending;assert(late.locks[0].released);assert.equal(late.awake.status,'off');
 const denied=harness({denied:true});await denied.awake.setEnabled(true);assert.equal(denied.awake.status,'error');assert.equal(denied.videos.length,0);
 for(const options of [{native:false},{secure:false}]){
  const fallback=harness(options);await fallback.awake.setEnabled(true);assert.equal(fallback.awake.status,'video');
  const video=fallback.videos[0];assert(video.muted);assert(video.playsInline);assert.equal(video.children.length,2);assert(video.children.every(s=>s.src.startsWith('/assets/vendor/nosleep/')));
  fallback.document.visibilityState='hidden';fallback.awake.visibilityChanged();assert(video.paused);
  fallback.document.visibilityState='visible';fallback.awake.visibilityChanged();await flush();assert(!video.paused);
  await fallback.awake.setEnabled(false);assert(video.paused);assert.equal(fallback.awake.status,'off');
 }
 console.log('PASS: native lock, visibility release/reacquire, OS release, late grant, permission rejection, HTTP fallback, silent local video and disable');
})().catch(error=>{console.error(error);process.exitCode=1;});
