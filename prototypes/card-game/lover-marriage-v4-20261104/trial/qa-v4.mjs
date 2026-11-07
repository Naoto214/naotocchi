// 試遊専用 QA：恋人18種類それぞれの「結婚直前（交際3）」「結婚中」を、その場で作る盤面。
// 保存しない（QA盤面の間は自動保存・戦績・保存ファイルの書き出しを止める）。正式版・通常の対戦には影響しない。
import {createGame,DEFAULT_DECK} from './engine.mjs';
export const QA_STATES={ready:'結婚直前（交際3・交際を進めると結婚）',married:'結婚中（追加能力が使える）',divorce:'結婚中・相手の番（相手がすれちがいを持つ）'};
// 能力を試すのに必要なカード（自分の手札・捨て札・山札の上、相手のメイン）。
const KIT={
 'P-anglerfish':{top:['W-deepsea'],world:'W-deepsea'},
 'P-cat_ceo':{hand:['G-crane-game-3d','G-dot-eater']},
 'P-cliff_goat':{world:'W-sea',hand:['W-snow']},
 'P-desert_scorpion':{discard:['G-dot-eater','I-bowtie'],hand:['G-dot-eater','I-ribbon']},
 'P-field_cow':{hand:['G-real-fishing']},
 'P-forest_bear':{equipLover:'I-bowtie'},
 'P-gentle_gorilla':{main:'M-dog-02',oppMain:'M-beetle-07'},
 'P-grove_deer':{},
 'P-high_eagle':{},
 'P-knitting_spider':{discard:['I-bowtie'],hand:['I-ribbon']},
 'P-oasis_cactus':{hand:['I-bowtie']},
 'P-robot_neighbor':{},
 'P-rock_octopus':{equipMain:['I-bowtie','I-ribbon']},
 'P-sea_mermaid':{discard:['W-snow'],hand:['W-sea']},
 'P-snow_spirit':{round:10},
 'P-snowman':{},
 'P-sunflower_partner':{main:'M-dog-03',hand:['M-dog-04','M-cat-03']},
 'P-swamp_croc':{oppMain:'M-dog-05'},
};
export function qaState(lover,state,seed=20261104){
 const kit=KIT[lover]??{};const s=createGame(seed,{A:[...DEFAULT_DECK],B:[...DEFAULT_DECK]});
 s.choice=null;s.pending=[];s.chain=[];s.phase='normal';s.window='normal';s.round=kit.round??6;s.turn=state==='divorce'?'B':'A';s.history=[];
 for(const a of ['A','B']){const p=s.players[a];p.deck.push(...p.hand.splice(0));p.time=s.round;p.growth=50;p.personUsed=false;p.relationshipUsed=false;p.challengeUsed=false;p.used=[];}
 const take=(a,c)=>{const p=s.players[a],x=p.deck.shift();s.cards[x].cardId=c;return x;};
 const put=(a,c,slot)=>{const id=take(a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;};
 put('A',kit.main??'M-dog-05','main');put('B',kit.oppMain??'M-dog-03','main');if(kit.world)put('A',kit.world,'world');
 const lov=put('A',lover,'partner');s.players.A.relationship=state==='ready'?3:4;
 const p=s.players.A;p.startPartner=lov;p.startPartnerGeneration=s.cards[lov].generation;p.startRelationship=p.relationship;p.startMain=p.board.main;p.startGeneration=s.cards[p.board.main].generation;
 for(const c of kit.hand??[])p.hand.push(take('A',c));for(const c of kit.discard??[])p.discard.push(take('A',c));
 for(const c of [...(kit.top??[])].reverse()){const id=take('A',c);p.deck.unshift(id);}
 const eq=(c,target)=>{const id=take('A',c);p.board.prepared.push({id,target,targetGeneration:s.cards[target].generation,attachedAt:0});};
 if(kit.equipLover)eq(kit.equipLover,lov);for(const c of kit.equipMain??[])eq(c,p.board.main);
 for(let i=0;i<3;i++)p.hand.push(take('A','G-dot-eater'));
 const o=s.players.B;o.hand.push(take('B','E-misunderstanding'),take('B','I-partner1'),take('B','G-dot-eater'));
 return s;
}
