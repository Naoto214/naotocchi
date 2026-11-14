import {QUICK_ADDITIONS_V7,createQuickCpuV7} from './official-quick-cpu-v7.mjs';
import {rng,createCpu} from './official-cpu-v4.mjs';
import {NORMAL_ADDITIONS_V6} from './official-catalog-v6.mjs';
import {observeOfficialCanvas} from './official-observer-v6.mjs';
import {createNormalCpuV6} from './official-normal-cpu-v6.mjs';
export const OFFICIAL_IDS=Object.freeze([...QUICK_ADDITIONS_V7,...Object.keys(NORMAL_ADDITIONS_V6),"eat", "dodge", "catch", "mash", "clean", "stop", "swipe", "medicine", "find", "charge", "partner", "season", "jump", "pull", "pet", "button", "flames", "coins", "cliff", "throw", "flee", "mole", "slice", "guard", "bento", "lift", "tickle", "balance", "color", "count", "bigger", "odd", "order", "holdlid", "umbrella", "shutter", "sort", "trace", "pushbox", "fish", "stack", "pair", "doors", "feather", "weather", "lights-out", "takoyaki-grill", "defend"]);
export const FRAME_MS=1000/60;
export function advanceOfficialClock(state, now, active) {
 if(!active){state.last=null;state.acc=0;return 0;}
 if(state.last===null){state.last=now;return 0;}
 state.acc+=Math.max(0,Math.min(250,now-state.last));state.last=now;
 const frames=Math.floor((state.acc+1e-7)/FRAME_MS);state.acc-=frames*FRAME_MS;return frames;
}
// realm MUST be a disposable iframe window or Node vm context, never parent/globalThis.
export function createOfficialRuntime({realm,container,context,onSound,onVoice,art}={}) {
 if(!realm||!container||!context)throw Error('isolated realm, container and canvas context required');
 let frame=0,clock=0,serial=0,rafs=new Map(),timers=new Map(),journal=[],scheduled=[],config,score,summary,game,cpu,canvas,board=[],gauges=[],gauge=null,replayUntil=0;
 realm.Math.random=()=>random();let random=rng(1);
 Object.defineProperty(realm,'performance',{configurable:true,value:{now:()=>clock}});
 realm.requestAnimationFrame=fn=>{rafs.set(++serial,fn);return serial;};realm.cancelAnimationFrame=id=>rafs.delete(id);
 realm.setTimeout=(fn,delay=0)=>{timers.set(++serial,{fn,at:clock+Math.max(FRAME_MS,Number(delay)||0)});return serial;};realm.clearTimeout=id=>timers.delete(id);
 // Capture only visible board strokes, preserving original drawing and random consumption.
 const stroke=context.strokeRect.bind(context);
 context.strokeRect=function(...args){const color=String(this.strokeStyle).match(/^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([.\d]+)\s*\)$/i);const alpha=color?Number(color[1]):NaN;if(alpha===.6||alpha===.12)board.push(alpha===.6);return stroke(...args);};
 // Observe the same visible cooking gauges a human uses, without reading or
 // rewriting the original game's closure state or changing its random stream.
 const fill=context.fillRect.bind(context);
 context.fillRect=function(x,y,w,h){
  if(config?.gameId==='takoyaki-grill'){
   const color=String(this.fillStyle).replace(/\s/g,'');
   if(/^rgba\(255,255,255,(?:0?\.15)\)$/.test(color)&&h===5)gauge={x:x+w/2,y:y-27.62};
   if(gauge&&/^rgba\(120,255,160,(?:0?\.9)\)$/.test(color))Object.assign(gauge,{lo:x,hi:x+w});
   if(gauge&&(color==='#fff'||color==='#ffffff')&&w===2&&h===9){gauges.push({...gauge,cursor:x+1});gauge=null;}
  }
  return fill(x,y,w,h);
 };
 const nativeText=context.fillText.bind(context),artText=art?.canvas(context).fillText;
 const observation=observeOfficialCanvas(context,{renderText:(...args)=>(NORMAL_ADDITIONS_V6[config?.gameId]&&artText?artText:nativeText)(...args)});
 const S={sfx:name=>{if(frame>replayUntil)onSound?.(name);},voice:(text,options)=>{if(frame<=replayUntil||typeof onVoice!=='function')return false;return onVoice(text,options)!==false;},clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),lerp:(a,b,t)=>a+(b-a)*t,ageDifficulty:()=>.5,minigameEase:()=>1,mgDuration:ms=>ms,MG_ACTION_START_GRACE_MS:150,SEASON:{id:'spring',SPRING:'spring',SUMMER:'summer',AUTUMN:'autumn',WINTER:'winter'},currentSprite:()=> '🐣',
 createMgCanvas:(c,h)=>{canvas=c; c.width=320;c.height=typeof h==='function'?h(320):h;return {ctx:context,W:320,H:c.height};},
 mgPointerPos:(c,e)=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*320/r.width,y:(e.clientY-r.top)*c.height/r.height};}};
 Object.assign(S,realm.installNaokoroControls());
 const quick=realm.installNaotocchiQuick(S);let normal;
 function input(e,record=true){if(!['pointerdown','pointermove','pointerup','pointercancel'].includes(e.type)||!Number.isFinite(e.x)||!Number.isFinite(e.y)||(e.target!==undefined&&e.target!=='pad'))throw Error('invalid pointer input');if(record)journal.push({frame,type:e.type,x:e.x,y:e.y,...(e.target?{target:e.target}:{})});// Journal coordinates already use the fixed logical canvas. Replay may run
 // while its iframe is hidden (native client rect is 0x0). Dispatch under a
 // logical rect so both official pointer wrappers see exact same coordinates.
 const receiver=e.target==='pad'?container.querySelector('.mg-pad'):canvas;
 if(!receiver)throw Error('input target unavailable');
 const logicalHeight=e.target==='pad'?92:canvas.height;
 const ownRect=Object.getOwnPropertyDescriptor(receiver,'getBoundingClientRect');
 Object.defineProperty(receiver,'getBoundingClientRect',{configurable:true,value:()=>({left:0,top:0,width:320,height:logicalHeight,right:320,bottom:logicalHeight})});
 const data={type:e.type,pointerId:1,clientX:e.x,clientY:e.y,preventDefault(){}};
 try{if(typeof receiver.dispatchPointer==='function')receiver.dispatchPointer(e.type,data);else receiver.dispatchEvent(new realm.PointerEvent(e.type,{...data,bubbles:true,cancelable:true}));}
 finally{if(ownRect)Object.defineProperty(receiver,'getBoundingClientRect',ownRect);else delete receiver.getBoundingClientRect;}
 }

 function step(count=1){if(!Number.isInteger(count)||count<0||count>36000)throw Error('invalid frame count');for(let n=0;n<count;n++){if(frame>=3600||score!==undefined)break;frame++;clock=frame*FRAME_MS;
 if(cpu&&score===undefined)cpu({frame,current:game?._run?.current,board:board.slice(-25),gauges,visible:observation.read(),send:frame<=replayUntil?()=>{}:input});
 for(const e of scheduled.filter(e=>e.frame===frame))input(e);
 for(const [id,t]of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}
 const work=[...rafs.values()];rafs.clear();board=[];gauges=[];gauge=null;observation.reset();for(const fn of work)fn(clock);
 }return snapshot();}
 function snapshot(){return JSON.parse(JSON.stringify({...config,frame,inputs:journal,pendingInputs:scheduled.filter(e=>e.frame>frame),score,summary,done:score!==undefined}));}
 function start(opts){if(config)throw Error('runtime is single-use; create a fresh isolated realm for restore');if(!opts||!Number.isInteger(opts.seed)||opts.seed<0||opts.seed>4294967295)throw Error('invalid seed');if(opts.cpuSeed!==undefined&&(!Number.isInteger(opts.cpuSeed)||opts.cpuSeed<0||opts.cpuSeed>4294967295))throw Error('invalid CPU seed');if(opts.frame!==undefined&&(!Number.isInteger(opts.frame)||opts.frame<0||opts.frame>3600))throw Error('invalid restore frame');if(opts.inputs!==undefined&&(!Array.isArray(opts.inputs)||opts.inputs.length>100000))throw Error('invalid journal');if(opts.pendingInputs!==undefined&&(!Array.isArray(opts.pendingInputs)||opts.pendingInputs.length>100000))throw Error('invalid pending inputs');if(opts.pendingInputs?.some(e=>!e||e.frame<=(opts.frame||0)))throw Error('invalid pending frame');if((opts.inputs?.length||0)+(opts.pendingInputs?.length||0)>100000)throw Error('journal too large');if(opts.difficulty&&!['easy','normal'].includes(opts.difficulty))throw Error('invalid difficulty');if(!OFFICIAL_IDS.includes(opts.gameId))throw Error('unsupported official game');config={gameId:opts.gameId,seed:opts.seed>>>0,cpuSeed:(opts.cpuSeed??opts.seed)>>>0,difficulty:opts.difficulty||'normal',cpu:!!opts.cpu};random=rng(config.seed);scheduled=[...(opts.inputs||[]),...(opts.pendingInputs||[])].map(e=>({...e}));if(scheduled.some((e,i)=>!Number.isInteger(e.frame)||e.frame<1||e.frame>3600||!['pointerdown','pointermove','pointerup','pointercancel'].includes(e.type)||!Number.isFinite(e.x)||!Number.isFinite(e.y)||(e.target!==undefined&&e.target!=='pad')||Math.abs(e.x)>10000||Math.abs(e.y)>10000||(i&&e.frame<scheduled[i-1].frame)))throw Error('invalid journal frame');replayUntil=opts.inputs?(opts.frame||0):0;cpu=opts.cpu?(NORMAL_ADDITIONS_V6[config.gameId]?createNormalCpuV6(config.gameId,config.difficulty,rng(config.cpuSeed^0x91e10da5)):QUICK_ADDITIONS_V7.includes(config.gameId)?createQuickCpuV7(config.gameId,config.difficulty,rng(config.cpuSeed^0x91e10da5)):createCpu(config.cpuSeed,config.difficulty,config.gameId)):null;
 if(NORMAL_ADDITIONS_V6[config.gameId]){S.sceneryAtlas=art?.sceneryAtlas;S.canvasIllustrations={canvas:ctx=>ctx,drawSymbol:(ctx,symbol,x,y,size)=>{observation.recordText(symbol,x+size/2,y+size/2);art?.drawSymbol(ctx,symbol,x,y,size);return true;}};}
 normal=realm.installNaotocchiMinigames(S);
 game=[...normal.MINIGAMES,...Object.values(normal.REGION_MINIGAMES).flat().map(e=>e.game),...Object.values(normal.SEASONAL_MINIGAMES).flat().map(e=>e.game)].find(g=>g.id===opts.gameId)||quick.makeQuickRun({only:opts.gameId,total:3,levelEvery:2});
 if(NORMAL_ADDITIONS_V6[opts.gameId]&&game.id!==opts.gameId)throw Error('missing formal normal ID');
 game.start(container,(s,text)=>{score=s;summary=text??container.querySelector(NORMAL_ADDITIONS_V6[opts.gameId]?'.mg-hint':opts.gameId==='takoyaki-grill'?'#tkHint':'#loHint')?.textContent??'終了';});if(opts.frame)step(opts.frame);return snapshot();}
 return {start,step,input:e=>{if(score!==undefined)return;if(!['pointerdown','pointermove','pointerup','pointercancel'].includes(e.type)||!Number.isFinite(e.x)||!Number.isFinite(e.y)||(e.target!==undefined&&e.target!=='pad'))throw Error('invalid pointer input');scheduled.push({...e,frame:frame+1});},inspect:()=>({board:board.slice(-25),moves:container.querySelector('#loMoves')?.textContent,round:container.querySelector('#loRound')?.textContent}),flushInputs:()=>scheduled.some(e=>e.frame===frame+1)?step(1):snapshot(),snapshot};
}
// Node adapter uses original source in a disposable vm with no storage/network APIs.
export async function createNodeOfficialRuntime({canonicalCanvasColors=false,zeroCanvasRect=false,onSound,onVoice}={}){const [{default:vm},fs]=await Promise.all([import('node:vm'),import('node:fs/promises')]);
 class Element{constructor(){this.nodes={};this.children=[];this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){},contains(){return false;}};this.listeners={};this.height=300;this.width=320;}appendChild(e){this.children.push(e);}insertBefore(e){this.children.unshift(e);}removeEventListener(){}querySelector(s){if(s==='.mg-pad'){return this.children.flatMap(e=>[e,...e.children]).find(e=>e.className?.split(' ').includes('mg-pad'))??null;}if(s==='.mg-hint')return Object.entries(this.nodes).find(([k])=>k.endsWith('Hint'))?.[1]??null;return this.nodes[s]??=new Element();}querySelectorAll(){return [];}set innerHTML(v){this.html=v;this.nodes={};}get innerHTML(){return this.html;}addEventListener(t,f){(this.listeners[t]??=[]).push(f);}dispatchPointer(t,e){for(const f of this.listeners[t]||[])f(e);}getBoundingClientRect(){return{left:0,top:0,width:zeroCanvasRect?0:this.width,height:zeroCanvasRect?0:this.height};}setPointerCapture(){}}
 const container=new Element();container.innerHTML='';const states=[];const ctx=new Proxy({globalAlpha:1,save(){states.push({fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,globalAlpha:this.globalAlpha,font:this.font,lineWidth:this.lineWidth});},restore(){Object.assign(this,states.pop()||{});},strokeRect(){},measureText:t=>({width:String(t).length*10}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=canonicalCanvasColors&&k==='strokeStyle'?String(v).replace(/^rgba\(255,255,255,(\.[0-9]+)\)$/,(_,a)=>`rgba(255, 255, 255, ${Number(a)})`):v,true)});
 const realm=vm.createContext({console,document:{createElement:()=>new Element(),addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:false})});vm.runInContext('this.Math=Math',realm);
 for(const file of ['quick.js','games.js','controls.js'])vm.runInContext(await fs.readFile(new URL('./official/'+file,import.meta.url),'utf8'),realm,{filename:file});
 return createOfficialRuntime({realm,container,context:ctx,onSound,onVoice});}
