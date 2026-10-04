// QA only. Explicit composition shared by setup and evidence assertion.
function performanceMix(args){
 if(args.includes('--human-mix'))return {name:'human-family QA stand-ins',player:{line:'woman',stageIndex:7},standIns:['man:2','man:6','woman:2','woman:4','ren:3','ren:5','ren:8']};
 if(args.includes('--puff-stress'))return {name:'puff stress QA stand-ins',player:{line:'dandelion',stageIndex:7},standIns:['dandelion:8']};
 if(args.includes('--fish-mix'))return {name:'fish-family QA stand-ins',player:{line:'salmon',stageIndex:5},standIns:['salmon:1','salmon:3','salmon:7','clownfish:5']};
 return {name:'fixed Pilot QA stand-ins',player:{line:'dog',stageIndex:3},standIns:['dog:4','penguin:8','clownfish:4','man:4','butterfly:8','dandelion:6','mushroom:8','starfish:4']};
}
function expectedTemplates(mix,count,spec,companions){
 const out={},add=k=>out[k]=(out[k]||0)+1;let i=0;
 add(mix.player.line+':'+(mix.player.stageIndex+1));
 for(const id of companions.slice(0,count-1)){
  const key=spec.specKeyFor({kind:'companion',id});add(key?key.id+':'+key.stage:mix.standIns[i++%mix.standIns.length]);
 }
 return out;
}
function matchesComposition(actual,expected){return JSON.stringify(Object.entries(actual||{}).sort())===JSON.stringify(Object.entries(expected).sort());}
module.exports={performanceMix,expectedTemplates,matchesComposition};
