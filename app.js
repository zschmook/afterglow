'use strict';
// Feed rendering uses textContent; upstream headlines are never HTML.
const $=id=>document.getElementById(id);
let zone='America/New_York';
function setZone(value){try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format();if(value&&zone!==value){zone=value;$('digital').dataset.time='';$('news-items').dataset.signature='';}}catch{}}
setZone(preferences.place?.timezone);
function zoneLabel(date=new Date(),style='long'){return new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:style}).formatToParts(date).find(p=>p.type==='timeZoneName').value;}

let news=[], refreshing=false, newsCategory="local", newsFeeds={}, sportsFeeds={}, sportsLeague=preferences.league;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const expressiveWeather=new Set(['clear-night','fog','snow','clear-day','partly-cloudy-day','partly-cloudy-night','overcast','rain','drizzle','partly-cloudy-day-rain','partly-cloudy-night-rain','thunderstorms']);
const iconPath=name=>expressiveWeather.has(name)?`/assets/weather-icons/faces/${name}.svg?v=5`:`/assets/weather-icons/meteocons/fill/${name}.svg`;
function weatherInfo(code,day=true){const suffix=day?'day':'night';if(code===0)return ['Clear',`clear-${suffix}`];if(code<=2)return ['Partly cloudy',`partly-cloudy-${suffix}`];if(code===3)return ['Overcast','overcast'];if(code<=48)return ['Foggy','fog'];if(code<=57)return ['Drizzle','drizzle'];if(code<=67)return ['Rain','rain'];if(code<=77)return ['Snow','snow'];if(code<=82)return ['Rain showers',`partly-cloudy-${suffix}-rain`];if(code<=86)return ['Snow showers','snow'];return ['Thunderstorms','thunderstorms'];}
const svgNS='http://www.w3.org/2000/svg';
for(let i=0;i<60;i++){const angle=i*Math.PI/30,major=i%5===0,inner=major?158:165;const line=document.createElementNS(svgNS,'line');for(const [k,v]of Object.entries({x1:200+Math.sin(angle)*inner,y1:200-Math.cos(angle)*inner,x2:200+Math.sin(angle)*170,y2:200-Math.cos(angle)*170,stroke:major?'#dcb1e9':'#624475','stroke-width':major?2:1}))line.setAttribute(k,v);$('ticks').append(line);}
for(let i=1;i<=12;i++){const angle=i*Math.PI/6,t=document.createElementNS(svgNS,'text');t.setAttribute('x',200+Math.sin(angle)*139);t.setAttribute('y',207-Math.cos(angle)*139);t.setAttribute('text-anchor','middle');t.textContent=i;$('numbers').append(t);}
function clock(){if(typeof embeddedPanel!=='undefined'&&embeddedPanel)return;const now=new Date(),parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));const s=+parts.second+(reduced.matches?0:now.getMilliseconds()/1000),m=+parts.minute+s/60,h=+parts.hour+m/60;$('hour-hand').setAttribute('transform',`rotate(${h*30} 200 200)`);$('minute-hand').setAttribute('transform',`rotate(${m*6} 200 200)`);$('second-hand').setAttribute('transform',`rotate(${s*6} 200 200)`);const digital=now.toLocaleTimeString('en-US',{timeZone:zone,hour:preferences.clock24?'2-digit':'numeric',minute:'2-digit',hourCycle:preferences.clock24?'h23':'h12'});if($('digital').dataset.time!==digital){$('clock-zone').textContent=zoneLabel(now).toUpperCase();$('digital').textContent=digital;$('digital').dataset.time=digital;$('clock').setAttribute('aria-label',digital+' '+zoneLabel(now));$('date').textContent=now.toLocaleDateString('en-US',{timeZone:zone,weekday:'long',month:'long',day:'numeric'});}window.MechanicalFace?.tick(now,h,m,s,digital,zone);setTimeout(clock,reduced.matches?1000:40);}clock();
function element(tag,cls,text){const el=document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;}
function safeURL(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function renderWeather(feed){if(!preferences.place)return;if(!feed.data){$('condition').textContent='Weather unavailable';$('weather-status').textContent='OFFLINE';return;}if(feed.data.timezone){setZone(feed.data.timezone);if(preferences.place.timezone!==zone){preferences.place.timezone=zone;savePreferences();}}renderHourly(feed.data.hourly);const c=feed.data.current,d=feed.data.daily,[label,icon]=weatherInfo(c.weather_code,c.is_day);$('weather-icon').src=iconPath(icon);$('weather-icon').alt=label;$('temperature').textContent=Math.round(c.temperature_2m)+'°';$('condition').textContent=label;$('feels').textContent=`Feels like ${Math.round(c.apparent_temperature)}°`;$('high-low').textContent=`H ${Math.round(d.temperature_2m_max[0])}° / L ${Math.round(d.temperature_2m_min[0])}°`;$('wind').textContent=`WIND ${Math.round(c.wind_speed_10m)} MPH`;$('humidity').textContent=`HUMIDITY ${c.relative_humidity_2m}%`;$('weather-status').textContent=feed.stale?'CACHED':preferences.place.name.toUpperCase();$('forecast').replaceChildren(...d.time.map((date,i)=>{
const [dayCondition,dayIcon]=weatherInfo(d.weather_code[i]);
const box=element('div','day'),img=element('img');img.src=iconPath(dayIcon);img.alt=dayCondition;box.append(element('span','',i===0?'TODAY':new Date(date*1000).toLocaleDateString('en-US',{timeZone:zone,weekday:'short'}).toUpperCase()),img,element('strong','',Math.round(d.temperature_2m_max[i])+'°'),element('em','',Math.round(d.temperature_2m_min[i])+'°'),element('span','rain',(d.precipitation_probability_max[i]??0)+'%'));return box;}));}
function renderNews(){
  const list=$('news-items'), feed=newsFeeds[newsCategory];
  $('news-count').textContent=`${news.length} STORIES · LAST 12H`;
  const signature=JSON.stringify([newsCategory,news,Boolean(feed?.data)]);
  if(list.dataset.signature===signature)return;
  list.dataset.signature=signature;
  const scroll=list.scrollTop, focused=list.contains(document.activeElement)?document.activeElement?.href:null;
  if(!news.length){list.textContent=feed?.data?'No stories from enabled sources in the last 12 hours.':'Headlines temporarily unavailable';return;}
  list.replaceChildren(...news.map(item=>{
    const a=element('a','headline');a.href=safeURL(item.url)||'#';a.target='_blank';a.rel='noopener';
    const date=new Date(item.date);
    a.append(element('time','',(item.source||'LNP')+' · '+date.toLocaleString('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).toUpperCase()),element('strong','',item.title));return a;
  }));
  if(focused)[...list.children].find(a=>a.href===focused)?.focus({preventScroll:true});
  list.scrollTop=scroll;
}
const expandedGames=new Set();
function gameState(event){return (event.status||event.competitions?.[0]?.status)?.type?.state||'pre';}
function gameDistance(event){
 if(!preferences.place)return Infinity;
 const radians=d=>d*Math.PI/180,origin=preferences.place;
 return Math.min(Infinity,...(event.competitions?.[0]?.competitors||[]).map(c=>{
  const p=c.team?.homeLocation;if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return Infinity;
  const dlat=radians(p.lat-origin.lat),dlon=radians(p.lon-origin.lon);
  const a=Math.sin(dlat/2)**2+Math.cos(radians(origin.lat))*Math.cos(radians(p.lat))*Math.sin(dlon/2)**2;
  return 3958.8*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
 }));
}
function renderSports(feed){
 const list=$('score-items');
 $('sports-status').textContent=feed?.stale?'CACHED SCORES · ESPN':'SCORES VIA ESPN';
 if(!feed?.data){list.textContent='Scores temporarily unavailable';return;}
 const rank={in:0,pre:1,post:2};
 const events=[...(feed.data.events||[])].sort((a,b)=>{const sa=gameState(a),sb=gameState(b);return (rank[sa]??3)-(rank[sb]??3)||(sa==='in'&&sb==='in'?(gameDistance(a)-gameDistance(b)||0):0)||(sa==='post'?Date.parse(b.date)-Date.parse(a.date):Date.parse(a.date)-Date.parse(b.date))||0;});
 if(!events.length){list.textContent=`No ${sportsLeague==='ncaa'?'NCAA D1':'NFL'} games on the current scoreboard.`;return;}
 const scroll=list.dataset.league===sportsLeague?list.scrollTop:0;
 const focused=list.contains(document.activeElement)?document.activeElement?.dataset?.gameKey:null;
 list.dataset.league=sportsLeague;
 let group=null;const nodes=[],summaries=[];
 for(const event of events){
  const state=gameState(event),competition=event.competitions?.[0]||{},status=event.status||competition.status||{},key=sportsLeague+':'+event.id;
  if(state!==group){nodes.push(element('h3','score-group',({in:'LIVE NOW',pre:'UPCOMING',post:'FINAL'})[state]||'OTHER GAMES'));group=state;}
  const game=element('details','game game-expandable'),summary=element('summary');summary.dataset.gameKey=key;
  game.open=expandedGames.has(key);game.ontoggle=()=>{if(game.open)expandedGames.add(key);else expandedGames.delete(key);};
  const date=new Date(event.date),scheduled=Number.isFinite(date.getTime())?date.toLocaleString('en-US',{timeZone:zone,month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Time TBD';
  summary.append(element('div','game-status',state==='in'?'LIVE · '+(status.type?.shortDetail||'In progress'):state==='pre'?scheduled:status.type?.shortDetail||'Final'));
  const row=element('div','teams');
  for(const [i,c]of(competition.competitors||[]).entries()){
   if(i)row.append(element('span','versus','VS'));const team=element('div','team'),logo=safeURL(c.team?.logo);
   if(logo){const img=element('img');img.src=logo;img.alt='';team.append(img);}
   team.append(element('b','',c.team?.abbreviation||c.team?.displayName||'TBD'),element('span','team-score',state==='pre'?'—':c.score??'—'));row.append(team);
  }
  summary.append(row);game.append(summary);summaries.push(summary);
  const detail=element('div','game-detail');
  const add=(label,value)=>{if(value!==undefined&&value!==null&&value!=='')detail.append(element('p','',label+value));};
  add('',status.type?.detail||status.type?.description);
  if(state==='in'){
   const miles=gameDistance(event);if(Number.isFinite(miles))add('Nearest team’s home: ',Math.round(miles)+' miles from your ZIP');
   if(status.period>0)add('',status.period<=4?'Quarter '+status.period:'Overtime '+(status.period-4));
   if(status.displayClock)add('Time remaining: ',status.displayClock);
   add('',competition.situation?.downDistanceText);add('Ball: ',competition.situation?.possessionText);
   add('Last play: ',competition.situation?.lastPlay?.text);
  }else if(state==='pre')add('Starts: ',scheduled);
  for(const c of competition.competitors||[]){if(c.linescores?.length)add((c.team?.abbreviation||'Team')+' by quarter: ',c.linescores.map((q,i)=>(i<4?'Q'+(i+1):'OT'+(i-3))+': '+(q.displayValue??q.value??'—')).join(' · '));}
  add('Venue: ',competition.venue?.fullName);
  add('TV: ',[...new Set((competition.broadcasts||[]).flatMap(b=>b.names||[]))].join(', '));
  game.append(detail);nodes.push(game);
 }
 list.replaceChildren(...nodes);if(focused)summaries.find(s=>s.dataset.gameKey===focused)?.focus({preventScroll:true});list.scrollTop=scroll;
}
async function refresh(){if(typeof embeddedPanel!=='undefined'&&['quotes','system','radio'].includes(embeddedPanel))return;if(refreshing)return;refreshing=true;const requestedPlace=preferences.place;try{const response=await fetch(preferences.place?`/api/dashboard?lat=${preferences.place.lat}&lon=${preferences.place.lon}`:'/api/dashboard');if(!response.ok)throw Error();const data=await response.json();if(requestedPlace!==preferences.place)return;renderWeather(data.weather);if(typeof renderWeatherAlerts==='function')renderWeatherAlerts(data.alerts);if(typeof renderWeatherAlerts==='function')renderWeatherAlerts(data.alerts);newsFeeds=data.news;selectNews(newsCategory,false);sportsFeeds=data.sports;renderSports(sportsFeeds[sportsLeague]);$('sync-status').textContent=[data.weather,...Object.values(data.sports),...Object.values(data.news)].some(f=>f.stale)?'SOME FEEDS UNAVAILABLE / CACHED':'UPDATED '+new Date().toLocaleTimeString('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'});}catch{$('sync-status').textContent='CONNECTION LOST · RETRYING';}finally{refreshing=false;if(requestedPlace!==preferences.place)refresh();}}setInterval(()=>{if(!document.hidden)refresh();},60000);
$('settings').onclick=()=>$('display-dialog').showModal();$('close-settings').onclick=()=>$('display-dialog').close();function scale(value){value=Math.max(85,Math.min(140,Number(value)||100));document.documentElement.style.setProperty('--ui-scale',value/100);$('ui-scale').value=value;$('scale-value').textContent=value+'%';try{localStorage.setItem('ui-scale',value);}catch{}}try{scale(localStorage.getItem('ui-scale')||100);}catch{scale(100);}$('ui-scale').oninput=e=>scale(e.target.value);$('reset-scale').onclick=()=>scale(100);$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('sync-status').textContent='FULLSCREEN UNAVAILABLE IN THIS BROWSER';}};

$('league').onchange=e=>{sportsLeague=e.target.value;renderSports(sportsFeeds[sportsLeague]);};
