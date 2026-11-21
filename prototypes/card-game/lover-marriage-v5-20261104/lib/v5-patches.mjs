// VERSION 5 試遊用（V4 の v4-patches.mjs を写し、ゴリラ・せいれい・サボテンの案を切り替えられるようにした）：恋人18種類の「♥ 結婚したら」能力を、正式モジュールの写しに当てるパッチ（未承認・試遊専用）。
// 能力の内容は VERSION 3 の推奨（../lover-marriage-redesign-20261103/v3/proposals-v3.json、PR #509 1cd72308）どおり。
// 共通ルール（結婚前の別れ−5・結婚+10・離婚−10、PR #515）は変えない。正式ファイルは読むだけで書き換えない。
// 使い方：applyV4(src,{cpu,ui}) … src は {ファイル名: 本文}。ラベル付きの厳密な置換で、想定箇所が1つでなければ止まる。
export const TRIAL_VERSION='hotseat-7-lover5';
export const TRIAL_POLICY='heuristic-3-lover5';
// 恋人18種類。kind：once＝結婚した時に1回、cont＝結婚している間ずっと、event＝条件がそろった時（回数制限つき）。
export const LOVERS={
 'P-anglerfish':{plan:'V3新案',kind:'once',married:'このこいびとと結婚した時、山札上4枚を見て、その中から「しんかい」1枚を公開して手札に加えてもよい。残りは山札の一番下に置く。'},
 'P-cat_ceo':{plan:'V3新案',kind:'once',married:'このこいびとと結婚した時、1枚引く。このターン、自分が次に「あそび」カードをプレイするための時を1少なくする。'},
 'P-cliff_goat':{plan:'V2 A',kind:'event',married:'「こいびとのとき」の能力は、時を1少なくする代わりに「1枚引く」にしてもよい。'},
 'P-desert_scorpion':{plan:'V3新案',kind:'once',married:'このこいびとと結婚した時、自分の捨て札の「あそび」か「あいてむ」1枚を手札に戻す。'},
 'P-field_cow':{plan:'V2 A',kind:'event',married:'「こいびとのとき」の能力で見たカードを手札に加え、手札1枚を山札の一番下に置いてもよい。'},
 'P-forest_bear':{plan:'V3新案',kind:'cont',married:'1ラウンドに1回。このカードが相手の効果で手札に戻るなら、このカードにみにつけられたカード1枚を捨て札に置くことで、その移動を防いでもよい。'},
 'P-gentle_gorilla':{plan:'V2 A',kind:'event',married:'「こいびとのとき」の能力は、手札を山札の一番下に置かずに発動できる。'},
 'P-grove_deer':{plan:'V3新案',kind:'once',married:'結婚した時と、結婚している間の自分のターン開始時に手札が1枚以下の時にも、「こいびとのとき」の能力を発動できる（結婚した時は山札上3枚を見る）。'},
 'P-high_eagle':{plan:'V3新案',kind:'once',married:'このこいびとと結婚した時、1枚引く。'},
 'P-knitting_spider':{plan:'V3新案',kind:'once',married:'このこいびとと結婚した時、自分の捨て札の「みにつける」のカード1枚を手札に戻す。'},
 'P-oasis_cactus':{plan:'V2 A',kind:'cont',married:'このカードにカードがみにつけられていない間、自分のメインのちから+1。'},
 'P-robot_neighbor':{plan:'V3新案',kind:'cont',married:'結婚している間、自分のターンには、自分のメインのちえ+1も得る。'},
 'P-rock_octopus':{plan:'V3新案',kind:'event',married:'「こいびとのとき」の能力は、時1を払わず、自分になかまがいなくても発動できる。',
  text:'1ターンに1回。自分のターンに、なかまがいて準備枠にカードが2枚以上あるなら、時1を払って発動できる。自分の装備1枚を、それをみにつけられる別の自分のキャラクターへつけ替える。'},
 'P-sea_mermaid':{plan:'V2 A',kind:'cont',married:'1ターンに1回。自分がセカイを出すための時を1少なくしてもよい。'},
 'P-snow_spirit':{plan:'V2 A',kind:'event',married:'自分のターン終了時、現在のラウンドがR10の場合、発動する。自分のそだち+5。'},
 'P-snowman':{plan:'V3新案',kind:'event',married:'結婚中に離れて「こいびとのとき」の能力が発動した時は、さらに1枚引く。',
  text:'このカードが相手の効果でこいびと枠を離れて（手札か捨て札へ）、関係が終わった時、自分のメインがたまごでなければ、移動先で発動できる。山札上2枚を見て、1枚を手札に加え、残りを山札の一番下に置く。'},
 'P-sunflower_partner':{plan:'V2 A',kind:'event',married:'自分のメインがときおくりでメイン枠に置かれた時にも、「こいびとのとき」の能力を発動できる。'},
 'P-swamp_croc':{plan:'V2 A',kind:'event',married:'相手から受けたちょうせんで引き分けた時にも、「こいびとのとき」の能力を発動できる。'},
};
// 3種類の比較案。V5 の推奨は FINAL（§報告）。none＝結婚後の追加能力なし（原因の切り分け用）。
export const VARIANTS={
 gorilla:{
  v4:{plan:'V4（V2 A）',kind:'event',married:'「こいびとのとき」の能力は、手札を山札の一番下に置かずに発動できる。'},
  v2b:{plan:'V2 B',kind:'event',value:0.8,married:'「こいびとのとき」の能力は、ちえでちょうせんする時にも使える。その場合は、ちえ+2。'},
  v3n:{plan:'V3新案',kind:'once',value:2,married:'このこいびとと結婚した時、このターン、自分のメインのちから+2。'},
  g4:{plan:'V5新案',kind:'event',value:1.6,married:'「こいびとのとき」の能力は、自分のメインのちからが相手より低くなくても発動できる。'},
  none:{plan:'追加なし',kind:'event',value:0,married:null}},
 snow:{
  v4:{plan:'V4（V2 A）',kind:'event',married:'自分のターン終了時、現在のラウンドがR10の場合、発動する。自分のそだち+5。'},
  v5:{plan:'V4（本文だけ明確化）',kind:'event',cpuKind:'once',value:5,married:'R10の自分のターン終了時に、このこいびとと結婚していれば発動する（R10に結婚したターンも含む）。自分のそだち+5。'},
  draw:{plan:'V5案（1枚）',kind:'once',value:1,married:'自分のターン開始時、現在のラウンドがR10の場合、発動する。1枚引く。'},
  b:{plan:'V2 B',kind:'cont',value:0.3,married:'自分のメインが⑦か⑧である間、そのメインのちえ+1。'},
  none:{plan:'追加なし',kind:'event',value:0,married:null}},
 cactus:{
  v4:{plan:'V4（V2 A）',kind:'cont',married:'このカードにカードがみにつけられていない間、自分のメインのちから+1。'},
  b:{plan:'V2 B',kind:'cont',married:'このカードにカードがみにつけられていない間、自分のメインのちえ+1。'},
  c3:{plan:'V5新案',kind:'event',value:1,married:'1ターンに1回。このカードにカードがみにつけられていない間、自分のメインが相手からちょうせんされた時、このちょうせんの間、そのメインの使用する能力値+1。'},
  none:{plan:'追加なし',kind:'cont',value:0,married:null}},
 deer:{
  v4:{plan:'V4',kind:'once',married:'このこいびとと結婚した時にも、「こいびとのとき」の能力を発動できる（山札上3枚を見る）。結婚している間、自分のターン開始時に手札が1枚以下なら、「こいびとのとき」の能力を発動できる。'},
  v5:{plan:'V5',kind:'once',married:'結婚した時と、結婚している間の自分のターン開始時に手札が1枚以下の時にも、「こいびとのとき」の能力を発動できる（結婚した時は山札上3枚を見る）。'},
  m:{plan:'結婚した時だけ',kind:'once',value:2.5,married:'このこいびとと結婚した時にも、「こいびとのとき」の能力を発動できる（山札上3枚を見る）。'},
  two:{plan:'結婚した時も2枚（こいびとのときと同じ）',kind:'once',married:'結婚した時と、結婚している間の自分のターン開始時に手札が1枚以下の時にも、「こいびとのとき」の能力を発動できる。'},
  s:{plan:'ターン開始時だけ',kind:'event',value:0.4,married:'結婚している間、自分のターン開始時に手札が1枚以下なら、「こいびとのとき」の能力を発動できる。'}},
 spider:{
  v4:{plan:'V4（V2 A）',kind:'once',married:'このこいびとと結婚した時、自分の捨て札の「みにつける」のカード1枚を手札に戻す。'},
  top:{plan:'V5案（山札の上）',kind:'once',value:1.5,married:'このこいびとと結婚した時、自分の捨て札の「みにつける」のカード1枚を山札の一番上に置く。'}}};
