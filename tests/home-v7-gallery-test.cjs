const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('tools/home-v7-gallery.js','utf8');
test('capture follows the rendered facing, including native-facing assets',()=>{
 const calls=[],ctx=new Proxy({}, {get:(_,key)=>(...a)=>calls.push([key,...a]),set:()=>true});
 const actor={key:'pet:dog',x:20,y:30,w:10},img={complete:true,naturalWidth:100,getBoundingClientRect:()=>({x:10,y:15,width:20,height:25})};
 const node={dataset:{dioramaActor:actor.key},querySelector:()=>img};
 const d={getElementById:()=>({getBoundingClientRect:()=>({x:0,y:0,width:390,height:400})}),querySelectorAll:()=>[node]};
 const frame={contentDocument:d,contentWindow:{getComputedStyle:()=>({getPropertyValue:()=>'-1'}),HomeV22QA:{detail:()=>({actors:[actor]}),captureBackground:()=>({})}}};
 const context={document:{createElement:()=>({getContext:()=>ctx})},ART_SCENES:{sea:{foreground:[]}},artTransform:()=>({})};
 vm.createContext(context);vm.runInContext(src.slice(src.indexOf('function capture('),src.indexOf('let drawing='))+'\nthis.capture=capture;',context);
 context.capture(frame,{id:'sea'},6);assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===-1),'mirrored DOM sprite must remain mirrored in export');
});
test('the most recent candidate selection is applied after a pending load',async()=>{
 const nodes={candidate:{value:'sea'},count:{value:'6'},width:{value:'390'},time:{value:'day'},current:{},metrics:{},liveStatus:{},qa:{}};
 for(const id of ['apply','live','freeze','speech','question','map','rotate'])nodes[id]={};
 let resume;const loaded=[];const context={$:id=>nodes[id],ART_CANDIDATES:[{id:'sea',name:'A',region:'sea'},{id:'sea-b',name:'B',region:'sea'}],scene:async(f,c)=>{if(!loaded.length)await new Promise(r=>resume=r);loaded.push(c.id);f.contentWindow={HomeV22QA:{detail:()=>({actors:[],slots:{homeEventSlot:{height:42},speechSlot:{height:76}}})}};}};
 vm.createContext(context);vm.runInContext(src.slice(src.indexOf('let drawing='),src.indexOf("$('apply').onclick"))+'\nthis.apply=apply;',context);
 const pending=context.apply();nodes.candidate.value='sea-b';await context.apply();resume();await pending;await new Promise(setImmediate);
 assert.deepEqual(loaded,['sea','sea-b']);assert.match(nodes.qa.href,/candidate=sea-b$/);assert.match(nodes.liveStatus.textContent,/^B/);
});
