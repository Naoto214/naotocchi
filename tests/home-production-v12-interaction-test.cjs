const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Execute the production gate with controlled UI inputs. Controller input and
// walking both consume this same gate; model/navigation are not substituted.
const source=fs.readFileSync('script.js','utf8');
const gate=source.slice(source.indexOf('  function homeDioramaBlocked()'),source.indexOf("  window.addEventListener('home-v6-egg-ready'"));
function setup(version='12'){
 const nodes={};const hidden=id=>nodes[id]??=( {classList:{contains:()=>id!=='screenNormal'},dataset:{}} );
 const s={birthCelebration:null,gameActive:false,meguruActive:false,document:{visibilityState:'visible',body:{dataset:{homeProduction:'true',homeViewportVersion:version},classList:{contains:()=>false}}},isAnyMenuOverlayOpen:()=>false,state:{},speechActive:false,conversationIsBusy:()=>false,el:new Proxy({},{get:(_,id)=>hidden(id)}),homeCastActors:()=>[],conv2Unit:null,individualityDialogOpen:false,homeV11Presentation:()=>({lowerUntil:0})};
 vm.createContext(s);vm.runInContext(gate,s);return s;
}
test('V12 ordinary speech and story notices do not freeze walking or pointer input',()=>{
 const s=setup();assert.equal(s.homeDioramaBlocked(),false);
 s.speechActive=true;assert.equal(s.homeDioramaBlocked(),false);
 s.conversationIsBusy=()=>true;s.conv2Unit={kind:'banter'};assert.equal(s.homeDioramaBlocked(),false);
 s.el.storyFlash.classList.contains=()=>false;assert.equal(s.homeDioramaBlocked(),false);
});
test('V12 still blocks questions, important speech, life choices and special presentations',()=>{
 for(const apply of [s=>s.conv2Unit={kind:'question',awaiting:true},s=>s.homeV11Presentation=()=>({lowerUntil:Date.now()+5000}),s=>s.individualityDialogOpen=true,s=>s.birthCelebration={},s=>s.state.transformOptions=['cat'],s=>s.document.visibilityState='hidden',s=>s.gameActive=true,s=>s.state.isSleeping=true,s=>s.el.castResponse.dataset.reaction='jump']){
  const s=setup();apply(s);assert.equal(s.homeDioramaBlocked(),true);
 }
});
test('ordinary idle speech moods keep input open, while care reactions retain their lock',()=>{
 const {reactionFor}=require('../cast-motion.js');
 for(const text of ['うれしい','ゆっくり','照れ','くすぐったい']){
  const s=setup(),mood=reactionFor('idle',text,'pet');
  s.speechActive=true;s.el.speechBubble.dataset.reactionEvent='idle';
  s.homeCastActors=()=>[{node:{dataset:{reaction:mood}}}];
  assert.equal(s.homeDioramaBlocked(),false,text);
  s.el.speechBubble.dataset.reactionEvent='play_with';
  assert.equal(s.homeDioramaBlocked(),true,text+' care');
 }
});
test('V11 and non-production homes retain the previous speech lock',()=>{
 const s=setup('11');s.speechActive=true;assert.equal(s.homeDioramaBlocked(),true);
 const p=setup();p.document.body.dataset.homeProduction='false';p.speechActive=true;assert.equal(p.homeDioramaBlocked(),true);
});
