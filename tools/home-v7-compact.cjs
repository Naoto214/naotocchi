// Optional deployment formatting pass. Original source and all image bytes stay intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]);
const bundle=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/lib/transform/babelBundle.js'):require.resolve('playwright/lib/transform/babelBundle');
const {babelParse,babelTransform}=require(bundle);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const omit=new Set(['start','end','loc','extra','comments','leadingComments','innerComments','trailingComments']);
const canonical=ast=>JSON.parse(JSON.stringify(ast,(k,v)=>omit.has(k)?undefined:v));
function mismatch(a,b,p='AST'){if(a===b)return null;if(!a||!b||typeof a!==typeof b||typeof a!=='object')return p+': '+JSON.stringify(a)+' != '+JSON.stringify(b);const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();for(const k of keys){const e=mismatch(a[k],b[k],p+'.'+k);if(e)return e;}return null;}
const rows=[];
for(const name of fs.readdirSync(out).filter(f=>f.endsWith('-script.js'))){
 const file=path.join(out,name),before=fs.readFileSync(file,'utf8');
 const after=babelTransform(before,name,true,[[path.resolve(__dirname,'home-v7-compact-plugin.cjs'),{}]],[]).code+'\n';
 const difference=mismatch(canonical(babelParse(after,name,true)),canonical(babelParse(before,name,true)));assert.equal(difference,null,name+' AST must be identical: '+difference);
 if(Buffer.byteLength(after)>=Buffer.byteLength(before))continue;
 fs.writeFileSync(file,after);rows.push({file:name,sourceSha256:hash(before),deliveredSha256:hash(after),sourceBytes:Buffer.byteLength(before),deliveredBytes:Buffer.byteLength(after),astEqual:true});
}
const releasePath=path.join(out,'release-v7.json'),release=JSON.parse(fs.readFileSync(releasePath,'utf8'));
for(const f of Object.keys(release.files))release.files[f]=hash(fs.readFileSync(path.join(out,f)));
for(const f of Object.keys(release.v6EntryHashes))release.v6EntryHashes[f]=hash(fs.readFileSync(path.join(out,f)));
release.compaction={kind:'comments and whitespace only; AST verified',files:rows};
fs.writeFileSync(releasePath,JSON.stringify(release,null,2)+'\n');
console.log(JSON.stringify({files:rows.length,savedBytes:rows.reduce((n,r)=>n+r.sourceBytes-r.deliveredBytes,0),allAstEqual:true}));
