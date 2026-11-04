import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('script.js','utf8');const match=source.match(/const PARTNER_RUNTIME_PROFILE = (\{[\s\S]*?\n  \});/);if(!match)throw Error('partner profile source not found');const profiles=vm.runInNewContext('('+match[1]+')');
fs.writeFileSync('prototypes/life-sugoroku/profiles.mjs','// Generated from script.js PARTNER_RUNTIME_PROFILE. Do not hand edit.\nexport const PARTNER_PROFILES = '+JSON.stringify(profiles,null,2)+';\n');
