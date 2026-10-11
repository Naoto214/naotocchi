// QA-only variants. Never imported by production runtime or spec registry.
const definitions={
 A:{label:'Natural mash / soft overlapping fringe',count:11,flow:.045,radius:.054,taper:.40,edge:.133,jitter:.016},
 B:{label:'Loose 7:3 flow / no open part',count:10,flow:.095,radius:.057,taper:.42,edge:.148,jitter:.021},
 C:{label:'Soft mash-wolf / irregular layered fringe',count:13,flow:.070,radius:.049,taper:.46,edge:.124,jitter:.028}
};
function create(){
 const base=require('../../character-3d/nonplayer-spec.js')()['author:naoto'],out={};
 for(const [id,d]of Object.entries(definitions)){
  const row=structuredClone(base),h=row.spec.hair;
  h.closedVolumes=h.closedVolumes.slice(0,2);
  const rear=h.closedPaths.slice(-3);h.closedPaths=[];
  for(let i=0;i<d.count;i++){
   const u=2*i/(d.count-1)-1;
   const x=.235*u+.008*Math.sin(i*2.1),edge=Math.abs(u);
   const rootX=Math.max(-.25,Math.min(.25,x+d.flow));
   const z=.260*Math.sqrt(1-(x/.32)**2);
   const tipY=d.edge-.070*edge+d.jitter*Math.sin(i*2.37+.6);
   // Intersecting, varied-width locks: the ends overlap instead of forming a comb.
   // Distributed roots and one-way curves avoid a central apex or exposed part.
   h.closedPaths.push({path:[
    [rootX,.280-.064*edge+.010*Math.sin(i*1.3),-.005],
    [x+d.flow*.72,.250-.055*edge,z*.58],
    [x+d.flow*.36,.195-.048*edge,z-.008],
    [x,tipY,z-.018]
   ],radius:d.radius*(1+.13*Math.sin(i*1.7)),taper:d.taper,outwardCaps:true,steps:18,radial:10});
  }
  h.closedPaths.push(...rear);out[id]=row;
 }
 return out;
}
module.exports={create,definitions};
