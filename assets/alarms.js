if(typeof embeddedPanel==='undefined'||!embeddedPanel){
const alarmStorage='dashboard-alarms';
let alarms={alarm:null,timer:null,ringing:[]};
try{const saved=JSON.parse(localStorage.getItem(alarmStorage)||'null');if(saved){for(const key of ['alarm','timer'])if(Number.isFinite(saved[key]?.due))alarms[key]=saved[key];alarms.ringing=(saved.ringing||[]).filter(x=>x==='alarm'||x==='timer');}}catch{}
function saveAlarms(){try{localStorage.setItem(alarmStorage,JSON.stringify(alarms));}catch{}}
function nextAlarm(time,timeZone,now=Date.now()){
 if(!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time))return null;
 const format=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 // Match actual instants, so skipped and repeated daylight-saving hours are handled.
 const start=Math.floor(now/60000)*60000+60000;
 for(let i=0;i<48*60;i++){const due=start+i*60000;if(format.format(due)===time)return due;}
 return null;
}
function alarmTab(name){for(const key of ['alarm','timer']){const b=$('alarm-tab-'+key);b.setAttribute('aria-selected',key===name);b.setAttribute('aria-controls','alarm-panel-'+key);b.tabIndex=key===name?0:-1;$('alarm-panel-'+key).hidden=key!==name;$('alarm-panel-'+key).setAttribute('aria-labelledby','alarm-tab-'+key);}}
for(const key of ['alarm','timer']){$('alarm-tab-'+key).onclick=()=>alarmTab(key);$('alarm-tab-'+key).onkeydown=e=>tabKeys(e,['alarm','timer'],key,alarmTab,'alarm-tab-');}alarmTab('alarm');
function cancelAlert(kind){alarms[kind]=null;alarms.ringing=alarms.ringing.filter(x=>x!==kind);saveAlarms();tickAlarms();}
$('alarm-form').onsubmit=e=>{e.preventDefault();const time=$('alarm-time').value,due=nextAlarm(time,zone);if(!due){$('alarm-state').textContent='Choose a valid alarm time.';return;}alarms.alarm={due,time,zone};alarms.ringing=alarms.ringing.filter(x=>x!=='alarm');saveAlarms();tickAlarms();};
$('timer-form').onsubmit=e=>{e.preventDefault();if(alarms.timer)return;const values=['hours','minutes','seconds'].map(k=>Number($('timer-'+k).value));if(values.some((n,i)=>!Number.isInteger(n)||n<0||n>(i?59:99)))return;const seconds=values[0]*3600+values[1]*60+values[2];if(!seconds){$('timer-state').textContent='Enter a duration greater than zero.';return;}alarms.timer={due:Date.now()+seconds*1000};alarms.ringing=alarms.ringing.filter(x=>x!=='timer');saveAlarms();tickAlarms();$('alarm-dialog').close();};
$('cancel-alarm').onclick=()=>cancelAlert('alarm');$('cancel-timer').onclick=()=>cancelAlert('timer');
function dismissAlarms(){alarms.ringing=[];saveAlarms();tickAlarms();}
const alarmButton=$('open-alarm'),alarmButtonContents=[...alarmButton.childNodes];
alarmButton.onclick=()=>{if(alarms.ringing.length)dismissAlarms();else $('alarm-dialog').showModal();};
$('dismiss-modal-alert').onclick=dismissAlarms;
function tickAlarms(){
 const now=Date.now();let changed=false;
 for(const kind of ['alarm','timer'])if(alarms[kind]&&alarms[kind].due<=now){alarms[kind]=null;if(!alarms.ringing.includes(kind))alarms.ringing.push(kind);changed=true;}
 if(changed)saveAlarms();
 const ringing=alarms.ringing.length>0;$('clock-panel').classList.toggle('clock-ringing',ringing);
 if(alarmButton.dataset.ringing!==String(ringing)){
  alarmButton.dataset.ringing=String(ringing);
  if(ringing)alarmButton.textContent='Dismiss';else alarmButton.replaceChildren(...alarmButtonContents);
  alarmButton.setAttribute('aria-label',ringing?'Dismiss alarm or timer':'Alarm');
  if(ringing){alarmButton.removeAttribute('aria-haspopup');alarmButton.removeAttribute('aria-controls');}
  else{alarmButton.setAttribute('aria-haspopup','dialog');alarmButton.setAttribute('aria-controls','alarm-dialog');}
 }
 for(const id of ['dismiss-modal-alert']){$(id).hidden=!ringing;$(id).textContent=(alarms.ringing.length===2?'Alarm + timer':alarms.ringing[0]==='timer'?'Timer finished':'Alarm')+' · Dismiss';}
 $('alarm-zone').textContent='Time zone: '+zoneLabel();
 $('alarm-state').textContent=alarms.alarm?'Set for '+new Date(alarms.alarm.due).toLocaleString('en-US',{timeZone:alarms.alarm.zone||zone,weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):alarms.ringing.includes('alarm')?'Alarm is ringing.':'';
 $('timer-inputs').hidden=!!alarms.timer;$('start-timer').disabled=!!alarms.timer;$('timer-countdown').hidden=!alarms.timer;
 for(const key of ['hours','minutes','seconds'])$('timer-'+key).disabled=!!alarms.timer;
 $('timer-state').textContent=alarms.timer?'':alarms.ringing.includes('timer')?'Timer finished.':'';
 const remaining=alarms.timer?Math.max(0,Math.ceil((alarms.timer.due-now)/1000)):0;
 $('timer-countdown').textContent=alarms.timer?[Math.floor(remaining/3600),Math.floor(remaining/60)%60,remaining%60].map(n=>String(n).padStart(2,'0')).join(':'):'';
 $('clock-timer').hidden=!alarms.timer;
 $('clock-timer-countdown').textContent=$('timer-countdown').textContent;
}
if(alarms.alarm?.time)$('alarm-time').value=alarms.alarm.time;
setInterval(tickAlarms,1000);document.addEventListener('visibilitychange',tickAlarms);tickAlarms();

}
