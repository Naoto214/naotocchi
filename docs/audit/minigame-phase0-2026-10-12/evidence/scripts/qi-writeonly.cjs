const fs=require('fs');const R='/home/user/naotocchi/';
const src=fs.readFileSync(R+'script.js','utf8');const lines=src.split('\n');
const init=lines.slice(1389,1702);
const names=new Set();
for(const l of init){const m=/^\s{4,10}([A-Za-z_]\w*)\s*:/.exec(l);if(m)names.add(m[1]);}
const files=fs.readdirSync(R).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(R+f,'utf8')]);
const rest=(f,t)=>f==='script.js'? lines.filter((_,i)=>i<1389||i>1701).join('\n'):t;
const out=[];
for(const n of names){
  let reads=0,writes=0,lit=0;
  for(const [f,t0] of files){const t=rest(f,t0);
    const rr=t.match(new RegExp('\\.'+n+'\\b','g'));reads+=rr?rr.length:0;
    const w=t.match(new RegExp('\\.'+n+'(\\s*(=(?!=)|\\+=|-=|\\*=|\\|\\|=|\\?\\?=|\\+\\+|--)|\\.(push|unshift|splice|add|set)\\(|\\[[^\\]\\n]+\\]\\s*(=(?!=)|\\+=|-=|\\+\\+|\\|\\|=))','g'));writes+=w?w.length:0;
    const w2=t.match(new RegExp('\\b'+n+'\\s*:','g'));lit+=w2?w2.length:0;
    const w3=t.match(new RegExp("\\[['\"]"+n+"['\"]\\]\\s*(=(?!=)|\\+=)",'g'));writes+=w3?w3.length:0;
  }
  if(writes===0) out.push(`${n}\treads=${reads}\tliteralKeys=${lit}`);
}
console.log(out.join('\n'));
