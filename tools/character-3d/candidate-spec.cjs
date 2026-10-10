// HTTP/Node QA overlay only. Never written into production spec or save.
const fs=require('fs'),path=require('path'),vm=require('vm'),{createRequire}=require('module');
const specPath=path.resolve(__dirname,'../../character-3d/spec.js');
function humanCandidateSource(source,createCandidates=require('../../character-3d/humanoid-spec.js')){
 const boundary='const api = factory(rollout);';
 if(source.split(boundary).length!==2)throw Error('Candidate QA spec boundary changed');
 const factory=createCandidates.toString();
 return source.replace(boundary,`const api = factory(pilot => ({...rollout(pilot),...(${factory})(pilot)}));`);
}
function loadHumanCandidates(createCandidates){
 const context={module:{exports:{}},require:createRequire(specPath)};
 vm.runInNewContext(humanCandidateSource(fs.readFileSync(specPath,'utf8'),createCandidates),context);
 return context.module.exports;
}
function nonPlayerCandidateSource(source,createCandidates){
 const boundary='const api = factory(rollout);';
 if(source.split(boundary).length!==2)throw Error('Candidate QA spec boundary changed');
 return source.replace(boundary,`const api = factory(rollout,(${createCandidates.toString()})());`);
}
function loadNonPlayerCandidates(createCandidates){
 const context={module:{exports:{}},require:createRequire(specPath)};
 vm.runInNewContext(nonPlayerCandidateSource(fs.readFileSync(specPath,'utf8'),createCandidates),context);
 return context.module.exports;
}
function candidateConfig(args){
 const kinds=['human','topology','aquatic','armored','botanical','mythic'].filter(k=>args.includes('--candidate-'+k));
 if(!kinds.length)return null;
 if(kinds.length!==1)throw Error('Choose one candidate wave');
 const kind=kinds[0],factory=require('../../character-3d/'+(kind==='human'?'humanoid':kind)+'-spec.js');
 const line=args[args.indexOf('--line')+1],rows=factory(require('../../character-3d/spec.js').PILOT);
 if(!args.includes('--rollout')||!args.includes('--species-only')||!args.includes('--line')||!rows[line])throw Error('Candidate QA requires --rollout --species-only --line with an exact candidate family');
 return {kind,factory,spec:loadHumanCandidates(factory)};
}
module.exports={humanCandidateSource,loadHumanCandidates,nonPlayerCandidateSource,loadNonPlayerCandidates,candidateConfig};
