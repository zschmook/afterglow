const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map(),storage={};let now=Date.parse('2026-10-03T00:00:00Z');class TestDate extends Date{static now(){return now;}}
const ctx={Date:TestDate,Intl,localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},$:id=>{if(!nodes.has(id))nodes.set(id,{close(){this.open=false;},value:'0',childNodes:[],dataset:{},replaceChildren(){},removeAttribute(){},setAttribute(){},classList:{toggle(k,v){this[k]=v;}}});return nodes.get(id);},zone:'America/New_York',zoneLabel:()=>'Eastern Daylight Time',tabKeys(){},setInterval(){},document:{addEventListener(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/alarms.js','utf8'),ctx);
assert.equal(vm.runInContext("nextAlarm('20:01','America/New_York')",ctx),now+60000);
assert.equal(vm.runInContext("nextAlarm('19:00','America/New_York')",ctx),now+23*3600000);
assert.equal(vm.runInContext("nextAlarm('02:30','America/New_York',Date.parse('2026-03-08T06:00:00Z'))",ctx),Date.parse('2026-03-09T06:30:00Z'));
ctx.$('alarm-time').value='20:01';nodes.get('alarm-form').onsubmit({preventDefault(){}});
ctx.$('timer-seconds').value='2';nodes.get('timer-form').onsubmit({preventDefault(){}});
assert(nodes.get('start-timer').disabled);assert(!nodes.get('clock-timer').hidden);assert.equal(nodes.get('clock-timer-countdown').textContent,'00:00:02');assert(nodes.get('timer-inputs').hidden);assert(!nodes.get('timer-countdown').hidden);const due=JSON.parse(storage['dashboard-alarms']).timer.due;nodes.get('timer-form').onsubmit({preventDefault(){}});assert.equal(JSON.parse(storage['dashboard-alarms']).timer.due,due);
now+=2000;vm.runInContext('tickAlarms()',ctx);assert(nodes.get('clock-panel').classList['clock-ringing']);assert(nodes.get('timer-state').textContent.includes('finished'));assert(!nodes.get('start-timer').disabled);assert(nodes.get('clock-timer').hidden);assert(!nodes.get('timer-inputs').hidden);assert.equal(nodes.get('open-alarm').textContent,'Dismiss');
nodes.get('open-alarm').onclick();assert(!nodes.get('clock-panel').classList['clock-ringing']);assert(JSON.parse(storage['dashboard-alarms']).alarm);
now+=58000;vm.runInContext('tickAlarms()',ctx);assert(nodes.get('clock-panel').classList['clock-ringing']);assert.equal(JSON.parse(storage['dashboard-alarms']).alarm,null);
nodes.get('dismiss-modal-alert').onclick();assert(!nodes.get('clock-panel').classList['clock-ringing']);
ctx.$('timer-seconds').value='10';nodes.get('timer-form').onsubmit({preventDefault(){}});nodes.get('cancel-timer').onclick();now+=10000;vm.runInContext('tickAlarms()',ctx);assert(!nodes.get('clock-panel').classList['clock-ringing']);
console.log('PASS: timezone scheduling, next-day rollover, DST skipped hour, independent alarm/timer, expiry, dismissal and cancel');
