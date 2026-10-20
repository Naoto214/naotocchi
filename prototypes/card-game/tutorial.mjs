// Practice-only fixed positions. All transitions use the unchanged canonical engine.
// Never pass these fixtures to match save/restore: progress stores lesson coordinates only.
import {CARDS,DEFAULT_DECK,createGame,legalActions,act,actor,view,validate,validateDeck} from './engine.mjs';
export const LEARNING_KEY='naotocchi-learning-v1';
const required=['M-turtle-01','M-turtle-03','M-starfish-01','M-cat-03','M-beetle-07','C-box','C-cat_friend','C-shiba','P-cliff_goat','W-forest','I-c_coin2','I-bowtie','G-curling-ice','G-area-claim','E-first-date'];
export const PRACTICE_DECK=Object.freeze([...new Set([...required,...DEFAULT_DECK,...Object.keys(CARDS)])].slice(0,40));
validateDeck(PRACTICE_DECK);
function put(s,seat,cardId,zone='hand',target=null){
 const p=s.players[seat],id=Object.keys(s.cards).find(id=>s.cards[id].owner===seat&&s.cards[id].cardId===cardId);
 if(!id)throw Error('練習カードがありません：'+cardId);
 for(const k of ['hand','deck','discard'])p[k]=p[k].filter(x=>x!==id);
 for(const k of ['main','partner','world'])if(p.board[k]===id)p.board[k]=null;
 p.board.companions=p.board.companions.filter(x=>x!==id);p.board.prepared=p.board.prepared.filter(x=>x.id!==id);
 if(['main','partner','world','companions','prepared'].includes(zone))s.cards[id].generation++;
 if(['main','partner','world'].includes(zone))p.board[zone]=id;
 else if(zone==='companions')p.board.companions.push(id);
 else if(zone==='prepared')p.board.prepared.push(target?{id,target,targetGeneration:s.cards[target].generation}:{id,faceDown:true,setSerial:s.serial-1});
 else p[zone].push(id);
 if(zone==='partner')p.relationship=0;
 return id;
}
function fixed({round=5,turn='A',mainA='M-turtle-01',mainB='M-starfish-01',handA=[],handB=[],growthA=20,growthB=20}={}){
 const s=createGame(214,{A:PRACTICE_DECK,B:PRACTICE_DECK});
 Object.assign(s,{round,turn,serial:(round-1)*2+(turn==='A'?1:2),phase:'normal',priority:turn,choice:null,window:'normal',passes:0,pending:[],chain:[],log:[],history:[]});
 for(const seat of ['A','B']){const p=s.players[seat];p.deck.push(...p.hand);p.hand=[];p.time=round;p.growth=seat==='A'?growthA:growthB;}
 if(mainA)put(s,'A',mainA,'main');if(mainB)put(s,'B',mainB,'main');
 for(const id of handA)put(s,'A',id);for(const id of handB)put(s,'B',id);
 validate(s);return s;
}
function command(s,predicate){const a=legalActions(s).find(predicate);if(!a)throw Error('固定局面で合法手が見つかりません');return act(s,actor(s),s.revision,a.id);}
function settle(s){
 // Only administrative choices and passes; no new ordinary actions or invented outcomes.
 for(let i=0;i<120;i++){
  if(['normal','finished'].includes(s.phase))return s;
  const actions=legalActions(s),a=actions.find(a=>a.kind==='skip')??actions.find(a=>a.kind==='pass')??actions[0];
  if(!a)throw Error('練習の自動進行を停止しました');s=act(s,actor(s),s.revision,a.id);
 }
 throw Error('練習の自動進行上限です');
}
const matches=(kind,extra={})=>(a,s)=>a.kind===kind&&Object.entries(extra).every(([k,v])=>k==='card'?s.cards[a.source]?.cardId===v:a[k]===v);
const item=(title,copy,match=null,extra={})=>({title,copy,match,...extra});
function chainFixture(){
 const s=fixed({turn:'B',round:5,handA:['G-area-claim'],handB:['I-c_coin2']});
 put(s,'A','C-box','companions');put(s,'A','C-cat_friend','companions');put(s,'A','C-shiba','companions');put(s,'A','P-cliff_goat','partner');put(s,'A','W-forest','world');put(s,'A','I-bowtie','prepared',s.players.A.board.main);
 // B has already activated its public card and passed; A may respond now.
 return command(command(s,a=>a.source&&s.cards[a.source].cardId==='I-c_coin2'&&a.kind==='play'),a=>a.kind==='pass');
}
export const LESSONS=[
 {title:'ゲームの目的',chapter:2,setup:()=>fixed({round:1,mainA:null,mainB:null}),steps:[
  item('そだちを育てよう','そだちは20から始まります。相手のHPを削るゲームではありません。盤面の「そだち20」を確認しましょう。'),
  item('10ラウンドで人生をつくる','先攻A→後攻Bで1ラウンド。R10の最後にそだちを比べます。R1〜R9は、100到達後に始まる最初の相手ターン終了まで100を維持すれば早期勝利です。')],outcome:'100は即勝利ではなく、維持する時間が必要です。'},
 {title:'盤面とたまご',chapter:5,setup:()=>createGame(214,{A:PRACTICE_DECK,B:PRACTICE_DECK}),steps:[
  item('手札から1枚、山札の下へ','実際のR1開始局面です。通常ドローと、たまごの追加ドローが済みました。光る手札をタップし、内容を確認して返しましょう。',a=>a.kind==='choose',{settle:true}),
  item('盤面を見てみよう','上段の中央がメイン枠です。今はたまご。手札は自分だけ、捨て札は公開、山札の順序は非公開です。カードや枠をタップして確かめられます。')],outcome:'返却は非公開で山札の一番下へ。シャッフルしません。'},
 {title:'たんじょう',chapter:6,setup:()=>fixed({round:1,mainA:null,mainB:null,handA:['M-turtle-01']}),steps:[
  item('かめ①を選ぼう','光る手札のかめ①をタップ。通常時コストは1です。確認してたんじょうすると、メイン枠のたまごに完全に重なります。',matches('place',{variant:'birth',card:'M-turtle-01'}),{settle:true})],outcome:'時1を払い、かめ①がたんじょう。①以外へ直接たんじょうすることもできます。'},
 {title:'ときおくり・へんしん',chapter:7,setup:()=>fixed({handA:['M-turtle-03','M-starfish-01']}),steps:[
  item('かめ①→③：差分の時2','R5の固定局面です。同じ種族の後段階はときおくり。③を選び、時2を払って進みましょう。②は飛ばすので、その能力は使いません。',matches('place',{variant:'time_skip',card:'M-turtle-03'}),{settle:true}),
  item('かめ③→ヒトデ①：行き先の時1','別種族なのでへんしん。段階差ではなく、行き先①の時1を払います。旧メインは捨て札へ移ります。',matches('place',{variant:'transform',card:'M-starfish-01'}),{settle:true})],outcome:'時5→3→2。同種族の過去段階へは戻れず、別種族なら低段階にもへんしんできます。'},
 {title:'なかま・こいびと・セカイ',chapter:9,setup:()=>fixed({handA:['C-box']}),steps:[
  item('なかまを迎える','ただのはこをなかまに。基本の配置は時0です。なかまとこいびとは合わせて自分ターン1人までです。',matches('place',{slot:'companions'}),{settle:true}),
  item('別のターン：こいびとと交際開始','別のターンの固定局面に切り替えました。人物配置の回数が残っています。がけのヤギさんを迎え、交際0を始めましょう。',matches('place',{slot:'partner'}),{setup:()=>{const s=fixed({round:6,handA:['P-cliff_goat','W-forest']});put(s,'A','C-box','companions');return s;},settle:true}),
  item('セカイを配置する','もりを選び、時2で配置しましょう。セカイは自分に1枚。人物を出したターンにも配置できます。',matches('place',{slot:'world'}),{settle:true}),
  item('交際0→1へ','交際は自動では進みません。時1で進めるボタンを押しましょう。通常は自分ターンに1回です。',matches('relationship'),{settle:true}),
  item('別のターン：交際3→結婚','交際3まで進んだ別の固定局面です。時1で結婚へ進め、基本報酬のそだち+10を確認しましょう。',matches('relationship'),{setup:()=>{const s=fixed({round:9});put(s,'A','P-cliff_goat','partner');s.players.A.relationship=3;return s;},settle:true})],outcome:'なかま最大3、こいびと1、セカイ1。結婚で+10、別れ／離婚で−10。メインだけの離脱では関係は残ります。'},
 {title:'アクションカードと準備枠',chapter:11,setup:()=>fixed({round:6,handA:['I-c_coin2','I-bowtie','G-curling-ice','E-first-date']}),steps:[
  item('すぐつかう：ラッキーコイン','時1を払い、発動領域へ。今回は双方パスを自動で進め、解決した結果を履歴で確認します。準備枠は使いません。',matches('play',{card:'I-c_coin2'}),{settle:true}),
  item('みにつける：おべんとうばこ','時2で自分のメインに装備します。準備枠を1つ使い、対象が離れたら装備も捨て札になります。',matches('place',{card:'I-bowtie',slot:'prepared'}),{settle:true}),
  item('しかける：カーリング','時1を前払いして、準備枠へ裏向きに置きましょう。引き分けた時など、カードに書かれた条件が成立してから発動します。',matches('place',{card:'G-curling-ice',trap:true}),{settle:true}),
  item('できごとも使い方を確認','別の固定局面です。はじめてのデートは「すぐつかう」の、できごとカード。交際0のこいびとを対象に発動して、1枚ドローとそだち+5を確認しましょう。交際段階は進みません。',matches('play',{card:'E-first-date'}),{setup:()=>{const s=fixed({round:6,handA:['E-first-date']});put(s,'A','P-cliff_goat','partner');put(s,'A','I-bowtie','prepared',s.players.A.board.main);put(s,'A','G-curling-ice','prepared');return s;},settle:true})],outcome:'あそび・あいてむ・できごとの分類と、3つの使い方は別です。準備枠は共用3つで、自由に捨てたり交換したりできません。'},
 {title:'ちょうせん',chapter:12,setup:()=>fixed({mainA:'M-beetle-07',mainB:'M-turtle-01'}),steps:[
  item('ちからで比べる','両者にメインがいます。自分のちからが高い固定局面です。時0でちょうせんを宣言し、応答後の比較とそだち+5を確認しましょう。',matches('challenge',{parameter:'power'}),{settle:true}),
  item('ちえでも挑める','別の固定局面です。今度はちえで挑みましょう。同じ能力同士を比べます。勝者+5、敗者の基本ペナルティはありません。',matches('challenge',{parameter:'wisdom'}),{setup:()=>fixed({mainA:'M-cat-03',mainB:'M-turtle-01'}),settle:true})],outcome:'自分ターン1回。たまごは挑戦できず、挑まれません。比較前に参加メインが離れたら途中終了です。'},
 {title:'応答・チェーン',chapter:13,setup:chainFixture,steps:[
  item('相手ターンに、じんとりで応答','Bがラッキーコインを発動し、Bは追加発動せずパス済みです。自分の場には7枚ある固定局面。時3を使い、じんとりを重ねましょう。',matches('play',{card:'G-area-claim'})),
  item('自分は追加しない','発動したAに最初の追加発動の機会があります。「応答しない」でBへ渡しましょう。ターン終了ではありません。',matches('pass')),
  item('相手もパス → 逆順解決','Bも応答しない固定の進行を確認します。双方連続パスで、後に積んだじんとり→先のラッキーコインの順に解決します。',matches('pass')),
  item('結果と履歴を確認','じんとりでAのそだち+10。その後にBのラッキーコインが解決しました。解決中には新しく割り込めません。通常任意の誘発やしかけた札は、条件と機会に従います。')],outcome:'双方パスで最後の発動から解決。「応答しない」と「ターン終了」は別の操作です。'},
 {title:'ターン終了・勝利',chapter:14,setup:()=>fixed({round:9,turn:'B'}),steps:[
  item('R9の後攻ターンを終える','Bの通常行動です。終了を申し出て、相手も発動しない場合の終了処理とR10への進行を確認しましょう。',matches('pass'),{settle:true}),
  item('最後のターンの固定局面','R10後攻、Aのそだち25・Bは20の固定局面です。終了を申し出て、すべての終了処理後の最終比較を確認しましょう。',matches('pass'),{setup:()=>fixed({round:10,turn:'B',growthA:25,growthB:20}),settle:true})],outcome:'R10の最終比較でAが勝利。同値なら結婚状態に関係なく引き分けです。'}
];
export class TutorialSession{
 constructor(lesson=0,step=0){this.lesson=Number.isInteger(lesson)&&LESSONS[lesson]?lesson:0;this.step=0;this.state=LESSONS[this.lesson].setup();this.done=false;this.epoch=0;this.enter();const target=Math.min(Math.max(Number.isInteger(step)?step:0,0),this.definition.steps.length);for(let i=0;i<target;i++){const a=this.expectedAction;if(a)this.perform(a.id,this.state.revision,this.epoch);else this.next();}}
 get definition(){return LESSONS[this.lesson];}
 get current(){return this.definition.steps[this.step]??null;}
 get outcome(){return this.definition.outcome;}
 get expectedAction(){if(!this.current?.match)return null;const a=legalActions(this.state).find(a=>this.current.match(a,this.state));if(!a)throw Error('練習の指定操作が合法手にありません：'+this.current.title);return a;}
 get projection(){return view(this.state,'A');}
 enter(){if(this.current?.setup)this.state=this.current.setup();validate(this.state);this.epoch++;}
 perform(id,revision,epoch){if(revision!==this.state.revision||epoch!==this.epoch)return false;const a=this.expectedAction;if(!a||id!==a.id)return false;this.state=act(this.state,actor(this.state),revision,id);if(this.current.settle)this.state=settle(this.state);this.lastResult=view(this.state,'A');this.step++;this.done=this.step>=this.definition.steps.length;this.enter();return true;}
 // Read-only orientation pages advance without issuing an engine command.
 next(){if(this.done)return false;if(this.current?.match)return false;this.step++;this.done=this.step>=this.definition.steps.length;this.enter();return true;}
 prepareStep(){this.enter();}
}
export class LearningProgress{
 constructor(storage){this.storage=storage;this.data={lesson:0,step:0,completed:[],seen:false};try{const d=JSON.parse(storage.getItem(LEARNING_KEY));if(d&&Number.isInteger(d.lesson)&&LESSONS[d.lesson]&&Number.isInteger(d.step)&&d.step>=0&&d.step<=LESSONS[d.lesson].steps.length)this.data={lesson:d.lesson,step:d.step,completed:[...new Set((Array.isArray(d.completed)?d.completed:[]).filter(i=>Number.isInteger(i)&&LESSONS[i]))],seen:d.seen===true};}catch{}}
 save(patch){const next={...this.data,...patch};try{this.storage.setItem(LEARNING_KEY,JSON.stringify(next));this.data=next;return true;}catch{this.data=next;return false;}}
}
