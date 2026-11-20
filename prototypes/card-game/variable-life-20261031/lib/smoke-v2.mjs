// VERSION 2 CPU (smart2) direction checks on hand-made public observations (PLAN-V2.md §2). Uses build/T-2v/cpu-policy.mjs.
// Usage: node lib/smoke-v2.mjs > evidence/smoke-v2.txt
const {scoreCpuAction}=await import(process.env.LIFE_BUILD?new URL('file://'+process.env.LIFE_BUILD+'/T-2v/cpu-policy.mjs').href:'../build/T-2v/cpu-policy.mjs');
const out=[];let fail=0;const check=(name,ok,detail)=>{out.push(`${ok?'PASS':'FAIL'} ${name}${detail?' — '+detail:''}`);if(!ok)fail++;};
const seat=(growth,main,extra={})=>({growth,time:extra.time??6,handCount:extra.hand??5,relationship:null,deckCount:20,discard:[],stats:{power:3,wisdom:3},board:{main:main?{cardId:main,type:'main'}:null,partner:null,world:extra.world??null,companions:[],prepared:[]}});
const obs=({round,me,op,mine='M-turtle-03',theirs='M-turtle-03',final=10,chain=[],turn='A',phase='normal',meX={},opX={},holding={A:false,B:false}})=>({seat:'A',round,turn,phase,deck:[],reactive:[],
 players:{A:seat(me,mine,meX),B:seat(op,theirs,opX)},life:{final,cap:{A:100,B:100},hold:{},holding},chain,actions:[]});
const T={IX:9,X:10,XI:11,XII:12},act=n=>({kind:'place',slot:'world',card:{name:n,cardId:'X-T-'+n,type:'world',cost:2},cost:2});
const v=(o,n)=>scoreCpuAction(act(n),o,()=>0);
const fmt=o=>Object.keys(T).map(n=>`${n} ${v(o,n).toFixed(1)}`).join(' / ');
let o;
o=obs({round:8,me:50,op:70});check('R8・負けている（同じデッキ）：IX は出さない',v(o,'IX')<0,fmt(o));check('R8・負けている：XII は出す価値がある',v(o,'XII')>0,fmt(o));
o=obs({round:9,me:66,op:58});check('R9・勝っている：XII は出さない',v(o,'XII')<0,fmt(o));check('R9・勝っている：IX は出す価値がある',v(o,'IX')>0,fmt(o));
o=obs({round:8,me:70,op:50});check('R8・20点リード：延長しない（大差なら短縮の必要も小さい）',v(o,'XII')<0&&v(o,'XI')<0,fmt(o));
o=obs({round:9,me:60,op:61});check('R9・ほぼ同点：大きな価値はない（|価値|<10）',Math.abs(v(o,'IX'))<10&&Math.abs(v(o,'XII'))<10,fmt(o));
o=obs({round:8,me:64,op:58,mine:'M-turtle-03',theirs:'M-venus_flytrap-03'});check('R8・少し勝っている そだち獲得（速攻）対 アイテム（長期）：IX は出す・XII は出さない',v(o,'IX')>0&&v(o,'XII')<0,fmt(o));
o=obs({round:7,me:58,op:62,mine:'M-venus_flytrap-03',theirs:'M-turtle-03'});check('R7・少し負けている アイテム（長期）対 そだち獲得：XII は出す・IX は出さない',v(o,'XII')>0&&v(o,'IX')<0,fmt(o));
o=obs({round:3,me:30,op:35});const late=obs({round:9,me:80,op:85});check('序盤（R3）の延長の価値は終盤（R9）より小さい（同じ点差の比）',v(o,'XII')<v(late,'XII'),`R3 ${v(o,'XII').toFixed(1)} / R9 ${v(late,'XII').toFixed(1)}`);
o=obs({round:8,me:50,op:70,opX:{time:0}});const o2=obs({round:8,me:50,op:70,opX:{time:6,hand:7}});check('相手がカウンターできない時のほうが価値が高い（上書きの見込み）',v(o,'XII')>v(o2,'XII'),`相手の時0 ${v(o,'XII').toFixed(1)} / 時6・手札7 ${v(o2,'XII').toFixed(1)}`);
o=obs({round:9,me:50,op:70,turn:'B',phase:'response',chain:[{name:'IX'}]});check('カウンター：負けていて相手が IX を出した → XII で返す価値、IX には価値なし',v(o,'XII')>0&&v(o,'IX')<0,fmt(o));
o=obs({round:9,me:70,op:50,turn:'B',phase:'response',chain:[{name:'XII'}]});check('カウンター：勝っていて相手が XII を出した → IX・X で返す価値',v(o,'IX')>0&&v(o,'X')>0,fmt(o));
o=obs({round:8,me:85,op:100,holding:{A:false,B:true}});const nh=obs({round:8,me:85,op:100});check('相手が100維持中：延長の価値を下げる（維持の判定を増やさない）',v(o,'XII')<v(nh,'XII')||v(o,'XII')<0,`維持中 ${v(o,'XII').toFixed(1)} / なし ${v(nh,'XII').toFixed(1)}`);
o=obs({round:8,me:50,op:70,meX:{world:{cardId:'W-countryside',name:'いなか',type:'world'}}});const o3=obs({round:8,me:50,op:70});check('自分のセカイを置き換える損を引く',v(o,'XII')<v(o3,'XII'),`いなかあり ${v(o,'XII').toFixed(1)} / なし ${v(o3,'XII').toFixed(1)}`);
out.push(`${fail?'FAILED':'ALL PASS'} (${out.length} checks)`);console.log(out.join('\n'));if(fail)process.exit(1);
