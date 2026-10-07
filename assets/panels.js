const slotTypes=['weather','forecast','news','scores'],panelTypes=[...slotTypes,'quotes','system','radio','m3u'];
if(panelTypes.includes(embeddedPanel)){
 // Widget copies have independent tabs and controls, with no nested dashboards.
 document.querySelector('.'+embeddedPanel).classList.add('embedded-selected');document.querySelector('.'+embeddedPanel).hidden=false;
 document.querySelectorAll('.location-prompt button').forEach(b=>b.onclick=()=>parent.openLocation());
 window.addEventListener('storage',e=>{
  if(e.key==='dashboard-preferences'){
   try{const before={...preferences},after=JSON.parse(e.newValue||'{}');const theme=after.theme;delete before.theme;delete after.theme;
    if(JSON.stringify(before)===JSON.stringify(after)){preferences.theme=theme;window.applyDashboardTheme?.(theme);return;}
   }catch{}
  }
  if(e.key==='dashboard-preferences'||e.key==='ui-scale')location.reload();
 });
}else{
 let layout={};try{layout=JSON.parse(localStorage.getItem('panel-layout')||'{}')||{};}catch{}
 // Repair older layouts that allowed more than one M3U card.
 let mediaTaken=preferences.centerContent==='m3u',layoutChanged=false;
 for(const type of slotTypes){if(layout[type]==='m3u'){if(mediaTaken){delete layout[type];layoutChanged=true;}else mediaTaken=true;}}
 function saveLayout(){try{localStorage.setItem('panel-layout',JSON.stringify(layout));}catch{}}
 if(layoutChanged)saveLayout();
 const slots={};let selectedSlot=null;
 for(const type of slotTypes){
  const original=document.querySelector('.dashboard>.'+type),slot=element('div','widget-slot slot-'+type),gear=element('button','panel-gear','⚙');
  gear.setAttribute('aria-label','Choose '+({weather:'upper-left',forecast:'lower-left',news:'upper-right',scores:'lower-right'})[type]+' panel content');gear.setAttribute('aria-haspopup','dialog');
  original.before(slot);slot.append(original,gear);slots[type]={original,slot,frame:null};
  gear.onclick=()=>{selectedSlot=type;$('panel-content').value=panelTypes.includes(layout[type])?layout[type]:type;$('panel-options').showModal();};
 }
 let updateCombinedWeather=()=>{};
 let splits={};try{splits=JSON.parse(localStorage.getItem('panel-height-splits')||'{}')||{};}catch{}
 const dashboard=document.querySelector('.dashboard');
 for(const [side,top,bottom] of [['left','weather','forecast'],['right','news','scores']]){
  const column=element('div','side-column side-'+side),divider=element('div','panel-divider');
  slots[top].slot.before(column);column.append(slots[top].slot,divider,slots[bottom].slot);
  divider.tabIndex=0;divider.setAttribute('role','separator');divider.setAttribute('aria-orientation','horizontal');
  divider.setAttribute('aria-label','Resize '+side+' panels');divider.title='Drag to resize · double-click to reset';
  let percentage=50,dragging=false;
  const apply=value=>{
   const height=column.clientHeight-16,min=Math.min(40,180/Math.max(1,height)*100);
   percentage=Math.max(min,Math.min(100-min,value));
   column.style.gridTemplateRows=`minmax(0,${percentage}fr) 16px minmax(0,${100-percentage}fr)`;
   divider.setAttribute('aria-valuemin',String(Math.round(min)));divider.setAttribute('aria-valuemax',String(Math.round(100-min)));
   divider.setAttribute('aria-valuenow',String(Math.round(percentage)));updateCombinedWeather();
  };
  const save=()=>{splits[side]=percentage;try{localStorage.setItem('panel-height-splits',JSON.stringify(splits));}catch{}};
  const move=event=>apply((event.clientY-column.getBoundingClientRect().top-8)/Math.max(1,column.clientHeight-16)*100);
  divider.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();dragging=true;divider.setPointerCapture(event.pointerId);dashboard.classList.add('dashboard-resizing');};
  divider.onpointermove=event=>{if(dragging)move(event);};
  const finish=()=>{if(!dragging)return;dragging=false;dashboard.classList.remove('dashboard-resizing');save();};
  divider.onpointerup=finish;divider.onpointercancel=finish;divider.onlostpointercapture=finish;
  divider.ondblclick=()=>{apply(50);save();};
  divider.onkeydown=event=>{
   const value=event.key==='ArrowUp'?percentage-2:event.key==='ArrowDown'?percentage+2:event.key==='Home'?0:event.key==='End'?100:null;
   if(value===null)return;event.preventDefault();apply(value);save();
  };
  apply(Number.isFinite(splits[side])?splits[side]:50);
 }
 function displaySlot(type){
  const {original,slot}=slots[type];if(slots[type].frame){window.CustomM3U?.unmount(slots[type].frame);slots[type].frame.remove();slots[type].frame=null;}
  const content=panelTypes.includes(layout[type])?layout[type]:type;original.hidden=content!==type;
  if(content==='m3u'){const card=element('section','panel m3u');slot.prepend(card);slots[type].frame=card;window.CustomM3U.mount(card);}
  else if(content!==type){const frame=element('iframe','widget-frame');frame.title=({weather:'Weather',forecast:'Five-day forecast',news:'News',scores:'Sports',quotes:'Quotes',system:'System stats',radio:'Radio'})[content];frame.src='/?panel='+content;slot.prepend(frame);slots[type].frame=frame;}
  updateCombinedWeather();
 }
 window.clearM3UCorners=except=>{
  let changed=false;
  for(const type of slotTypes){if(type!==except&&layout[type]==='m3u'){delete layout[type];displaySlot(type);changed=true;}}
  if(changed)saveLayout();
 };
 slotTypes.forEach(displaySlot);
 // Keep each view mounted: moving animated SVG images between hidden parents
 // can leave them blank after a resize in some browsers.
 const forecastDays=$('forecast'),forecastHome=forecastDays.parentNode;
 const forecastSource=forecastHome.querySelector('.source');
 const combined=element('section','combined-forecast');combined.hidden=true;
 combined.setAttribute('aria-label','Five-day forecast');
 combined.append(element('h3','eyebrow','THE NEXT FEW DAYS'));
 const combinedDays=element('div','forecast-days');
 combined.append(combinedDays,forecastSource.cloneNode(true));
 const syncForecast=()=>combinedDays.replaceChildren(...Array.from(forecastDays.childNodes,node=>node.cloneNode(true)));
 new MutationObserver(syncForecast).observe(forecastDays,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 syncForecast();
 $('weather-overview').append(combined);
 const available=element('section','panel weather-slot-available');available.hidden=true;
 available.append(element('h2','eyebrow','ANOTHER LITTLE SPACE'));
 const choose=element('button','','Choose a panel');choose.onclick=()=>slots.forecast.slot.querySelector('.panel-gear').click();
 available.append(choose);slots.forecast.slot.prepend(available);
 updateCombinedWeather=()=>{
  const bounds=slots.weather.slot.getBoundingClientRect();
  const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'))||1;
  const weatherContent=panelTypes.includes(layout.weather)?layout.weather:'weather';
  const forecastContent=panelTypes.includes(layout.forecast)?layout.forecast:'forecast';
  const fits=weatherContent==='weather'&&bounds.width>=300*scale&&bounds.height>=360*scale;
  combined.hidden=!fits;slots.weather.original.classList.toggle('weather-combined',fits);
  slots.forecast.original.hidden=forecastContent!=='forecast'||fits;
  available.hidden=!fits||forecastContent!=='forecast';
 };
 new ResizeObserver(updateCombinedWeather).observe(slots.weather.slot);
 new MutationObserver(updateCombinedWeather).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
 updateCombinedWeather();
 const conditions=$('weather-overview').querySelector('.conditions');
 new ResizeObserver(entries=>{
  const {width,height}=entries[0].contentRect;if(!width||!height)return;
  const icon=Math.round(Math.min(height*.82,width*.44));
  const temperature=Math.round(Math.min(Math.max(42,height*.62),width*.34));
  slots.weather.original.style.setProperty('--conditions-icon-size',icon+'px');
  slots.weather.original.style.setProperty('--conditions-temperature-size',temperature+'px');
 }).observe(conditions);
 $('panel-content').onchange=e=>{
  const content=e.target.value;
  if(content==='m3u'){
   if(preferences.centerContent==='m3u')window.setCenterContent('clock');
   window.clearM3UCorners(selectedSlot);
  }
  layout[selectedSlot]=content;saveLayout();displaySlot(selectedSlot);$('panel-options').close();
 };
 $('close-panel-options').onclick=()=>$('panel-options').close();
 $('clock-format').value=preferences.clock24?'24':'12';
 $('clock-options').onclick=()=>$('clock-options-dialog').showModal();$('close-clock-options').onclick=()=>$('clock-options-dialog').close();
 $('clock-format').onchange=e=>{preferences.clock24=e.target.value==='24';savePreferences();$('digital').dataset.time='';};
}
