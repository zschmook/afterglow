const settingsTabs=['display','location','news','sports','media'];
function settingsTab(name){settingsTabs.forEach(key=>{const b=$('settings-'+key);b.setAttribute('aria-selected',key===name);b.setAttribute('aria-controls','settings-panel-'+key);b.tabIndex=key===name?0:-1;const panel=$('settings-panel-'+key);panel.hidden=key!==name;panel.setAttribute('aria-labelledby','settings-'+key);});}
settingsTabs.forEach(name=>{const b=$('settings-'+name);b.onclick=()=>settingsTab(name);b.onkeydown=e=>tabKeys(e,settingsTabs,name,settingsTab,'settings-');});settingsTab('display');
function settingsSaved(){ $('settings-status').textContent=savePreferences()?'Saved in this browser.':'Applied for this session; browser storage is unavailable.'; }
function locationFields(){const p=preferences.place;$('place-zip').value=p?.zip||'';$('location-result').textContent=p?.name||'Enter your ZIP code to set weather and radar.';$('location-label').textContent=p?p.name.toUpperCase():'SET LOCATION';document.querySelectorAll('.location-required').forEach(panel=>panel.classList.toggle('needs-location',!p));}
function applyLocation(place){preferences.place=place;setZone(place.timezone||'America/New_York');settingsSaved();locationFields();stopRadar();if(radarMap){radarMap.remove();radarMap=null;radarLayer=null;radarFrames=[];radarFetched=0;}if(weatherTab==='radar')loadRadar();refresh();}
let locationLookupBusy=false;
$('location-form').onsubmit=async e=>{e.preventDefault();if(locationLookupBusy)return;const zip=$('place-zip').value.trim();if(!/^[0-9]{5}$/.test(zip)){$('location-result').textContent='Enter a five-digit US ZIP code.';return;}locationLookupBusy=true;$('location-save').disabled=true;$('place-zip').disabled=true;$('location-result').textContent='Looking up ZIP code…';try{const response=await fetch('/api/location?zip='+encodeURIComponent(zip));const place=await response.json();if(!response.ok)throw Error(place.error||'ZIP lookup unavailable. Try again.');applyLocation(place);$('display-dialog').close();}catch(error){$('location-result').textContent=error.message;}finally{locationLookupBusy=false;$('location-save').disabled=false;$('place-zip').disabled=false;}};
locationFields();
for(const [id,source]of [['lnp','LNP'],['wgal','WGAL'],['wapo','Washington Post'],['npr','NPR'],['cbs','CBS'],['bbc','BBC'],['guardian','Guardian']]){const input=$('source-'+id);input.checked=preferences.sources[source];input.onchange=()=>{preferences.sources[source]=input.checked;settingsSaved();selectNews(newsCategory);};}
function sportsOptions(){
 for(const id of ['league','default-league']){
  const select=$(id);select.replaceChildren(...preferences.sportsLeagues.map(key=>{const option=document.createElement('option');option.value=key;option.textContent=sportsCatalog[key];return option;}));
  select.value=id==='league'?sportsLeague:preferences.league;
 }
}
for(const key of Object.keys(sportsCatalog)){
 const input=$('sports-enable-'+key);input.checked=preferences.sportsLeagues.includes(key);
 input.onchange=()=>{
  const selected=Object.keys(sportsCatalog).filter(key=>$('sports-enable-'+key).checked);
  if(!selected.length){input.checked=true;$('sports-settings-status').textContent='Keep at least one league selected.';return;}
  preferences.sportsLeagues=selected;
  if(!selected.includes(preferences.league))preferences.league=selected[0];
  if(!selected.includes(sportsLeague))sportsLeague=preferences.league;
  sportsOptions();settingsSaved();$('sports-settings-status').textContent='League choices saved in this browser.';
  renderSports(sportsFeeds[sportsLeague]);refresh();
 };
}
sportsOptions();
$('default-league').onchange=e=>{preferences.league=e.target.value;sportsLeague=e.target.value;$('league').value=sportsLeague;settingsSaved();renderSports(sportsFeeds[sportsLeague]);};

function openLocation(){settingsTab('location');if(!$('display-dialog').open)$('display-dialog').showModal();$('place-zip').focus();}
$('location-label').onclick=openLocation;
for(const id of ['weather-set-location','forecast-set-location'])$(id).onclick=openLocation;

$('m3u-settings-form').onsubmit=async event=>{
  event.preventDefault();
  const loader=window.CustomM3U;
  if(!loader){$('m3u-settings-status').textContent='Media is still loading. Try again.';return;}
  $('m3u-settings-save').disabled=true;
  try{await loader.loadPlaylist($('m3u-settings-url').value.trim());}
  finally{$('m3u-settings-save').disabled=false;}
};

$('display-theme').value=preferences.theme;
$('display-theme').onchange=event=>{
 const theme=event.target.value;
 if(!['afterglow','midnight','hearth','halloween','thanksgiving','christmas'].includes(theme))return;
 preferences.theme=theme;globalThis.applyDashboardTheme?.(theme);settingsSaved();
};
