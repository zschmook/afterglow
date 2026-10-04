const assert=require('node:assert/strict');
const Calculator=require('../assets/calculator-engine.js');
function run(keys,c=new Calculator()){for(const key of keys)c.press(key);return c;}
function answer(keys,want){const c=run(keys);assert.equal(c.error,false,keys.join(' '));assert.ok(Math.abs(c.value-want)<=1e-9*Math.max(1,Math.abs(want)),`${keys.join(' ')}: ${c.display} != ${want}`);return c;}
// Algebraic order and the manual's example: 10 - 7 × (3 + 6) = -53.
answer(['2','+','3','*','4','='],14);
answer(['1','0','-','7','*','(','3','+','6',')','='],-53);
answer(['2','*','(','3','+','(','4','*','5',')',')','='],46);
answer(['2','(','3','+','4',')','='],14);
answer(['2','^','3','='],8);
answer(['2','7','root','3','='],3);
answer(['2','+','(','3','*','4','='],14); // Closing pending groups on equals.
answer(['2','+','3','sqrt','='],2+Math.sqrt(3));
answer(['(','3','+','6',')','sqrt','='],3);
answer(['2','+','7','CE','3','='],5);
answer(['2','+','7','CE','='],2);
answer(['2','+','*','3','='],6);
answer(['.','1','+','.','2','='],.3);
answer(['3','0','sin','='],.5);
answer(['9','0','cos','='],Math.cos(Math.PI/2));
answer(['GRA','1','0','0','sin','='],1);
answer(['RAD','pi','cos','='],-1);
answer(['.','5','asin','='],30);
answer(['1','0','0','log','='],2);
answer(['1','exp','ln','='],1);
answer(['5','factorial','='],120);
answer(['2','EXP','3','+','1','='],2001);
answer(['2','EXP','sign','3','='],.002);
answer(['9','sqrt','sign','='],-3);
answer(['2','5','0','0','*','1','5','%','='],375);
const memory=answer(['5','3','+','6','=','Min','AC','2','3','-','8','=','M+','AC','MR','='],74);
assert.equal(memory.memory,74);
const chained=answer(['2','+','3','=','*','4','='],20);
chained.press('8');assert.equal(chained.display,'8');
const digits=run('123456789'.split(''));assert.equal(digits.display,'12345678');
for(const keys of [['1','/','0','='],['1','sign','sqrt'],['0','log'],['9','0','tan'],['7','0','factorial'],[')'],['(','(','(','(','(']]){
  const c=run(keys);assert.equal(c.display,'Error',keys.join(' '));c.press('AC');c.press('5');assert.equal(c.display,'5');
}
const base=new Calculator();base.setProgrammer(true);
run(['2','5','5','HEX'],base);assert.equal(base.display,'FF');
base.press('BIN');assert.equal(base.display,'11111111');base.press('OCT');assert.equal(base.display,'377');base.press('DEC');assert.equal(base.display,'255');
run(['AC','HEX','F','F','AND','A','=','DEC'],base);assert.equal(base.display,'10');
run(['AC','1','8','OR','3','='],base);assert.equal(base.display,'19');
run(['AC','5','XOR','3','='],base);assert.equal(base.display,'6');
run(['AC','1','NEG','HEX'],base);assert.equal(base.display,'FFFFFFFF');base.press('DEC');assert.equal(base.display,'-1');
run(['AC','BIN','2'],base);assert.equal(base.display,'0');
run(['AC','DEC','4','2','9','4','9','6','7','2','9','6','='],base);assert.equal(base.display,'Error');
console.log('Calculator passed: precedence, nested parentheses, entry correction, scientific modes, memory, exponent entry, error recovery, and 32-bit base conversions/logic.');
