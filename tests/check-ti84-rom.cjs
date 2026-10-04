// Optional integration test: pass a user-supplied classic TI-84 ROM. Never downloads one.
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const path=process.argv[2];if(!path){console.log('SKIP: supply a local TI-84 Plus/Plus SE ROM path.');return;}
  const rom=fs.readFileSync(path);assert.ok([1048576,2097152].includes(rom.length),'Classic Plus or SE ROM required');
  const core=await require('../assets/vendor/wabbitemu/core.js')({print:()=>{},printErr:()=>{}});
  const p=core._ag_init(rom.length===1048576?3:4);assert.ok(p);core.HEAPU8.set(rom,p);
  const tick=seconds=>{for(let i=0;i<seconds*30;i++)core._ag_tick(Math.round(core._ag_rate()/30));};
  const key=k=>{core._ag_key(k,1);tick(8/30);core._ag_key(k,0);tick([0x64,0x63,0x62,0x61,0x60,0x66,0x37].includes(k)?20/30:4/30);};
  const screen=()=>{const p=core._ag_frame();return Buffer.from(core.HEAPU8.slice(p,p+6144));};
  tick(2);key(128);tick(2);assert.ok(core._ag_on(),'TI OS must light the LCD');
  assert.ok(screen().reduce((a,b)=>a+b)>100,'Boot screen contains text');
  key(0x16);const blank=screen();key(0x31);key(0x11);key(0x31);key(0x10);tick(1);
  assert.notDeepEqual(screen(),blank,'2+2 ENTER changes the LCD');
  key(0x64);key(0x47);key(0x54);key(0x60);tick(5);const graph=screen();
  assert.ok(graph.reduce((a,b)=>a+b)>100,'GRAPH produces a populated framebuffer');
  assert.notDeepEqual(graph,blank,'Graph differs from clear home');
  // ZStandard X²: both branches reach the top and converge toward the origin.
  // A syntax-error screen also contains pixels, so a nonempty LCD is insufficient.
  for(const [x,y] of [[32,0],[62,0],[38,19],[56,19],[42,27],[52,27]])assert.equal(graph[y*96+x],1,`Parabola pixel ${x},${y}`);
  if(process.env.TI84_CAPTURE)fs.writeFileSync(process.env.TI84_CAPTURE,graph);
  key(0x65);key(128);assert.equal(core._ag_on(),0,'2nd ON turns the LCD off');
  key(128);tick(1);assert.equal(core._ag_on(),1,'ON wakes the calculator');
  console.log('TI ROM boot, keypad arithmetic, graph display and OFF/ON integration passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
