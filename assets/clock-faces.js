/* Mechanical dial and watch-face selection. Time comes from the dashboard clock. */
(() => {
  if (embeddedPanel) return;
  const ns='http://www.w3.org/2000/svg',classic=$('clock');
  const dial=document.createElementNS(ns,'svg');
  dial.id='mechanical-clock';dial.setAttribute('viewBox','0 0 400 400');
  dial.setAttribute('role','img');dial.setAttribute('aria-label','Mechanical clock');
  const polar=(r,a)=>[+(Math.sin(a)*r).toFixed(2),+(-Math.cos(a)*r).toFixed(2)];
  function gear(x,y,r,teeth,seconds,gold=false) {
    const points=[];
    for(let i=0;i<teeth*4;i++)points.push(polar(i%4===1||i%4===2?r:r-3.5,i*Math.PI/(teeth*2)).join(','));
    const spokes=Array.from({length:6},(_,i)=>`<path transform="rotate(${i*60})" d="M-3 -8L-5 -${r-8}H5L3 -8Z" fill="url(#mf-steel)"/>`).join('');
    return `<g transform="translate(${x} ${y})"><g class="mf-motion mf-gear" style="--period:${Math.abs(seconds)}s;--direction:${seconds<0?'reverse':'normal'}">
      <polygon points="${points.join(' ')}" fill="url(#${gold?'mf-gold':'mf-steel'})" stroke="#090b0d" stroke-width="1.2"/>
      <circle r="${r-7}" fill="#111619" stroke="${gold?'#a7832e':'#6d7274'}" stroke-width="1.3"/>
      ${spokes}<circle r="9" fill="url(#mf-steel)" stroke="#0c0d0e"/><circle r="3" fill="#050708"/>
    </g></g>`;
  }
  function balance(x,y,reverse=false) {
    const spiral=Array.from({length:160},(_,i)=>{const a=i*.16,r=6+i*.16;return `${i?'L':'M'}${(Math.cos(a)*r).toFixed(2)},${(Math.sin(a)*r).toFixed(2)}`;}).join(' ');
    return `<g transform="translate(${x} ${y})">
      <circle r="65" fill="#06090b" stroke="url(#mf-steel)" stroke-width="5"/>
      ${gear(0,0,58,38,reverse?-22:22,true)}
      <g class="mf-motion mf-balance" style="--phase:${reverse?'-.38s':'0s'}">
        <circle r="48" fill="none" stroke="url(#mf-gold)" stroke-width="3"/>
        <path d="${spiral}" fill="none" stroke="#9e873e" stroke-width=".8"/>
        ${[0,120,240].map(a=>`<path transform="rotate(${a})" d="M-7 -9L-12 -38Q-11 -48 0 -49Q11 -48 12 -38L7 -9Z" fill="url(#mf-steel)" stroke="#252a2e" stroke-width="1.5"/><circle transform="rotate(${a})" cy="-38" r="3.5" fill="#11171c" stroke="#a8aaab"/>`).join('')}
      </g>
      <path d="M-53 29L-11 -10Q0 -20 10 -8L52 29L47 38L5 12Q0 9 -5 12L-47 38Z" fill="url(#mf-steel)" stroke="#161b1e" stroke-width="2"/>
      <circle r="13" fill="url(#mf-steel)" stroke="#12171a" stroke-width="2"/>
      <circle r="6" fill="url(#mf-ruby)" stroke="#b5a678" stroke-width="2"/>
      <circle cx="-1" cy="-2" r="1.6" fill="#fbd6e9" opacity=".8"/>
    </g>`;
  }
  const screws=Array.from({length:12},(_,i)=>{
    const [x,y]=polar(182,(i+.5)*Math.PI/6);
    return `<g transform="translate(${200+x} ${200+y}) rotate(${i*31})"><circle r="4.1" fill="url(#mf-steel)" stroke="#030506" stroke-width="1.3"/><path d="M-2.5 0h5" stroke="#20272b" stroke-width="1.3"/></g>`;
  }).join('');
  const ticks=Array.from({length:60},(_,i)=>{
    const [x1,y1]=polar(i%5?174:168,i*Math.PI/30),[x2,y2]=polar(178,i*Math.PI/30);
    return `<path d="M${200+x1} ${200+y1}L${200+x2} ${200+y2}" stroke="${i%5?'#727879':'#f5e7c7'}" stroke-width="${i%5?1:2.5}"/>`;
  }).join('');
  dial.innerHTML=`<defs>
    <linearGradient id="mf-steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e0e2dc"/><stop offset=".25" stop-color="#7d8586"/><stop offset=".48" stop-color="#333c41"/><stop offset=".65" stop-color="#b6bfbd"/><stop offset="1" stop-color="#414a4f"/></linearGradient>
    <linearGradient id="mf-plate" x2=".8" y2="1"><stop stop-color="#666c6b"/><stop offset=".45" stop-color="#303739"/><stop offset="1" stop-color="#171e22"/></linearGradient>
    <linearGradient id="mf-gold" x2=".8" y2="1"><stop stop-color="#fff1a6"/><stop offset=".25" stop-color="#e1b846"/><stop offset=".55" stop-color="#805721"/><stop offset=".8" stop-color="#f4d46c"/><stop offset="1" stop-color="#937232"/></linearGradient>
    <radialGradient id="mf-ruby"><stop stop-color="#dc79ba"/><stop offset=".5" stop-color="#944270"/><stop offset="1" stop-color="#301c30"/></radialGradient>
    <radialGradient id="mf-well"><stop stop-color="#263237"/><stop offset="1" stop-color="#05090b"/></radialGradient>
    <pattern id="mf-brush" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 .5h3" stroke="#fff" stroke-opacity=".065" stroke-width=".45"/></pattern>
    <clipPath id="mf-cutoff"><circle cx="200" cy="200" r="173"/></clipPath>
    <mask id="mf-openings"><circle cx="200" cy="200" r="166" fill="white"/>
      <path d="M54 147Q65 96 111 65Q136 55 147 81L160 123Q111 145 54 147ZM246 76Q260 58 278 71Q325 100 341 146L250 119ZM171 72Q200 56 227 72L223 107L177 107ZM39 180L155 142L171 186L75 235Q46 222 39 180ZM246 143L360 180Q355 216 324 237L230 186Z" fill="black"/>
      <circle cx="120" cy="279" r="66" fill="black"/><circle cx="280" cy="279" r="66" fill="black"/>
      <circle cx="200" cy="199" r="32" fill="black"/>
    </mask>
    <filter id="mf-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1" dy="3" stdDeviation="2" flood-opacity=".85"/></filter>
  </defs>
  <circle cx="200" cy="200" r="194" fill="#080c0e" stroke="#080a0d" stroke-width="4"/>
  <circle cx="200" cy="200" r="190" fill="url(#mf-plate)" stroke="url(#mf-steel)" stroke-width="3"/>
  <circle cx="200" cy="200" r="184" fill="#080d10" stroke="#8b9290" stroke-width=".6"/>
  <circle cx="200" cy="200" r="172" fill="url(#mf-well)" stroke="#777e7b" stroke-width="2"/>
  <g clip-path="url(#mf-cutoff)">
    ${gear(104,103,44,28,28)}${gear(172,117,28,20,-18,true)}${gear(225,96,25,18,16,true)}${gear(292,106,45,30,-29)}
    ${gear(74,205,37,25,-23,true)}${gear(134,179,25,18,16)}${gear(200,184,47,32,-30,true)}${gear(269,182,25,18,16)}${gear(329,209,38,25,-24,true)}
    ${gear(201,315,28,20,18)}
  </g>
  <g mask="url(#mf-openings)" filter="url(#mf-shadow)"><circle cx="200" cy="200" r="166" fill="url(#mf-plate)"/><circle cx="200" cy="200" r="166" fill="url(#mf-brush)"/><circle cx="200" cy="200" r="165" fill="none" stroke="#a3a8a0" stroke-width="1.5"/></g>
  ${balance(120,279)}${balance(280,279,true)}
  <g class="mf-labels" text-anchor="middle">
    <path d="M186 39L192 26L200 35L208 26L214 39Z" fill="none" stroke="url(#mf-gold)" stroke-width="1.5"/>
    <text x="200" y="54" class="mf-brand">AFTERGLOW</text>
    <text x="200" y="65" class="mf-small">OPENWORK • No. 02</text>
    <path d="M57 130L153 115L149 91L77 101Z" fill="#080d10" stroke="#626b6b" stroke-width=".8"/>
    <text id="mf-digital" x="111" y="114" class="mf-time">—:—</text>
    <text id="mf-weekday" x="104" y="131" class="mf-small">SATURDAY</text>
    <text x="293" y="119" class="mf-small mf-gold-text">AUTOMATIC</text>
    <text x="200" y="150" class="mf-script">A little time</text>
    <text x="200" y="163" class="mf-small">FOR YOURSELF</text>
    <text x="43" y="204" class="mf-index">9</text><text x="357" y="204" class="mf-index">3</text>
    <circle cx="200" cy="362" r="18" fill="#090f13" stroke="url(#mf-steel)" stroke-width="3"/>
    <text id="mf-day" x="200" y="369" class="mf-date">—</text>
    <text x="200" y="342" class="mf-small">TWIN BALANCE</text>
  </g>
  ${ticks}${screws}
  <g id="mf-hour" filter="url(#mf-shadow)"><path d="M194 215L191 129L200 110L209 129L206 215Z" fill="url(#mf-steel)" stroke="#d5dcd7" stroke-width="1.3"/><path d="M197 185L196 132L200 121L204 132L203 185Z" fill="#0a1014" stroke="#858f91"/></g>
  <g id="mf-minute" filter="url(#mf-shadow)"><path d="M196 220L193 79L200 59L207 79L204 220Z" fill="url(#mf-steel)" stroke="#e7eee7" stroke-width="1.3"/><path d="M199 183L197 82L200 72L203 82L201 183Z" fill="#090e12" stroke="#879393" stroke-width=".7"/></g>
  <g id="mf-second"><path d="M200 237V49" stroke="#080a0b" stroke-width="3.8"/><path d="M200 237V49" stroke="#f1c640" stroke-width="1.6"/><path d="M197 222v16h6v-16Z" fill="#141b1f" stroke="#f1c640" stroke-width="1.3"/></g>
  <circle cx="200" cy="200" r="9" fill="#090c0e" stroke="#969e98" stroke-width="1.2"/><circle cx="200" cy="200" r="5" fill="url(#mf-steel)"/><circle cx="200" cy="200" r="1.7" fill="#f4de88"/>`;
  classic.after(dial);
  const choice=$('clock-face');
  function selectFace(){
    const mechanical=preferences.clockFace==='mechanical',aviation=preferences.clockFace==='aviation',rectangular=preferences.clockFace==='rectangular',skeleton=preferences.clockFace==='skeleton',sport=preferences.clockFace==='sport',calculator=preferences.clockFace==='calculator';
    choice.value=preferences.clockFace;classic.toggleAttribute('hidden',mechanical||aviation||rectangular||skeleton||sport||calculator);dial.toggleAttribute('hidden',!mechanical);
    window.AviationFace.dial.toggleAttribute('hidden',!aviation);
    window.RectangularFace.dial.toggleAttribute('hidden',!rectangular);
    window.SkeletonFace.dial.toggleAttribute('hidden',!skeleton);
    window.SportFace.dial.toggleAttribute('hidden',!sport);
    window.CalculatorFace.dial.toggleAttribute('hidden',!calculator);
    $('clock-panel').classList.toggle('mechanical-face-selected',mechanical);
    $('clock-panel').classList.toggle('aviation-face-selected',aviation);
    $('clock-panel').classList.toggle('rectangular-face-selected',rectangular);
    $('clock-panel').classList.toggle('skeleton-face-selected',skeleton);
    $('clock-panel').classList.toggle('sport-face-selected',sport);
    $('clock-panel').classList.toggle('calculator-face-selected',calculator);
  }
  choice.addEventListener('change',()=>{preferences.clockFace=['mechanical','aviation','rectangular','skeleton','sport','calculator'].includes(choice.value)?choice.value:'classic';savePreferences();selectFace();});
  document.addEventListener('visibilitychange',()=>dial.classList.toggle('mf-paused',document.hidden));
  dial.classList.toggle('mf-paused',document.hidden);
  let stamp='';
  window.MechanicalFace={tick(now,h,m,s,digital,timeZone){
    window.AviationFace.tick(now,h,m,s,digital,timeZone);
    window.RectangularFace.tick(now,h,m,s,digital,timeZone);
    window.SkeletonFace.tick(now,h,m,s,digital,timeZone);
    window.SportFace.tick(now,h,m,s,digital,timeZone);
    window.CalculatorFace.tick(now,h,m,s,digital,timeZone);
    if(dial.hasAttribute('hidden')||preferences.centerContent!=='clock'||$('clock-panel').classList.contains('show-calendar'))return;
    $('mf-hour').setAttribute('transform',`rotate(${h*30} 200 200)`);
    $('mf-minute').setAttribute('transform',`rotate(${m*6} 200 200)`);
    $('mf-second').setAttribute('transform',`rotate(${s*6} 200 200)`);
    const key=digital+timeZone+now.getDate();
    if(key!==stamp){
      stamp=key;$('mf-digital').textContent=digital;
      $('mf-weekday').textContent=now.toLocaleDateString('en-US',{timeZone,weekday:'short'}).toUpperCase();
      $('mf-day').textContent=now.toLocaleDateString('en-US',{timeZone,day:'numeric'});
      dial.setAttribute('aria-label',`Mechanical clock, ${digital}, ${timeZone}`);
    }
  }};
  selectFace();
})();
