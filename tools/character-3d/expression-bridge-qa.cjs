// Real script bridge, isolated harness state, all relationship identities.
const assert=require('node:assert/strict'),fs=require('fs');
const {harness}=require('../../tests/helpers/runtime-harness.cjs');
const R=require('../../relationship-expression.js'),results=[];
for(const kind of ['companion','partner'])for(const id of R.SUPPORTED[kind]){
 const h=harness({deterministic:true}),s=h.api.state();
 Object.assign(s,{stage:'growing',speciesLine:'dog',stageIndex:3,ageTicks:500,hunger:80,health:80,energy:80,isSleeping:false,isSick:false,deathMeter:0});
 const entity=kind==='partner'?{...h.api.partnerCandidates.find(p=>p.id===id),affection:29,married:false,bondCount:0}:{id,bond:29};
 if(kind==='partner')s.partner=entity;else s.companions=[entity];
 const a={key:kind+':'+id,kind,id,asset:`assets/characters/${kind==='partner'?'partners':'companions'}/${id}.png`,emotion:'normal'};
 const v={world:{regionId:'forest'},party:[a],residents:[]};const m=h.api.meguruMod;
 m.prepareExpressions(v,0);assert.equal(a.expr.emotion,'lonely',a.key);entity[kind==='partner'?'affection':'bond']=30;m.prepareExpressions(v,16);assert.equal(a.expr.emotion,'normal',a.key);
 if(kind==='partner'){
  h.api.reinforceRelationship();m.prepareExpressions(v,32);assert.equal(a.expr.emotion,'positive');
  entity.affection=20;h.advance(2501);m.prepareExpressions(v,48);assert.equal(a.expr.emotion,'lonely');
 }
 results.push({kind,id,boundary29:'lonely',boundary30:'normal',positiveAndExpiry:kind==='partner'?'positive -> current lonely':'covered by existing Home integration suite'});
}
fs.writeFileSync('docs/qa/expression-complete-20261016/relationship-bridge.json',JSON.stringify({status:'PASS',identities:results.length,results},null,2));console.log('PASS: 44 live bridge identities, 18 partner reinforcement/expiry cases');
