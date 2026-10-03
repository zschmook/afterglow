if(embeddedPanel==='system'){
 let busy=false;
 const bytes=value=>value===null?'…':value>=1073741824?(value/1073741824).toFixed(1)+' GiB':value>=1048576?(value/1048576).toFixed(1)+' MiB':(value/1024).toFixed(1)+' KiB';
 async function updateStats(){
  if(busy||document.hidden)return;busy=true;
  try{
   const response=await fetch('/api/system-stats',{cache:'no-store',signal:AbortSignal.timeout(15000)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'System stats unavailable');
   const hardware=data.hardware||{};
   const ramNames=[...new Set((hardware.ram||[]).map(r=>[r.Manufacturer?.trim(),r.PartNumber?.trim(),(r.ConfiguredClockSpeed||r.Speed)?(r.ConfiguredClockSpeed||r.Speed)+' MT/s':''].filter(Boolean).join(' · ')))];
   const ramModel=ramNames.join(' / '),diskModel=hardware.disk?.FriendlyName;
   const enabled=key=>preferences.stats?.[key]!==false;
   for(const key of ['cpu','memory','disk','network','uptime','battery'])$('system-'+key+(key==='network'||key==='uptime'||key==='battery'?'':'-value')).closest('[data-stat]').hidden=!enabled(key);
   $('system-cpu-label').textContent='CPU · '+(data.cpu_model||'Processor');
   $('system-host').textContent=data.os+' · '+data.threads+' THREADS';
   for(const [name,value,detail] of [['cpu',data.cpu,data.threads+' logical processors'],['memory',data.memory.percent,bytes(data.memory.used)+' / '+bytes(data.memory.total)+(ramModel?' · '+ramModel:'')],['disk',data.disk.percent,data.disk.name+' · '+bytes(data.disk.total-data.disk.used)+' free'+(diskModel?' · '+diskModel:'')]]){
    $('system-'+name+'-value').textContent=Math.round(value)+'%';$('system-'+name+'-bar').value=value;$('system-'+name+'-detail').textContent=detail;
   }
   const gpuList=$('system-gpus');gpuList.replaceChildren();
   for(const gpu of data.gpus||[]){
    if(!enabled('gpu:'+gpu.name))continue;
    const row=document.createElement('div');row.className='system-metric';
    const heading=document.createElement('div'),label=document.createElement('span'),value=document.createElement('strong');
    label.textContent='GPU · '+gpu.name;value.textContent=gpu.percent===null?'N/A':Math.round(gpu.percent)+'%';heading.append(label,value);row.append(heading);
    if(gpu.percent!==null){const bar=document.createElement('progress');bar.max=100;bar.value=gpu.percent;bar.setAttribute('aria-label',gpu.name+' utilization');row.append(bar);}
    const detail=document.createElement('small');detail.textContent=gpu.memory_used_mib===null||gpu.memory_total_mib===null?'VRAM unavailable':'Dedicated '+bytes(gpu.memory_used_mib*1048576)+' / '+bytes(gpu.memory_total_mib*1048576)+(gpu.shared_total_mib?' · Shared limit '+bytes(gpu.shared_total_mib*1048576):'');row.append(detail);gpuList.append(row);
   }
   if(!data.gpus?.length)gpuList.textContent='GPU counters unavailable';
   $('system-network').textContent='↓ '+bytes(data.network.received)+'/s     ↑ '+bytes(data.network.sent)+'/s';
   const hours=Math.floor(data.uptime/3600);$('system-uptime').textContent='UP '+Math.floor(hours/24)+'d '+hours%24+'h';
   $('system-battery').textContent=data.battery?'BATTERY '+Math.round(data.battery.percent)+'%'+(data.battery.plugged?' · AC':''):'';
   $('system-status').textContent='LIVE · EVERY 2 SEC';$('system-body').classList.remove('stats-stale');
  }catch(error){$('system-status').textContent=error.message;$('system-body').classList.add('stats-stale');}
  finally{busy=false;}
 }
 setInterval(updateStats,2000);document.addEventListener('visibilitychange',updateStats);updateStats();
}
