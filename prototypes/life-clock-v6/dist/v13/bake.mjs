// Deterministic rendering of the static SVG face only; hands/numerals stay live.
import fs from'node:fs';import{createRequire}from'node:module';import{render,sample}from'./clock-v13.mjs';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');let s=render(sample,{baked:false});const a=s.indexOf('<g data-v13-contour='),b=s.indexOf('<g data-bezel-width=');s='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 1024 1024">'+s.slice(a,b)+'</svg>';
for(const f of ['../assets/dial-art-v4.png','displacement.png'])s=s.replaceAll(f,'data:image/png;base64,'+fs.readFileSync(new URL(f,import.meta.url)).toString('base64'));
await sharp(Buffer.from(s)).webp({lossless:true}).toFile(new URL('face-v13.webp',import.meta.url).pathname);
