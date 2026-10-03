const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map(),storage={};let now=Date.parse('2026-10-03T00:00:00Z');class TestDate extends Date{static now(){return now;}}
let sounds=[];
class TestSound{state='ready';setVolume(){}unlock(){}preview(){}stopPreview(){}sync(kinds){sounds=Array.from(kinds);}}
const ctx={AfterglowAlertSound:TestSound,Date:TestDate,Intl,localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},$:id=>{if(!nodes.has(id))nodes.set(id,{showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},value:'0',childNodes:[],dataset:{},replaceChildren(){},removeAttribute(){},setAttribute(){},classList:{toggle(k,v){this[k]=v;}}});return nodes.get(id);},zone:'America/New_York',zoneLabel:()=>'Eastern Daylight Time',tabKeys(){},setInterval(){},document:{addEventListener(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/alarms.js','utf8'),ctx);
const submit={preventDefault(){}};
function confirm(sound){ctx.$('alert-sound-choice').value=sound;ctx.$('alert-sound-form').onsubmit(submit);}
assert.equal(vm.runInContext("nextAlarm('20:01','America/New_York')",ctx),now+60000);
assert.equal(vm.runInContext("nextAlarm('19:00','America/New_York')",ctx),now+23*3600000);
assert.equal(vm.runInContext("nextAlarm('02:30','America/New_York',Date.parse('2026-03-08T06:00:00Z'))",ctx),Date.parse('2026-03-09T06:30:00Z'));
ctx.$('alarm-time').value='20:01';nodes.get('alarm-form').onsubmit({preventDefault(){}});
assert(nodes.get('alert-sound-dialog').open);assert.equal(ctx.$('alert-sound-choice').value,'silent');
assert.equal(JSON.parse(storage['dashboard-alarms']||'{}').alarm??null,null);confirm('alarm');
ctx.$('timer-seconds').value='2';nodes.get('timer-form').onsubmit({preventDefault(){}});
assert.equal(JSON.parse(storage['dashboard-alarms']).timer,null);confirm('timer');
assert(nodes.get('start-timer').disabled);assert(!nodes.get('clock-timer').hidden);assert.equal(nodes.get('clock-timer-countdown').textContent,'00:00:02');assert(nodes.get('timer-inputs').hidden);assert(!nodes.get('timer-countdown').hidden);const due=JSON.parse(storage['dashboard-alarms']).timer.due;nodes.get('timer-form').onsubmit({preventDefault(){}});assert.equal(JSON.parse(storage['dashboard-alarms']).timer.due,due);
now+=2000;vm.runInContext('tickAlarms()',ctx);assert(nodes.get('clock-panel').classList['clock-ringing']);assert(nodes.get('timer-state').textContent.includes('finished'));assert(!nodes.get('start-timer').disabled);assert(nodes.get('clock-timer').hidden);assert(!nodes.get('timer-inputs').hidden);assert.equal(nodes.get('open-alarm').textContent,'Dismiss');
assert.deepEqual(sounds,['timer']);
nodes.get('open-alarm').onclick();assert(!nodes.get('clock-panel').classList['clock-ringing']);assert(JSON.parse(storage['dashboard-alarms']).alarm);
assert.deepEqual(sounds,[]);
now+=58000;vm.runInContext('tickAlarms()',ctx);assert(nodes.get('clock-panel').classList['clock-ringing']);assert.equal(JSON.parse(storage['dashboard-alarms']).alarm,null);
assert.deepEqual(sounds,['alarm']);
nodes.get('dismiss-modal-alert').onclick();assert(!nodes.get('clock-panel').classList['clock-ringing']);
ctx.$('timer-seconds').value='10';nodes.get('timer-form').onsubmit(submit);confirm('timer');nodes.get('cancel-timer').onclick();now+=10000;vm.runInContext('tickAlarms()',ctx);assert(!nodes.get('clock-panel').classList['clock-ringing']);
nodes.get('timer-form').onsubmit(submit);nodes.get('close-alert-sound').onclick();assert.equal(JSON.parse(storage['dashboard-alarms']).timer,null);
nodes.get('timer-form').onsubmit(submit);now+=5000;confirm('silent');assert.equal(JSON.parse(storage['dashboard-alarms']).timer.due,now+10000);
now+=10000;vm.runInContext('tickAlarms()',ctx);assert(nodes.get('clock-panel').classList['clock-ringing']);assert.deepEqual(sounds,['silent']);
nodes.get('dismiss-modal-alert').onclick();
// Simultaneous alerts retain their independent tones when one is canceled.
now=Date.parse('2026-10-03T00:00:00Z');ctx.$('alarm-time').value='20:01';nodes.get('alarm-form').onsubmit(submit);confirm('alarm');ctx.$('timer-seconds').value='0';ctx.$('timer-minutes').value='1';nodes.get('timer-form').onsubmit(submit);confirm('timer');now+=60000;vm.runInContext('tickAlarms()',ctx);
assert.deepEqual(sounds,['alarm','timer']);nodes.get('cancel-timer').onclick();assert.deepEqual(sounds,['alarm']);nodes.get('dismiss-modal-alert').onclick();assert.deepEqual(sounds,[]);
// Reload preserves each choice and pending/ringing sound without discarding old settings.
vm.runInContext(fs.readFileSync('assets/alarms.js','utf8'),ctx);
nodes.get('alarm-form').onsubmit(submit);assert.equal(ctx.$('alert-sound-choice').value,'alarm');nodes.get('close-alert-sound').onclick();nodes.get('timer-form').onsubmit(submit);assert.equal(ctx.$('alert-sound-choice').value,'timer');
console.log('PASS: scheduling, DST, optional sound picker, delayed confirmation, cancel, silent alerts, independent simultaneous sounds, dismissal and reload');
