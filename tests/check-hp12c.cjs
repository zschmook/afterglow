const assert=require('node:assert/strict');
const HP=require('../assets/hp12c-engine.js');
let assertions=0;
function near(actual,want,tolerance=1e-8){assert.ok(Math.abs(actual-want)<=tolerance,`${actual} != ${want}`);assertions++;}
function run(sequence,c=new HP()){
  for(const token of sequence.split(' ')){
    if(/^-?\d+(\.\d+)?$/.test(token)){for(const ch of token.replace('-',''))c.press(ch);if(token.startsWith('-'))c.press('CHS');}
    else c.press(token);
    assert.equal(c.error,'',`${token}: ${c.error}`);
  }return c;
}
// RPN stack lift/drop and repeated constants; no algebraic precedence.
near(run('2 ENTER 3 + 4 *').x,20);
let c=run('1 ENTER 2 ENTER 3 ENTER 4');assert.deepEqual(c.stack,[4,3,2,1]);
c.press('+');assert.deepEqual(c.stack,[7,2,1,1]);c.press('roll');assert.deepEqual(c.stack,[2,1,1,7]);
near(run('2 ENTER ENTER ENTER 3 * * *').x,24);
near(run('100 ENTER 15 % +').x,115);
near(run('100 ENTER 125 delta%').x,25);
near(run('200 ENTER 50 %T').x,25);
near(run('9 sqrt LASTx +').x,12);
near(run('12 ENTER 34 CLx 5 +').x,17);
near(run('5 factorial').x,120);
near(run('2 ENTER 3 power').x,8);
near(run('1 EEX CHS 3 ENTER 2 *').x,.002);
near(run('9 ENTER EEX ENTER').x,1);
near(run('2.75 FRAC').x,.75);
// Manual: 30-year mortgage, 13.25%, $50,000; then amortize one payment.
c=run('30 12x 13.25 12/ 50000 PV PMT');near(c.x,-562.89,.005);
run('0 n 1 AMORT',c);near(c.x,-552.08);near(c.y,-10.81);near(c.fin.PV,49989.19);
// Help example and solving each TVM register, including calculated interest entry.
c=run('30 12x 6 ENTER 12 / i 200000 PV PMT');near(c.x,-1199.1010503055,1e-7);
const payment=c.x;
c.fin.PV=0;c.press('PV');near(c.x,200000,1e-6);
c.fin.FV=0;c.press('FV');near(c.x,0,1e-6);
c.fin.i=0;c.press('i');near(c.x,.5,1e-9);
c.fin.n=0;c.press('n');near(c.x,360);
near(run('12 n 0 i 1200 PV PMT').x,-100);
c=run('12 n 1 i 1000 PV PMT');const end=c.x;c.press('BEG');c.press('PMT');near(c.x,end/1.01);
c=run('10 n 0 i -100 PV 200 FV i');near(c.x,(Math.pow(2,.1)-1)*100);
// Official guide pp.60,62–63: NPV $212.18; grouped NPV $907.77 and IRR 13.72%.
c=run('-80000 CF0 -500 CFj 4500 CFj 5500 CFj 4500 CFj 130000 CFj 13 i NPV');near(c.x,212.18,.005);
c=run('-79000 CF0 14000 CFj 11000 CFj 10000 CFj 3 Nj 9100 CFj 9000 CFj 2 Nj 4500 CFj 100000 CFj 13.5 i NPV');near(c.x,907.77,.005);
c.press('IRR');assert.equal(c.error,'');near(c.x,13.72,.005);c.press('NPV');near(c.x,0,1e-7);
near(run('-100 CF0 90 CFj IRR').x,-10,1e-8);
c=run('100 CF0 90 CFj');const before=c.snapshot();c.press('IRR');assert.match(c.error,/positive and negative/);assert.deepEqual(c.snapshot(),{...before,message:c.error});
// Memory, precision and reload continuity.
c=run('123');c.store(12);run('2',c);c.store(12,'*');c.recallRegister(12);near(c.x,246);
c.store('PV');near(c.fin.PV,246);
const copy=new HP();assert.equal(copy.restore(c.snapshot()),true);assert.deepEqual(copy.snapshot(),c.snapshot());
assert.equal(copy.restore({stack:[1]}),false);
c=run('2 ENTER 3 /');c.decimals=2;assert.equal(c.display,'0.67');near(c.x,2/3);c.press('RND');near(c.x,.67);
// Depreciation: 5-year asset costing 10,000, salvage 1,000.
near(run('5 n 10000 PV 1000 FV 1 SL').x,1800);
near(run('5 n 10000 PV 1000 FV 1 SOYD').x,3000);
near(run('5 n 10000 PV 1000 FV 200 i 1 DB').x,4000);
// Sample pairs (x,y) = (1,2), (2,4), (3,6).
c=run('2 ENTER 1 sigma+ 4 ENTER 2 sigma+ 6 ENTER 3 sigma+ mean');near(c.x,2);near(c.y,4);
c.press('sd');near(c.x,1);near(c.y,2);
run('4 estimateY',c);near(c.x,8);near(c.y,1);
run('8 estimateX',c);near(c.x,4);
c.press('weighted');near(c.x,28/6);
near(run('1.16 ENTER 15 sigma+ 1.24 ENTER 7 sigma+ 1.20 ENTER 10 sigma+ 1.18 ENTER 17 sigma+ weighted').x,1.19,.005);
c.press('clearSTATS');assert.deepEqual(c.memory.slice(1,7),[0,0,0,0,0,0]);
// Gregorian dates and leap year, no local timezone/DST arithmetic.
c=run('2.282024 ENTER 2 DATE');near(c.x,3.012024);assert.match(c.message,/2024-03-01/);
near(run('2.282024 ENTER 3.012024 DAYS').x,2);
c=run('DMY 28.022024 ENTER 2 DATE');near(c.x,1.032024);
// Errors preserve the operands; CLx dismisses the error before clearing.
c=run('7 ENTER 0');const stack=[...c.stack];c.press('/');assert.ok(c.error);assert.deepEqual(c.stack,stack);c.press('CLx');assert.equal(c.error,'');run('2 /',c);near(c.x,3.5);
c=run('2.5 n 1 i 100 PV');c.press('PMT');assert.match(c.error,/odd-period/);
console.log(`HP 12C: ${assertions} numeric checks plus stack, persistence and error checks passed.`);
