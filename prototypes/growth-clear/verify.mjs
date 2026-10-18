import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {replay} from './session.mjs';
const root=new URL('./',import.meta.url);const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const archive=fs.readFileSync(new URL('raw-results.tar.gz',root));const expected=fs.readFileSync(new URL('raw-results.sha256',root),'utf8').split(/\s/)[0];if(sha(archive)!==expected)throw Error('Archive checksum mismatch');
execFileSync('tar',['-xzf',fileURLToPath(new URL('raw-results.tar.gz',root)),'-C',fileURLToPath(root)]);
const index=JSON.parse(fs.readFileSync(new URL('evidence-index.json',root)));for(const {file,sha256} of index){const bytes=fs.readFileSync(new URL(file,root));if(sha(bytes)!==sha256)throw Error('File hash mismatch '+file);replay(JSON.parse(bytes).record);}
console.log(`Verified ${index.length} result SHA-256 and final replay hashes`);
