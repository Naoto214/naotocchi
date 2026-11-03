// Run against the preserved V17 site directory, without modifying it.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const source=path.resolve(process.argv[2]),temp=fs.mkdtempSync(path.join(os.tmpdir(),'home-render-diagnostic-'));
try {
 for(const name of ['v17.html','v17-script.js'])fs.copyFileSync(path.join(source,name),path.join(temp,name));
 const before=Object.fromEntries(fs.readdirSync(temp).map(n=>[n,fs.readFileSync(path.join(temp,n))]));
 cp.execFileSync(process.execPath,[path.join(__dirname,'build.cjs'),temp]);
 for(const [name,bytes] of Object.entries(before))assert.deepEqual(fs.readFileSync(path.join(temp,name)),bytes,name+' changed');
 assert.equal(fs.readdirSync(temp).length,5,'only three diagnostic outputs');
 const script=fs.readFileSync(path.join(temp,'v17-render-diagnostic-script.js'),'utf8');
 assert(!script.includes('naotocchi-save-v1'),'production save key must be absent');
 assert(script.includes('naotocchi-render-diagnostic-v1'),'separate save key required');
 cp.execFileSync(process.execPath,['--check',path.join(temp,'v17-render-diagnostic-script.js')]);
 const html=fs.readFileSync(path.join(temp,'v17-render-diagnostic.html'),'utf8');
 assert(html.includes('data-home-display-version="17"'));
 assert(!/src="v17-script\.js/.test(html),'must load isolated runtime');
 assert(html.includes('src="v17-render-diagnostic-script.js'));
 const reverted=html.replace(/src="v17-render-diagnostic-script.js[^"\n]*"/,before['v17.html'].toString().match(/src="v17-script.js[^"\n]*"/)[0]).replace(/<script src="v17-render-diagnostic-panel.js[^"\n]*"><\/script>\n/,'');
 assert.equal(reverted,before['v17.html'].toString(),'all other V17 markup/references preserved');
 fs.appendFileSync(path.join(temp,'v17-script.js'),'\n// unexpected baseline');
 assert.throws(()=>cp.execFileSync(process.execPath,[path.join(__dirname,'build.cjs'),temp],{stdio:'pipe'}),'different baseline rejected');
 console.log('PASS: V17 preservation, isolated saves, three outputs, valid script, exact markup round-trip, baseline rejection');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
