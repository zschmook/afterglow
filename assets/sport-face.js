/* Instrument-style dial. All complications use dashboard time and weather. */
(() => {
  if (embeddedPanel) return;
  const dial=document.createElementNS('http://www.w3.org/2000/svg','svg');
  dial.id='sport-clock';dial.setAttribute('viewBox','0 0 400 400');
  dial.setAttribute('role','img');dial.setAttribute('aria-label','Sport instrument clock');
  dial.setAttribute('hidden','');
  const weekdays=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const ticks=Array.from({length:120},(_,i)=>`<path transform="rotate(${i*3} 200 200)" d="M200 ${i%10===0?19:i%2===0?16:13}V${i%2===0?24:20}" stroke="${i%2===0?'#a2a6a3':'#565b59'}" stroke-width="${i%2===0?1.6:.8}"/>`).join('');
  const markers=Array.from({length:12},(_,i)=>`<g transform="rotate(${i*30} 200 200)"><path d="M190 29H210V53H190Z" fill="url(#sp-steel)" stroke="#080a0b" stroke-width="2"/><path d="M193 32H198V39H193ZM202 32H207V39H202ZM193 43H198V50H193ZM202 43H207V50H202Z" fill="#f0f1e8"/></g>`).join('');
  const days=weekdays.map((name,i)=>`<g transform="rotate(${-18+i*360/7} 200 200)"><path id="sp-week-wedge-${i}" d="M182 46H218V67H182Z" fill="transparent"/><text id="sp-week-${i}" x="200" y="62" class="sp-week">${name}</text></g>`).join('');
  const gaugeTicks=Array.from({length:13},(_,i)=>`<path transform="rotate(${-130+i*260/12})" d="M0 -${i%3?27:24}V-30" stroke="${i%3?'#676d69':'#e3e6dd'}" stroke-width="${i%3?1:1.8}"/>`).join('');
  dial.innerHTML=`<defs>
    <radialGradient id="sp-dial"><stop stop-color="#303532"/><stop offset=".8" stop-color="#202522"/><stop offset="1" stop-color="#101412"/></radialGradient>
    <linearGradient id="sp-steel" x2=".8" y2="1"><stop stop-color="#d2d6d0"/><stop offset=".3" stop-color="#696e6a"/><stop offset=".55" stop-color="#d9dcd4"/><stop offset="1" stop-color="#4b514e"/></linearGradient>
    <linearGradient id="sp-lume" x2="1" y2="1"><stop stop-color="#f2f4e9"/><stop offset="1" stop-color="#a8b1a4"/></linearGradient>
    <pattern id="sp-grain" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 1H4M1 3H2" stroke="#c4cec1" stroke-width=".5" opacity=".06"/></pattern>
    <filter id="sp-shadow" x="-60%" y="-30%" width="220%" height="180%"><feDropShadow dx="1" dy="3" stdDeviation="1.4" flood-opacity=".9"/></filter>
  </defs>
  <circle cx="200" cy="200" r="196" fill="#090c0a" stroke="#676d68" stroke-width="2"/>
  <circle cx="200" cy="200" r="190" fill="#191d1b" stroke="#323934" stroke-width="2"/>
  <circle cx="200" cy="200" r="174" fill="#303631" stroke="#080a09" stroke-width="3"/>
  ${ticks}${markers}
  <circle cx="200" cy="200" r="148" fill="url(#sp-dial)" stroke="#757b71" stroke-width="1.4"/>
  <circle cx="200" cy="200" r="145" fill="url(#sp-grain)"/>
  <g text-anchor="middle">${days}</g>
  <g fill="none" stroke="#ff691a" stroke-width="4">
    <path d="M52 141 44 169 M350 144 356 172 M47 232 57 263 M344 232 333 263"/>
  </g>
  <path d="M134 68V153L91 183V270L156 298H244L309 268V134L268 94" fill="none" stroke="#0a0e0b" stroke-width="4"/>
  <path d="M136 70V154L93 184V268L157 296H244L307 267V135L267 96" fill="none" stroke="#73796e" stroke-opacity=".45" stroke-width="1"/>
  <path d="M126 80 96 99 106 125H126Z" fill="#f66a21" stroke="#ff9e59" stroke-width="1"/>
  <text id="sp-date-badge" x="114" y="111" text-anchor="middle" class="sp-badge">—</text>
  <g text-anchor="middle">
    <text id="sp-temperature" x="207" y="103" class="sp-value">—</text>
    <text id="sp-date" x="190" y="131" class="sp-date">—</text>
    <image id="sp-weather" x="240" y="79" width="47" height="47" href="/assets/weather-icons/meteocons/fill/not-available.svg"/>
    <text id="sp-digital" x="165" y="167" class="sp-digital">—:—</text>
    <text id="sp-period" x="250" y="165" class="sp-label">LOCAL</text>
    <text x="123" y="212" class="sp-label">LOCAL TIME</text>
    <text x="124" y="242" class="sp-label">WIND</text>
    <text id="sp-wind" x="124" y="257" class="sp-readout">—</text>
    <text x="227" y="242" class="sp-label">HUMIDITY</text>
    <text id="sp-humidity" x="227" y="257" class="sp-readout">—</text>
    <path d="M91 244 85 249 91 254M255 244 261 249 255 254" fill="#ff6c22"/>
    <text x="200" y="283" class="sp-caption">DAY PROGRESS</text>
    <rect x="142" y="301" width="116" height="4" rx="2" fill="#0c110e" stroke="#646b60" stroke-width=".5"/>
    <rect id="sp-progress" x="142" y="301" width="0" height="4" rx="2" fill="#ff701f"/>
    <text id="sp-progress-label" x="200" y="322" class="sp-readout">—</text>
    <text id="sp-zone" x="200" y="336" class="sp-caption">LOCAL TIME</text>
  </g>
  <g transform="translate(278 198)">
    <circle r="34" fill="#121713" stroke="#575f55" stroke-width="1"/>
    ${gaugeTicks}<text x="-19" y="22" class="sp-gauge-label">0</text><text x="17" y="22" class="sp-gauge-label">24</text>
    <text id="sp-hours" y="-9" text-anchor="middle" class="sp-readout">—</text>
    <g id="sp-24-hand"><path d="M-2 5-3-18 0-26 3-18 2 5Z" fill="#fb6a1b" stroke="#151a13" stroke-width=".8"/><circle r="2" fill="#121713"/></g>
  </g>
  <text transform="translate(320 223) rotate(-90)" class="sp-label">24 HOURS</text>
  <g id="sp-hour" filter="url(#sp-shadow)">
    <path d="M193 218 187 112 192 92 200 85 208 92 213 112 207 218Z" fill="#111614" stroke="url(#sp-steel)" stroke-width="3"/>
    <path d="M195 179 193 114 197 99 203 99 207 114 205 179Z" fill="#0b0f0c" stroke="#737d73" stroke-width="1.2"/>
    <path d="M196 101H204L206 116H194Z" fill="url(#sp-lume)"/>
  </g>
  <g id="sp-minute" filter="url(#sp-shadow)">
    <path d="M196 225 194 56 198 39 202 39 206 56 204 225Z" fill="#141a16" stroke="url(#sp-steel)" stroke-width="2.2"/>
    <path d="M198 177 197 59 200 47 203 59 202 177Z" fill="url(#sp-lume)"/>
  </g>
  <g id="sp-second" filter="url(#sp-shadow)">
    <path d="M200 227V9" stroke="#ff641a" stroke-width="1.6"/>
    <path d="M197 213H203V228H197Z" fill="#141a16" stroke="#ff641a" stroke-width="1.6"/>
  </g>
  <circle cx="200" cy="200" r="8" fill="#f77728" stroke="#080d09" stroke-width="2"/>
  <circle cx="200" cy="200" r="3.2" fill="#222822" stroke="#ffc28b" stroke-width=".7"/>`;
  $('clock').after(dial);
  let stamp='',weatherStamp='';
  function updateWeather(feed){
    const c=feed?.data?.current,known=!!preferences.place&&!!c;
    const temp=known&&Number.isFinite(c.temperature_2m)?`${Math.round(c.temperature_2m)}°F`:'—';
    const wind=known&&Number.isFinite(c.wind_speed_10m)?`${Math.round(c.wind_speed_10m)} MPH`:'—';
    const humidity=known&&Number.isFinite(c.relative_humidity_2m)?`${Math.round(c.relative_humidity_2m)}%`:'—';
    const code=known&&Number.isFinite(c.weather_code)?c.weather_code:null;
    const icon=code===null?'not-available':weatherInfo(code,c.is_day)[1];
    const key=[temp,wind,humidity,icon,!!feed?.stale].join('|');
    if(key===weatherStamp)return;weatherStamp=key;
    $('sp-temperature').textContent=temp;$('sp-wind').textContent=wind;$('sp-humidity').textContent=humidity;
    $('sp-weather').setAttribute('href',iconPath(icon));
    $('sp-weather').setAttribute('visibility',code===null?'hidden':'visible');
    $('sp-temperature').setAttribute('aria-label',`${feed?.stale?'Cached ':''}temperature ${temp}`);
    $('sp-weather').setAttribute('opacity',feed?.stale?'.6':'1');
  }
  window.SportFace={dial,updateWeather,tick(now,h,m,s,digital,timeZone){
    if(dial.hasAttribute('hidden')||preferences.centerContent!=='clock'||$('clock-panel').classList.contains('show-calendar'))return;
    for(const [id,angle] of [['hour',h*30],['minute',m*6],['second',s*6]])$('sp-'+id).setAttribute('transform',`rotate(${angle} 200 200)`);
    $('sp-24-hand').setAttribute('transform',`rotate(${-130+h/24*260})`);
    const key=[digital,timeZone,Math.floor(now.getTime()/60000)].join('|');
    if(key!==stamp){
      const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',day:'2-digit',month:'short',year:'numeric'}).formatToParts(now).map(p=>[p.type,p.value]));
      stamp=key;$('sp-digital').textContent=digital.replace(/\s*[AP]M$/i,'');
      $('sp-period').textContent=preferences.clock24?'24H':digital.match(/[AP]M$/i)?.[0]||'';
      $('sp-date').textContent=`${parts.day} ${parts.month.toUpperCase()}`;
      $('sp-date-badge').textContent=parts.day;
      $('sp-hours').textContent=Math.floor(h).toString().padStart(2,'0');
      $('sp-progress').setAttribute('width',(116*h/24).toFixed(2));
      $('sp-progress-label').textContent=`${Math.floor(h/24*100)}%`;
      $('sp-zone').textContent=zoneLabel(now,'short').toUpperCase();
      weekdays.forEach((day,i)=>{
        const active=day===parts.weekday.toUpperCase();
        $('sp-week-'+i).classList.toggle('sp-today',active);
        $('sp-week-wedge-'+i).setAttribute('fill',active?'#f36b22':'transparent');
      });
      dial.setAttribute('aria-label',`Sport instrument clock, ${digital}, ${parts.weekday} ${parts.month} ${parts.day}, ${timeZone}`);
    }
  }};
  updateWeather(latestWeatherFeed);
})();
