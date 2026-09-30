// Read-only independent runtime audit. Run from any cwd with Node + sharp.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');process.chdir(root);
const sharp=require('sharp'),{harness}=require(path.join(root,'tests/helpers/runtime-harness.cjs'));
const exp=require(path.join(root,'pet-expression.js')),bounds=require(path.join(root,'cast-bounds.js'));
const css=fs.readFileSync('pet-expression.css','utf8');
const placement=JSON.parse(fs.readFileSync('pet-expression.js','utf8').match(/const MARK_PLACEMENT = (\{[\s\S]*?\n  \});/)[1]);
const names=['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping'];
const probe=harness(),lines=[...probe.api.ALL_LINES];
const stages=lines.flatMap(line=>probe.api.SPECIES[line].stages.map((s,i)=>({line,i,base:s.asset})));
const disk=fs.readdirSync('assets/characters',{withFileTypes:true}).filter(x=>x.isDirectory()&&fs.existsSync(`assets/characters/${x.name}/01.png`)&&fs.existsSync(`assets/characters/${x.name}/08.png`)).map(x=>x.name);
const errors=[],results={source:'production ALL_LINES/SPECIES plus disk 01..08 directories; expression registry not used as population',lines,masterStages:stages.length,disk,missingDisk:lines.filter(x=>!disk.includes(x)),extraDisk:disk.filter(x=>!lines.includes(x)),mapped:0,reached:0,errors};
const persistent={normal:{},hungry:{hunger:40},sick:{isSick:true},tired:{energy:40},sulky:{happiness:40,affectionStreak:3},weak:{deathMeter:60},critical:{deathMeter:80},wantsPlay:{happiness:40},sleeping:{isSleeping:true}};
function common(line,i){return {stage:'growing',speciesLine:line,ageTicks:[1,3,7,12,16,25,40,70][i]*20,stageIndex:i,hunger:80,happiness:80,energy:80,health:80,isSick:false,isSleeping:false,deathMeter:0,dying:false,transformOptions:null,affectionStreak:0,companions:[],partner:null,achievementsUnlocked:['age-10','age-25','age-50','rare-line-1','sick-cured-1']};}
function render(h,values){Object.assign(h.api.state(),values);h.get('storyFlash').classList.add('hidden');h.get('lifeCardOverlay').classList.add('hidden');h.api.render();}
for(const {line,i,base} of stages){
 const h=harness(),initial=common(line,i);
 const check=name=>{const got=h.get('petSprite').dataset.expression,src=h.get('petSprite').innerHTML.match(/class="character-asset" src="([^"]+)"/)?.[1];if(got!==name||src!==exp.assetFor(base,name))errors.push({line,i,name,got,src,want:exp.assetFor(base,name)});results.reached++;};
 for(const [name,values] of Object.entries(persistent)){render(h,{...initial,...values});check(name);}
 render(h,initial);
 for(const [name,event] of [['happy','play_with'],['strained','overfeed']]){h.api.setSpeechBubble('audit',{kind:'pet',label:'audit'},{event});check(name);}
 for(const name of names){const file=exp.assetFor(base,name);if(file===base||!fs.existsSync(file)||!exp.accentFor(base,name))errors.push({missing:base,name,file});results.mapped++;}
 if(exp.assetFor(base,'normal')!==base||exp.accentFor(base,'normal')!==''||!exp.sweatFor(base,104,104))errors.push({base,normalOrSweatFailure:true});
}
results.concurrentReach=[];
for(const [expected,values,button] of [['critical',{deathMeter:80}],['weak',{deathMeter:60}],['sleeping',{isSleeping:true}],['happy',{},'playWithBtn'],['sulky',{affectionStreak:3},'playWithBtn'],['strained',{},'feedBtn']]){
 const h=harness();render(h,{...common('cat',2),isSick:true,sicknessType:'かぜ',...values});
 if(button){vm.runInContext('Math.random=()=>0.55',h.sandbox);h.dispatch(h.get(button),'click');h.advance(1);}
 const r={expected,got:h.get('petSprite').dataset.expression,isSick:h.api.state().isSick,sweat:h.get('device').dataset.careIllness,button:button||null};results.concurrentReach.push(r);
 if(r.expected!==r.got||!r.isSick||r.sweat!=='true')errors.push(r);
}
const W=408,wrap=raw=>Buffer.from(`<svg width="${W}" height="${W}" viewBox="-50 -50 204 204">${raw}</svg>`);
function dropPath(w,h){const c=[.65,.35,.6,.4].map(v=>[w*v/1.05,h*v/1.05]);return `M${c[0][0]} 0H${w-c[1][0]}A${c[1]} 0 0 1 ${w} ${c[1][1]}V${h-c[2][1]}A${c[2]} 0 0 1 ${w-c[2][0]} ${h}H${c[3][0]}A${c[3]} 0 0 1 0 ${h-c[3][1]}V${c[0][1]}A${c[0]} 0 0 1 ${c[0][0]} 0Z`;}
(async()=>{
 results.geometry={checked:0,empty:[],direction:[],outside:[]};
 results.sweat={method:'104 logical px, 2x raster, alpha>16. CSS outer border-radius normalized by1.05, 18deg rotation. Full7px downward sweep at0.5px raster increments. Shadow excluded. CSS-shape reconstruction, not browser/device proof.',checked:0,envelopeCandidates:0,hits:[],counts:{}};
 const simultaneous=new Set(['happy','strained','sulky','weak','critical','sleeping']);
 for(const {base} of stages){
  const key=base.slice(18,-4),shift=104*(128-bounds[base].box[3])/128,face=placement[key].face.map(v=>v*104/128);face[1]+=shift;
  const d=exp.sweatFor(base,104,104,shift),dw=10.4,dh=15.6;
  const art=[d.left,104-d.right-dw].map(left=>`<g transform="translate(${left} ${d.top}) rotate(18 ${dw/2} ${dh/2})"><path fill="green" d="${dropPath(dw,dh)}"/></g>`).join('');
  const drop=await sharp(wrap(art)).ensureAlpha().raw().toBuffer(),sweep=new Uint8Array(W*W);
  for(let y=0;y<W;y++)for(let x=0;x<W;x++)if(drop[(y*W+x)*4+3]>16)for(let dy=0;dy<=Math.round(d.travel*2)&&y+dy<W;dy++)sweep[(y+dy)*W+x]=1;
  for(const name of names){
   const raw=exp.accentFor(base,name).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1],data=await sharp(wrap(`<style>${css}</style><g class="pet-expression-accent">${raw}</g>`)).ensureAlpha().raw().toBuffer();
   let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,overlap=0;
   for(let y=0;y<W;y++)for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]>16){x0=Math.min(x0,x/2-50);y0=Math.min(y0,y/2-50);x1=Math.max(x1,(x+1)/2-50);y1=Math.max(y1,(y+1)/2-50);if(sweep[y*W+x])overlap++;}
   if(!Number.isFinite(x0))results.geometry.empty.push({key,name});
   if(x0<0||y0<0||x1>104||y1>104)results.geometry.outside.push({key,name,box:[x0,y0,x1,y1]});
   const dx=(x0+x1)/2-face[0],dy=(y0+y1)/2-face[1];
   if(dy>=0||(name==='strained'?dx>=0:name==='wantsPlay'?Math.abs(dx)>1:dx<=0))results.geometry.direction.push({key,name,dx,dy});results.geometry.checked++;
   if(!simultaneous.has(name))continue;
   results.sweat.checked++;
   const rw=dw*Math.cos(Math.PI/10)+dh*Math.sin(Math.PI/10),rh=dh*Math.cos(Math.PI/10)+dw*Math.sin(Math.PI/10);let candidate=false;
   for(const left of [d.left,104-d.right-dw]){const a=left+(dw-rw)/2,c=left+(dw+rw)/2,b=d.top+(dh-rh)/2,f=d.top+(dh+rh)/2+d.travel;for(let y=Math.max(0,Math.floor((b+50)*2));y<Math.min(W,Math.ceil((f+50)*2));y++)for(let x=Math.max(0,Math.floor((a+50)*2));x<Math.min(W,Math.ceil((c+50)*2));x++)if(data[(y*W+x)*4+3]>16)candidate=true;}
   if(candidate)results.sweat.envelopeCandidates++;
   if(overlap){results.sweat.hits.push({key,state:name,sweptOverlapPixels:overlap});results.sweat.counts[name]=(results.sweat.counts[name]||0)+1;}
  }
 }
 results.geometry.outsideCount=results.geometry.outside.length;results.sweat.hitCount=results.sweat.hits.length;
 results.sweatSizes={104:{checked:results.sweat.checked,hitCount:results.sweat.hitCount,counts:results.sweat.counts,hits:results.sweat.hits}};
 for(const size of [64,80]){
  const result={checked:0,hitCount:0,counts:{},hits:[],method:'2x raster CSS-shape reconstruction;0.5px translation samples plus exact fractional final displacement; CSS shadow excluded; no browser measurement'};
  for(const {base} of stages){
   const key=base.slice(18,-4),shift=size*(128-bounds[base].box[3])/128,d=exp.sweatFor(base,size,size,shift),dw=Math.max(6,Math.min(11,size*.1)),dh=Math.max(9,Math.min(16,size*.15));
   const dropArt=dy=>[d.left,size-d.right-dw].map(left=>`<g transform="translate(${left} ${d.top+dy}) rotate(18 ${dw/2} ${dh/2})"><path fill="green" d="${dropPath(dw,dh)}"/></g>`).join('');
   const first=await sharp(wrap(dropArt(0))).ensureAlpha().raw().toBuffer(),last=await sharp(wrap(dropArt(d.travel))).ensureAlpha().raw().toBuffer(),sweep=new Uint8Array(W*W);
   for(let y=0;y<W;y++)for(let x=0;x<W;x++){if(first[(y*W+x)*4+3]>16)for(let dy=0;dy<=Math.floor(d.travel*2)&&y+dy<W;dy++)sweep[(y+dy)*W+x]=1;if(last[(y*W+x)*4+3]>16)sweep[y*W+x]=1;}
   for(const name of simultaneous){
    const raw=exp.accentFor(base,name).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1],data=await sharp(wrap(`<style>${css}</style><g transform="scale(${size/104})" class="pet-expression-accent">${raw}</g>`)).ensureAlpha().raw().toBuffer();let overlap=0;
    for(let j=0;j<sweep.length;j++)if(sweep[j]&&data[j*4+3]>16)overlap++;result.checked++;
    if(overlap){result.hits.push({key,state:name,sweptOverlapPixels:overlap});result.counts[name]=(result.counts[name]||0)+1;}
   }
  }
  result.hitCount=result.hits.length;results.sweatSizes[size]=result;
 }
 console.log(JSON.stringify(results,null,2));if(errors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
