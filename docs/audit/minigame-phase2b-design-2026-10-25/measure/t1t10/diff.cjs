const fs=require('fs');const src=fs.readFileSync(process.cwd()+'/games.js','utf8').split('\n');
const starts=[];src.forEach((l,i)=>{const m=l.match(/^  function (make\w+)\s*\(/);if(m)starts.push([m[1],i]);});
const body={};starts.forEach(([n,i],k)=>{body[n]={from:i+1,text:src.slice(i,(starts[k+1]||[0,src.length])[1]).join('\n')};});
const rows=[];src.forEach((l,i)=>{for(const m of l.matchAll(/mg\('([\w-]+)',\s*(?:randomThemeGame\()?(make\w+)/g)){const b=body[m[2]];if(!b){rows.push([m[1],m[2],'?']);continue;}const t=b.text;
const ad=/ageDifficulty\(\)/.test(t),ez=/minigameEase\(\)/.test(t);const declared=/const difficulty = ageDifficulty\(\)/.test(t);const used=declared?(t.match(/\bdifficulty\b/g)||[]).length-1:null;
const dur=/mgDuration\(/.test(t);rows.push([m[1],m[2]+':'+b.from,ad?'age':'-',ez?'ease':'-',declared?('difficultyUses='+used):'',dur?'mgDur':'noDur']);}});
for(const r of rows)console.log(r.join('\t'));
