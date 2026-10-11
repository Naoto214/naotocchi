// QA-only variants. Never imported by production runtime or spec registry.
const definitions={
 A:{label:'Natural mash / subtle flow',count:17,flow:.025,radius:.031,taper:.63,edge:.132,jitter:.008},
 B:{label:'Loose 7:3 flow / no open part',count:18,flow:.060,radius:.029,taper:.60,edge:.138,jitter:.011},
 C:{label:'Soft mash-wolf / fine uneven tips',count:21,flow:.038,radius:.026,taper:.66,edge:.128,jitter:.018}
};
function create(){const base=require('../../character-3d/nonplayer-spec.js')()['author:naoto'],out={};for(const [id,d]of Object.entries(definitions)){const row=structuredClone(base),h=row.spec.hair;h.closedVolumes=h.closedVolumes.slice(0,2);const rear=h.closedPaths.slice(-3);h.closedPaths=[];for(let i=0;i<d.count;i++){const u=2*i/(d.count-1)-1,x=.245*u,edge=Math.abs(u),rootX=Math.max(-.255,Math.min(.255,x+d.flow)),z=.270*Math.sqrt(1-(x/.315)**2),tipY=d.edge-.083*edge+d.jitter*Math.sin(i*2.37);h.closedPaths.push({path:[[rootX,.305-.078*edge,.012],[x+d.flow*.65,.260-.070*edge,z*.61],[x+d.flow*.28,.190-.055*edge,z],[x,tipY,z-.005]],radius:d.radius*(1+.07*Math.sin(i*1.7)),taper:d.taper,outwardCaps:true,steps:18,radial:8});}h.closedPaths.push(...rear);out[id]=row;}return out;}
module.exports={create,definitions};
