// Isolated read interception; never edits/reverts the working tree.
const fs=require('fs'),{spawnSync}=require('child_process'),assert=require('node:assert/strict');
const src=fs.readFileSync('meguru-3d.mjs','utf8');
const mutations=[
 ['width-only focal length','Math.min(W, H * 1.5) * 0.95','W * 0.95'],
 ['downward pitch returns','camera.rotation.set(0, -c.yaw, 0);',"camera.rotation.set(-0.15, -c.yaw, 0, 'YXZ');"],
 ['feet anchor changes','(FEET_FRAC - HOR / H) * H * c.dist / F','(0.95 - HOR / H) * H * c.dist / F']
];
for(const [name,from,to] of mutations){assert.ok(src.includes(from),name+' mutation target');const boot=`const fs=require('fs'),read=fs.readFileSync;fs.readFileSync=function(p,...a){const s=read.call(this,p,...a);return typeof p==='string'&&p.endsWith('meguru-3d.mjs')&&typeof s==='string'?s.replace(${JSON.stringify(from)},${JSON.stringify(to)}):s;};require('./tests/meguru-default-3d-test.cjs');`;
 const r=spawnSync(process.execPath,['-e',boot],{encoding:'utf8'});assert.equal(r.status,1,name+' must fail assertions');assert.match(r.stdout+r.stderr,/AssertionError/);console.log('DETECTED '+name);
}
console.log('3/3 mutations detected; no production writes');
