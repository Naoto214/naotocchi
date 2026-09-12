// Exhaustive painted-asset audit for balanced wings, dialogue and the poop row.
// Run from the repository root: node tests/home-floor-audit.cjs [report.json]
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {layoutHomeCast}=require('../cast-layout.js');
const bounds=require('../cast-bounds.js');
const master=new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
const assets=Object.keys(bounds).filter(a=>/characters\/[^/]+\/\d\d\.png$/.test(a));
const partners=master.partners.map(p=>p.asset);
const friends=[...master.companions.normal,...master.companions.rare].map(c=>c.asset);
const body=(f,asset)=>{
  const b=bounds[asset]?.box || [0,0,128,128];
  return {x:f.x+f.w*b[0]/128,y:f.y+(f.artOffsetY||0)+f.h*b[1]/128,
    w:f.w*(b[2]-b[0])/128,h:f.h*(b[3]-b[1])/128};
};
const separate=(a,b,g=0)=>a.x+a.w+g<=b.x+.01 || b.x+b.w+g<=a.x+.01 || a.y+a.h+g<=b.y+.01 || b.y+b.h+g<=a.y+.01;
const report={assets:assets.length,partners:partners.length,scenarios:0,failures:[],
  gap:[Infinity,-Infinity],centerError:0,mainCenterError:0,wingGapError:0,minRightMargin:Infinity,maxPoopDistanceFromBody:0,minMainFrame:Infinity,minFriendFrame:Infinity,
  poopSize:[Infinity,-Infinity],maxPileWidth:0,maxPileHeight:0,maxPoopAnchorDistanceFromBody:0,fixedAnchorError:0};
