const base=require('../../v5/tests/native.cjs');
function setup(){base.setup();global.Image=class extends base.Image{set src(v){super.src=typeof v==='string'&&v.startsWith('file:')?require('node:url').fileURLToPath(v):v}};global.fetch=async url=>{const p=require('node:url').fileURLToPath(url);return{json:async()=>JSON.parse(base.fs.readFileSync(p,'utf8'))}}}
module.exports={...base,setup};
