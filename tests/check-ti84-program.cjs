// Local-only integration: node tests/check-ti84-program.cjs <ROM> <DRUGWARS.8xp>
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
  if(!process.argv[2]||!process.argv[3]){console.log('SKIP: supply a local TI-84 ROM and DrugWars program.');return;}
  const rom=fs.readFileSync(process.argv[2]),game=fs.readFileSync(process.argv[3]);
  assert.ok([1048576,2097152].includes(rom.length));
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  assert.equal(hash(game),'43782482e13c5648b8acf10baf242f5323a37be7eb5d7ed1b12d279fe9cf3f95','Use the documented local DrugWars version');
  const c=await require('../assets/vendor/wabbitemu/core.js')({print:()=>{},printErr:()=>{}});
  c.HEAPU8.set(rom,c._ag_init(rom.length===1048576?3:4));
  const tick=s=>{for(let i=0;i<s*30;i++)c._ag_tick(Math.round(c._ag_rate()/30));};
  const key=k=>{c._ag_key(k,1);tick(8/30);c._ag_key(k,0);tick(20/30);};
  const frame=()=>{const p=c._ag_frame();return c.HEAPU8.slice(p,p+6144);};
  // Text region excludes the blinking OS busy indicator and input cursor.
  const textHash=()=>{const b=Buffer.from(frame());return hash(Buffer.concat(Array.from({length:40},(_,y)=>b.subarray(y*96,y*96+90))));};
  tick(2);key(128);tick(3);key(0x16);
  const p=c._ag_program_buffer(),original=frame();
  c.HEAPU8.set(game,p);
  assert.equal(c._ag_import_program(40000),10,'Oversize rejected');
  assert.equal(c._ag_import_program(20),10,'Truncation rejected');
  for(const offset of [0,53,55,57,59,60,70,72,game.length-1]){
    c.HEAPU8.set(game,p);c.HEAPU8[p+offset]^=0xff;
    assert.equal(c._ag_import_program(game.length),10,`Invalid header/name/checksum rejected at ${offset}`);
    assert.deepEqual(frame(),original,'Invalid file must not alter calculator state');
  }
  c.HEAPU8.set(game,p);assert.equal(c._ag_import_program(game.length),0,'OS accepts program over virtual link');tick(1);
  // Same sequence as the Play button, with release gaps for TI menu transitions.
  for(const k of [0x65,0x66,0x16,0x36,0x10,0x10])key(k);
  tick(3);
  if(process.env.TI84_CAPTURE)fs.writeFileSync(process.env.TI84_CAPTURE,frame());
  assert.equal(textHash(),'e36a3beef677bb6b197b6d1b3161f90db998bcf9e955f15461c583c07594e0a8','Original DrugWars title must actually run');
  key(0x10);tick(2);
  assert.equal(textHash(),'1a2ce879604936dc3ddd1df54626a08711e2b022d71814521f7f7fc5567c6e88','ENTER reaches instructions menu');
  console.log('TI program validation, virtual link installation, DrugWars launch and menu passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