function check(args) {
  const r=layoutHomeCast(args),main=body(r.main,args.mainAsset),cx=main.x+main.w/2,bottom=main.y+main.h;
  const gap=r.conversation.y-bottom,centerError=Math.abs(r.conversation.x+r.conversation.w/2-cx);
  const actors=[main,...(r.partner?[body(r.partner,args.partnerAsset)]:[]),...(r.accessory?[r.accessory]:[]),...r.hearts,...r.companionBodies];
  const floor=[r.conversation,...r.poops];
  report.scenarios++;
  report.gap=[Math.min(report.gap[0],gap),Math.max(report.gap[1],gap)];
  report.centerError=Math.max(report.centerError,centerError);
  report.minMainFrame=Math.min(report.minMainFrame,r.main.w);
  if(args.companions.length) report.minFriendFrame=Math.min(report.minFriendFrame,r.size);
  const errors=[];
  report.mainCenterError=Math.max(report.mainCenterError,Math.abs(cx-args.width/2));
  if(Math.abs(cx-args.width/2)>.01)errors.push('main is off center');
  for(let i=0;i+1<r.companionBodies.length;i+=2) {
    const a=r.companionBodies[i],b=r.companionBodies[i+1];
    const error=Math.abs((main.x-a.x-a.w)-(b.x-main.x-main.w));
    report.wingGapError=Math.max(report.wingGapError,error);
    if(error>.01 || Math.abs(a.y+a.h/2-b.y-b.h/2)>.01)errors.push('unbalanced painted wings');
  }
  if(r.height>args.height+.01) errors.push('stage height');
  if(centerError>.01 || gap<r.poops[0].h+5.99 || gap>30.01) errors.push('conversation axis/floor strip');
  for(const f of floor) {
    if(f.x<0 || f.x+f.w>args.width+.01 || f.y+f.h>r.height+.01) errors.push('floor bounds');
    if(actors.some(a=>!separate(a,f,args.motionRadius))) errors.push('actor/floor collision');
  }
  for(let i=0;i<floor.length;i++) for(let j=0;j<i;j++) if(!separate(floor[i],floor[j],2)) errors.push('floor collision');
  for(const p of r.poops) {
    const margin=args.width-p.x-p.w,distance=Math.hypot(p.x+p.w/2-main.x-main.w,p.y+p.h/2-bottom);
    report.minRightMargin=Math.min(report.minRightMargin,margin);
    report.maxPoopDistanceFromBody=Math.max(report.maxPoopDistanceFromBody,distance);
    report.poopSize=[Math.min(report.poopSize[0],p.w,p.h),Math.max(report.poopSize[1],p.w,p.h)];
    if(p.w<8 || p.w>24 || p.h!==p.w) errors.push('poop size outside readable range');
    if(p.x<r.pocket.x+5-.01 || p.x+p.w>r.pocket.x+r.pocket.w-5+.01 || p.y<r.pocket.y-.01 || p.y+p.h>r.pocket.y+r.pocket.h+.01) errors.push('poop outside reserved pocket');
    if(p.y+p.h<bottom+4-.01 || margin<12-.01 || p.x<12-.01) errors.push('poop position');
    for(const sway of [-5,5]) for(const lift of [0,-17]) if(actors.some(a=>!separate({...a,x:a.x+sway,y:a.y+lift},p,args.motionRadius+1))) errors.push('sway/reaction/pocket collision');
  }
  const pileWidth=Math.max(...r.poops.map(p=>p.x+p.w))-Math.min(...r.poops.map(p=>p.x));
  const pileHeight=Math.max(...r.poops.map(p=>p.y+p.h))-Math.min(...r.poops.map(p=>p.y));
  report.maxPileWidth=Math.max(report.maxPileWidth,pileWidth);report.maxPileHeight=Math.max(report.maxPileHeight,pileHeight);
  const first=r.poops[0],last=r.poops[3],dx=Math.max(main.x-last.x-last.w,first.x-main.x-main.w,0);
  const anchorError=Math.max(Math.abs(first.x-args.width/2-12),Math.abs(first.y+first.h-r.conversation.y+2),
    Math.abs(r.conversation.y-args.height+args.conversationHeight+10));
  report.fixedAnchorError=Math.max(report.fixedAnchorError,anchorError);
  if(anchorError>.01) errors.push('poop or speech moved from its fixed anchor');
  const anchorDistance=Math.hypot(dx,Math.max(0,first.y-bottom));
  report.maxPoopAnchorDistanceFromBody=Math.max(report.maxPoopAnchorDistanceFromBody,anchorDistance);
  if(anchorDistance>72) errors.push('poop row detached from main');
  if(pileWidth>102.01 || pileHeight>24.01) errors.push('row spread');
  r.poops.forEach((p,i)=>{
    if(p.y!==first.y || (i && Math.abs(p.x-r.poops[i-1].x-r.poops[i-1].w-2)>.01)) errors.push('not one compact horizontal row');
  });
  if(errors.length) report.failures.push({args,errors:[...new Set(errors)]});
}
// Every published species/stage, sparse and crowded, minimum and normal sizes.
for(const mainAsset of [...assets,null]) for(const [width,height] of [[270,152],[302,152],[358,260],[500,260]]) {
  for(const count of [0,1,2,3,6,17,18,25,26,32]) for(const equipped of [false,true]) check({width,height,mainAsset,
    hasPartner:equipped,partnerAsset:partners[0],hasAccessory:equipped,
    companions:Array.from({length:count},(_,i)=>friends[i%friends.length]),motionRadius:count>18?1:3,conversationHeight:44});
}
// Every partner and main shape shares the same fixed floor strip. Taller
// phones also exercise growth beyond 1x and the largest reserved poop row.
for(const mainAsset of [...assets,null]) for(const partnerAsset of [...partners,null]) for(const height of [240,260,340]) check({width:358,height,
  mainAsset,partnerAsset,hasPartner:true,hasAccessory:true,
  companions:[],motionRadius:3,conversationHeight:44});
// Every main/partner combination including failed/unknown PNGs at the minimum.
for(const mainAsset of [...assets,null]) for(const partnerAsset of [...partners,null]) check({width:270,height:152,
  mainAsset,hasPartner:true,partnerAsset,hasAccessory:true,companions:friends,motionRadius:1,conversationHeight:44});
// Losing every (or alternate) companion PNG must keep all 26 fallback frames
// inside the same fixed home. Missing images cannot create a taller scene.
for(const mainAsset of [...assets,null]) for(const partnerAsset of [...partners,null]) for(const partial of [false,true]) check({width:270,height:152,
  mainAsset,hasPartner:true,partnerAsset,hasAccessory:true,
  companions:friends.map((a,i)=>partial && i%2?a:null),motionRadius:1,conversationHeight:44});
if(process.argv[2]) fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,failures:report.failures.slice(0,5),failureCount:report.failures.length},null,2));
assert.equal(report.failures.length,0,'home floor audit failures');
