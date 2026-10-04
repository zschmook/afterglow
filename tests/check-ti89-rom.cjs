// Local integration test; supply your own classic TI-89 ROM. No firmware is bundled.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const context={console,ArrayBuffer,DataView,Uint8Array,Uint16Array};vm.createContext(context);
for(const file of ['assets/vendor/ti68k/ti68k.js','assets/ti89-engine.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const create=context.AfterglowTI89.create;
assert.throws(()=>create(new ArrayBuffer(1048576)),/2 MB/);
assert.throws(()=>create(new ArrayBuffer(2097152)),/not a classic/);
const fake=new ArrayBuffer(2097152),header=new DataView(fake);header.setUint16(0x12000,0x800f);header.setUint16(0x12006,0x8011);header.setUint8(0x12008,9);
assert.throws(()=>create(fake),/not a classic/);
if(!process.argv[2]){console.log('TI-89 rejects invalid, wrong-size and Titanium ROMs. Supply a local ROM path to test boot/CAS/graph/power.');process.exit(0);}
const bytes=fs.readFileSync(process.argv[2]),core=create(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const tick=n=>{for(let i=0;i<n;i++)core.tick();};
const key=(...codes)=>{codes.forEach(k=>core.key(k,true));tick(18);codes.forEach(k=>core.key(k,false));tick(36);};
const hash=()=>crypto.createHash('sha256').update(core.frame().subarray(16*160,82*160)).digest('hex');
tick(450);assert.equal(core.on(),true);assert.ok(core.frame().some(Boolean));
key(25);key(9);key(25);key(8);tick(250);
assert.equal(hash(),'f48b67ad910317aca4aa06b91e72f2c1c8222f101e674e7474f21b2d32bfe315','Native 2+2 must render 4 in HOME history');
key(14);key(39);key(25);key(45);key(13);key(25);key(10);key(33);key(28);key(8);tick(300);
assert.equal(hash(),'cc4072688436968e48e18dc56cb4a86b85f12de3a2f5d0f6aa237beb53a71a95','Native factor(x^2-1) must render (x-1)(x+1)');
key(6);key(47);tick(150);key(45);key(13);key(25);key(8);key(6);key(31);tick(600);
assert.equal(hash(),'46d534b69fa84f36d6f8500ad4d79608bc158ce21e985f1295fde9232cc354f0','Diamond F3 must graph y1=x^2');
key(46);key(4);key(80);tick(100);assert.equal(core.on(),false);assert.equal(core.frame().some(Boolean),false,'OFF must blank LCD');
key(80);tick(300);assert.equal(core.on(),true);assert.equal(hash(),'cc4072688436968e48e18dc56cb4a86b85f12de3a2f5d0f6aa237beb53a71a95','ON must retain HOME history');
console.log('TI-89 ROM: boot, native arithmetic, symbolic factorization, parabola, OFF/ON and retained history passed.');
