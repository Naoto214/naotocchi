// VERSION 6 CPU checks (PLAN-V6.md §2): ながいきのひけつ decisions of the three builds on hand-made public observations.
// Usage: node lib/smoke-v6.mjs > evidence/smoke-v6.txt
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=dirname(fileURLToPath(import.meta.url)),B=v=>import(pathToFileURL(join(HERE,'..','build',v,'cpu-policy.mjs')).href);
const P={early:(await B('T-6e')).scoreCpuAction,hold:(await B('T-6h')).scoreCpuAction,adaptive:(await B('T-6a')).scoreCpuAction};
let fails=0;const ok=(n,c,i='')=>{console.log(`${c?'PASS':'FAIL'} ${n}${i?' — '+i:''}`);if(!c)fails++;};
const card=(name,cardId)=>({name,cardId}),xii=card('XII','X-T-XII'),filler=k=>Array.from({length:k},(_,i)=>card('ほか'+i,'C-owl'));
const seat=(g,hand=[],hc=5)=>({growth:g,time:6,handCount:hc,hand,relationship:null,deckCount:20,discard:[],stats:{power:3,wisdom:3},board:{main:{cardId:'M-turtle-03',type:'main'},partner:null,world:null,companions:[],prepared:[]}});
const obs=(round,me,op,final=10,hand=[],opHand=5)=>({seat:'A',round,turn:'A',phase:'normal',deck:[],reactive:[],players:{A:seat(me,hand,hand.length),B:seat(op,[],opHand)},life:{final,cap:{A:100,B:100},hold:{},holding:{A:false,B:false}},chain:[],actions:[]});
const naga={kind:'play',card:{name:'ながいきのひけつ',cardId:'X-N-nagaiki',type:'event',cost:2},cost:2};
const use=(k,o)=>P[k](naga,o,()=>0)>0;
let o=obs(4,30,45,10,[xii]);ok('R4・負けている・XII あり・手札が少ない：早期型は温存、温存型は温存、状況型も温存',!use('early',o)&&!use('hold',o)&&!use('adaptive',o));
o=obs(4,30,45,10,[]);ok('R4・負けている・XI/XII なし・手札が少ない：早期型は今使う、温存型は温存',use('early',o)&&!use('hold',o));
o=obs(4,40,45,10,filler(8));ok('R4・少し負けている・XI/XII なし・手札が多い（8枚）：状況型は今使う（後で使う時が見つからない見込み）',use('adaptive',o)&&!use('hold',o));
o=obs(4,50,30,10,filler(2));ok('R4・大きく勝っている：状況型は今使う（+10 の条件「負けている」になる見込みが小さい）',use('adaptive',o));
o=obs(6,95,60,10,[]);ok('+5 で100に届く：3型とも今使う',use('early',o)&&use('hold',o)&&use('adaptive',o));
o=obs(9,50,60,11,[]);ok('終了ラウンド11・負けている：3型とも +15 で使う',use('early',o)&&use('hold',o)&&use('adaptive',o));
o=obs(10,50,60,10,[xii]);ok('最後のラウンド：3型とも使う',use('early',o)&&use('hold',o)&&use('adaptive',o));
console.log(fails?`FAILED ${fails}`:'ALL PASS');if(fails)process.exit(1);
