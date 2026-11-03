const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const d=require('../home-production-diorama.js');
test('V15 uses actual SVG ink with a safe fallback and leaves legacy size reservations separate',()=>{
 assert.equal(typeof d.residentPaintExtent,'function');
 const actor={h:120,extent:{top:120,bottom:0}},fallback={up:164,down:12};
 assert.deepEqual(d.residentPaintExtent(actor,144,138,[{y:4,height:20}],fallback),{up:138-(4-3)*144/104,down:8});
 assert.deepEqual(d.residentPaintExtent(actor,144,138,null,fallback),fallback);
 const window={};const s=fs.readFileSync('home-production-touch.js','utf8');vm.runInNewContext(s.slice(s.indexOf('/* V8 viewport:')),{window});const api=window.NaotocchiHomeViewport;
 const envelope={left:53,right:290,top:150,bottom:368,above:164,below:12,side:84,vertical:[[150,139,10],[368,161,11]],fitVertical:[[150,119,8],[368,139,8]]};
 for(const count of [1,6,28]){const args={paneWidth:343,paneHeight:254,stageTop:134,count,envelope},p=api.portraitPresentation(args),old=api.portraitPresentation({...args,envelope:{...envelope,fitVertical:undefined}});assert.equal(p.bodyScale,old.bodyScale);assert.equal(p.scaleX,old.scaleX);assert.ok(p.scaleY>old.scaleY);for(const [y,u,b]of envelope.fitVertical){const foot=(134+p.pad+y-p.scrollTop)*p.scaleY;assert.ok(foot-u*p.bodyScale>=2.999);assert.ok(foot+b*p.bodyScale<=251.001);}}
});
test('V15 all companion invitations retain home presentation, blocking and original decline/play behavior',()=>{
 const {harness}=require('./helpers/runtime-harness.cjs');
 for(const id of ['snail','tanuki','cat_friend']){const h=harness({homeDiorama:true,productionHome:true}),s=h.api.state();Object.assign(s,{stage:'growing',speciesLine:'dog',stageIndex:1,isSleeping:false,isSick:false,companions:[],partner:null,transformOptions:null});h.document.body.dataset.homeDisplayVersion='15';h.get('lifeCardOverlay').classList.add('hidden');s.items.c_friend=3;h.api.useConsumableItem('c_friend');h.api.resolvePickerSelection(id);assert.equal(h.get('companionInviteOverlay').dataset.companionId,id);assert.equal(h.get('device').dataset.homeFixed,'true');assert.equal(h.api.homeDioramaBlocked(),true);h.dispatch(h.get('companionInviteLaterBtn'),'click');assert.ok(h.get('companionInviteOverlay').classList.contains('hidden'));h.api.useConsumableItem('c_friend');h.api.resolvePickerSelection(id);h.dispatch(h.get('companionInvitePlayBtn'),'click');assert.ok(h.get('companionInviteOverlay').classList.contains('hidden'));assert.equal(h.api.pendingCompanion(),id);assert.equal(h.get('screenGame').classList.contains('hidden'),false);}
});
test('V15 single full-height landscape image leaves white margins even at night',async()=>{
 const {createHomeWorld}=await import('../home-production-world.mjs');
 for(const time of ['day','night']){const contexts=[];const canvas=()=>{const calls=[],fills=[],ctx={drawImage:(...a)=>calls.push(a),setTransform(){},fillRect(...a){fills.push({color:this.fillStyle,rect:a})},save(){},restore(){}};contexts.push({calls,fills,ctx});return {style:{},getContext:()=>ctx,remove(){}};};
 const host={left:0,top:0,width:420,height:280},stage={left:16,top:134,width:343,height:380},container={appendChild(){},getBoundingClientRect:()=>host},doc={body:{style:{setProperty(){}},dataset:{homeViewportVersion:'12',homeTinyOverview:'true',homeDisplayVersion:'15'}},createElement:tag=>tag==='canvas'?canvas():{style:{},dataset:{},remove(){}},getElementById:()=>({getBoundingClientRect:()=>stage})};class Image{set src(v){this.onload();}}
 const world=createHomeWorld({container,document:doc,window:{Image,devicePixelRatio:1,NaotocchiHomeViewport:{residentPresentation:()=>({landscape:true})}}});world.setEnvironment({region:'home',time,weather:'sunny'});world.draw(0,{reducedMotion:true});
 assert.equal(contexts[0].calls.length,1);assert.equal(contexts[0].ctx.filter,undefined);const [,x,y,w,h]=contexts[0].calls[0];assert.equal(h,280);assert.equal(y,0);assert.equal(h/w,1.5);assert.equal(contexts[1].fills[0].color,'#ffffff');assert.equal(contexts[1].fills.length,1,'authored night has no dark overlay');
 }
});
test('V15 tight SVG reservation retains the existing body motion margin when marks sit below the head',()=>{
 const a={h:60,w:52,extent:{top:60,bottom:0}};
 const ink=d.residentPaintExtent(a,100,85,[{y:45,height:20}],{up:100,down:10});
 assert.ok(ink.up>=72,'retain the original +12 body reserve for jumping and reactions');
});
