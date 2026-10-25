const fs=require('fs');const src=fs.readFileSync(process.cwd()+'/games.js','utf8').split('\n');
const starts=[];src.forEach((l,i)=>{const m=l.match(/^  function (make\w+)\s*\(/);if(m)starts.push([m[1],i]);});
const body={};starts.forEach(([n,i],k)=>{body[n]={from:i+1,text:src.slice(i,(starts[k+1]||[0,src.length])[1]).join('\n')};});
const seen=new Set();
src.forEach((l)=>{for(const m of l.matchAll(/mg\('([\w-]+)',\s*(?:randomThemeGame\()?(make\w+)/g)){const b=body[m[2]];if(!b||seen.has(m[2]))continue;seen.add(m[2]);const t=b.text;
 const hasLimit=/TIME_LIMIT_MS|DURATION_MS|mgDuration\(/.test(t);const shows=/残り|remain\w*\s*\/\s*1000|⏱|秒`/.test(t);
 if(hasLimit&&!shows)console.log(m[1],m[2]+':'+b.from);}});
