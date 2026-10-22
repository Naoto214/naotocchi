const fs=require('fs');const s=fs.readFileSync('/home/user/naotocchi/script.js','utf8');
const pool=['🐻','🦊','🐱','🐶','🐰','🐼','🐨','🐯','🦁','🐮','🐷','🐸'];
const hits={};for(const e of pool){const re=new RegExp("emoji:\\s*'"+e+"'","g");const m=s.match(re);hits[e]=m?m.length:0;}
console.log(hits);
