// Generate only the isolated, owner-private preview. All substitutions verify
// their upstream anchors so a changed main cannot silently disable an adapter.
const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(__dirname,'../..');
const dist=path.resolve(process.argv[2]||'');
if(!process.argv[2]||dist===source||dist.startsWith(source+path.sep))throw Error('Use a dist directory outside the production checkout');
const game=path.join(dist,'game'),beauty=path.join(game,'beauty');
if(process.argv.includes('--fresh')) {
  // Copy exactly the production Pages input from a complete checkout.
  const manifest=JSON.parse(fs.readFileSync(path.join(source,'tools/pages/allowlist.json'),'utf8'));
  for(const file of manifest.files) {
    const target=path.join(game,file);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(path.join(source,file),target);
  }
} else if(!fs.existsSync(path.join(game,'index.html'))) {
  throw Error('Supply a prebuilt dist/game or use --fresh with a full checkout.');
}
fs.mkdirSync(beauty,{recursive:true});
const read=name=>fs.readFileSync(path.join(source,name),'utf8');
const write=(name,content)=>fs.writeFileSync(path.join(game,name),content);
function replace(text,anchor,change){
  if(text.split(anchor).length!==2)throw Error('Missing or duplicate production anchor '+anchor);
  return text.replace(anchor,()=>change);
}
for(const file of ['sea-e.mjs','forest-e.mjs','nature.mjs','full-motion.mjs','other-regions.mjs','paint.mjs','cast.css','bridge.js','fixture.js'])fs.copyFileSync(path.join(__dirname,file),path.join(beauty,file));
let html=read('index.html').replaceAll('naotocchi-save-v1','naotocchi-beauty-v4-fixture');
const seed=JSON.parse(fs.readFileSync(path.join(__dirname,'fixture.json'),'utf8'));
const marker='<script src="cast-bounds.js';
html=replace(html,marker,'<link rel="stylesheet" href="beauty/cast.css"><script src="beauty/bridge.js"></script><script id="beauty-seed" type="application/json">'+JSON.stringify(seed).replaceAll('<','\\u003c')+'</script><script src="beauty/fixture.js"></script>\n  '+marker);
write('index.html',html);
let script=read('script.js').replaceAll('naotocchi-save-v1','naotocchi-beauty-v4-fixture');
script=replace(script,'if (locality) environment.locality = locality;', 'Object.assign(environment,window.NaotocchiDaypartsQA);\n    if (locality) environment.locality = locality;');
write('script.js',script);
let world="import {composeNature} from './beauty/paint.mjs';\n"+read('home-production-world.mjs');
world=replace(world,'Math.floor(time/120)','win.HomeBeauty.revision,Math.floor(time/(win.HomeBeauty.settings.variant==="current"||win.HomeBeauty.settings.count>=4||flags.tier>0?120:55))');
world=replace(world,'if(fk!==fxKey){','if(fk!==fxKey || fx.dataset.beautyVariant!==win.HomeBeauty.settings.variant){fx.dataset.beautyVariant=win.HomeBeauty.settings.variant;');
world=replace(world,'particle:mood.particle','particle:win.HomeBeauty.settings.variant==="current"?mood.particle:"none"');
world=replace(world,"if(!flags.reducedMotion){ctx.save();ctx.globalCompositeOperation='screen';", "composeNature(ctx,t,host,fade,time/1000,flags.reducedMotion);\n  if(win.HomeBeauty.settings.variant==='current'&&!flags.reducedMotion){ctx.save();ctx.globalCompositeOperation='screen';");
write('home-production-world.mjs',world);
let controller=read('home-production-diorama.js');
controller=replace(controller,'modelAPI.createModel({onEvent:emit})','modelAPI.createModel({random:env.HomeBeauty.actorRandom,onEvent:emit})');
controller=replace(controller,'const dt=Math.min(1,gap/1000);','const dt=Math.min(1,gap/1000)*env.HomeBeauty.settings.speed;');
controller=replace(controller,'const sx=presentation?.scaleX||1,sy=presentation?.scaleY||1,bod=paintedBodyScale??1;',`const sx=presentation?.scaleX||1,sy=presentation?.scaleY||1,bod=paintedBodyScale??1;
      const beauty=env.HomeBeauty,artRect=beauty.paintRect;
      const screenStage=beauty.settings.variant!=='current'&&beauty.settings.effects.contact&&scene.region==='sea'&&artRect?stage.getBoundingClientRect():null;`);
controller=replace(controller,'const stamp=[sx,sy,bod,',`const footScreenX=screenStage ? screenStage.left+a.x*sx : 0;
        const inShallows=screenStage && beauty.waterSurface && beauty.waterSurface((footScreenX-artRect.left)/artRect.width,
          (screenStage.top+a.y*sy-artRect.top)/artRect.height,footScreenX);
        const stamp=[beauty.revision,inShallows,screenStage?.top,screenStage?.left,artRect?.width,artRect?.height,sx,sy,bod,`);
controller=replace(controller,'row.shadow.remove();','row.contact?.remove();row.shadow.remove();');
controller=replace(controller,'row.shadow.style.left=a.x+',`if (screenStage && beauty.waterSurface) {
          row.shadow.dataset.surface=inShallows?'water':'ground';
        }else if(row.shadow.dataset.surface)delete row.shadow.dataset.surface;
        const material=scene.region==='forest'?'grass':row.shadow.dataset.surface==='water'?'water':null;
        if (beauty.settings.variant!=='current' && beauty.settings.effects.contact && material) {
          if (!row.contact) {
            row.contact=doc.createElement('span');row.contact.className='beauty-foot';
            row.contact.setAttribute('aria-hidden','true');stage.appendChild(row.contact);
          }
          row.contact.hidden=false;row.contact.dataset.material=material;
          const width=a.w*depthScale*bod;
          Object.assign(row.contact.style,{left:a.x+'px',top:a.y+'px',width:(width*.77/sx)+'px',
            height:(Math.max(1.4,Math.min(4,width*.045))/sy)+'px',zIndex:String(Math.round(a.y)+1)});
        } else if(row.contact)row.contact.hidden=true;
        for(const n of [row.owner,...(row.attachments||[])])if(!n.hasAttribute('data-beauty-lit'))n.setAttribute('data-beauty-lit','');
        row.shadow.style.left=a.x+`);
write('home-production-diorama.js',controller);

for(const file of ['index.html','style.css','controls.mjs'])fs.copyFileSync(path.join(__dirname,file),path.join(dist,file));
