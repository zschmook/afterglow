'use strict';
let weatherTab='overview', radarMap=null, radarLayer=null, radarFrames=[], radarIndex=0;
let radarTimer=null, radarFetched=0, radarBusy=false, radarHost='';
const weatherNames=['overview','hourly','radar'], newsNames=['local','national','world'];

function selectNews(category,reset=true){
  newsCategory=category;
  const feed=newsFeeds[category];
  const now=Date.now(),cutoff=now-12*60*60*1000;
  news=(feed?.data||[]).filter(item=>{const time=Date.parse(item.date);return preferences.sources[item.source]!==false&&Number.isFinite(time)&&time>=cutoff&&time<=now;}).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  if(reset)$('news-items').scrollTop=0;
  newsNames.forEach(name=>{const button=$('news-'+name);button.setAttribute('aria-selected',name===category);button.tabIndex=name===category?0:-1;});
  $('news-items').setAttribute('aria-labelledby','news-'+category);
  $('news-heading').textContent={local:'AROUND LANCASTER',national:'ACROSS THE NATION',world:'AROUND THE WORLD'}[category];
  const categorySources={local:['LNP','WGAL'],national:['Washington Post','NPR','CBS'],world:['Washington Post','BBC','Guardian','NPR']};
  const enabled=Object.entries(feed?.sources||Object.fromEntries(categorySources[category].map(name=>[name,{available:!!feed?.data,stale:feed?.stale}]))).filter(([name])=>preferences.sources[name]!==false);
  $('news-publisher').textContent=enabled.map(([name])=>name==='Washington Post'?'WaPo':name).join(' + ')||'Sources off';
  $('news-status').textContent=enabled.map(([name,state])=>name+(state.available?(state.stale?' (cached)':''):' (unavailable)')).join(' · ')||'All sources disabled';
  renderNews();
}
function tabKeys(event,names,current,select,prefix){
  let next=names.indexOf(current);
  if(event.key==='ArrowRight')next=(next+1)%names.length;
  else if(event.key==='ArrowLeft')next=(next+names.length-1)%names.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=names.length-1;
  else return;
  event.preventDefault();select(names[next]);$(prefix+names[next]).focus();
}
newsNames.forEach(name=>{const button=$('news-'+name);button.onclick=()=>selectNews(name);button.onkeydown=e=>tabKeys(e,newsNames,newsCategory,selectNews,'news-');});

function renderHourly(hourly){
  if(!hourly?.time?.length){$('hourly-items').textContent='Hourly forecast unavailable';return;}
  const hourNow=Math.floor((Date.now()+30*60*1000)/3600000)*3600;
  const indexes=hourly.time.map((t,i)=>i).filter(i=>hourly.time[i]>=hourNow).slice(0,12);
  $('hourly-items').replaceChildren(...indexes.map(i=>{
    const row=element('div','hour-row'),[label,icon]=weatherInfo(hourly.weather_code[i],hourly.is_day[i]);
    const img=element('img');img.src=iconPath(icon);img.alt=label;
    row.append(element('time','',new Date(hourly.time[i]*1000).toLocaleTimeString('en-US',{timeZone:zone,hour:'numeric'})),img,element('strong','',Math.round(hourly.temperature_2m[i])+'°'),element('span','hour-rain',(hourly.precipitation_probability[i]??0)+'% rain'));
    return row;
  }));
}
function stopRadar(){clearInterval(radarTimer);radarTimer=null;$('radar-play').textContent='Play';}
function selectWeather(name){
  weatherTab=name;
  weatherNames.forEach(value=>{const selected=value===name;const tab=$('tab-'+value);tab.setAttribute('aria-selected',selected);tab.tabIndex=selected?0:-1;$('weather-'+value).hidden=!selected;});
  if(name==='radar')loadRadar();else stopRadar();
}
weatherNames.forEach(name=>{const button=$('tab-'+name);button.onclick=()=>selectWeather(name);button.onkeydown=e=>tabKeys(e,weatherNames,weatherTab,selectWeather,'tab-');});
let touchStart=null;
$('weather-pages').addEventListener('touchstart',e=>{if(weatherTab!=='radar'&&e.touches.length===1)touchStart=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});
$('weather-pages').addEventListener('touchend',e=>{if(!touchStart||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-touchStart[0],dy=e.changedTouches[0].clientY-touchStart[1];touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5){const i=weatherNames.indexOf(weatherTab);selectWeather(weatherNames[(i+(dx<0?1:2))%3]);}},{passive:true});
$('weather-pages').addEventListener('touchcancel',()=>{touchStart=null;},{passive:true});

