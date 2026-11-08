// Emit into the private preview AFTER Pages packaging. No fixture, save data,
// inspector or configuration UI is loaded by the production entry point.
const fs=require('node:fs'),path=require('node:path'),out=path.resolve(process.argv[2]);
fs.mkdirSync(out,{recursive:true});
const read=name=>fs.readFileSync(name,'utf8'),write=(name,data)=>fs.writeFileSync(path.join(out,name),data);
function once(s,pattern,replacement){
 const next=s.replace(pattern,replacement);if(next===s)throw Error('Missing private fixture insertion: '+pattern);return next;
}
const memory=`<script>
for(const name of ['localStorage','sessionStorage']){
 const data=new Map();Object.defineProperty(window,name,{value:{get length(){return data.size},key:i=>[...data.keys()][i]??null,
 getItem:k=>data.get(String(k))??null,setItem:(k,v)=>data.set(String(k),String(v)),removeItem:k=>data.delete(String(k)),clear:()=>data.clear()}});
}
</script>`;
const init=`<script>
const castQ=new URLSearchParams(location.search),choice=(key,values,fallback)=>values.includes(castQ.get(key))?castQ.get(key):fallback;
document.body.dataset.homePopulationProfile=choice('profile',['current','v18','v1'],'v1');
document.body.dataset.castGuide=castQ.get('marker')==='1'?'on':'off';
document.body.dataset.homeHeroPercent=choice('hero',['100','105','110','115','120'],'110');
window.privateCastCount=Number(choice('count',['1','2','5','10','18','28'],'5'));
</script>`;
const fixture=`
const castMaster=window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
window.HomeCastSizeQA={
 set({count,hero,profile,marker}={}){
  count=[1,2,5,10,18,28].includes(count)?count:window.privateCastCount;
  if([100,105,110,115,120].includes(hero))document.body.dataset.homeHeroPercent=hero;
  if(['current','v18','v1'].includes(profile))document.body.dataset.homePopulationProfile=profile;
  if(typeof marker==='boolean')document.body.dataset.castGuide=marker?'on':'off';
  window.privateCastCount=count;
  clearConversationTimers();message='';speechActive=false;conversationBusyUntil=0;petBusyUntil=0;castMotion.clear();
  el.storyFlash.classList.add('hidden');el.lifeCardOverlay.classList.add('hidden');
  Object.assign(state,{stage:STAGE.GROWING,speciesLine:'dog',stageIndex:3,ageTicks:25*AGE_TICKS_PER_YEAR,regionId:'home',hunger:95,happiness:95,energy:95,health:100,isSleeping:false,isSick:false});
  Object.assign(state.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'summer'});
  const members=[...castMaster.companions.normal,...castMaster.companions.rare];
  state.companions=members.slice(0,Math.max(0,count-2)).map(c=>({id:c.id,bond:85}));
  const bear=castMaster.partners.find(p=>p.id==='forest_bear');
  state.partner=count>1?{...bear,gender:'male',orientationId:'bi',affection:80,married:false,bondCount:3}:null;
  homeCastLayoutKey='';render();homeDiorama.sync();window.dispatchEvent(new Event('resize'));
 },
 detail(){
  const model=homeDiorama.model,scene=homeDiorama.inspectScene(),nav=scene?.navigation,p=window.NaotocchiHomeViewport?.residentPresentation();
  const images=dioramaActors().map(a=>{
    const el=a.owner.querySelector('.character-asset'),r=el?.getBoundingClientRect(),b=window.NaotocchiCastBounds[a.asset]?.box||[0,0,128,128],f=Number(a.owner.style.getPropertyValue('--diorama-facing'))||1;
    const ink=r?{left:r.left+r.width*(f===-1?128-b[2]:b[0])/128,right:r.left+r.width*(f===-1?128-b[0]:b[2])/128,top:r.top+r.height*b[1]/128,bottom:r.top+r.height*b[3]/128}:null;
    return {key:a.key,asset:a.asset,ready:!!el?.complete&&el.naturalWidth>0,ink};
  });
  return {slots:{castStage:el.castStage.getBoundingClientRect().toJSON()},blocked:homeDioramaBlocked(),scope:window.privateCastCount,hero:document.body.dataset.homeHeroPercent,profile:document.body.dataset.homePopulationProfile,selected:model.selected(),presentation:p,metrics:model.metrics(),actors:model.snapshot().map(a=>({key:a.key,kind:a.kind,x:a.x,y:a.y,w:a.w,h:a.h,depth:nav?.depthScale(a),grounded:!!nav?.valid(a),bounds:model.bounds(a),...images.find(i=>i.key===a.key)}))};
 },
 rehearseAge(){
  if(individualityDialogOpen)return true;
  el.storyFlash.classList.add('hidden');
  state.individuality??=INDIVIDUALITY.create(state.speciesLine,REGIONS.map(r=>r.id),()=>.5,'qa-dog');
  state.individuality.events[3]={status:'pending'};
  return showIndividualityEvent(true);
 },
 inspect(){return {scene:homeDiorama.inspectScene(),bounds:homeDiorama.model.snapshot().map(a=>homeDiorama.model.bounds(a))};},
 move(){return (${require('./home-v8-qa-movement.cjs').toString()})(homeDiorama.model,homeDiorama.inspectScene().navigation);}
};
HomeCastSizeQA.set();
})();`;
let script=once(read('script.js'),/\}\)\(\);\s*$/,()=>fixture);
script=once(script,'setInterval(loop, TICK_MS);','/* QA: freeze game ticks; presentation motion and input remain live. */');
write('qa-cast-script.js',script);
const diorama=once(read('home-production-diorama.js'),'return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,');
write('qa-cast-diorama.js',once(diorama,'row.shadow.style.left=a.x+', "row.shadow.dataset.qaRole=a.kind;row.shadow.style.left=a.x+"));
let html=once(read('index.html'),'<script>',memory+'<script>');
html=once(html,'</head>','<style>body[data-cast-guide="on"] .diorama-shadow[data-qa-role="pet"]{outline:1.5px solid #ffdfa2;background:#bb88364d;box-shadow:0 0 0 1px #795c38a3}</style></head>');
html=once(html,/<script src="script\.js[^"]*"><\/script>/,init+'<script src="qa-cast-script.js"></script>');
write('qa-cast.html',once(html,/src="home-production-diorama\.js[^"]*"/,'src="qa-cast-diorama.js"'));
fs.copyFileSync('tools/home-cast-size-panel.html',path.join(out,'qa-cast-panel.html'));
