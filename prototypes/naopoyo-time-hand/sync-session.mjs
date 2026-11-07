import fs from 'node:fs';import crypto from 'node:crypto';
const src=new URL('../naopoyo-world/session.mjs',import.meta.url),source=fs.readFileSync(src,'utf8');
const body='// GENERATED from official WorldSession: only engine import and unused storage KEY differ.\n'+source.replace('"../naopoyo-v2/engine.mjs"','"./engine.mjs"').replace('"naopoyo.world.pilot.20261023.v1"','"naopoyo.time-hand.experiment.20261031.v1"');
const target=new URL('session.mjs',import.meta.url);if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==body)throw Error('Session drift');}else fs.writeFileSync(target,body);console.log('Session source SHA256',crypto.createHash('sha256').update(source).digest('hex'));
