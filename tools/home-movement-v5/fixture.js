// This hook lives only in generated comparison scripts, never in production.
window.MovementQA={
 resetUI(){const p=homeV11Presentation();clearTimeout(p.upperTimer);clearTimeout(p.lowerTimer);p.upper=null;p.upperQueue=[];p.lowerQueue=[];p.lowerUntil=0;homeV11ClearUpper();delete document.body.dataset.homeUpper;conv2Abort('qa');clearConversationTimers();hideSpeechBubble();},
 catalog(){const m=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1,heroes=[...m.playerSpecies.normal,...m.playerSpecies.rare,...(m.playerSpecies.secret||[])],companions=[...m.companions.normal,...m.companions.rare];return {heroes:heroes.map(x=>({id:x.id,label:x.label,stages:x.stages})),residents:[{key:'pet:'+state.speciesLine,id:state.speciesLine,kind:'pet',label:'主人公'},...companions.map(x=>({key:'companion:'+x.id,id:x.id,kind:'companion',label:x.label})),{key:'partner:'+(state.partner?.id||'gentle_gorilla'),id:state.partner?.id||'gentle_gorilla',kind:'partner',label:state.partner?.label||'やさしいゴリラ'}],partners:m.partners.map(x=>({id:x.id,label:x.label})),items:SHOP_ITEMS.map(x=>({id:x.id,label:x.label})),achievementItems:NAOTO_ITEMS.map(x=>({id:x.id,label:x.label})),regions:[m.regions.home,...m.regions.normal,...m.regions.special],times:[{id:'morning',label:'朝'},{id:'day',label:'昼'},{id:'evening',label:'夕方'},{id:'night',label:'夜'}]};},
 setup(options={}){
 const {heroId='hermit_crab',stage=5,region='city',speech=false,notice=false,time='night',focusKey='pet:'+heroId,partnerId='gentle_gorilla',naotoItems=[]}=options;
 const itemId=Object.hasOwn(options,'itemId')?options.itemId:(options.item===false?null:'poop1');let count=Math.max(1,Math.min(28,Math.floor(Number(options.count)||4)));
 if(!SPECIES[heroId])throw Error('Unknown comparison species: '+heroId);const stageIndex=Math.max(0,Math.min(7,Math.floor(stage)));
 const m=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1,all=[...m.companions.normal,...m.companions.rare],focusCompanion=focusKey.startsWith('companion:')?focusKey.slice(10):null,focusPartner=focusKey.startsWith('partner:');
 if(focusCompanion&&!all.some(c=>c.id===focusCompanion))throw Error('Unknown comparison companion');
 if(focusCompanion||focusPartner)count=Math.max(2,count);
 this.resetUI();HomeReleaseQA.scene(region,count,time);
 const age=heroId==='hermit_crab'&&stageIndex===5?59:heroId==='hermit_crab'&&stageIndex===6?62:stageMinsForLine(heroId)[stageIndex];
 Object.assign(state,{speciesLine:heroId,stageIndex,ageTicks:age*AGE_TICKS_PER_YEAR,growth:100,poopCount:0,infinite:false,infiniteForm:null});
 if(state.itemLife)delete state.itemLife.temporaryForm;
 state.lifetime.equippedItemId=SHOP_ITEMS.some(i=>i.id===itemId)?itemId:null;state.lifetime.ownedNaotoItems=naotoItems.filter(id=>NAOTO_ITEMS.some(i=>i.id===id));
 const includePartner=count>2||focusPartner,partner=m.partners.find(p=>p.id===(focusPartner?focusKey.slice(8):partnerId))||m.partners.find(p=>p.id==='gentle_gorilla');
 state.partner=includePartner?{...partner,gender:'male',orientationId:'bi',label:partner.label,affection:80,married:true,bondCount:3}:null;
 const priority=[focusCompanion,...(count<=4?['panda','seal']:[])].filter(Boolean),ordered=[...new Set([...priority,...all.map(c=>c.id)])];
 state.companions=ordered.slice(0,count-1-Number(includePartner)).map(id=>({id,bond:85}));
 homeCastLayoutKey='';render();homeDiorama.sync();homeDiorama.dismissGuide();
 if(speech)setSpeechBubble('片づけた場所を忘れた',petSpeaker(),{holdMs:3600000});if(notice)showMessage('さっぱりした！',3600000,null);
 this.focus(focusKey.startsWith('pet:')?'pet:'+heroId:focusKey);return this.detail();
 },
 focus(key){const a=homeDiorama.model.snapshot().find(a=>a.key===key);if(!a)return false;homeDiorama.model.select(key);homeDiorama.paintFrame();return true;},
 setUI({speech=false,notice=false}={}){this.resetUI();if(speech)setSpeechBubble('片づけた場所を忘れた',petSpeaker(),{holdMs:3600000});if(notice)showMessage('さっぱりした！',3600000,null);},
 changeEquipment(itemId,naotoItems=[]){state.lifetime.equippedItemId=SHOP_ITEMS.some(i=>i.id===itemId)?itemId:null;state.lifetime.ownedNaotoItems=naotoItems.filter(id=>NAOTO_ITEMS.some(i=>i.id===id));homeCastLayoutKey='';render();homeDiorama.sync();return this.detail();},
 changeItemNow(item){state.lifetime.equippedItemId=item?'poop1':null;homeCastLayoutKey='';render();homeDiorama.sync();},
 model:()=>homeDiorama.model,
 pause(value=true){homeDiorama.model.cancel();window.__movementPaused=value;},
 step(seconds){for(let i=0;i<seconds*20;i++)homeDiorama.model.step(.05,{autonomy:false});homeDiorama.paintFrame();window.MovementV5Draw?.();},
 inkRects(){return homeDiorama.inspectRows().flatMap(row=>[...[...row.owner.querySelectorAll('img.character-asset'),...(row.attachments||[]).flatMap(n=>[...n.querySelectorAll('img')])].map(n=>{
   const rect=n.getBoundingClientRect(),css=getComputedStyle(n),w=parseFloat(css.width),h=parseFloat(css.height),src=n.getAttribute('src').split('?')[0],box=NaotocchiCastBounds[src]?.box||[0,0,128,128];let m=new DOMMatrix();
   for(let e=n;e&&e.nodeType===1;e=e.parentElement){const s=getComputedStyle(e),scale=s.scale==='none'||!s.scale?[1,1]:s.scale.split(/\s+/).map(Number),angle=s.rotate==='none'?0:parseFloat(s.rotate)||0,deg=s.rotate?.endsWith('rad')?angle*180/Math.PI:s.rotate?.endsWith('turn')?angle*360:angle;const own=new DOMMatrix().rotate(deg).scale((scale[0]||1)*(parseFloat(s.zoom)||1),(scale[1]??scale[0]??1)*(parseFloat(s.zoom)||1)).multiply(new DOMMatrix(s.transform==='none'?undefined:s.transform));m=own.multiply(m);}
   const {a,b,c,d}=m,x=rect.left-Math.min(0,a*w,c*h,a*w+c*h),y=rect.top-Math.min(0,b*w,d*h,b*w+d*h),points=[[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]]].map(([u,v])=>({x:x+a*u*w/128+c*v*h/128,y:y+b*u*w/128+d*v*h/128}));return {key:row.key,kind:'alpha-image',src,left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}),...[...row.owner.querySelectorAll('.partner-ring,.partner-heart,.relationship-heart')].flatMap(n=>{const rect=n.getBoundingClientRect(),css=getComputedStyle(n);if(!rect.width||!rect.height||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return [];return [{key:row.key,kind:'dom-cue',src:'dom:'+n.className,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}];})]);},
 detail(){const v=NaotocchiHomeViewport,p=v.residentPresentation(),s=v.presentationRect(el.castStage),scene=homeDiorama.inspectScene(),actors=homeDiorama.model.snapshot(),rows=homeDiorama.inspectRows(),rect=e=>e.getBoundingClientRect().toJSON();
 if(!p)return {pending:true,presentation:null,actors:[],viewport:{width:innerWidth,height:innerHeight},world:homeDiorama.inspectWorld()};
 const project=a=>({x:p.x+(s.left+a.x-p.x)*p.scaleX,y:p.y+(s.top+a.y-p.y)*p.scaleY});
 return {envelope:el.castStage.__homeResidentEnvelope,rows:rows.map(r=>({key:r.key,asset:r.asset,paint:r.paintExtent,ownerHeight:r.owner.style.height,ownerTop:r.owner.style.top,y:r.y})),scene:{groundTop:scene.groundTop,width:scene.width,height:scene.height},viewport:{width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height},presentation:p,stage:s,frame:rect(document.querySelector('.screen-frame')),notice:rect(document.getElementById('homeEventSlot')),speech:rect(document.getElementById('homeCommentDock')),actors:actors.map(a=>({...a,foot:project(a),depth:scene.navigation?.depthScale(a),bounds:homeDiorama.model.bounds(a),ink:rows.find(r=>r.key===a.key)?.paintExtent})),world:homeDiorama.inspectWorld()};},
 limits(key){const d=this.detail(),a=d.actors.find(a=>a.key===key)||d.actors[0],b=a.bounds,scene=homeDiorama.inspectScene(),p=d.presentation,s=d.stage;
 const project=q=>({x:p.x+(s.left+q.x-p.x)*p.scaleX,y:p.y+(s.top+q.y-p.y)*p.scaleY});
 const edges={left:null,right:null,top:null,bottom:null};let area=0;
 // Geometric availability, excluding other moving residents. The model still
 // checks their collisions for real routes. Include fractional boundary edges.
 const xs=[],ys=[];for(let x=b.left;x<b.right;x+=2)xs.push(x);xs.push(b.right);for(let y=b.top;y<b.bottom;y+=2)ys.push(y);ys.push(b.bottom);
 const points=[];
 for(let iy=0;iy<ys.length;iy++)for(let ix=0;ix<xs.length;ix++){const q={x:xs[ix],y:ys[iy]};if(!scene.navigation?.valid(q))continue;points.push(q);if(iy%4===0&&ix%4===0&&scene.visible(q,a))area+=64;}
 for(const edge of ['left','right','top','bottom']){const axis=['left','right'].includes(edge)?'x':'y',sign=['left','top'].includes(edge)?1:-1;points.sort((u,v)=>sign*(u[axis]-v[axis]));const q=points.find(q=>scene.visible(q,a));if(q)edges[edge]={native:q,screen:project(q)};}
 return {key:a.key,edges,approximateAreaPx2:area*p.scaleX*p.scaleY,gridStep:2,areaGridStep:8,bounds:b};
 },
 move(key,point,source='drag'){return homeDiorama.model.move(key,point,source);}
};