export const VKEYS=[['gorilla','P-gentle_gorilla'],['snow','P-snow_spirit'],['cactus','P-oasis_cactus'],['spider','P-knitting_spider'],['deer','P-grove_deer']];
export const FINAL={gorilla:'v3n',snow:'v5',cactus:'v4',spider:'top',deer:'two'};
// CPU（中級だけ）：結婚後の能力の目安の価値。once は結婚の価値に足し、cont／event は残りの自分のターン数で重み付け。
export const CPU_VALUE={'P-anglerfish':3,'P-cat_ceo':4,'P-cliff_goat':1,'P-desert_scorpion':3,'P-field_cow':1.2,'P-forest_bear':0.8,'P-gentle_gorilla':1.2,
 'P-grove_deer':4,'P-high_eagle':3,'P-knitting_spider':3,'P-oasis_cactus':1.8,'P-robot_neighbor':1.8,'P-rock_octopus':0.6,'P-sea_mermaid':1.5,'P-snow_spirit':6,
 'P-snowman':0.5,'P-sunflower_partner':0.8,'P-swamp_croc':0.6};

// 正式の RULES を上書きせず、写しの rules.mjs の最後で18件を組み替える（追加分には v4:true の印）。
const RULES_APPENDIX=`
// ---- lover-marriage-v5 試遊：恋人18種類の「♥ 結婚したら」（未承認） ----
{const V=__V5__,M='v4Married',NM={not:'v4Married'},R=(id,f)=>{if(!(V.off??[]).includes(id))RULES[id]=f(RULES[id]);},T=t=>({...t,v4:true});
 const keep=(r,i,extra)=>r.triggers.map((t,j)=>j===i?{...t,...extra}:t);
 R('P-anglerfish',r=>({...r,triggers:[...r.triggers,T({when:'marriage',mandatory:true,steps:[{op:'search',n:4,filter:{cardId:'W-deepsea'},max:1,min:0,reveal:true}]})]}));
 R('P-cat_ceo',r=>({...r,triggers:[...r.triggers,T({when:'marriage',mandatory:true,steps:[draw(),{op:'discount',action:'action',type:'play',n:1}]})]}));
 R('P-cliff_goat',r=>({...r,triggers:[...keep(r,0,{limitGroup:'goat'}),T({when:'worldChange',condition:{all:['changedName',M]},steps:[draw()],once:true,limitGroup:'goat'})]}));
 R('P-desert_scorpion',r=>({...r,triggers:[...r.triggers,T({when:'marriage',mandatory:true,target:'ownDiscardPlayOrItem',steps:[move()]})]}));
 R('P-field_cow',r=>({...r,triggers:r.triggers.map(t=>({...t,steps:[{op:'look',v4Swap:true}]}))}));
 R('P-forest_bear',r=>({...r,replacements:[...r.replacements,{kind:'move',scope:'self',to:['hand'],replace:'stay',optional:true,limit:'round',cost:'attachedDiscard',condition:M,v4:true}]}));
 if(V.gorilla==='v4')R('P-gentle_gorilla',r=>{const t=r.triggers[0],{handCost,...free}=t;return {...r,triggers:[{...t,limitGroup:'gorilla'},T({...free,limitGroup:'gorilla',condition:{all:[t.condition,M]}})]};});
 if(V.gorilla==='v2b')R('P-gentle_gorilla',r=>{const t=r.triggers[0];return {...r,triggers:[{...t,limitGroup:'gorilla'},T({...t,limitGroup:'gorilla',condition:{all:['ownChallenge','challengeWisdom','mainWisdomLower',M]},steps:[stat(0,2,'challenge')]})]};});
 if(V.gorilla==='v3n')R('P-gentle_gorilla',r=>({...r,triggers:[...r.triggers,T({when:'marriage',mandatory:true,target:'ownMain',steps:[stat(2,0,'turn')]})]}));
 if(V.gorilla==='g4')R('P-gentle_gorilla',r=>{const t=r.triggers[0];return {...r,triggers:[{...t,limitGroup:'gorilla'},T({...t,limitGroup:'gorilla',condition:{all:['ownChallenge','challengePower',M]}})]};});
 {const dv=V.deer??'v5',dm=dv!=='s',ds=dv!=='m';R('P-grove_deer',r=>({...r,triggers:[...keep(r,0,{limitGroup:'deer'}),...(dm?[T({when:'marriage',steps:[search(dv==='two'?2:3)],once:true,limitGroup:'deer'})]:[]),...(ds?[T({when:'start',condition:{all:[M,'v4Hand1']},steps:[search(2)],once:true,limitGroup:'deer'})]:[])]}));}
 R('P-high_eagle',r=>({...r,triggers:[...r.triggers,T({when:'marriage',mandatory:true,steps:[draw()]})]}));
 if((V.spider??'v4')==='v4')R('P-knitting_spider',r=>({...r,triggers:[...r.triggers,T({when:'marriage',mandatory:true,target:'ownDiscardEquipment',steps:[move()]})]}));
 if(V.spider==='top')R('P-knitting_spider',r=>({...r,triggers:[...r.triggers,T({when:'marriage',mandatory:true,target:'ownDiscardEquipment',steps:[move('top')]})]}));
 if(V.cactus==='v4')R('P-oasis_cactus',r=>({...r,passive:[{condition:{all:[M,'sourceUnequipped']},power:1,wisdom:0,v4:true}]}));
 if(V.cactus==='b')R('P-oasis_cactus',r=>({...r,passive:[{condition:{all:[M,'sourceUnequipped']},power:0,wisdom:1,v4:true}]}));
 if(V.cactus==='c3')R('P-oasis_cactus',r=>({...r,triggers:[...(r.triggers??[]),T({when:'challenge',opponent:true,target:'ownMain',condition:{all:[M,'sourceUnequipped']},steps:[{op:'battleStat',n:1}],once:true})]}));
 R('P-robot_neighbor',r=>({...r,passive:[...r.passive,{condition:{all:[M,'ownTurn']},power:0,wisdom:1,v4:true}]}));
 R('P-rock_octopus',r=>({...r,activeMarried:{...r.active,condition:{all:['ownTurn','prepared2']},cost:0,v4:true}}));
 if(V.snow==='v4'||V.snow==='v5')R('P-snow_spirit',r=>({...r,triggers:[...r.triggers,T({when:'end',mandatory:true,condition:{all:[M,'v4Round10']},steps:[growth(5)]})]}));
 if(V.snow==='draw')R('P-snow_spirit',r=>({...r,triggers:[...r.triggers,T({when:'start',mandatory:true,condition:{all:[M,'v4Round10']},steps:[draw()]})]}));
 if(V.snow==='b')R('P-snow_spirit',r=>({...r,passive:[...(r.passive??[]),{condition:{all:[M,{value:'stage',op:'gte',n:7}]},power:0,wisdom:1,v4:true}]}));
 R('P-snowman',r=>({...r,triggers:r.triggers.map(t=>({...t,steps:[...t.steps,iff('v4EventWasMarried',[draw()])]}))}));
 R('P-sunflower_partner',r=>({...r,triggers:[...keep(r,0,{limitGroup:'sun'}),T({when:'time_skip',condition:M,target:'ownMain',steps:[stat(0,1)],once:true,limitGroup:'sun'})]}));
 R('P-swamp_croc',r=>({...r,triggers:[...keep(r,0,{limitGroup:'croc'}),T({when:'challengeResult',condition:{all:['tied',{not:'eventOwnChallenge'},M]},once:true,limitGroup:'croc',steps:[draw()]})]}));
}
`;
// うみのにんぎょ：世界樹②と同じ「1ターンに1回…してもよい」の時の軽減（costs.mjs）。
const COST_APPENDIX=`
// ---- lover-marriage-v4 試遊 ----
const V4_COST_RULES={'P-sea_mermaid':{mode:'partner',costModifiers:[{action:'world',predicate:'v4Married',n:1,optional:true,once:true}]}};
`;
const P=(label,from,to)=>[label,from,to];
export function engineFixes(){return {
 'engine.mjs':[
  P('version',"export const VERSION='hotseat-7';",`export const VERSION='${TRIAL_VERSION}';`),
  P('versions',"'hotseat-6',VERSION]);","'hotseat-6','hotseat-7',VERSION]);"),
  P('departure-stage',"const related=slot==='partner'&&p.relationship!==null;","const related=slot==='partner'&&p.relationship!==null,__relStage=p.relationship;"),
  P('departure-event',"relationshipEnded:related,","relationshipEnded:related,relationshipStage:related?__relStage:null,"),
  P('ability-v4',"index:t.program.limitKey??t.program.limitGroup??t.index,source:t.source,","index:t.program.limitKey??t.program.limitGroup??t.index,v4:!!t.program.v4,source:t.source,"),
 ],
 'effects.mjs':[
  P('filter-cardId',"function matches(s,id,f,l){const c=card(s,id);","function matches(s,id,f,l){const c=card(s,id);if(f.cardId&&c.id!==f.cardId)return false;"),
  P('target-play-item',"case 'ownDiscardEquipment':","case 'ownDiscardPlayOrItem':return p.discard.filter(id=>['play','item'].includes(card(s,id).type));case 'ownDiscardEquipment':"),
  P('look-swap',"case 'look':if(p.deck.length)return choose(s,'program_look',[{id:'top',label:'一番上に戻す'},{id:'bottom',label:'一番下に置く'}],l,{peek:[p.deck[0]]});break;",
   "case 'look':if(p.deck.length)return choose(s,'program_look',[{id:'top',label:'一番上に戻す'},{id:'bottom',label:'一番下に置く'},...(e.v4Swap&&p.relationship===4&&board(s,l.actor).partner===l.source?[{id:'hand',label:'手札に加え、手札1枚を山札の一番下へ'}]:[])],l,{peek:[p.deck[0]]});break;"),
  P('look-hand',"else if(q.kind==='program_look'){if(value==='bottom'&&p.deck.length)p.deck.push(p.deck.shift());}",
   "else if(q.kind==='program_look'){if(value==='bottom'&&p.deck.length)p.deck.push(p.deck.shift());if(value==='hand'&&p.deck.length){p.hand.push(p.deck.shift());h.log(s,`${l.actor}：見たカードを手札に加えた`);s.program.steps.unshift({op:'handBottom'});}}"),
  P('discount-type',"excludeType:e.excludeType,faceUp","excludeType:e.excludeType,type:e.type,faceUp"),
 ],
 'costs.mjs':[
  P('type-filter',"return actionMatches(e.action,action)&&(!e.excludedMethod","return actionMatches(e.action,action)&&(!e.type||e.type===c?.type)&&(!e.excludedMethod"),
  P('v4-rules',"r=COST_RULES[c?.id];","r=COST_RULES[c?.id]??V4_COST_RULES[c?.id];"),
  P('v4-predicate',"case 'self':return b.main===id;","case 'v4Married':return s.players[a].relationship===4&&b.partner===id&&!!b.main;case 'self':return b.main===id;"),
 ],
 'late-conditions.mjs':[
  P('v4-conditions'," switch(key){"," switch(key){\n case 'v4Married':return p.relationship===4&&b.partner===l.source;\n case 'v4Hand1':return p.hand.length<=1;\n case 'v4Round10':return s.round===10;\n case 'v4EventWasMarried':return ev.relationshipStage===4;"),
 ],
 'ability-copy.mjs':[
  P('octopus-married',"export function effectiveRule(s,source,base={}){","export function effectiveRule(s,source,base={}){\n if(base?.activeMarried){const o=s.cards[source]?.owner,q=o&&s.players[o];if(q&&q.board.partner===source&&q.relationship===4)base={...base,active:base.activeMarried};}"),
 ],
 'remaining-rules.mjs':[
  P('frogger-version',"['ownPreparedOther',['hotseat-6','hotseat-7']]",`['ownPreparedOther',['hotseat-6','hotseat-7','${TRIAL_VERSION}']]`),
  P('takoyaki-version',"['ownPreparedOther',['hotseat-5','hotseat-6','hotseat-7']]",`['ownPreparedOther',['hotseat-5','hotseat-6','hotseat-7','${TRIAL_VERSION}']]`),
 ],
};}
export function cpuFixes(variants=FINAL){const L=lovers(variants),VAL={...CPU_VALUE};for(const [k,id] of VKEYS)VAL[id]=VARIANTS[k][variants[k]].value??CPU_VALUE[id];for(const id of variants.off??[])VAL[id]=0;return {'cpu-policy.mjs':[
 P('policy-version',"export const POLICY_VERSION='heuristic-2';",`export const POLICY_VERSION='${TRIAL_POLICY}';`),
 P('policy-versions',"export const POLICY_VERSIONS=Object.freeze(['heuristic-1','heuristic-2']);",`export const POLICY_VERSIONS=Object.freeze(['heuristic-1','heuristic-2','${TRIAL_POLICY}']);`),
 P('policy-features',"'heuristic-2':{intermediate:{statChoice:true}}});",`'heuristic-2':{intermediate:{statChoice:true}},'${TRIAL_POLICY}':{intermediate:{statChoice:true,lover4:true}}});\nconst V4_VALUE=${JSON.stringify(VAL)},V4_KIND=${JSON.stringify(Object.fromEntries(Object.entries(L).map(([k,v])=>[k,v.cpuKind??v.kind])))};\nconst v4Worth=(id,o)=>{const v=V4_VALUE[id]??0,left=Math.max(0,10-(o.round??1));return V4_KIND[id]==='once'?v:v*left;};`),
 P('observation-flag',",o=observation,timed=timeOpportunity(o,prof);",",o={...observation,lover4:!!prof.lover4},timed=timeOpportunity(o,prof);"),
 P('lover-card',"if(c.type==='partner')return b.partner?2:12;","if(c.type==='partner')return b.partner?2:12+(o.lover4?Math.min(4,(V4_VALUE[c.cardId]??0)):0);"),
 P('place-lover',"if(a.slot==='partner')return 20+(b.main?6:0);","if(a.slot==='partner')return 20+(b.main?6:0)+(o.lover4?Math.min(4,(V4_VALUE[c?.cardId]??0)):0);"),
 P('marry',"if(a.kind==='relationship')return (p.relationship===3?28:17)-spend;","if(a.kind==='relationship')return (p.relationship===3?28+(o.lover4&&b.partner?v4Worth(b.partner.cardId,o):0):17)-spend;"),
 P('equip-letter',"if(a.slot==='prepared')return 7-spend+(b.main?2:0);","if(a.slot==='prepared')return 7-spend+(b.main?2:0)+(o.lover4&&c?.cardId==='I-partner1'&&p.relationship===4?4:0);"),
 P('misunderstanding'," if(a.program?.handCost)value-=cardValue(a.costCard,o)*.7;"," if(o.lover4&&c?.cardId==='E-misunderstanding'){const r=opp.relationship;value+=r===4?6+(opp.board.partner?Math.min(4,v4Worth(opp.board.partner.cardId,o)/2):0):r!==null&&r!==undefined&&r<=1?-3:0;}\n if(a.program?.handCost)value-=cardValue(a.costCard,o)*.7;"),
]};}
export function uiFixes(){return {
 'ui-presentation.mjs':[
  P('card-class',"${c.text?.length>140?' long-copy':''}","${(c.text?.length??0)+(c.married?.length??0)>(c.married?200:140)?' long-copy':''}${c.married?' lover-two':''}"),
  P('card-copy',"<p>${h(c.text)}</p></div>","${c.married?`<p class=\"lover-block\"><b>こいびとのとき</b>${h(c.text)}</p><p class=\"lover-block lover-married\"><b>♥ 結婚したら</b>${h(c.married)}</p>`:`<p>${h(c.text)}</p>`}</div>"),
  P('milestone-v4',"if(rows.some(r=>r.kind==='breakup'))return {kind:'breakup',title:'おわかれ',symbol:'♡'};","if(rows.some(r=>r.kind==='breakup'))return {kind:'breakup',title:'おわかれ',symbol:'♡'};\n if(rows.some(r=>r.kind==='lover4'))return {kind:'lover4',title:'結婚の能力！',symbol:'♥'};"),
  P('milestone-rows',"const eventRows=g.rows.filter(r=>['marriage','breakup','birth','main','finish'].includes(r.kind))","const eventRows=g.rows.filter(r=>['marriage','breakup','lover4','birth','main','finish'].includes(r.kind))"),
 ],
 'ui-results.mjs':[
  P('marriage-unlock',"rowSpecs.push({kind:'marriage',seat,ids:[p.board.main,p.board.partner].filter(Boolean),publicCards:true,text:'けっこん成立'});",
   "rowSpecs.push({kind:'marriage',seat,ids:[p.board.main,p.board.partner].filter(Boolean),publicCards:true,text:CARDS[after.cards[p.board.partner]?.cardId]?.married?'けっこん成立 · ♥ 結婚したら の能力が使えるようになった':'けっこん成立'});"),
  P('breakup-loss',"text:`${event.married?'けっこんした あいてと おわかれ':'こいびとと おわかれ'}（そだち−${event.penalty}）`});",
   "text:`${event.married?'けっこんした あいてと おわかれ':'こいびとと おわかれ'}（そだち−${event.penalty}）${CARDS[event.cardId]?.married?(event.married?' · こいびとの能力と ♥ 結婚の能力を失った':' · こいびとの能力を失った'):''}`});\n if(before)for(const event of events.filter(e=>e.kind==='ability'&&e.v4))rowSpecs.push({kind:'lover4',seat:event.actor,ids:[event.source],publicCards:true,text:`♥ 結婚したら の能力が発動`});"),
 ],
};}
export function lovers(variants=FINAL){const L=JSON.parse(JSON.stringify(LOVERS));for(const [k,id] of VKEYS){const x=VARIANTS[k][variants[k]];if(!x)throw Error('unknown variant '+k+':'+variants[k]);L[id]={...L[id],...x};if(!x.married)delete L[id].married;}for(const id of variants.off??[])delete L[id].married;return L;}
export function catalogAppendix(variants=FINAL){const L=lovers(variants);return `\n// ---- lover-marriage-v5 試遊：恋人18種類の「♥ 結婚したら」（未承認） ----\nfor(const [id,x] of Object.entries(${JSON.stringify(Object.fromEntries(Object.entries(L).filter(([,v])=>v.married).map(([k,v])=>[k,{married:v.married,...(v.text?{text:v.text}:{}),v4Plan:v.plan}])))}))Object.assign(CATALOG[id],x);\n`;}
function patch(text,from,to,label){const n=text.split(from).length-1;if(n!==1)throw Error(`patch ${label}: expected 1 match, found ${n}`);return text.replace(from,()=>to);}
export function applyV5(src,{cpu=true,ui=true,variants=FINAL}={}){
 variants={...FINAL,...variants};
 const out={...src};const lists=[engineFixes(),...(cpu?[cpuFixes(variants)]:[]),...(ui?[uiFixes()]:[])];
 for(const list of lists)for(const [f,items] of Object.entries(list))for(const [label,a,b] of items)out[f]=patch(out[f],a,b,`${f}:${label}`);
 out['rules.mjs']+=RULES_APPENDIX.replace('__V5__',JSON.stringify(variants));out['costs.mjs']+=COST_APPENDIX;out['full-catalog.mjs']+=catalogAppendix(variants);
 return out;
}
