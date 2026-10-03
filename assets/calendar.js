// US federal holiday rules: https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
function calendarHolidays(year) {
 const days=new Map();
 const key=d=>d.toISOString().slice(0,10);
 const add=(d,name)=>{const k=key(d);days.set(k,[...(days.get(k)||[]),name]);};
 const nth=(y,m,weekday,n)=>1+(weekday-new Date(Date.UTC(y,m,1)).getUTCDay()+7)%7+7*(n-1);
 // Adjacent years include observed New Year's Day on December 31.
 for(const y of [year-1,year,year+1]){
  for(const [m,d,name] of [[0,1,"New Year's Day"],[5,19,'Juneteenth'],[6,4,'Independence Day'],[10,11,'Veterans Day'],[11,25,'Christmas Day']]){
   const date=new Date(Date.UTC(y,m,d));add(date,name);
   const weekday=date.getUTCDay();if(weekday===0||weekday===6){date.setUTCDate(d+(weekday===0?1:-1));add(date,name+' (observed)');}
  }
  for(const [m,n,name] of [[0,3,'Martin Luther King Jr. Day'],[1,3,"Washington’s Birthday"],[8,1,'Labor Day'],[9,2,'Columbus Day']])add(new Date(Date.UTC(y,m,nth(y,m,1,n))),name);
  const last=new Date(Date.UTC(y,5,0));last.setUTCDate(last.getUTCDate()-(last.getUTCDay()+6)%7);add(last,'Memorial Day');
  add(new Date(Date.UTC(y,10,nth(y,10,4,4))),'Thanksgiving');
 }
 return days;
}
function calendarToday(now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=t=>Number(parts.find(p=>p.type===t).value);
 return {year:get('year'),month:get('month')-1,day:get('day')};
}
if(typeof embeddedPanel==='undefined'||!embeddedPanel){
 let shown=false,year,month,lastToday='',startDate,rowHeight=64;
 const weekMs=7*86400000;
 const panel=$('clock-panel'),toggle=$('calendar-toggle');
 function monthLabel(date){
  year=date.getUTCFullYear();month=date.getUTCMonth();
  $('calendar-month').textContent=date.toLocaleDateString('en-US',{timeZone:'UTC',month:'long',year:'numeric'});
 }
 function renderCalendar(anchor=new Date(Date.UTC(year,month,1))){
  const today=calendarToday(),grid=$('calendar-days');grid.replaceChildren();
  const sunday=new Date(anchor);sunday.setUTCDate(sunday.getUTCDate()-sunday.getUTCDay());
  startDate=new Date(sunday.getTime()-26*weekMs);
  rowHeight=Math.max(60,Math.floor(grid.clientHeight/6)||64);
  grid.style.gridAutoRows=rowHeight+'px';
  const holidayYears=new Map();
  for(let i=0;i<53*7;i++){
   const date=new Date(startDate.getTime()+i*86400000),key=date.toISOString().slice(0,10),y=date.getUTCFullYear();
   if(!holidayYears.has(y))holidayYears.set(y,calendarHolidays(y));
   const holidays=holidayYears.get(y);
   const cell=document.createElement('div');cell.className='calendar-day';cell.setAttribute('role','cell');
   const number=document.createElement('span');number.className='calendar-number';number.textContent=date.getUTCDate()===1?date.toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'}):date.getUTCDate();cell.append(number);
   if(date.getUTCFullYear()===today.year&&date.getUTCMonth()===today.month&&date.getUTCDate()===today.day){cell.classList.add('calendar-today');cell.setAttribute('aria-current','date');}
   for(const name of holidays.get(key)||[]){const holiday=document.createElement('small');holiday.textContent=name;cell.append(holiday);}
   cell.setAttribute('aria-label',date.toLocaleDateString('en-US',{timeZone:'UTC',dateStyle:'full'})+(holidays.has(key)?': '+holidays.get(key).join(', '):''));grid.append(cell);
  }
  grid.scrollTop=26*(rowHeight+3);
  monthLabel(anchor);lastToday=JSON.stringify(today);
 }
 function visibleWeek(){return new Date(startDate.getTime()+Math.floor($('calendar-days').scrollTop/(rowHeight+3))*weekMs);}
 $('calendar-days').onscroll=()=>{
  if(!shown||!startDate)return;
  const grid=$('calendar-days'),index=Math.floor(grid.scrollTop/(rowHeight+3)),date=visibleWeek();
  // Thursday determines the month of a week that straddles two months.
  monthLabel(new Date(date.getTime()+3*86400000));
  if(index<6||index>40){const remainder=grid.scrollTop%(rowHeight+3);renderCalendar(date);grid.scrollTop+=remainder;}
 };
 function todayMonth(){const t=calendarToday();year=t.year;month=t.month;renderCalendar(new Date(Date.UTC(year,month,t.day)));}
 function setCalendar(value){shown=value;panel.classList.toggle('show-calendar',shown);$('calendar-view').hidden=!shown;toggle.setAttribute('aria-expanded',String(shown));toggle.setAttribute('aria-label',shown?'Return to '+({system:'system stats',m3u:'Custom M3U'}[preferences.centerContent]||'clock'):'Show calendar');toggle.title=shown?'Return to '+({system:'system stats',m3u:'Custom M3U'}[preferences.centerContent]||'clock'):'Show calendar';if(shown)todayMonth();}
 toggle.onclick=()=>setCalendar(!shown);
 $('calendar-back').onclick=()=>{setCalendar(false);toggle.focus();};
 $('calendar-today').onclick=todayMonth;
 for(const [id,step] of [['calendar-prev',-1],['calendar-next',1]])$(id).onclick=()=>{const d=new Date(Date.UTC(year,month+step,1));year=d.getUTCFullYear();month=d.getUTCMonth();renderCalendar();};
 setInterval(()=>{if(shown&&JSON.stringify(calendarToday())!==lastToday)renderCalendar(visibleWeek());},1000);
}
