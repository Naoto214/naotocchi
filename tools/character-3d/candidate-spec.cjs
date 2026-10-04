// HTTP/Node QA overlay only. Never written into production spec or save.
const fs=require('fs'),path=require('path'),vm=require('vm'),{createRequire}=require('module');
const specPath=path.resolve(__dirname,'../../character-3d/spec.js');
function humanCandidateSource(source){
 const boundary='const api = factory(rollout);';
 if(source.split(boundary).length!==2)throw Error('Candidate QA spec boundary changed');
 const factory=require('../../character-3d/humanoid-spec.js').toString();
 return source.replace(boundary,`const api = factory(pilot => ({...rollout(pilot),...(${factory})(pilot)}));`);
}
function loadHumanCandidates(){
 const context={module:{exports:{}},require:createRequire(specPath)};
 vm.runInNewContext(humanCandidateSource(fs.readFileSync(specPath,'utf8')),context);
 return context.module.exports;
}
module.exports={humanCandidateSource,loadHumanCandidates};
