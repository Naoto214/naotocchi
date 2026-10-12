// QA-only geometry options. Never imported by production runtime/spec registry.
// D/E replace the Human-rejected A/B/C; the original captures remain immutable.
const definitions={
 D:{label:'Viewer-right 7:3 part / full sweep to viewer-left',mirror:1,partX:.105},
 E:{label:'Viewer-left 7:3 part / full sweep to viewer-right',mirror:-1,partX:-.105}
};
function create(){
 const base=require('../../character-3d/nonplayer-spec.js')()['author:naoto'],out={};
 // Unequal groups originate on opposite sides of an actual skin-visible opening.
 // The long group travels sideways AND down, rather than projecting up/back.
 const locks=[
  {path:[[.065,.250,.100],[.055,.215,.208],[.034,.180,.250],[-.005,.133,.250]],radius:.063,taper:.65},
  {path:[[.038,.268,.075],[-.020,.239,.185],[-.030,.175,.256],[-.025,.098,.251]],radius:.061,taper:.57},
  {path:[[.020,.281,.045],[-.063,.239,.180],[-.106,.160,.238],[-.078,.087,.243]],radius:.064,taper:.61},
  {path:[[.005,.289,.010],[-.100,.237,.164],[-.159,.151,.211],[-.139,.072,.221]],radius:.063,taper:.62},
  {path:[[-.020,.287,-.015],[-.135,.237,.130],[-.205,.136,.178],[-.192,.060,.185]],radius:.060,taper:.58},
  {path:[[-.052,.275,-.040],[-.174,.215,.087],[-.238,.108,.129],[-.242,.036,.120]],radius:.054,taper:.60},
  {path:[[-.083,.260,-.060],[-.212,.183,.040],[-.267,.091,.070],[-.271,.022,.055]],radius:.047,taper:.56},
  {path:[[.163,.229,.099],[.163,.208,.181],[.187,.163,.223],[.211,.112,.215]],radius:.047,taper:.60},
  {path:[[.174,.254,.047],[.216,.200,.157],[.243,.129,.179],[.232,.065,.176]],radius:.048,taper:.56},
  {path:[[.183,.250,-.018],[.247,.177,.087],[.275,.098,.109],[.268,.032,.092]],radius:.047,taper:.54}
 ];
 for(const [id,d]of Object.entries(definitions)){
  const row=structuredClone(base),h=row.spec.hair,rear=h.closedPaths.slice(-3);
  h.closedVolumes=h.closedVolumes.slice(0,2);
  h.closedPaths=locks.map(p=>({...p,path:p.path.map(([x,y,z])=>[x*d.mirror,y,z]),outwardCaps:true,steps:18,radial:10}));
  h.closedPaths.push(...rear);out[id]=row;
 }
 return out;
}
module.exports={create,definitions};
function createSideRepair(){
 const E=create().E,F=structuredClone(E),h=F.spec.hair;
 const layers=[
  {path:[[.230,.185,.082],[.286,.130,.031],[.300,.076,-.023],[.280,.035,-.075]],radius:.056,taper:.48},
  {path:[[.223,.205,-.022],[.293,.127,-.075],[.292,.045,-.130],[.255,-.045,-.178]],radius:.064,taper:.52},
  {path:[[.200,.195,-.108],[.273,.097,-.157],[.270,.005,-.199],[.231,-.115,-.225]],radius:.059,taper:.58}
 ];
 const sides=[-1,1].flatMap(side=>layers.map(p=>({...p,path:p.path.map(([x,y,z])=>[x*side,y,z]),outwardCaps:true,steps:18,radial:10})));
 h.closedPaths.splice(10,0,...sides);return {E,F};
}
module.exports.createSideRepair=createSideRepair;
