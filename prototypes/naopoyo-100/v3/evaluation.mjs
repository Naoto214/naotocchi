// Designer judgements, 1–5. These are hypotheses for human playtests, not solver facts.
// discovery,inference,split/merge planning,combinations,foresight,uniqueness,clarity,busywork
const rows=`
01 route 11111151
02 hold-step 12121251
03 exchange 22112241
04 condition-route 21112251
05 drop 21111251
06 assemble 22211251
07 divide 22212251
08 allocation 23213241
09 defer-merge 23313341
10 slide-entry 22112341
11 forced-route 22112341
12 teleport 21112351
13 terrain-roles 22122351
14 flow-end 22112351
15 slide-entry 22112351
16 forced-route 22122341
17 push-corner 23113341
18 stopper 33123341
19 one-way 22112351
20 live-stopper 33223341
21 phase 23223341
22 burrow 22112351
23 crate-parking 33223341
24 remote-merge 22222341
25 push-after-flow 23223341
26 landing-space 33223341
27 support-stair 23113441
28 latch-memory 12112251
29 slide-drop 23223441
30 toggle-parity 22122351
31 exit-assignment 21112251
32 avoid-current 32123341
33 roof 33113441
34 lift 22123351
35 mass-immunity 33323441
36 phase-wave 33223341
37 flow-catch 33223441
38 landing-space 33223341
39 overflow 33313441
40 flow-catch 33233441
41 sequence 33223351
42 toggle-return 33334441
43 substitute-weight 33323451
44 phase-offset 34334441
45 lift-transfer 33233441
46 slide-assignment 33233341
47 conditional-transport 33333441
48 forced-split 33333441
49 buoyancy 23223441
50 water-exchange 33223341
51 crate-selection 34334441
52 one-way-merge 33333441
53 collapse 34324441
54 wave-catch 33223341
55 split-drop 34334441
56 falling-merge 34324441
57 exact-mass 33323351
58 support-return 34334441
59 small-burrow 33333441
60 hold-release 34334441
61 moving-support 34334431
62 birth-direction 33323441
63 terrain-transport 33333441
64 one-way-slide 34334441
65 shape-before-split 34434441
66 opposed-lanes 34334441
67 remote-clock 34334441
68 merge-then-split 34434441
69 selective-buoyancy 34434441
70 split-clock 44434441
71 temporary-strength 34434441
72 preserve-mass 44434441
73 owl-cooperation 34334441
74 selective-lift 34434441
75 control-handoff 34334441
76 replace-support 44434441
77 flow-allocation 34434441
78 collapse-order 44444431
79 overflow-key 44434441
80 control-handoff 44434441
81 cooperation-clock 44444431
82 serial-split-drop 44444431
83 split-return-key 34334441
84 scaffold-dismantle 45445431
85 asymmetric-transport 44434441
86 sequence-roles 45445431
87 lift-then-transport 34434441
88 split-ice-key 44444431
89 selective-flow-key 44444441
90 water-mass-routing 44434441
91 transport-return 44444441
92 dual-hold 45445431
93 control-handoff 45445431
94 temporary-strength 45445431
95 small-burrow-queue 45445431
96 preparation-before-flow 44444431
97 sequence-roles 45445431
98 phase-composition 45445431
99 blocked-transfer 45445431
100 role-preservation 55555531
`.trim().split('\n');
export const axes=['discovery','inference','massPlanning','combinations','foresight','uniqueness','clarity','busywork'];
export const evaluations=Object.fromEntries(rows.map(row=>{const [id,family,digits]=row.split(' ');const rating=Object.fromEntries(axes.map((key,i)=>[key,Number(digits[i])]));return [id,{family,rating,reason:'盤面の中心発想と合法手順に基づく設計者の仮評価。実機の初見評価で更新する。'}]}));
export function cognitiveScore(r){return 2*r.discovery+3*r.inference+2*r.massPlanning+2*r.combinations+3*r.foresight;}
// Distinct from visual labels: navigation, arithmetic, sequencing, and environmental planning.
const families={route:'navigation','hold-step':'control',exchange:'contact','condition-route':'navigation',drop:'gravity',assemble:'arithmetic',divide:'arithmetic',allocation:'arithmetic','defer-merge':'arithmetic','slide-entry':'transport','forced-route':'transport',teleport:'transport','terrain-roles':'roles','flow-end':'transport',stopper:'placement','one-way':'navigation','live-stopper':'placement',phase:'timing',burrow:'transport','crate-parking':'placement','remote-merge':'arithmetic','push-after-flow':'placement','landing-space':'placement','support-stair':'gravity','latch-memory':'control','slide-drop':'gravity','toggle-parity':'control','exit-assignment':'roles','avoid-current':'navigation',roof:'gravity',lift:'gravity','mass-immunity':'arithmetic','phase-wave':'timing','flow-catch':'placement',overflow:'arithmetic',sequence:'order','toggle-return':'order','substitute-weight':'placement','phase-offset':'timing','lift-transfer':'gravity','slide-assignment':'roles','conditional-transport':'roles','forced-split':'arithmetic',buoyancy:'gravity','water-exchange':'contact','crate-selection':'placement','one-way-merge':'arithmetic',collapse:'irreversible','split-drop':'gravity','falling-merge':'gravity','exact-mass':'arithmetic','support-return':'roles','small-burrow':'arithmetic','hold-release':'roles','moving-support':'gravity','birth-direction':'geometry','terrain-transport':'roles','one-way-slide':'navigation','shape-before-split':'geometry','opposed-lanes':'roles','remote-clock':'timing','merge-then-split':'arithmetic','selective-buoyancy':'arithmetic','split-clock':'timing','temporary-strength':'roles','preserve-mass':'order','owl-cooperation':'cooperation','selective-lift':'arithmetic','control-handoff':'order','replace-support':'placement','flow-allocation':'arithmetic','collapse-order':'irreversible','overflow-key':'arithmetic','cooperation-clock':'cooperation','serial-split-drop':'gravity','split-return-key':'order','scaffold-dismantle':'gravity','asymmetric-transport':'roles','sequence-roles':'order','lift-then-transport':'gravity','split-ice-key':'order','selective-flow-key':'roles','water-mass-routing':'roles','transport-return':'order','dual-hold':'placement','parity-handoff':'order','small-burrow-queue':'transport','preparation-before-flow':'order','phase-composition':'timing','transport-scheduling':'order','blocked-transfer':'order','role-preservation':'cooperation'};
for(const e of Object.values(evaluations))e.group=families[e.family];
export function orderStages(items){
 const pending=items.filter(s=>s.id!=='01'&&s.id!=='100'),ordered=[items.find(s=>s.id==='01')];
 const first={ 'terrain.ice':'10','field.wind':'11','fixture.warp':'12','terrain.water':'13','field.current':'14','object.crate':'17','fixture.oneway':'19','fixture.phase':'21','fixture.burrow':'22','terrain.tunnel':'22','fixture.latch':'28','fixture.toggle':'30','field.updraft':'34','field.wave':'36','fixture.sequence':'41','fixture.plate.weight':'43','fixture.crumble':'53','field.bubble':'49','npc.owl':'73'};
 const seen=new Set(ordered[0].materials);
 while(pending.length){const eligible=pending.filter(s=>s.materials.every(m=>!first[m]||seen.has(m)||first[m]===s.id));if(!eligible.length)throw Error('Introduction dependency cycle');
 const previous=evaluations[ordered.at(-1).id].group;
 eligible.sort((a,b)=>(cognitiveScore(evaluations[a.id].rating)+Number(evaluations[a.id].group===previous)*.5)-(cognitiveScore(evaluations[b.id].rating)+Number(evaluations[b.id].group===previous)*.5)||Number(a.id)-Number(b.id));
 const s=eligible[0];pending.splice(pending.indexOf(s),1);ordered.push(s);for(const m of s.materials)seen.add(m);
 }ordered.push(items.find(s=>s.id==='100'));
 return ordered.map((s,i)=>({...s,number:i+1,difficulty:i+1}));
}
