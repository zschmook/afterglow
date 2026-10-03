/* Silver openwork dial. The hands share the dashboard clock; the movement is decorative. */
(() => {
  if (embeddedPanel) return;
  const dial=document.createElementNS('http://www.w3.org/2000/svg','svg');
  dial.id='skeleton-clock';dial.setAttribute('viewBox','0 0 400 400');
  dial.setAttribute('role','img');dial.setAttribute('aria-label','Silver skeleton clock');
  dial.setAttribute('hidden','');
  const point=(r,a)=>[+(Math.sin(a)*r).toFixed(3),+(-Math.cos(a)*r).toFixed(3)];
  const screw=(x,y,r=4,angle=35)=>`<g transform="translate(${x} ${y}) rotate(${angle})"><circle r="${r+1}" fill="#454e50"/><circle r="${r}" fill="url(#sf-screw)" stroke="#cbd2d2" stroke-width=".6"/><path d="M${-r*.65} -.6H${r*.65}" stroke="#424b50" stroke-width="1.1"/><path d="M${-r*.65} .5H${r*.65}" stroke="#f6f7f4" stroke-width=".5"/></g>`;
  const jewel=(x,y,r=3.4)=>`<g transform="translate(${x} ${y})"><circle r="${r+2.5}" fill="#616968" stroke="#e0e0d2" stroke-width="1.2"/><circle r="${r}" fill="url(#sf-ruby)" stroke="#552440" stroke-width=".7"/><circle cx="${-r*.25}" cy="${-r*.3}" r="${r*.23}" fill="#efbcd4" opacity=".7"/></g>`;
  function gear(x,y,r,teeth,period,brass=false,spokes=5,phase=0){
    const rim=[];
    for(let i=0;i<teeth*4;i++)rim.push(point(i%4===1||i%4===2?r:r-2.2,i*Math.PI/(teeth*2)).join(','));
    return `<g transform="translate(${x} ${y})"><g transform="rotate(${phase})"><g class="sf-motion sf-gear" style="--period:${Math.abs(period)}s;--direction:${period<0?'reverse':'normal'}">
      <polygon points="${rim.join(' ')}" fill="url(#${brass?'sf-brass':'sf-steel'})" stroke="#5c625e" stroke-width=".65"/>
      <circle r="${r-5}" fill="#333b3d" stroke="#161d20" stroke-width="1"/>
      ${Array.from({length:spokes},(_,i)=>`<path transform="rotate(${i*360/spokes})" d="M-2 -3L-3 -${r-6}H3L2 -3Z" fill="url(#${brass?'sf-brass':'sf-steel'})"/>`).join('')}
      <circle r="${r-6.6}" fill="none" stroke="${brass?'#c4b982':'#c3ccca'}" stroke-width=".7"/>
      <circle r="6" fill="url(#sf-steel)" stroke="#484e4f" stroke-width="1"/><circle r="2.4" fill="#172023"/>
    </g></g></g>`;
  }
  const minuteTrack=Array.from({length:60},(_,i)=>{
    const [x,y]=point(187,i*Math.PI/30),[u,v]=point(i%5?178:176,i*Math.PI/30);
    return `<path d="M${200+x} ${200+y}L${200+u} ${200+v}" stroke="#454e51" stroke-width="${i%5?.9:1.5}"/>`;
  }).join('');
  const outerStuds=Array.from({length:12},(_,i)=>{
    const [x,y]=point(189,i*Math.PI/6);
    return `<circle cx="${200+x}" cy="${200+y}" r="4.5" fill="url(#sf-pearl)" stroke="#a8b0b0" stroke-width=".9"/>`;
  }).join('');
  const indexes=Array.from({length:12},(_,i)=>`<g transform="rotate(${i*30} 200 200)" filter="url(#sf-small-shadow)">
    <path d="M195 42L194 91L200 97L206 91L205 42Z" fill="url(#sf-steel)" stroke="#656f70" stroke-width=".85"/>
    <path d="M196 44L196 89L200 93V44Z" fill="#edf0eb"/><path d="M200 44V93L204 89V44Z" fill="#858e8b"/>
    <path d="M198 48V86" stroke="#bec6c1" stroke-width="1.1"/>
    ${i%3===0?'<path d="M194 57H206M194 60H206M194 63H206M194 66H206" stroke="#697272" stroke-width=".7"/>':''}
  </g>`).join('');
  const spiral=Array.from({length:230},(_,i)=>{
    const a=i*.135,r=4+i*.135;return `${i?'L':'M'}${(Math.cos(a)*r).toFixed(2)} ${(Math.sin(a)*r).toFixed(2)}`;
  }).join('');
  dial.innerHTML=`<defs>
    <linearGradient id="sf-case" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#596266"/><stop offset=".17" stop-color="#e9ece8"/><stop offset=".31" stop-color="#a1abae"/><stop offset=".5" stop-color="#fafcf5"/><stop offset=".67" stop-color="#717d80"/><stop offset=".82" stop-color="#e1e4de"/><stop offset="1" stop-color="#a1abad"/></linearGradient>
    <linearGradient id="sf-steel" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#fbfcf5"/><stop offset=".24" stop-color="#c3ccc9"/><stop offset=".45" stop-color="#7a8588"/><stop offset=".58" stop-color="#f5f6ed"/><stop offset=".77" stop-color="#d1d8d4"/><stop offset="1" stop-color="#818c8d"/></linearGradient>
    <linearGradient id="sf-plate" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#f5f6f0"/><stop offset=".45" stop-color="#e0e4df"/><stop offset="1" stop-color="#aeb9b9"/></linearGradient>
    <linearGradient id="sf-dial" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#bfc8c9"/><stop offset=".36" stop-color="#f5f6ee"/><stop offset=".72" stop-color="#e1e6e1"/><stop offset="1" stop-color="#f7f7ef"/></linearGradient>
    <linearGradient id="sf-brass" x2=".9" y2="1"><stop stop-color="#e1d7a1"/><stop offset=".4" stop-color="#8c8356"/><stop offset=".6" stop-color="#d9d098"/><stop offset="1" stop-color="#8c8052"/></linearGradient>
    <linearGradient id="sf-lume" x2=".6" y2="1"><stop stop-color="#fffffa"/><stop offset="1" stop-color="#dce4db"/></linearGradient>
    <radialGradient id="sf-well" cx=".38" cy=".32" r=".78"><stop stop-color="#626d6e"/><stop offset=".65" stop-color="#343e41"/><stop offset="1" stop-color="#1b2327"/></radialGradient>
    <radialGradient id="sf-screw" cx=".32" cy=".25"><stop stop-color="#f7f8f2"/><stop offset=".65" stop-color="#acb6b7"/><stop offset="1" stop-color="#707b7f"/></radialGradient>
    <radialGradient id="sf-pearl" cx=".3" cy=".25"><stop stop-color="#ffffff"/><stop offset=".55" stop-color="#e4e8e1"/><stop offset="1" stop-color="#9ba7a8"/></radialGradient>
    <radialGradient id="sf-ruby" cx=".35" cy=".3"><stop stop-color="#dc8aab"/><stop offset=".42" stop-color="#943864"/><stop offset="1" stop-color="#351a36"/></radialGradient>
    <pattern id="sf-brushing" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><path d="M0 .5H2.4" stroke="#647175" stroke-width=".4" stroke-opacity=".14"/><path d="M0 1.2H2.4" stroke="#fff" stroke-width=".3" stroke-opacity=".4"/></pattern>
    <pattern id="sf-perlage" width="17" height="14" patternUnits="userSpaceOnUse"><circle cx="8.5" cy="7" r="7" fill="none" stroke="#dbe2dd" stroke-width=".65" opacity=".25"/><circle cx="8.5" cy="7" r="5.5" fill="none" stroke="#17272c" stroke-width=".6" opacity=".18"/><circle cx="8.5" cy="7" r="3.9" fill="none" stroke="#dbe2dd" stroke-width=".5" opacity=".22"/></pattern>
    <clipPath id="sf-movement"><circle cx="200" cy="200" r="165"/></clipPath>
    <filter id="sf-small-shadow" x="-60%" y="-30%" width="220%" height="170%"><feDropShadow dx=".9" dy="1.5" stdDeviation="1" flood-color="#102025" flood-opacity=".65"/></filter>
    <filter id="sf-hand-shadow" x="-70%" y="-30%" width="260%" height="180%"><feDropShadow dx="1.5" dy="3" stdDeviation="1.8" flood-color="#081013" flood-opacity=".75"/></filter>
    <path id="sf-top-bridge" d="M104 79Q108 72 117 77Q155 97 191 95Q232 95 264 81Q279 74 282 88L277 109Q274 122 258 124L190 125L140 154Q129 161 118 149L98 128Q88 117 94 103Z"/>
    <path id="sf-side-bridge" d="M281 121Q284 112 294 115L309 123Q325 141 330 169Q345 232 309 286L283 318Q276 326 267 318L254 308Q250 300 258 292Q302 257 304 211Q310 161 284 138Q277 131 281 121Z"/>
  </defs>
  <circle cx="200" cy="200" r="197" fill="#313e42" stroke="#bdc7c9" stroke-width="1"/>
  <circle cx="200" cy="200" r="194.5" fill="url(#sf-case)" stroke="#f2f4ed" stroke-width="1.3"/>
  <circle cx="200" cy="200" r="191" fill="url(#sf-dial)" stroke="#869398" stroke-width=".8"/>
  <circle cx="200" cy="200" r="170" fill="url(#sf-well)" stroke="#727f83" stroke-width="2"/>
  <g clip-path="url(#sf-movement)">
    <circle cx="200" cy="200" r="165" fill="url(#sf-perlage)" opacity=".3"/>
    <path d="M95 87Q135 51 184 47L179 66Q139 69 111 101ZM216 47Q276 54 316 99L302 113Q268 78 222 70ZM341 158Q354 200 340 245L324 241Q335 200 324 163ZM192 351Q235 355 274 329L265 316Q230 337 196 332Z" fill="url(#sf-dial)" stroke="#919e9e" stroke-width="1.6"/>
    <path d="M99 87Q137 56 178 53M226 54Q275 65 309 100M335 169Q344 201 335 234M200 346Q233 346 265 328" fill="none" stroke="#f6f8ef" stroke-width="2"/>
    <path d="M132 80L143 102M273 87L266 111M326 148L300 156M321 252L305 244M222 325L228 306" stroke="#59666b" stroke-width="8"/>
    <path d="M132 80L143 102M273 87L266 111M326 148L300 156M321 252L305 244M222 325L228 306" stroke="url(#sf-steel)" stroke-width="4.5"/>
    <path d="M53 144L84 99L127 93L144 124L116 183L67 206Z" fill="url(#sf-plate)" stroke="#697679" stroke-width="2"/>
    <path d="M80 151L101 128L119 133L104 173L80 183Z" fill="#576466" stroke="#f1f4eb" stroke-width="2"/>
    <path d="M194 295L233 307L272 291L290 310L264 341L202 357L175 328Z" fill="url(#sf-plate)" stroke="#57666b" stroke-width="2"/>
    <path d="M215 317L249 321L262 310" fill="none" stroke="#525e61" stroke-width="9"/>
    ${gear(237,167,40,32,64,false,6,4)}
    ${gear(289,205,26,21,-42,true,5,2)}
    ${gear(254,250,33,26,52,false,5,0)}
    ${gear(219,290,21,17,-34,true,4,1)}
    ${gear(157,139,37,30,-60,false,5,5)}
    ${gear(124,190,25,20,40,true,5,5)}
    ${gear(203,212,23,18,-36,true,5,0)}
    <path d="M200 157Q219 136 248 137L263 145L250 159L222 162L219 199L233 222L234 257L217 268L202 255L210 229L195 204Z" fill="url(#sf-steel)" stroke="#4b595f" stroke-width="2"/>
    <path d="M202 158Q222 144 247 144M217 165L215 199L229 223V250" fill="none" stroke="#f6f7ef" stroke-width="2"/>
    ${jewel(219,179,4)}${jewel(221,224,4.2)}${screw(220,253,4,-15)}${screw(260,313,4)}
    <path d="M54 207Q64 182 91 189L117 218L102 244L66 238Z" fill="url(#sf-steel)" stroke="#626e70" stroke-width="1.5"/>
    <path d="M63 208L86 203L101 220L91 232L66 229Z" fill="#2b373c" stroke="#edf0e8" stroke-width="1.4"/>
    <use href="#sf-top-bridge" fill="url(#sf-plate)" stroke="#566368" stroke-width="4"/>
    <use href="#sf-top-bridge" fill="url(#sf-brushing)" stroke="#fafbf3" stroke-width="1.5"/>
    <path d="M120 119L139 137L184 111L248 112" fill="none" stroke="#69777b" stroke-width="1.6"/>
    ${screw(108,111,7,-64)}${screw(267,107,7,54)}${screw(177,135,5,-15)}${screw(199,133,5,12)}${jewel(153,144,4)}
    <use href="#sf-side-bridge" fill="url(#sf-plate)" stroke="#505e62" stroke-width="5"/>
    <use href="#sf-side-bridge" fill="url(#sf-brushing)" stroke="#f9faf3" stroke-width="1.8"/>
    <path d="M292 128Q317 160 316 200Q317 260 266 305" fill="none" stroke="#6d797b" stroke-width="1.2"/>
    ${screw(297,135,5,60)}${screw(274,302,5,-25)}
    <path d="M262 153Q279 165 280 190L271 215L259 214Q270 181 252 165Z" fill="url(#sf-plate)" stroke="#eff2ea" stroke-width="1.4"/>
    ${jewel(260,229,4)}${jewel(249,257,3.8)}${screw(254,167,4,70)}
    <g transform="translate(153 264)">
      <circle r="67" fill="#29373d" stroke="url(#sf-case)" stroke-width="6"/>
      <circle r="60" fill="url(#sf-well)" stroke="#929f9e" stroke-width="2"/>
      <circle r="56" fill="none" stroke="#e5e8db" stroke-width="1.2"/>
      <g class="sf-motion sf-balance">
        <circle r="50" fill="none" stroke="#545343" stroke-width="5"/>
        <circle r="49" fill="none" stroke="url(#sf-brass)" stroke-width="3"/>
        <path d="${spiral}" fill="none" stroke="#bcc5b9" stroke-width=".65" opacity=".85"/>
        ${[0,120,240].map(a=>`<g transform="rotate(${a})"><path d="M-4 -5L-5 -45L0 -49L5 -45L4 -5Z" fill="url(#sf-steel)" stroke="#657378" stroke-width=".8"/><rect x="-4" y="-52" width="8" height="6" rx="1" fill="url(#sf-brass)" stroke="#5a5b4e" stroke-width=".6"/></g>`).join('')}
        <circle r="10" fill="url(#sf-steel)" stroke="#424f53" stroke-width="1.3"/>
      </g>
      <path d="M-9 -8L5 -19L43 -9Q50 -7 47 4L37 15L15 5L-6 8Z" fill="url(#sf-plate)" stroke="#5f6c70" stroke-width="2"/>
      <path d="M9 -13L39 -5L35 6L13 -2" fill="none" stroke="#f8faf1" stroke-width="1.8"/>
      ${screw(39,-1,4,-30)}${jewel(0,0,6)}
      <path d="M-30 44Q2 55 33 34" fill="none" stroke="#d8dedd" stroke-width="3"/>
      ${screw(33,34,3,15)}
    </g>
    <path d="M47 189Q62 183 78 188L109 208" fill="none" stroke="#424f55" stroke-width="12"/>
    <path d="M47 189Q62 183 78 188L109 208" fill="none" stroke="url(#sf-steel)" stroke-width="7"/>
    ${screw(65,188,4,-20)}${screw(90,321,4,55)}
  </g>
  <circle cx="200" cy="200" r="168.5" fill="none" stroke="#f0f3ec" stroke-width="3"/>
  <circle cx="200" cy="200" r="172" fill="none" stroke="#939f9f" stroke-width=".8"/>
  ${indexes}
  <path d="M146 91Q199 100 251 91L252 111Q199 121 145 110Z" fill="url(#sf-dial)" stroke="#9eaaaa" stroke-width=".7"/>
  <path d="M155 95Q199 102 243 95M155 109Q199 116 243 109" fill="none" stroke="#bac3bf" stroke-width=".65"/>
  <g text-anchor="middle"><text x="200" y="105" class="sf-signature">OPENWORK</text></g>
  ${minuteTrack}${outerStuds}
  <g id="sf-hour" filter="url(#sf-hand-shadow)">
    <path d="M194 212L191.5 107Q191.5 101 200 94Q208.5 101 208.5 107L206 212Q200 217 194 212Z" fill="url(#sf-steel)" stroke="#35484f" stroke-width="2"/>
    <path d="M193.5 108Q194 104 200 98V209L196 208Z" fill="#f5f7ef"/>
    <path d="M200 98Q206 104 206.5 108L204 208L200 209Z" fill="#889894"/>
    <path d="M197 180L195.5 109Q195.5 106 200 102Q204.5 106 204.5 109L203 180Z" fill="url(#sf-lume)" stroke="#637772" stroke-width="1"/>
  </g>
  <g id="sf-minute" filter="url(#sf-hand-shadow)">
    <path d="M196.5 216L194.5 51Q194.5 45 200 40Q205.5 45 205.5 51L203.5 216Q200 220 196.5 216Z" fill="url(#sf-steel)" stroke="#35484f" stroke-width="1.8"/>
    <path d="M196 52Q196 49 200 45V212H198Z" fill="#f9faf3"/>
    <path d="M200 45Q204 49 204 52L202 212H200Z" fill="#92a39d"/>
    <path d="M198.5 181L197 54Q197 51 200 48Q203 51 203 54L201.5 181Z" fill="url(#sf-lume)" stroke="#6b7c77" stroke-width=".85"/>
  </g>
  <circle cx="200" cy="200" r="8.5" fill="url(#sf-steel)" stroke="#5c6c72" stroke-width="1.4"/>
  <circle cx="200" cy="200" r="4.5" fill="url(#sf-screw)" stroke="#d3dcd6" stroke-width=".8"/>
  <circle cx="198.5" cy="198.5" r="1.3" fill="#f5f7ef"/>`;
  $('clock').after(dial);
  const hour=dial.querySelector('#sf-hour'),minute=dial.querySelector('#sf-minute');
  const pause=()=>dial.classList.toggle('sf-paused',document.hidden);
  document.addEventListener('visibilitychange',pause);pause();
  let stamp='';
  window.SkeletonFace={dial,tick(now,h,m,s,digital,timeZone){
    if(dial.hasAttribute('hidden')||preferences.centerContent!=='clock'||$('clock-panel').classList.contains('show-calendar'))return;
    hour.setAttribute('transform',`rotate(${h*30} 200 200)`);
    minute.setAttribute('transform',`rotate(${m*6} 200 200)`);
    const key=digital+timeZone;
    if(key!==stamp){stamp=key;dial.setAttribute('aria-label',`Silver skeleton clock, ${digital}, ${timeZone}`);}
  }};
})();
