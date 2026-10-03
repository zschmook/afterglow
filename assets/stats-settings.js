if(!embeddedPanel){
 const fields=[['cpu','CPU'],['memory','Memory'],['disk','Disk'],['network','Network'],['uptime','Uptime'],['battery','Battery']];
 const groups=[];
 function populate(group,gpus=[]){
  group.replaceChildren();const title=document.createElement('p');title.textContent='Include in stats cards (all views)';group.append(title);
  for(const [key,name] of [...fields,...gpus.map(g=>['gpu:'+g.name,g.name])]){
   const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=preferences.stats?.[key]!==false;
   input.onchange=()=>{preferences.stats??={};preferences.stats[key]=input.checked;savePreferences();for(const other of groups)if(other!==group)populate(other,gpus);document.querySelectorAll('iframe').forEach(frame=>{try{frame.contentWindow.postMessage({type:'stats-preferences'},location.origin);}catch{}});};
   label.append(input,document.createTextNode(name));group.append(label);
  }
 }
 for(const [dialogId,selectId] of [['panel-options','panel-content'],['clock-options-dialog','center-content']]){
  const dialog=$(dialogId),group=document.createElement('div');group.className='stats-settings';group.hidden=true;dialog.append(group);groups.push(group);
  new MutationObserver(async()=>{
   if(!dialog.open)return;group.hidden=$(selectId).value!=='system';if(group.hidden)return;
   populate(group);try{const response=await fetch('/api/system-stats');if(response.ok){const data=await response.json();populate(group,data.gpus||[]);}}catch{}
  }).observe(dialog,{attributes:true,attributeFilter:['open']});
 }
}else if(embeddedPanel==='system'){
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='stats-preferences')location.reload();});
}
