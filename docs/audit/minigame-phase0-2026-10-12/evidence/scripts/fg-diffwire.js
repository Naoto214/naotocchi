// per top-level makeXxx in games.js: ageDifficulty / difficulty-var use / minigameEase / mgDuration
const L=require('fs').readFileSync('/home/user/naotocchi/games.js','utf8').split('\n');
const starts=[]; L.forEach((l,i)=>{const m=l.match(/^  function (make\w+)\(/); if(m) starts.push([i,m[1]]);});
const out=[];
for(let k=0;k<starts.length;k++){ const [s,name]=starts[k]; const e=k+1<starts.length?starts[k+1][0]:L.length; const body=L.slice(s,e).join('\n');
 const ad=/ageDifficulty\(\)/.test(body); const decl=(body.match(/const (\w+) = ageDifficulty\(\)/)||[])[1]; let used=null; if(decl){ const re=new RegExp('\\b'+decl+'\\b','g'); used=(body.match(re)||[]).length-1; }
 out.push({name, line:s+1, ad, var:decl, varUses:used, ease:/minigameEase\(\)/.test(body), dur:/mgDuration\(/.test(body)}); }
for(const o of out) if(!o.ad || o.varUses===0) console.log(JSON.stringify(o));
console.log('minigameEase users:', out.filter(o=>o.ease).map(o=>o.name+':'+o.line).join(', '));
console.log('no mgDuration:', out.filter(o=>!o.dur).map(o=>o.name).join(', '));
