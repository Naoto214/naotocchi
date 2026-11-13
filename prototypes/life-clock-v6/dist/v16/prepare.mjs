import fs from'node:fs';import{createRequire}from'node:module';const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const uri=f=>'data:image/png;base64,'+fs.readFileSync(new URL(f,import.meta.url)).toString('base64');
const s=`<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 1024 1024"><defs><mask id="zone"><circle cx="512" cy="500" r="359" fill="none" stroke="white" stroke-width="58"/></mask></defs><image href="${uri('../assets/dial-art-v4.png')}" width="1024" height="1024"/><image href="${uri('clean-generated.png')}" width="1024" height="1024" mask="url(#zone)"/></svg>`;
await sharp(Buffer.from(s)).webp({lossless:true}).toFile(new URL('plate.webp',import.meta.url).pathname);
