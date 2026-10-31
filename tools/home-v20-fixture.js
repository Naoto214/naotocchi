window.HomeV20QA=HomeV16QA;
Object.assign(HomeV20QA,{
 scene(region,count=6,time='day'){
  this.prepare();state.regionId=region;state.stageIndex=3;state.ageTicks=25*AGE_TICKS_PER_YEAR;
  const m=window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
  state.companions=[...m.companions.normal,...m.companions.rare].slice(0,Math.max(0,count-2)).map(c=>({id:c.id,bond:85}));
  const p=m.partners.find(p=>p.id==='forest_bear');state.partner=count>1?{...p,gender:'male',orientationId:'bi',label:p.name||p.label,affection:80,married:true,bondCount:3}:null;
  Object.assign(state.lifetime,{timeMode:time,weatherMode:'sunny',seasonMode:'summer'});state.isSleeping=false;render();homeDiorama.sync();this.freeze();
 },
 detail(){const s=homeDiorama.inspectScene(),actors=homeDiorama.model.snapshot();return {region:s.region,actors:actors.map(a=>({key:a.key,x:a.x,y:a.y,w:a.w,h:a.h,activity:a.activity,visualReaction:a.visualReaction,ground:s.navigation?.unproject(a),safe:s.navigation?.valid(a),visible:s.visible?.(a,a),scale:s.navigation?.depthScale?.(a)})),visualPoints:s.visualPoints,header:{rect:document.querySelector('.device-header').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.header-button:not(.hidden)')].map(n=>n.getBoundingClientRect().toJSON()),grid:getComputedStyle(el.device).gridTemplateRows},metrics:JSON.parse(el.castStage.dataset.livingMetrics||'{}'),slots:this.inspect().slots};},
 moveTest(){const a=homeDiorama.model.snapshot().find(a=>a.kind==='pet'),b=homeDiorama.model.bounds(a);homeDiorama.model.select(a.key);for(const p of [{x:b.right,y:b.bottom-5},{x:b.left,y:b.bottom-5},{x:a.x+40,y:a.y},{x:a.x-40,y:a.y},{x:a.x,y:a.y+35},{x:a.x,y:a.y-35}])if(homeDiorama.model.move(a.key,p,'ground'))return true;return false;},
 glyphs(){this.sayText('いまのぼく、ちょっとできる子');},
});
