/* Independent, real-valued TI-84-style expression/graph engine. No ROM, eval or Function.
 * Behavior reference: TI-84 Plus guidebook (EOS, function graphs, tables).
 */
class TI84Math {
  static format(value){return Number.isFinite(value)?String(Number(value.toPrecision(10))):'undefined';}
  static compile(source,angle='RAD'){
    if(typeof source!=='string'||source.length>256)throw Error('Expression too long (256 characters maximum)');
    source=source.replace(/×/g,'*').replace(/[÷]/g,'/').replace(/[−–]/g,'-').replace(/π/g,'pi').replace(/²/g,'^2').replace(/√/g,'sqrt');
    const tokens=[];let i=0;
    while(i<source.length){
      if(/\s/.test(source[i])){i++;continue;}
      const n=source.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
      if(n){tokens.push({type:'number',value:Number(n[0])});i+=n[0].length;continue;}
      const name=source.slice(i).match(/^[A-Za-z]+/);
      if(name){tokens.push({type:'name',value:name[0]});i+=name[0].length;continue;}
      if('+-*/^!(),'.includes(source[i])){tokens.push({type:source[i],value:source[i]});i++;continue;}
      throw Error('Unexpected character: '+source[i]);
    }
    if(!tokens.length)throw Error('Enter an expression');
    const r=angle==='DEG'?Math.PI/180:1;
    const functions={sin:[1,x=>Math.sin(x*r)],cos:[1,x=>Math.cos(x*r)],tan:[1,x=>Math.abs(Math.cos(x*r))<1e-12?NaN:Math.tan(x*r)],asin:[1,x=>Math.asin(x)/r],acos:[1,x=>Math.acos(x)/r],atan:[1,x=>Math.atan(x)/r],sqrt:[1,Math.sqrt],abs:[1,Math.abs],ln:[1,Math.log],log:[1,Math.log10],exp:[1,Math.exp],int:[1,Math.floor],round:[1,Math.round],min:[2,Math.min],max:[2,Math.max],nCr:[2,(n,k)=>TI84Math.combinations(n,k)],nPr:[2,(n,k)=>TI84Math.combinations(n,k)*TI84Math.factorial(k)]};
    let pos=0,depth=0;
    const peek=()=>tokens[pos]?.type;
    function expression(min=0){
      if(++depth>40)throw Error('Expression nested too deeply');
      const token=tokens[pos++];if(!token)throw Error('Missing value');let left;
      if(token.type==='number')left={kind:'value',value:token.value};
      else if(token.type==='+'||token.type==='-')left={kind:'unary',op:token.type,arg:expression(25)};
      else if(token.type==='('){left=expression();if(peek()!==')')throw Error('Missing closing parenthesis');pos++;}
      else if(token.type==='name'){
        const name=token.value;
        if(Object.hasOwn(functions,name)){
          if(peek()!=='(')throw Error(name+' needs parentheses');pos++;const args=[expression()];
          while(peek()===','){pos++;args.push(expression());}
          if(peek()!==')')throw Error('Missing closing parenthesis');pos++;
          if(args.length!==functions[name][0])throw Error(name+' needs '+functions[name][0]+' argument(s)');
          left={kind:'call',fn:functions[name][1],args};
        }else if(name==='pi'||name==='e')left={kind:'value',value:name==='pi'?Math.PI:Math.E};
        else if(name==='Ans'||/^[A-Z]$/.test(name)||name==='x')left={kind:'variable',name:name==='x'?'X':name};
        else throw Error('Unknown name: '+name);
      }else throw Error('Expected a value');
      while(pos<tokens.length){
        if(peek()==='!'&&40>=min){pos++;left={kind:'call',fn:TI84Math.factorial,args:[left]};continue;}
        const implicit=['number','name','('].includes(peek()),op=implicit?'*':peek(),power={'+':10,'-':10,'*':20,'/':20,'^':30}[op];
        if(power===undefined||power<min)break;
        if(!implicit)pos++;
        // TI EOS evaluates equal-priority operations from left to right.
        const right=expression(power+1);left={kind:'binary',op,left,right};
      }
      depth--;return left;
    }
    const tree=expression();if(pos!==tokens.length)throw Error('Unexpected '+tokens[pos].value);
    function evaluate(node,x,env){
      if(node.kind==='value')return node.value;
      if(node.kind==='variable'){if(node.name==='X')return x;const v=env[node.name];if(!Number.isFinite(v))throw Error('Variable '+node.name+' is not set');return v;}
      if(node.kind==='unary'){const v=evaluate(node.arg,x,env);return node.op==='-'?-v:v;}
      if(node.kind==='call')return node.fn(...node.args.map(a=>evaluate(a,x,env)));
      const a=evaluate(node.left,x,env),b=evaluate(node.right,x,env);
      switch(node.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return b===0?NaN:a/b;case '^':return a**b;}
    }
    return (x=0,env={Ans:0})=>evaluate(tree,x,env);
  }
  static factorial(n){if(!Number.isInteger(n)||n<0||n>69)return NaN;let v=1;for(let i=2;i<=n;i++)v*=i;return v;}
  static combinations(n,k){if(!Number.isInteger(n)||!Number.isInteger(k)||n<0||k<0||k>n||n>10000)return NaN;k=Math.min(k,n-k);let v=1;for(let i=1;i<=k;i++)v=v*(n-k+i)/i;return v;}
  static windowValid(w){return w&&['xmin','xmax','ymin','ymax'].every(k=>Number.isFinite(w[k])&&Math.abs(w[k])<=1e12)&&w.xmax>w.xmin&&w.ymax>w.ymin&&w.xmax-w.xmin>=1e-10&&w.ymax-w.ymin>=1e-10;}
  static sample(fn,w,env={},steps=384){
    if(!TI84Math.windowValid(w))throw Error('Invalid graph window');
    steps=Math.max(32,Math.min(1024,steps));const segments=[];let line=[],previous=null;
    const span=w.ymax-w.ymin,at=x=>{try{const y=fn(x,env);return Number.isFinite(y)?y:NaN;}catch{return NaN;}};
    for(let i=0;i<=steps;i++){
      const x=w.xmin+(w.xmax-w.xmin)*i/steps,y=at(x);
      if(!Number.isFinite(y)||y<w.ymin-span*4||y>w.ymax+span*4){if(line.length>1)segments.push(line);line=[];previous=null;continue;}
      if(previous){const mid=at((previous[0]+x)/2);if(!Number.isFinite(mid)||Math.abs(y-previous[1])>span*.7||Math.abs(mid-(y+previous[1])/2)>span*.2){if(line.length>1)segments.push(line);line=[];}}
      line.push([x,y]);previous=[x,y];
    }if(line.length>1)segments.push(line);return segments;
  }
  static zero(fn,lo,hi,env={}){
    let a=fn(lo,env),b=fn(hi,env);if(!Number.isFinite(a)||!Number.isFinite(b)||a*b>0)throw Error('Bracket a zero between opposite signs');
    if(a===0)return lo;if(b===0)return hi;
    for(let i=0;i<80;i++){const mid=(lo+hi)/2,v=fn(mid,env);if(!Number.isFinite(v))throw Error('Discontinuity, not a zero');if(Math.abs(v)<1e-12)return mid;if(Math.sign(v)===Math.sign(a)){lo=mid;a=v;}else hi=mid;}
    const x=(lo+hi)/2;if(Math.abs(fn(x,env))>1e-7)throw Error('No zero found; possible discontinuity');return x;
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports=TI84Math;
if(typeof window!=='undefined')window.TI84Math=TI84Math;
