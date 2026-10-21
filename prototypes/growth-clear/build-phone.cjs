// Optional build-only esbuild dependency. No runtime network dependencies.
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
(async()=>{
 const root=__dirname,{catalog}=await import('../growth-chain/catalog.mjs'),images={},witnesses={};
 for(const c of catalog)for(let s=1;s<=8;s++){const p=`../../assets/characters/${c.id}/${String(s).padStart(2,'0')}.png`;images[p]='data:image/png;base64,'+fs.readFileSync(path.resolve(root,p)).toString('base64');}
 for(const name of ['chain3','chain5','chain10','lifetime08'])witnesses[name]=JSON.parse(fs.readFileSync(path.join(root,'witnesses',name+'.json')));
 const result=await esbuild.build({entryPoints:[path.join(root,'phone.mjs')],bundle:true,write:false,format:'iife',target:'es2022'});
 const safe=s=>s.replaceAll('</script','<\\/script');
 const html=fs.readFileSync(path.join(root,'player.html'),'utf8').replace(/<link rel="stylesheet" href="phone\.css"\s*\/?>/,'<style>'+fs.readFileSync(path.join(root,'phone.css'),'utf8')+'</style>').replace('<script type="module" src="phone.mjs"></script>','<script>window.GROWTH_CLEAR_IMAGES='+safe(JSON.stringify(images))+';window.GROWTH_CLEAR_WITNESSES='+safe(JSON.stringify(witnesses))+';</script><script>'+safe(result.outputFiles[0].text)+'</script>');
 fs.writeFileSync(path.join(root,'phone-standalone.html'),html);console.log(JSON.stringify({bytes:Buffer.byteLength(html),images:Object.keys(images).length,witnesses:Object.keys(witnesses)}));
})().catch(e=>{console.error(e);process.exitCode=1});
