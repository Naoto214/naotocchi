// This hook lives only in generated comparison scripts, never in production.
window.MovementQA={
 resetUI(){const p=homeV11Presentation();clearTimeout(p.upperTimer);clearTimeout(p.lowerTimer);p.upper=null;p.upperQueue=[];p.lowerQueue=[];p.lowerUntil=0;homeV11ClearUpper();delete document.body.dataset.homeUpper;conv2Abort('qa');clearConversationTimers();hideSpeechBubble();},
 setup({count=4,item=true,stage=5,region='city',speech=false,notice=false}={}){
 this.resetUI();HomeReleaseQA.scene(region,count,'night');const m=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
 Object.assign(state,{speciesLine:'hermit_crab',stageIndex:stage,ageTicks:(stage===6?62:59)*AGE_TICKS_PER_YEAR,growth:100,poopCount:0});state.lifetime.equippedItemId=item?'poop1':null;
 if(count===4)state.companions=['panda','seal'].map(id=>({id,bond:85}));
 if(count===2){state.partner=null;state.companions=[{id:'seal',bond:85}];}
 if(count>2)state.partner={...m.partners.find(p=>p.id==='gentle_gorilla'),gender:'male',orientationId:'bi',label:'やさしいゴリラ',affection:80,married:true,bondCount:3};
 homeCastLayoutKey='';render();homeDiorama.sync();homeDiorama.dismissGuide();
 if(speech)setSpeechBubble('片づけた場所を忘れた',petSpeaker(),{holdMs:3600000});if(notice)showMessage('さっぱりした！',3600000,null);
 },
 changeItemNow(item){state.lifetime.equippedItemId=item?'poop1':null;homeCastLayoutKey='';render();homeDiorama.sync();},
 model:()=>homeDiorama.model,
 pause(value=true){homeDiorama.model.cancel();window.__movementPaused=value;},
 step(seconds){for(let i=0;i<seconds*20;i++)homeDiorama.model.step(.05,{autonomy:false});homeDiorama.paintFrame();},
 inkRects(){return homeDiorama.inspectRows().flatMap(row=>[...row.owner.querySelectorAll('img.character-asset'),...(row.attachments||[]).flatMap(n=>[...n.querySelectorAll('img')])].map(n=>{
   const rect=n.getBoundingClientRect(),css=getComputedStyle(n),w=parseFloat(css.width),h=parseFloat(css.height),src=n.getAttribute('src').split('?')[0],box=NaotocchiCastBounds[src]?.box||[0,0,128,128];let m=new DOMMatrix();
   for(let e=n;e&&e.nodeType===1;e=e.parentElement){const s=getComputedStyle(e),scale=s.scale==='none'||!s.scale?[1,1]:s.scale.split(/\s+/).map(Number),angle=s.rotate==='none'?0:parseFloat(s.rotate)||0,deg=s.rotate?.endsWith('rad')?angle*180/Math.PI:s.rotate?.endsWith('turn')?angle*360:angle;const own=new DOMMatrix().rotate(deg).scale((scale[0]||1)*(parseFloat(s.zoom)||1),(scale[1]??scale[0]??1)*(parseFloat(s.zoom)||1)).multiply(new DOMMatrix(s.transform==='none'?undefined:s.transform));m=own.multiply(m);}
   const {a,b,c,d}=m,x=rect.left-Math.min(0,a*w,c*h,a*w+c*h),y=rect.top-Math.min(0,b*w,d*h,b*w+d*h),points=[[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]]].map(([u,v])=>({x:x+a*u*w/128+c*v*h/128,y:y+b*u*w/128+d*v*h/128}));return {key:row.key,src,left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}));},
 detail(){const v=NaotocchiHomeViewport,p=v.residentPresentation(),s=v.presentationRect(el.castStage),scene=homeDiorama.inspectScene(),actors=homeDiorama.model.snapshot(),rows=homeDiorama.inspectRows(),rect=e=>e.getBoundingClientRect().toJSON();
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
