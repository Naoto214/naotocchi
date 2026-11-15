// Disposable diagnostic instrumentation only. Pinned A and PR #554 B runtime.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'../reach-site/dist'));
cp.execFileSync(process.execPath,['tools/home-movement-v1/build.cjs',out],{cwd:root});
function edit(file,from,to){const p=path.join(out,file),s=fs.readFileSync(p,'utf8');if(!s.includes(from))throw Error('Missing instrumentation anchor: '+file+' '+from);fs.writeFileSync(p,s.replace(from,to));}
edit('home-production-model.js','function separated(a,p,b){return','function separated(a,p,b){if(globalThis.__reachAblation?.collision)return true;return');
edit('home-production-model.js','const b={left,right,top,bottom};return','const b={left,right,top,bottom};if(globalThis.__reachAblation?.bounds)return globalThis.__reachFullBounds;return');
edit('home-production-model.js','const q=destination(a,p);if(!q)return false;','const q=destination(a,p);globalThis.__reachTrace={key,raw:p,clamped:limit(a,p,scene),destination:q};if(!q){globalThis.__reachTrace.rejected="destination";return false;}');
edit('home-production-model.js','if(!path.length)return false;','globalThis.__reachTrace.path=path;if(!path.length){globalThis.__reachTrace.rejected="route";return false;}');
edit('home-production-model.js','if(!safe){a.target=null;','if(!safe){globalThis.__reachTrace.stop={from:{x:a.x,y:a.y},next:p,visible:visible(a,p),polygon:!scene.navigation||scene.navigation.segmentSafe(a,p),contacts:actors.filter(b=>b!==a&&!separated(a,p,b)).map(b=>b.key)};a.target=null;');
edit('home-production-model.js','return {metrics:()=>','return {auditRestore(list){actors=structuredClone(list);selected=null;paused=false;for(const a of actors){a.target=null;a.route=[];a.activity="rest";}globalThis.__reachTrace=null;},metrics:()=>');
edit('home-route-navigation.mjs','&&walkable(q);','&&(globalThis.__reachAblation?.polygon||walkable(q));');
edit('home-route-navigation.mjs','const key=JSON.stringify(bounds);','const key=JSON.stringify([bounds,globalThis.__reachAblation?.polygon]);');
for(const v of ['a','b']){
 edit('movement-'+v+'-diorama.js','function visibleAt(p,a){','function visibleAt(p,a){if(env.__reachAblation?.occlusion)return true;');
 edit('movement-'+v+'-script.js',"if(count===4)state.companions=", "if(count===3)state.companions=[{id:'panda',bond:85}];if(count===4)state.companions=");
 edit('movement-'+v+'.html','</body>','<script src="reach-hook.js"></script></body>');
}
fs.copyFileSync(path.join(__dirname,'hook.js'),path.join(out,'reach-hook.js'));
console.log(out);
