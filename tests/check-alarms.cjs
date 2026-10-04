const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map(),storage={};let now=Date.parse('2026-10-03T00:00:00Z');class TestDate extends Date{static now(){return now;}}
let sounds=[],prepare=async()=>true;
class TestSound{state='ready';setVolume(){}unlock(){}prepare(kind){return prepare(kind);}preview(){}stopPreview(){}sync(kinds){sounds=Array.from(kinds);}}
const catalog=Object.fromEntries(JSON.parse(fs.readFileSync('assets/alarm-sounds/sources.json','utf8')).sounds.map(s=>[s.id,s.name]));
const ctx={afterglowAlarmSounds:catalog,AfterglowAlertSound:TestSound,Date:TestDate,Intl,localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},$:id=>{if(!nodes.has(id))nodes.set(id,{showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},value:'0',childNodes:[],dataset:{},replaceChildren(){},removeAttribute(){},setAttribute(){},classList:{toggle(k,v){this[k]=v;}}});return nodes.get(id);},zone:'America/New_York',zoneLabel:()=>'Eastern Daylight Time',tabKeys(){},setInterval(){},document:{addEventListener(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/alarms.js','utf8'),ctx);
const submit={preventDefault(){}};
function confirm(sound){ctx.$('alert-sound-choice').value=sound;return ctx.$('alert-sound-form').onsubmit(submit);}
(async()=>{
assert.equal(vm.runInContext("nextAlarm('20:01','America/New_York')",ctx),now+60000);
assert.equal(vm.runInContext("nextAlarm('19:00','America/New_York')",ctx),now+23*3600000);
assert.equal(vm.runInContext("nextAlarm('02:30','America/New_York',Date.parse('2026-03-08T06:00:00Z'))",ctx),Date.parse('2026-03-09T06:30:00Z'));
ctx.$('alarm-time').value='20:01';nodes.get('alarm-form').onsubmit({preventDefault(){}});
assert(nodes.get('alert-sound-dialog').open);assert.equal(ctx.$('alert-sound-choice').value,'silent');
assert.equal(JSON.parse(storage['dashboard-alarms']||'{}').alarm??null,null);await confirm('classic');
ctx.$('timer-seconds').value='2';nodes.get('timer-form').onsubmit({preventDefault(){}});
assert.equal(JSON.parse(storage['dashboard-alarms']).timer,null);await confirm('digital');
assert(nodes.get('start-timer').disabled);assert(!nodes.get('clock-timer').hidden);assert.equal(nodes.get('clock-timer-countdown').textContent,'00:00:02');assert(nodes.get('timer-inputs').hidden);assert(!nodes.get('timer-countdown').hidden);const due=JSON.parse(storage['dashboard-alarms']).timer.due;nodes.get('timer-form').onsubmit({preventDefault(){}});assert.equal(JSON.parse(storage['dashboard-alarms']).timer.due,due);
now+=2000;vm.runInContext('tickAlarms()',ctx);assert(nodes.get('clock-panel').classList['clock-ringing']);assert(nodes.get('timer-state').textContent.includes('finished'));assert(!nodes.get('start-timer').disabled);assert(nodes.get('clock-timer').hidden);assert(!nodes.get('timer-inputs').hidden);assert.equal(nodes.get('open-alarm').textContent,'Dismiss');
assert.deepEqual(sounds,['digital']);
nodes.get('open-alarm').onclick();assert(!nodes.get('clock-panel').classList['clock-ringing']);assert(JSON.parse(storage['dashboard-alarms']).alarm);
assert.deepEqual(sounds,[]);
now+=58000;vm.runInContext('tickAlarms()',ctx);assert(nodes.get('clock-panel').classList['clock-ringing']);assert.equal(JSON.parse(storage['dashboard-alarms']).alarm,null);
assert.deepEqual(sounds,['classic']);
nodes.get('dismiss-modal-alert').onclick();assert(!nodes.get('clock-panel').classList['clock-ringing']);
ctx.$('timer-seconds').value='10';nodes.get('timer-form').onsubmit(submit);await confirm('digital');nodes.get('cancel-timer').onclick();now+=10000;vm.runInContext('tickAlarms()',ctx);assert(!nodes.get('clock-panel').classList['clock-ringing']);
nodes.get('timer-form').onsubmit(submit);nodes.get('close-alert-sound').onclick();assert.equal(JSON.parse(storage['dashboard-alarms']).timer,null);
nodes.get('timer-form').onsubmit(submit);now+=5000;await confirm('silent');assert.equal(JSON.parse(storage['dashboard-alarms']).timer.due,now+10000);
now+=10000;vm.runInContext('tickAlarms()',ctx);assert(nodes.get('clock-panel').classList['clock-ringing']);assert.deepEqual(sounds,['silent']);
nodes.get('dismiss-modal-alert').onclick();
// Simultaneous alerts retain their independent tones when one is canceled.
now=Date.parse('2026-10-03T00:00:00Z');ctx.$('alarm-time').value='20:01';nodes.get('alarm-form').onsubmit(submit);await confirm('classic');ctx.$('timer-seconds').value='0';ctx.$('timer-minutes').value='1';nodes.get('timer-form').onsubmit(submit);await confirm('digital');now+=60000;vm.runInContext('tickAlarms()',ctx);
assert.deepEqual(sounds,['classic','digital']);nodes.get('cancel-timer').onclick();assert.deepEqual(sounds,['classic']);nodes.get('dismiss-modal-alert').onclick();assert.deepEqual(sounds,[]);
// Reload preserves each choice and pending/ringing sound without discarding old settings.
vm.runInContext(fs.readFileSync('assets/alarms.js','utf8'),ctx);
nodes.get('alarm-form').onsubmit(submit);assert.equal(ctx.$('alert-sound-choice').value,'classic');nodes.get('close-alert-sound').onclick();nodes.get('timer-form').onsubmit(submit);assert.equal(ctx.$('alert-sound-choice').value,'digital');
console.log('PASS: scheduling, DST, optional sound picker, delayed confirmation, cancel, silent alerts, independent simultaneous sounds, dismissal and reload');

// Each original recording can be armed, and cancel during loading never arms it.
nodes.get('close-alert-sound').onclick();
for(const kind of Object.keys(catalog)){
 nodes.get('timer-form').onsubmit(submit);await confirm(kind);
 assert.equal(JSON.parse(storage['dashboard-alarms']).timer.sound,kind);
 nodes.get('cancel-timer').onclick();
}
prepare=async()=>false;
nodes.get('timer-form').onsubmit(submit);await confirm('facility');
assert.equal(JSON.parse(storage['dashboard-alarms']).timer,null,'failed recording must not arm timer');
nodes.get('close-alert-sound').onclick();
let finish;prepare=()=>new Promise(resolve=>finish=resolve);
nodes.get('timer-form').onsubmit(submit);const pending=confirm('vintage');
assert(nodes.get('alert-sound-choice').disabled);
nodes.get('close-alert-sound').onclick();finish(true);await pending;
assert.equal(JSON.parse(storage['dashboard-alarms']).timer,null,'cancel while loading must not arm timer');
console.log('PASS: all five recordings, failed preparation and canceled loading');
})().catch(error=>{console.error(error);process.exitCode=1;});
