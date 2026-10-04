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
 function displaySlot(type){
  const {original,slot}=slots[type];if(slots[type].frame){window.CustomM3U?.unmount(slots[type].frame);slots[type].frame.remove();slots[type].frame=null;}
  const content=panelTypes.includes(layout[type])?layout[type]:type;original.hidden=content!==type;
  if(content==='m3u'){const card=element('section','panel m3u');slot.prepend(card);slots[type].frame=card;window.CustomM3U.mount(card);}
  else if(content!==type){const frame=element('iframe','widget-frame');frame.title=({weather:'Weather',forecast:'Five-day forecast',news:'News',scores:'Sports',quotes:'Quotes',system:'System stats',radio:'Radio'})[content];frame.src='/?panel='+content;slot.prepend(frame);slots[type].frame=frame;}
 }
 window.clearM3UCorners=except=>{
  let changed=false;
  for(const type of slotTypes){if(type!==except&&layout[type]==='m3u'){delete layout[type];displaySlot(type);changed=true;}}
  if(changed)saveLayout();
 };
 slotTypes.forEach(displaySlot);
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
