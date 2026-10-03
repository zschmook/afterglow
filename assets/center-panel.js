if(!embeddedPanel){
 const container=$('center-system'),mediaContainer=$('center-media'),choice=$('center-content');
 function selectCenter(){
  const system=preferences.centerContent==='system';
  const media=preferences.centerContent==='m3u';
  choice.value=system?'system':media?'m3u':'clock';
  $('center-heading').textContent=system?'A FEW STATS FOR YOU':media?'A LITTLE ENTERTAINMENT':'A LITTLE TIME FOR YOURSELF';
  $('clock-panel').classList.toggle('center-system-selected',system);
  $('clock-panel').classList.toggle('center-m3u-selected',media);
  container.hidden=!system;
  if(system&&!container.firstChild){
   const frame=document.createElement('iframe');frame.title='System stats';frame.src='/?panel=system&center=1';container.append(frame);
  }else if(!system)container.replaceChildren();
  mediaContainer.hidden=!media;
  if(media&&!mediaContainer.firstChild){
   const card=document.createElement('section');card.className='panel m3u';mediaContainer.append(card);CustomM3U.mount(card);
  }else if(!media&&mediaContainer.firstChild){CustomM3U.unmount(mediaContainer.firstChild);mediaContainer.replaceChildren();}
  const back='Return to '+(system?'system stats':media?'Custom M3U':'clock');
  $('calendar-back').setAttribute('aria-label',back);
  if($('calendar-toggle').getAttribute('aria-expanded')==='true'){
   $('calendar-toggle').setAttribute('aria-label',back);$('calendar-toggle').title=back;
  }
 }
 window.setCenterContent=value=>{
  const content=['system','m3u'].includes(value)?value:'clock';
  if(content==='m3u')window.clearM3UCorners();
  preferences.centerContent=content;savePreferences();selectCenter();$('clock-options-dialog').close();
 };
 choice.onchange=()=>window.setCenterContent(choice.value);
 selectCenter();
}else if(embeddedPanel==='system'&&new URLSearchParams(location.search).get('center')==='1'){
 document.documentElement.classList.add('embed-system-center');
}
