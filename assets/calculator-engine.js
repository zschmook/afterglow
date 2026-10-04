/* Inspired by Casio module 463: C1 algebraic scientific and C2 base-n modes.
   Reference: https://www.digital-watch.com/images/casio_manuals/463-module.pdf
   Browser adaptation: 32-bit base-n in every radix, no hardware overflow emulation. */
(() => {
  const priorities={OR:1,XOR:2,AND:3,'+':4,'-':4,'*':5,'/':5,'^':6,root:6};
  const isOp=t=>typeof t==='string'&&Object.hasOwn(priorities,t);
  class WatchCalculator {
    constructor(){this.memory=0;this.angle='DEG';this.base=10;this.programmer=false;this.clear();}
    clear(){this.tokens=[];this.entry=null;this.value=0;this.fresh=true;this.solved=false;this.error=false;}
    get display(){
      if(this.error)return 'Error';
      if(this.entry!==null&&!this.fresh)return this.entry;
      if(this.programmer)return this.base===10?String(this.value):(this.value>>>0).toString(this.base).toUpperCase();
      return String(Number(this.value.toPrecision(8)));
    }
    get context(){return this.tokens.map(t=>typeof t==='number'?String(Number(t.toPrecision(8))):({'*':'×','/':'÷','-':'−','^':'^',root:'ROOT'}[t]||t)).join(' ');}
    inputValue(){
      if(this.entry===null)return this.value;
      if(this.programmer)return parseInt(this.entry,this.base);
      return Number(this.entry.replace(/e-?$/i,'e0'));
    }
    check(n){
      if(!Number.isFinite(n)||Math.abs(n)>=1e100)throw Error('Range');
      if(this.programmer&&(n<-2147483648||n>4294967295))throw Error('32-bit range');
      return this.programmer?n|0:n;
    }
    apply(a,op,b){
      switch(op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return b===0?NaN:this.programmer?Math.trunc(a/b):a/b;case '^':return a**b;case 'root':return b===0?NaN:a<0&&Math.abs(b%2)===1?-((-a)**(1/b)):a**(1/b);case 'AND':return a&b;case 'OR':return a|b;case 'XOR':return a^b;default:throw Error('Operator');}
    }
    evaluate(tokens){
      const values=[],ops=[];
      const reduce=()=>{const op=ops.pop(),b=values.pop(),a=values.pop();if(a===undefined||b===undefined)throw Error('Operand');values.push(this.check(this.apply(a,op,b)));};
      let expect=true,depth=0;
      for(const t of tokens){
        if(typeof t==='number'){if(!expect)throw Error('Operator missing');values.push(t);expect=false;}
        else if(t==='('){if(!expect||++depth>4)throw Error('Parentheses');ops.push(t);}
        else if(t===')'){if(expect||depth--<=0)throw Error('Parentheses');while(ops.at(-1)!=='(')reduce();ops.pop();expect=false;}
        else if(isOp(t)){
          if(expect)throw Error('Operand missing');
          while(ops.length&&ops.at(-1)!=='('&&priorities[ops.at(-1)]>=priorities[t])reduce();
          ops.push(t);expect=true;
        }else throw Error('Token');
      }
      if(expect||depth)throw Error('Incomplete');
      while(ops.length)reduce();if(values.length!==1)throw Error('Expression');return this.check(values[0]);
    }
    commit(){if(this.entry!==null){this.value=this.check(this.inputValue());this.tokens.push(this.value);this.entry=null;}}
    operand(){
      if(this.entry!==null){const n=this.inputValue();this.entry=null;return n;}
      if(this.tokens.at(-1)===')'){
        let depth=0,index=this.tokens.length;
        do {index--;if(this.tokens[index]===')')depth++;if(this.tokens[index]==='(')depth--;}while(index>0&&depth);
        return this.evaluate(this.tokens.splice(index));
      }
      if(typeof this.tokens.at(-1)==='number')return this.tokens.pop();
      return this.value;
    }
    result(n){this.value=this.check(n);this.entry=null;this.fresh=true;}
    setBase(base){const n=this.check(this.inputValue());this.base=base;this.result(n);}
    setProgrammer(enabled){this.programmer=enabled;this.base=10;this.clear();}
    press(key){
      if(key==='AC'){this.clear();return;}
      if(key==='CE'){if(this.error)this.clear();else {this.entry='0';this.value=0;this.fresh=true;}return;}
      if(['DEG','RAD','GRA'].includes(key)){this.angle=key;return;}
      if(this.error){if(/^[0-9A-F.]$/.test(key)||key==='pi')this.clear();else return;}
      try{this.execute(key);}catch{this.error=true;this.entry=null;this.tokens=[];}
    }
    execute(key){
      if(['DEC','BIN','OCT','HEX'].includes(key)){if(this.programmer)this.setBase({DEC:10,BIN:2,OCT:8,HEX:16}[key]);return;}
      if(/^[0-9A-F.]$/.test(key)){
        if(this.programmer&&(key==='.'||parseInt(key,16)>=this.base))return;
        if(!this.programmer&&/^[A-F]$/.test(key))return;
        if(this.solved){this.tokens=[];this.solved=false;}
        if(this.entry===null||this.fresh){if(this.tokens.at(-1)===')')this.tokens.push('*');this.entry='0';this.fresh=false;}
        if(key==='.') {if(!/[.e]/i.test(this.entry))this.entry+='.';return;}
        const exponent=this.entry.match(/e(-?)(\d*)$/i);
        if(exponent){if(exponent[2].length<2)this.entry+=key;return;}
        const limit=this.programmer?({2:32,8:11,10:10,16:8}[this.base]):8;
        if(this.entry.replace(/[-.]/g,'').length>=limit)return;
        this.entry=this.entry==='0'?key:this.entry==='-0'?'-'+key:this.entry+key;return;
      }
      if(key==='DEL'){if(this.entry!==null){this.entry=this.entry.slice(0,-1);if(!this.entry||this.entry==='-')this.entry='0';}return;}
      if(key==='EXP'){if(this.programmer)return;if(this.entry===null)this.entry=String(this.value);if(!/e/i.test(this.entry))this.entry+='e';this.fresh=false;return;}
      if(key==='sign'){
        if(this.entry!==null){const i=this.entry.toLowerCase().indexOf('e');if(i>=0){this.entry=this.entry.slice(0,i+1)+(this.entry[i+1]==='-'?this.entry.slice(i+2):'-'+this.entry.slice(i+1));}else this.entry=this.entry.startsWith('-')?this.entry.slice(1):'-'+this.entry;}
        else {this.result(-this.operand());this.entry=String(this.value);}
        if(this.fresh&&this.entry!==null)this.value=this.check(this.inputValue());return;
      }
      if(key==='('){if(this.solved){this.clear();}this.commit();if(typeof this.tokens.at(-1)==='number'||this.tokens.at(-1)===')')this.tokens.push('*');if(this.tokens.filter(t=>t==='(').length-this.tokens.filter(t=>t===')').length>=4)throw Error('Nesting');this.tokens.push('(');this.fresh=true;return;}
      if(key===')'){this.commit();this.tokens.push(')');const open=this.tokens.filter(t=>t==='(').length-this.tokens.filter(t=>t===')').length;if(open<0)throw Error('Parentheses');this.value=this.evaluate([...this.tokens,...Array(open).fill(')')]);this.fresh=true;return;}
      if(isOp(key)){
        this.commit();if(isOp(this.tokens.at(-1)))this.tokens.pop();
        if(!this.tokens.length)this.tokens.push(this.value);
        if(this.tokens.at(-1)==='(')throw Error('Operand');
        this.tokens.push(key);this.fresh=true;this.solved=false;return;
      }
      if(key==='='){
        this.commit();if(!this.tokens.length)return;
        const open=this.tokens.filter(t=>t==='(').length-this.tokens.filter(t=>t===')').length;
        if(open<0)throw Error('Parentheses');
        this.result(this.evaluate([...this.tokens,...Array(open).fill(')')]));this.tokens=[];this.solved=true;return;
      }
      if(key==='MR'){this.result(this.memory);this.entry=this.programmer&&this.base!==10?(this.value>>>0).toString(this.base):String(this.value);this.solved=false;return;}
      if(key==='Min'||key==='M+'||key==='M-'){const v=this.inputValue();this.memory=this.check(key==='Min'?v:this.memory+(key==='M+'?v:-v));this.fresh=true;return;}
      const x=this.operand(),r=this.angle==='DEG'?Math.PI/180:this.angle==='GRA'?Math.PI/200:1;
      let value;
      switch(key){
        case 'pi':value=Math.PI;break;
        case 'sin':value=Math.sin(x*r);break;
        case 'cos':value=Math.cos(x*r);break;
        case 'tan':value=Math.abs(Math.cos(x*r))<1e-12?NaN:Math.tan(x*r);break;
        case 'asin':value=Math.asin(x)/r;break;
        case 'acos':value=Math.acos(x)/r;break;
        case 'atan':value=Math.atan(x)/r;break;
        case 'log':value=Math.log10(x);break;
        case 'ln':value=Math.log(x);break;
        case 'sqrt':value=Math.sqrt(x);break;
        case 'square':value=x*x;break;
        case 'reciprocal':value=x===0?NaN:1/x;break;
        case 'pow10':value=10**x;break;
        case 'exp':value=Math.exp(x);break;
        case 'factorial':if(x<0||x%1||x>69)throw Error('Factorial');value=1;for(let n=2;n<=x;n++)value*=n;break;
        case '%':value=x/100;break;
        case 'NEG':value=-x;break;
        case 'DMS':{const a=Math.abs(x),d=Math.floor(a),m=Math.floor((a-d)*60),s=((a-d)*60-m)*60;value=Math.sign(x)*(d+m/100+s/10000);break;}
        default:return;
      }
      this.result(value);this.entry=this.programmer&&this.base!==10?(this.value>>>0).toString(this.base):String(this.value);this.solved=false;
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=WatchCalculator;
  else window.WatchCalculator=WatchCalculator;
})();
