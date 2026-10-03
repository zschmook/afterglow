'use strict';
const homeDialog=$('home-dialog'), homeGrid=$('home-grid');
let homeGeneration=0,homeBusy=0;
async function homeAPI(path,body){
  const response=await fetch('/api/home/'+path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Device request failed');return result;
}
function homeNotice(message){$('home-status').textContent=message;}
function homeLock(delta){homeBusy+=delta;$('home-discover').disabled=homeBusy>0;}
function deviceCard(device,kind,generation){
  const card=element('article','device-card'),head=element('button','device-head'),info=element('div');
  head.setAttribute('aria-haspopup','dialog');head.setAttribute('aria-label','Settings for '+device.name);
  const glyph=element('span','device-glyph',kind==='lights'?'☼':'⏻');glyph.setAttribute('aria-hidden','true');
  info.append(element('h3','',device.name),element('small','',kind==='lights'?'SMART BULB':'SMART OUTLET'));
  head.append(glyph,info);card.append(head);
  const message=element('p','device-status','Reading device…');message.setAttribute('role','status');
  const power=element('button','device-power','Connecting…');power.disabled=true;
  card.append(power);
  const settings=element('dialog','device-dialog'),heading=element('div','dialog-heading'),close=element('button','','×');
  settings.setAttribute('aria-label',device.name+' settings');close.setAttribute('aria-label','Close device settings');
  heading.append(element('h2','',device.name),close);
  const detailPower=element('button','device-power'),detailMessage=element('p','device-status');
  detailMessage.setAttribute('role','status');
  const options=element('div','device-options');settings.append(heading,detailPower,options,detailMessage);card.append(message,settings);
  head.onclick=()=>settings.showModal();close.onclick=()=>settings.close();
  function notice(text){message.textContent=text;detailMessage.textContent=text;}
  let state=null,busy=false;const inputs=[];
  function show(){
    card.classList.toggle('device-on',!!state?.on);
    power.textContent=state?(state.on?'Turn off':'Turn on'):'Unavailable';power.disabled=busy||!state;
    power.setAttribute('aria-label',`${power.textContent} ${device.name}`);
    detailPower.textContent=power.textContent;detailPower.disabled=power.disabled;
    for(const input of inputs)input.disabled=busy||!state?.on;
  }
  async function change(changes){
    if(busy||!state)return;busy=true;homeLock(1);show();notice('Updating…');
    try{state=await homeAPI(`${kind}/${encodeURIComponent(device.device_id)}/control`,changes);renderOptions();notice(state.on?'On':'Off');}
    catch(error){notice(error.message);renderOptions();}
    finally{busy=false;homeLock(-1);show();}
  }
  function range(label,key,min,max,value,unit){
    const wrap=element('label','device-range'),title=element('span','',label),out=element('output','',value+unit),input=element('input');
    input.type='range';input.min=min;input.max=max;input.step=key==='color_temp'?100:1;input.value=value;input.setAttribute('aria-label',label+' for '+device.name);
    input.oninput=()=>{out.textContent=input.value+unit;};input.onchange=()=>change({[key]:Number(input.value)});
    title.append(out);wrap.append(title,input);options.append(wrap);inputs.push(input);
  }
  function renderOptions(){
    options.replaceChildren();inputs.length=0;
    if(state?.dimmable)range('Brightness','brightness',1,100,state.brightness??100,'%');
    if(state?.color_capable){const wrap=element('label','device-color','Color'),input=element('input');input.type='color';input.value=state.color||'#ffffff';input.setAttribute('aria-label','Color for '+device.name);input.onchange=()=>change({color:input.value});wrap.append(input);options.append(wrap);inputs.push(input);}
    if(state?.color_temp_capable)range('White temperature','color_temp',state.color_temp_min??2500,state.color_temp_max??6500,state.color_temp??3000,' K');
    if(state&&!inputs.length)options.append(element('p','muted','This outlet supports power on/off.'));
    show();
  }
  power.onclick=detailPower.onclick=()=>{if(state)return change({on:!state.on});};
  show();notice('Reading device…');
  homeAPI(`${kind}/${encodeURIComponent(device.device_id)}/state`).then(result=>{if(generation!==homeGeneration)return;state=result;renderOptions();notice(state.on?'On':'Off');show();}).catch(error=>{if(generation!==homeGeneration)return;notice(error.message);show();});
  return card;
}
async function loadHome(discover=false,background=false){
  if(homeBusy)return;
  const generation=++homeGeneration;homeLock(1);if(!background)homeNotice(discover?'Looking for supported bulbs and outlets…':'Loading your home…');
  try{
    if(discover)await homeAPI('discover',{});
    const devices=await homeAPI('devices');
    if(generation!==homeGeneration)return;
    const bulbs=devices.lights||[],outlets=devices.outlets||[],other=devices.other||[];
    const sections=[];
    for(const [label,kind,items]of [['Bulbs','lights',bulbs],['Outlets','outlets',outlets],['Other','other',other]]){
      if(!items.length)continue;
      const section=element('section','device-section'),heading=element('h3','device-section-title',label),grid=element('div','device-section-grid');
      heading.id='home-group-'+kind;section.setAttribute('aria-labelledby',heading.id);
      for(const device of items){
        if(kind!=='other')grid.append(deviceCard(device,kind,generation));
        else{const card=element('article','device-card');card.append(element('h3','',device.name||'Unknown device'),element('p','device-status','Controls unavailable for this device.'));grid.append(card);}
      }
      section.append(heading,grid);sections.push(section);
    }
    const scroll=homeGrid.scrollTop;homeGrid.replaceChildren(...sections);homeGrid.scrollTop=scroll;
    homeNotice(`${bulbs.length} bulbs · ${outlets.length} outlets`+(other.length?` · ${other.length} other`:''));
    if(!sections.length)homeGrid.append(element('p','muted','No devices found. Tap Find all devices to scan your network.'));
  }catch(error){if(generation===homeGeneration)homeNotice(error.message);}
  finally{homeLock(-1);}
}
let homeRefreshTimer=null;
function stopHomeRefresh(){if(homeRefreshTimer!==null)clearInterval(homeRefreshTimer);homeRefreshTimer=null;}
$('open-home').onclick=()=>{
  homeDialog.showModal();loadHome();stopHomeRefresh();
  homeRefreshTimer=setInterval(()=>{
    if(!homeDialog.open||homeBusy||homeGrid.querySelector('dialog[open]')||homeGrid.contains(document.activeElement))return;
    loadHome(false,true);
  },15*60*1000);
};
$('close-home').onclick=()=>homeDialog.close();
homeDialog.addEventListener('close',stopHomeRefresh);
$('home-discover').onclick=()=>loadHome(true);

$('open-alarm').onclick=()=>$('alarm-dialog').showModal();
$('close-alarm').onclick=()=>$('alarm-dialog').close();
