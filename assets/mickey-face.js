/* Classic character watch: independent arm groups follow local hour/minute time. */
(() => {
  if (embeddedPanel) return;
  const dial=document.createElementNS('http://www.w3.org/2000/svg','svg');
  dial.id='mickey-clock';dial.setAttribute('viewBox','0 0 400 400');
  dial.setAttribute('role','img');dial.setAttribute('aria-label','Mickey character clock');
  dial.setAttribute('hidden','');
  const ticks=Array.from({length:60},(_,i)=>`<path transform="rotate(${i*6} 200 200)" d="M200 ${i%5===0?28:30}V${i%5===0?36:34}" stroke="#252622" stroke-width="${i%5===0?3:1.2}"/>`).join('');
  const numbers=Array.from({length:12},(_,i)=>{
    const n=i+1,a=n*Math.PI/6;
    return `<text x="${200+Math.sin(a)*149}" y="${200-Math.cos(a)*149+10}" text-anchor="middle">${n}</text>`;
  }).join('');
  dial.innerHTML=`<defs>
    <linearGradient id="mc-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7f6842"/><stop offset=".17" stop-color="#f2dfad"/><stop offset=".42" stop-color="#cab47f"/><stop offset=".64" stop-color="#fff0c5"/><stop offset="1" stop-color="#8a7047"/></linearGradient>
    <radialGradient id="mc-ivory"><stop stop-color="#faf8ed"/><stop offset=".85" stop-color="#f1eedf"/><stop offset="1" stop-color="#ded7c0"/></radialGradient>
    <filter id="mc-shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="1" dy="2" stdDeviation="1.2" flood-opacity=".22"/></filter>
  </defs>
  <circle cx="200" cy="200" r="195" fill="url(#mc-gold)" stroke="#806a43" stroke-width="1.5"/>
  <circle cx="200" cy="200" r="185" fill="url(#mc-ivory)" stroke="#bba77a" stroke-width="2"/>
  <circle cx="200" cy="200" r="178" fill="none" stroke="#c5c0ae" stroke-width=".6"/>
  ${ticks}<g class="mc-numbers">${numbers}</g>
  <g id="mc-character" stroke="#222320" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" filter="url(#mc-shadow)">
    <!-- Legs and oversized yellow shoes. -->
    <path d="M194 235Q194 258 181 270L177 288 191 290Q211 267 210 241Z" fill="#242522"/>
    <path d="M216 234Q230 247 232 268L242 280 231 290Q211 274 205 246Z" fill="#242522"/>
    <path d="M180 270Q166 265 157 277Q150 290 157 300Q168 313 197 303Q209 296 204 286Q202 278 194 276L189 277Q186 270 180 270Z" fill="#e6b342"/>
    <path d="M159 298Q180 304 202 293M165 281Q172 274 179 278" fill="none" stroke="#8e671f" stroke-width="1.6"/>
    <path d="M230 272Q229 280 222 287Q218 299 230 307Q245 316 267 307Q273 302 269 293Q267 285 254 283L242 276Q236 271 230 272Z" fill="#e6b342"/>
    <path d="M229 304Q247 310 267 302M245 285Q254 283 261 291" fill="none" stroke="#8e671f" stroke-width="1.6"/>
    <!-- Tail, torso, and red shorts. -->
    <path d="M226 231Q247 233 257 249Q265 263 256 272" fill="none" stroke-width="3"/>
    <path d="M192 160Q172 170 179 194L184 223Q203 241 225 220Q235 195 219 167Z" fill="#252623"/>
    <path d="M181 210Q203 219 228 207L232 236Q221 248 205 247L187 242Z" fill="#ce3330"/>
    <path d="M186 216Q186 228 189 237M226 215 228 233" fill="none" stroke="#a42728"/>
    <ellipse cx="199" cy="228" rx="5" ry="8" fill="#faf8ee" transform="rotate(-7 199 228)"/>
    <ellipse cx="217" cy="226" rx="5" ry="8" fill="#faf8ee" transform="rotate(6 217 226)"/>
    <!-- Circular ears and smiling face. -->
    <circle cx="174" cy="103" r="19" fill="#252623"/>
    <circle cx="231" cy="108" r="18" fill="#252623"/>
    <path d="M177 137Q175 110 201 110Q224 109 233 132Q244 160 221 176Q198 184 182 164Z" fill="#252623"/>
    <path d="M184 138Q180 119 192 118Q201 117 205 129Q205 116 216 121Q226 126 224 145L230 155Q219 174 197 167Q181 157 184 138Z" fill="#f0dfbf" stroke-width="1.4"/>
    <ellipse cx="196" cy="135" rx="6" ry="11" fill="#faf8ee" stroke-width="1.2" transform="rotate(-11 196 135)"/>
    <ellipse cx="211" cy="135" rx="6" ry="10" fill="#faf8ee" stroke-width="1.2" transform="rotate(-9 211 135)"/>
    <ellipse cx="199" cy="138" rx="2.5" ry="6.5" fill="#252623" stroke="none"/>
    <ellipse cx="214" cy="138" rx="2.5" ry="6" fill="#252623" stroke="none"/>
    <path d="M189 144Q199 140 211 143L228 141Q243 144 239 153Q229 167 210 170Q193 169 188 155Q185 148 189 144Z" fill="#f0dfbf" stroke-width="1.4"/>
    <ellipse cx="229" cy="142" rx="10" ry="6" fill="#252623" transform="rotate(-17 229 142)"/>
    <path d="M193 153Q205 169 225 155Q219 174 207 170Q198 168 193 153Z" fill="#252623" stroke-width="1.2"/>
    <path d="M204 168Q210 159 218 165L215 169Z" fill="#c97064" stroke="none"/>
    <path d="M190 153Q193 150 197 152" fill="none" stroke-width="1.1"/>
  </g>
  <!-- Both hands share the watch pin. Gloves travel with their respective arms. -->
  <g id="mc-hour" stroke="#222320" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" filter="url(#mc-shadow)">
    <path d="M195 205Q188 177 189 151L192 123H202L202 151Q203 176 205 205Z" fill="#252623"/>
    <path d="M189 127H204V119H189Z" fill="#faf8ee"/>
    <path d="M190 120Q182 115 184 106Q181 101 187 98L192 103L193 88Q194 82 198 85L200 102Q206 93 210 99Q214 96 216 102Q221 103 219 109Q215 120 205 122Z" fill="#faf8ee"/>
    <path d="M199 103 204 111M205 101 209 109M211 103 214 110" fill="none" stroke-width="1.2"/>
  </g>
  <g id="mc-minute" stroke="#222320" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#mc-shadow)">
    <path d="M196 204Q199 172 198 140L196 115H204L205 140Q204 173 204 204Z" fill="#252623"/>
    <g transform="translate(0 25)">
    <path d="M193 94H207V86H193Z" fill="#faf8ee"/>
    <path d="M195 87Q184 83 185 73Q181 69 185 65Q188 63 193 69L196 46Q197 39 201 43L202 65Q209 57 213 62Q219 59 220 65Q225 66 222 72Q220 83 207 88Z" fill="#faf8ee"/>
    <path d="M202 66 208 74M208 64 214 71M215 65 218 71" fill="none" stroke-width="1.2"/>
    </g>
  </g>
  <g id="mc-second"><path d="M200 225V38" stroke="#bb3435" stroke-width="1.4"/><circle cx="200" cy="217" r="3.5" fill="none" stroke="#bb3435" stroke-width="1.2"/></g>
  <circle cx="200" cy="200" r="5" fill="#bb3435" stroke="#752726" stroke-width="1"/>
  <circle cx="200" cy="200" r="1.5" fill="#f0ddba"/>`;
  $('clock').after(dial);
  let stamp='';
  window.MickeyFace={dial,tick(now,h,m,s,digital,timeZone){
    if(dial.hasAttribute('hidden')||preferences.centerContent!=='clock'||$('clock-panel').classList.contains('show-calendar'))return;
    for(const [id,angle] of [['hour',h*30],['minute',m*6],['second',s*6]])$('mc-'+id).setAttribute('transform',`rotate(${angle} 200 200)`);
    const key=digital+timeZone;
    if(key!==stamp){stamp=key;dial.setAttribute('aria-label',`Mickey character clock, ${digital}, ${timeZone}. Mickey's arms show the hours and minutes.`);}
  }};
})();
