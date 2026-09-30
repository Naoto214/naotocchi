const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');process.chdir(root);
const {harness}=require(root+'/tests/helpers/runtime-harness.cjs');
const expression=require(root+'/pet-expression.js');
const names=require(root+'/tools/expression-stage-names.json');
const ages=[1,3,7,12,16,25,40,70], rows=[];
const fresh=harness().api.freshState();
for(const [line,labels] of Object.entries(names))for(let i=0;i<8;i++){
 const state=Object.assign(JSON.parse(JSON.stringify(fresh)),{stage:'growing',speciesLine:line,stageIndex:i,ageTicks:ages[i]*20,hunger:40,happiness:80,energy:80,health:80,deathMeter:0,dying:false,isSick:false,isSleeping:false,transformOptions:null,companions:[],partner:null,achievementsUnlocked:['age-10','age-25','age-50','rare-line-1']});
 const data=new Map([['naotocchi-save-v1',JSON.stringify(state)]]);
 const h=harness({resume:true,storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}});
 for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');h.api.render();
 const s=h.api.state(),base=`assets/characters/${line}/${String(i+1).padStart(2,'0')}.png`,html=h.get('petSprite').innerHTML;
 assert.equal(s.schemaVersion,5);assert.equal(s.speciesLine,line);assert.equal(h.api.currentFormStageIndex(),i);assert.equal(s.ageTicks,state.ageTicks);
 assert.equal(h.api.currentStageLabel(),labels[i].replace(/（[男女]）/g,''));
 assert.equal(h.get('petSprite').dataset.expression,'hungry');assert(html.includes(expression.assetFor(base,'hungry')));
 assert(expression.hungerCategoryFor(base));assert(html.includes('pet-expression-accent--hungry'));
 rows.push({line,stage:i+1,schema:5,name:h.api.currentStageLabel(),expression:'hungry',asset:expression.assetFor(base,'hungry'),hunger:expression.hungerCategoryFor(base)});
}
assert.equal(rows.length,248);fs.writeFileSync(__dirname+'/save-compatibility.json',JSON.stringify({scope:'existing runtime harness; generated schema5 fixtures, not user private saves; legacy schema migrations covered by formal migration-test',pass:rows.length,rows},null,2)+'\n');console.log('schema5 load/name/stage/expression/hunger: 248 PASS');
