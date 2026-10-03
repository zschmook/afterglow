const settingsTabs=['display','location','news','sports'];
function settingsTab(name){settingsTabs.forEach(key=>{const b=$('settings-'+key);b.setAttribute('aria-selected',key===name);b.setAttribute('aria-controls','settings-panel-'+key);b.tabIndex=key===name?0:-1;const panel=$('settings-panel-'+key);panel.hidden=key!==name;panel.setAttribute('aria-labelledby','settings-'+key);});}
settingsTabs.forEach(name=>{const b=$('settings-'+name);b.onclick=()=>settingsTab(name);b.onkeydown=e=>tabKeys(e,settingsTabs,name,settingsTab,'settings-');});settingsTab('display');
function settingsSaved(){ $('settings-status').textContent=savePreferences()?'Saved in this browser.':'Applied for this session; browser storage is unavailable.'; }
function locationFields(){const p=preferences.place;$('place-zip').value=p?.zip||'';$('location-result').textContent=p?.name||'Enter your ZIP code to set weather and radar.';$('location-label').textContent=p?p.name.toUpperCase():'SET LOCATION';document.querySelectorAll('.location-required').forEach(panel=>panel.classList.toggle('needs-location',!p));}
function applyLocation(place){preferences.place=place;setZone(place.timezone||'America/New_York');settingsSaved();locationFields();stopRadar();if(radarMap){radarMap.remove();radarMap=null;radarLayer=null;radarFrames=[];radarFetched=0;}if(weatherTab==='radar')loadRadar();refresh();}
let locationLookupBusy=false;
$('location-form').onsubmit=async e=>{e.preventDefault();if(locationLookupBusy)return;const zip=$('place-zip').value.trim();if(!/^[0-9]{5}$/.test(zip)){$('location-result').textContent='Enter a five-digit US ZIP code.';return;}locationLookupBusy=true;$('location-save').disabled=true;$('place-zip').disabled=true;$('location-result').textContent='Looking up ZIP code…';try{const response=await fetch('/api/location?zip='+encodeURIComponent(zip));const place=await response.json();if(!response.ok)throw Error(place.error||'ZIP lookup unavailable. Try again.');applyLocation(place);$('display-dialog').close();}catch(error){$('location-result').textContent=error.message;}finally{locationLookupBusy=false;$('location-save').disabled=false;$('place-zip').disabled=false;}};
locationFields();
for(const [id,source]of [['lnp','LNP'],['wgal','WGAL'],['wapo','Washington Post'],['npr','NPR'],['cbs','CBS'],['bbc','BBC'],['guardian','Guardian']]){const input=$('source-'+id);input.checked=preferences.sources[source];input.onchange=()=>{preferences.sources[source]=input.checked;settingsSaved();selectNews(newsCategory);};}
$('default-league').value=preferences.league;$('league').value=sportsLeague;
$('default-league').onchange=e=>{preferences.league=e.target.value;sportsLeague=e.target.value;$('league').value=sportsLeague;settingsSaved();renderSports(sportsFeeds[sportsLeague]);};

function openLocation(){settingsTab('location');if(!$('display-dialog').open)$('display-dialog').showModal();$('place-zip').focus();}
$('location-label').onclick=openLocation;
for(const id of ['weather-set-location','forecast-set-location'])$(id).onclick=openLocation;
