/* Hamilton dial based on the user's family watch; dashboard-local time. */
(() => {
  if (embeddedPanel) return;
  const dial=document.createElementNS('http://www.w3.org/2000/svg','svg');
  dial.id='rectangular-clock';dial.setAttribute('viewBox','0 0 400 400');
  dial.setAttribute('role','img');dial.setAttribute('aria-label','Hamilton clock');dial.setAttribute('hidden','');
  function railTrack(w,h,inset){
    const ticks=Array.from({length:60},(_,i)=>{
      const a=i*Math.PI/30,sx=Math.sin(a),sy=-Math.cos(a),r=1/Math.max(Math.abs(sx),Math.abs(sy));
      return `<path d="M${sx*r*w} ${sy*r*h}L${sx*r*(w-inset)} ${sy*r*(h-inset)}" stroke-width="${i%5?.65:2.6}"/>`;
    }).join('');
    return `<g fill="none" stroke="#625d4c"><rect x="${-w}" y="${-h}" width="${w*2}" height="${h*2}" stroke-width="1"/><rect x="${-w+inset}" y="${-h+inset}" width="${(w-inset)*2}" height="${(h-inset)*2}" stroke-width=".8"/>${ticks}</g>`;
  }
  const positions=[[12,200,89],[1,271,89],[2,280,150],[3,281,211],[4,279,271],[5,271,337],[7,129,337],[8,121,271],[9,119,211],[10,123,150],[11,129,89]];
  const numbers=positions.map(([n,x,y])=>`<text x="${x}" y="${y}" class="rf-number">${n}</text>`).join('');
  dial.innerHTML=`<defs>
    <linearGradient id="rf-painted-gold" x2=".6" y2="1"><stop stop-color="#b18e4c"/><stop offset=".55" stop-color="#a78240"/><stop offset="1" stop-color="#99743a"/></linearGradient>
    <linearGradient id="rf-case" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#765421"/><stop offset=".07" stop-color="#e4c67c"/><stop offset=".16" stop-color="#fff0be"/><stop offset=".25" stop-color="#b98d43"/><stop offset=".5" stop-color="#ead39a"/><stop offset=".75" stop-color="#b58a42"/><stop offset=".9" stop-color="#fff0bd"/><stop offset="1" stop-color="#84622d"/></linearGradient>
    <linearGradient id="rf-bevel" x2=".8" y2="1"><stop stop-color="#fff0b9"/><stop offset=".18" stop-color="#b58b42"/><stop offset=".46" stop-color="#f6e1aa"/><stop offset=".73" stop-color="#8e682c"/><stop offset="1" stop-color="#ead097"/></linearGradient>
    <linearGradient id="rf-gold" x2=".75" y2=".6"><stop stop-color="#847452"/><stop offset=".25" stop-color="#dcc592"/><stop offset=".5" stop-color="#b5a075"/><stop offset=".54" stop-color="#8d7a56"/><stop offset="1" stop-color="#d7c59b"/></linearGradient>
    <radialGradient id="rf-ivory" cx=".4" cy=".35" r=".85"><stop stop-color="#f1e4c3"/><stop offset=".6" stop-color="#e4d7b6"/><stop offset="1" stop-color="#c6b58e"/></radialGradient>
    <linearGradient id="rf-hand" x2="1" y2=".15"><stop stop-color="#747265"/><stop offset=".48" stop-color="#c6c2ae"/><stop offset=".51" stop-color="#827d6c"/><stop offset="1" stop-color="#b6ae96"/></linearGradient>
    <linearGradient id="rf-crown-gold" x2="1" y2=".2"><stop stop-color="#72532c"/><stop offset=".3" stop-color="#cfac69"/><stop offset=".65" stop-color="#f0d795"/><stop offset="1" stop-color="#96703b"/></linearGradient>
    <clipPath id="rf-crown-clip"><path d="M337 162Q354 161 354 190Q354 219 337 218Z"/></clipPath>
    <pattern id="rf-satin" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 1h2" stroke="#9c916f" stroke-opacity=".08" stroke-width=".35"/></pattern>
    <filter id="rf-hand-shadow" x="-70%" y="-20%" width="240%" height="150%"><feDropShadow dx="1" dy="1.7" stdDeviation="1" flood-color="#5d4b28" flood-opacity=".45"/></filter>
  </defs>
  <g id="rf-crown" aria-hidden="true">
    <rect x="329" y="175" width="12" height="30" rx="2" fill="url(#rf-bevel)" stroke="#755d39" stroke-width=".8"/>
    <path d="M337 162Q354 161 354 190Q354 219 337 218Z" fill="url(#rf-crown-gold)" stroke="#7c6139" stroke-width="1"/>
    <g clip-path="url(#rf-crown-clip)">${Array.from({length:16},(_,i)=>{const y=164+i*3.5;return `<path d="M337 ${y}Q346 ${y+1.5} 355 ${y}" fill="none" stroke="#795c32" stroke-width=".95"/><path d="M338 ${y+1.2}Q346 ${y+2.7} 354 ${y+1.2}" fill="none" stroke="#f7df9f" stroke-width=".7"/>`;}).join('')}</g>
    <path d="M338 164V216" stroke="#e6c686" stroke-width="1"/>
  </g>
  <path d="M78 17H322L330 26Q337 200 330 374L322 383H78L70 374Q63 200 70 26Z" fill="url(#rf-case)" stroke="#715832" stroke-width="1.5"/>
  <path d="M79 21H321L326 28Q333 200 326 372L321 379H79L74 372Q67 200 74 28Z" fill="none" stroke="#f3dc9f" stroke-width=".8"/>
  <path d="M89 30H311L318 37Q325 200 318 363L311 370H89L82 363Q75 200 82 37Z" fill="url(#rf-bevel)" stroke="#8e744a" stroke-width="1"/>
  <path d="M97 39H303L310 45Q316 200 310 355L303 361H97L90 355Q84 200 90 45Z" fill="url(#rf-ivory)" stroke="#82765a" stroke-width="1.5"/>
  <rect x="91" y="40" width="218" height="320" rx="4" fill="url(#rf-satin)"/>
  <path d="M71 26L82 37M329 26L318 37M71 374L82 363M329 374L318 363" stroke="#785e33" stroke-width="1"/>
  <g transform="translate(200 200)">${railTrack(102,151,6)}</g>
  <g text-anchor="middle">${numbers}</g>
  <text id="rf-brand" x="200" y="125" text-anchor="middle" class="rf-brand">HAMILTON</text>
  <g id="rf-seconds-dial" transform="translate(200 300)">
    <rect x="-33" y="-47" width="66" height="94" fill="#e1d2ac" fill-opacity=".35"/>
    ${railTrack(33,47,4)}
    <path d="M-22 -32H22V32H-22Z" fill="none" stroke="#7c7154" stroke-width=".55"/>
    <g class="rf-sub-number" text-anchor="middle"><text y="-35">60</text><text transform="translate(25 -20) rotate(90)">10</text><text transform="translate(25 20) rotate(90)">20</text><text y="41">30</text><text transform="translate(-25 20) rotate(-90)">40</text><text transform="translate(-25 -20) rotate(-90)">50</text></g>
    <g id="rf-second"><path d="M0 9V-29" stroke="#665d49" stroke-width="1"/><path d="M-1.5 5h3v5h-3Z" fill="url(#rf-hand)"/></g>
    <circle r="3" fill="url(#rf-hand)" stroke="#807356" stroke-width=".5"/>
  </g>
  <g id="rf-hour" filter="url(#rf-hand-shadow)"><path d="M200 110L192.5 169L197 196H203L207.5 169Z" fill="url(#rf-hand)" stroke="#81775c" stroke-width=".55"/><path d="M200 115V192" stroke="#d7d0b7" stroke-width=".7"/></g>
  <g id="rf-minute" filter="url(#rf-hand-shadow)"><path d="M200 88L195 164L198 197H202L205 164Z" fill="url(#rf-hand)" stroke="#7c7359" stroke-width=".55"/><path d="M200 94V193" stroke="#e0d8bc" stroke-width=".65"/></g>
  <circle cx="200" cy="190" r="6" fill="url(#rf-bevel)" stroke="#897953" stroke-width=".75"/><circle cx="200" cy="190" r="2.6" fill="url(#rf-hand)" stroke="#736b55" stroke-width=".7"/>`;
  $('clock').after(dial);
  let stamp='';
  window.RectangularFace={dial,tick(now,h,m,s,digital,timeZone){
    if(dial.hasAttribute('hidden')||preferences.centerContent!=='clock'||$('clock-panel').classList.contains('show-calendar'))return;
    $('rf-hour').setAttribute('transform',`rotate(${h*30} 200 190)`);
    $('rf-minute').setAttribute('transform',`rotate(${m*6} 200 190)`);
    $('rf-second').setAttribute('transform',`rotate(${s*6})`);
    const key=digital+timeZone;
    if(key!==stamp){stamp=key;dial.setAttribute('aria-label',`Hamilton clock, ${digital}, ${timeZone}. Rectangular small seconds dial.`);}
  }};
})();
