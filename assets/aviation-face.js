/* Aviation-inspired dial; each subdial shows real dashboard-local time. */
(() => {
  if (embeddedPanel) return;
  const dial=document.createElementNS('http://www.w3.org/2000/svg','svg');
  dial.id='aviation-clock';dial.setAttribute('viewBox','0 0 400 400');
  dial.setAttribute('role','img');dial.setAttribute('aria-label','Aviation clock');
  dial.setAttribute('hidden','');
  const point=(r,degrees)=>[+(200+Math.sin(degrees*Math.PI/180)*r).toFixed(2),+(200-Math.cos(degrees*Math.PI/180)*r).toFixed(2)];
  const track=Array.from({length:240},(_,i)=>{
    const major=i%20===0,minute=i%4===0,[x,y]=point(major?174:minute?179:183,i*1.5),[ex,ey]=point(189,i*1.5);
    return `<path d="M${x} ${y}L${ex} ${ey}" stroke="${major?'#f4f1dd':'#babdb5'}" stroke-width="${major?2.6:minute?1.4:.65}"/>`;
  }).join('');
  const bezelNumbers=Array.from({length:12},(_,i)=>{
    const [x,y]=point(196,i*30);
    return `<text transform="translate(${x} ${y}) rotate(${i*30})" class="af-bezel">${i?i*5:60}</text>`;
  }).join('');
  const numerals=[1,2,4,5,7,8,10,11].map(n=>{
    const [x,y]=point(146,n*30);
    return `<text x="${x}" y="${y+17}" class="af-number">${n}</text>`;
  }).join('');
  function subdial(x,y,id,label,max){
    const ticks=Array.from({length:60},(_,i)=>`<path transform="rotate(${i*6})" d="M0 -${i%5?43:38}V-47" stroke="${id==='hours'&&i<15?'#ad2926':'#303734'}" stroke-width="${i%5?.75:1.6}"/>`).join('');
    const numbers=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return `<text x="${Math.sin(a)*30}" y="${-Math.cos(a)*30+4}" class="af-sub-number">${i?i*max/6:max}</text>`;}).join('');
    return `<g transform="translate(${x} ${y})"><circle r="54" fill="#060909" stroke="#6c7470" stroke-width="1.2"/><circle r="50" fill="url(#af-cream)" stroke="#d8d8c5" stroke-width="2"/><circle r="48" fill="none" stroke="#9d9e87" stroke-width=".6"/>
      ${ticks}${numbers}<text y="19" class="af-sub-label">${label}</text>
      <g id="af-${id}"><path d="M-2 10L-2.4 -35L0 -43L2.4 -35L2 10Z" fill="#5b6260" stroke="#202824" stroke-width=".7"/><path d="M0 -9V-36" stroke="#e4e6da" stroke-width="1"/></g>
      <circle r="5" fill="url(#af-steel)" stroke="#696f67"/><circle r="1.3" fill="#343d38"/></g>`;
  }
  dial.innerHTML=`<defs>
    <radialGradient id="af-dial"><stop stop-color="#292e2d"/><stop offset=".72" stop-color="#181c1d"/><stop offset="1" stop-color="#090e0f"/></radialGradient>
    <linearGradient id="af-steel" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f8faf3"/><stop offset=".24" stop-color="#b3bab6"/><stop offset=".48" stop-color="#68716e"/><stop offset=".62" stop-color="#e0e4df"/><stop offset="1" stop-color="#78817c"/></linearGradient>
    <linearGradient id="af-lume" x2="1" y2=".3"><stop stop-color="#bec6bc"/><stop offset=".45" stop-color="#ffffec"/><stop offset="1" stop-color="#d9e0d3"/></linearGradient>
    <radialGradient id="af-cream"><stop stop-color="#f5f3df"/><stop offset=".76" stop-color="#e1e3cb"/><stop offset="1" stop-color="#babdab"/></radialGradient>
    <pattern id="af-grain" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 1h2M3 4h1" stroke="#cbd0c4" stroke-width=".45" opacity=".1"/></pattern>
    <filter id="af-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.6" flood-opacity=".8"/></filter>
  </defs>
  <circle cx="200" cy="200" r="192" fill="url(#af-dial)" stroke="#626966" stroke-width="2"/>
  <circle cx="200" cy="200" r="173" fill="url(#af-grain)" stroke="#424945" stroke-width=".5"/>
  ${track}<g text-anchor="middle">${bezelNumbers}</g>
  <g text-anchor="middle" filter="url(#af-shadow)">${numerals}</g>
  ${subdial(200,97,'hours','24 HOURS',24)}
  ${subdial(98,200,'seconds','SECONDS',60)}
  ${subdial(200,302,'minutes','MINUTES',60)}
  <g text-anchor="middle">
    <g transform="translate(266 167)" fill="none" stroke="#c3cbc3" stroke-width="1.2">
      <path d="M-6 0L-43 -8L-37 -1L-9 5M6 0L43 -8L37 -1L9 5M-36 -4L-10 1M36 -4L10 1M-29 1L-9 7M29 1L9 7"/>
      <path d="M0 -10L5 1L3 9L0 6L-3 9L-5 1Z" fill="url(#af-steel)"/>
    </g>
    <text x="265" y="186" class="af-brand">AFTERGLOW</text>
    <text x="266" y="198" class="af-caption">FLIGHT • No. 03</text>
    <text x="200" y="246" class="af-automatic">AUTOMATIC</text>
    <text x="200" y="365" class="af-caption">LOCAL TIME · PRECISION IN MOTION</text>
    <g transform="translate(315 224)"><rect x="-25" y="-18" width="50" height="36" fill="url(#af-steel)" stroke="#070a08" stroke-width="2"/><rect x="-21" y="-14" width="42" height="28" fill="#080d0c"/><rect x="-18" y="-11" width="36" height="22" fill="#f0f0db"/><text id="af-day" y="8" class="af-date">—</text></g>
  </g>
  <g id="af-hour" filter="url(#af-shadow)"><path d="M194 221L192 116L200 90L208 116L206 221Z" fill="url(#af-steel)" stroke="#535e58" stroke-width="1.2"/><path d="M196 181L195 119L200 103L205 119L204 181Z" fill="url(#af-lume)"/></g>
  <g id="af-minute" filter="url(#af-shadow)"><path d="M196 224L194 56L200 37L206 56L204 224Z" fill="url(#af-steel)" stroke="#5c6661" stroke-width="1"/><path d="M198 183L197 58L200 49L203 58L202 183Z" fill="url(#af-lume)"/></g>
  <g id="af-second" filter="url(#af-shadow)"><path d="M200 231V25" stroke="#ea472e" stroke-width="1.3"/><path d="M194 62L200 46L206 62L200 77Z" fill="#e3482f" stroke="#591e16" stroke-width="1"/><path d="M196.5 62L200 53L203.5 62L200 70Z" fill="#f8f5dc"/><path d="M197 217h6v13h-6Z" fill="#a9b4a8"/></g>
  <circle cx="200" cy="200" r="8" fill="url(#af-steel)" stroke="#555e59"/><circle cx="200" cy="200" r="3" fill="#afb9af"/>`;
  $('clock').after(dial);
  let stamp='';
  window.AviationFace={dial,tick(now,h,m,s,digital,timeZone){
    if(dial.hasAttribute('hidden')||preferences.centerContent!=='clock'||$('clock-panel').classList.contains('show-calendar'))return;
    for(const [id,angle] of [['hour',h*30],['minute',m*6],['second',s*6]])$('af-'+id).setAttribute('transform',`rotate(${angle} 200 200)`);
    for(const [id,angle] of [['hours',h*15],['seconds',s*6],['minutes',m*6]])$('af-'+id).setAttribute('transform',`rotate(${angle})`);
    const day=now.toLocaleDateString('en-US',{timeZone,day:'numeric'}),key=digital+timeZone+day;
    if(key!==stamp){stamp=key;$('af-day').textContent=day;dial.setAttribute('aria-label',`Aviation clock, ${digital}, ${timeZone}. Subdials: 24-hour time, seconds, minutes.`);}
  }};
})();
