import fs from'node:fs';import{createRequire}from'node:module';import{standSvg}from'../v12/stands.mjs';import{render,sample}from'./clock-v13.mjs';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
let s=standSvg(0);const start=s.indexOf('<svg x='),end=s.indexOf('</svg>',start)+6;s=s.slice(0,start)+render(sample).replace('<svg ','<svg x="20" y="60" width="270" height="270" ')+s.slice(end);
for(const [f,url]of[['../assets/dial-art-v4.png',new URL('../assets/dial-art-v4.png',import.meta.url)],['displacement.png',new URL('displacement.png',import.meta.url)],['face-v13.webp',new URL('face-v13.webp',import.meta.url)]])s=s.replaceAll(f,'data:image/png;base64,'+(f.endsWith('webp')?await sharp(url.pathname).png().toBuffer():fs.readFileSync(url)).toString('base64'));
await sharp(Buffer.from(s)).resize(1350,615).jpeg({quality:90}).toFile(new URL('evidence/stand-A.jpg',import.meta.url).pathname);