function showRadar(index){
  if(!radarFrames.length)return;
  radarIndex=(index+radarFrames.length)%radarFrames.length;
  const frame=radarFrames[radarIndex];
  if(radarLayer)radarMap.removeLayer(radarLayer);
  radarLayer=L.tileLayer(`${radarHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,{opacity:.75,maxZoom:7,attribution:'Radar © <a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a>'});
  const layer=radarLayer;
  layer.on('tileerror',()=>{if(layer===radarLayer){$('radar-time').textContent='Radar imagery unavailable';stopRadar();}});
  layer.addTo(radarMap);
  $('radar-time').textContent=new Date(frame.time*1000).toLocaleTimeString('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'})+' '+zoneLabel(new Date(frame.time*1000),'short');
}
async function loadRadar(force=false){
  if(!preferences.place)return;
  if(!radarMap){
    if(typeof L==='undefined'){$('radar-time').textContent='Map library unavailable';return;}
    radarMap=L.map('radar-map',{scrollWheelZoom:false,maxZoom:7,minZoom:4}).setView([preferences.place.lat,preferences.place.lon],7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:7,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(radarMap);
    L.circleMarker([preferences.place.lat,preferences.place.lon],{radius:4,color:'#ff36bb',fillOpacity:1}).addTo(radarMap).bindTooltip(element('span','',preferences.place.name));
    new ResizeObserver(()=>radarMap.invalidateSize()).observe($('radar-map'));
  }
  requestAnimationFrame(()=>radarMap.invalidateSize());
  if(radarBusy||(!force&&Date.now()-radarFetched<300000))return;
  radarBusy=true;
  try{
    const response=await fetch('/api/radar');if(!response.ok)throw Error();const feed=await response.json();
    if(!feed.data?.radar?.past?.length)throw Error();
    const host=new URL(feed.data.host);if(host.protocol!=='https:'||host.hostname!=='tilecache.rainviewer.com')throw Error();
    const frames=feed.data.radar.past.filter(f=>/^\/v2\/radar\/[a-zA-Z0-9_-]+$/.test(f.path)&&Number.isFinite(f.time)).sort((a,b)=>a.time-b.time);if(!frames.length)throw Error();
    stopRadar();radarHost=host.origin;radarFrames=frames;radarFetched=Date.now();showRadar(frames.length-1);
    if(feed.stale)$('radar-time').textContent+=' · cached';
  }catch{$('radar-time').textContent=radarFrames.length?'Update failed · older radar':'Radar temporarily unavailable';}
  finally{radarBusy=false;}
}
$('radar-prev').onclick=()=>{stopRadar();showRadar(radarIndex-1);};
$('radar-next').onclick=()=>{stopRadar();showRadar(radarIndex+1);};
$('radar-play').onclick=()=>{if(radarTimer){stopRadar();showRadar(radarFrames.length-1);loadRadar();return;}if(!radarFrames.length)return;$('radar-play').textContent='Pause';radarTimer=setInterval(()=>{if(!document.hidden&&weatherTab==='radar')showRadar(radarIndex+1);else stopRadar();},900);};
setInterval(()=>{if(weatherTab==='radar'&&!document.hidden)loadRadar(true);},300000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopRadar();else if(weatherTab==='radar')loadRadar();});

refresh();
const currentWeatherLink=element('a','current-weather-link');
currentWeatherLink.id='current-weather-link';currentWeatherLink.target='_blank';currentWeatherLink.rel='noopener noreferrer';
$('weather-icon').before(currentWeatherLink);
currentWeatherLink.append($('weather-icon'),$('temperature').parentElement);
function updateWeatherForecastLink(){
 const place=preferences.place;
 if(place&&Number.isFinite(place.lat)&&Number.isFinite(place.lon)){
  currentWeatherLink.href='https://forecast.weather.gov/MapClick.php?'+new URLSearchParams({lat:place.lat,lon:place.lon});
  currentWeatherLink.setAttribute('aria-label','National Weather Service forecast for '+place.name+' (opens in a new tab)');
  currentWeatherLink.title='NWS forecast for '+place.name;
  currentWeatherLink.removeAttribute('aria-disabled');currentWeatherLink.removeAttribute('tabindex');
 }else{
  currentWeatherLink.removeAttribute('href');currentWeatherLink.setAttribute('aria-disabled','true');currentWeatherLink.tabIndex=-1;
 }
}
updateWeatherForecastLink();
