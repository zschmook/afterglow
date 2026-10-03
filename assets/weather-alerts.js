let weatherAlertFeed;
function activeWeatherAlerts(feed, now=Date.now()) {
 const rank={Extreme:0,Severe:1,Moderate:2,Minor:3,Unknown:4};
 return (feed?.data?.features||[]).map(f=>f.properties).filter(p=>p&&p.status==='Actual'&&p.messageType!=='Cancel'&&(!p.expires||Date.parse(p.expires)>now)&&(!p.ends||Date.parse(p.ends)>now)).sort((a,b)=>(rank[a.severity]??4)-(rank[b.severity]??4));
}
function displayedWeatherAlerts() {
 return activeWeatherAlerts(weatherAlertFeed);
}

function showWeatherAlerts(alerts, stale) {
 const container=$('weather-alert-details');container.replaceChildren();
 if(stale){const status=document.createElement('p');status.textContent='NWS update unavailable. Previously received alerts may be out of date.';container.append(status);}
 for(const alert of alerts){
  const section=document.createElement('article');section.className='weather-alert-detail';
  const add=(tag,text)=>{if(!text)return;const node=document.createElement(tag);node.textContent=text;section.append(node);};
  add('small',(alert.senderName||'National Weather Service')+' · '+alert.severity);
  add('h3',alert.event);add('p',alert.headline);add('p',alert.areaDesc);
  if(alert.expires)add('p','Expires '+new Date(alert.expires).toLocaleString('en-US',{timeZone:zone}));
  add('p',alert.description);add('p',alert.instruction);container.append(section);
 }
 if(!alerts.length){const p=document.createElement('p');p.textContent='No active alerts for this location.';container.append(p);}
 if(!$('weather-alert-dialog').open)$('weather-alert-dialog').showModal();
}
function renderWeatherAlerts(feed) {
 weatherAlertFeed=feed;
 const alerts=preferences.place?displayedWeatherAlerts():[],button=$('weather-alert-button');
 button.hidden=!alerts.length;
 button.title=alerts.map(a=>a.event).join('\n');
 button.setAttribute('aria-label',`View ${alerts.length} weather alert${alerts.length===1?'':'s'}`);
 $('weather-alert-count').textContent=alerts.length>1?String(alerts.length):'ALERT';
}
$('weather-alert-button').onclick=()=>{
 const host=window.parent!==window&&typeof window.parent.showWeatherAlerts==='function'?window.parent:window;
 host.showWeatherAlerts(displayedWeatherAlerts(),!!weatherAlertFeed?.stale);
};
$('close-weather-alert').onclick=()=>$('weather-alert-dialog').close();
setInterval(()=>renderWeatherAlerts(weatherAlertFeed),10000);
renderWeatherAlerts(undefined);
