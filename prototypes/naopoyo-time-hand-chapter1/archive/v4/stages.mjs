const actor=(level,x,y,id='parent',species='dog')=>({id,species,level,x,y});
const base=(actors,extra={})=>({w:8,h:8,gravity:false,gravityRules:'supported-v1',movementRules:'contact-v2',terrainRules:'magic-gate-v2',splitRules:'recombine-once-v1',splitPriority:'D',timeHand:{maxSteps:7,resetHeading:false,passGenerated:false},actors,walls:[],gates:[],exits:[],spikes:[],water:[],...extra});
export const stages=[
 {title:'目覚め',difficulty:1,text:'ここは……？ あの光まで、歩いてみよう。',goal:'光の出口へ、みんなで進もう。',hint:'いぬを選んで、右へ4マス。',board:base([actor(1,1,4)],{walls:Array.from({length:8},(_,x)=>[[x,3],[x,5]]).flat(),exits:[{x:5,y:4}]})},
 {title:'最初のトゲ',difficulty:1,text:'ちくっ。小さなぼくが、うしろに！',goal:'1体に分裂し、合体して「＝2」の出口へ。',hint:'下のトゲへ。上へ戻って合体、右へ2マス。',board:base([actor(2,3,4)],{spikes:[{x:3,y:5,power:1}],exits:[{x:5,y:4,exact:2}]})},
 {title:'分かれた時間',difficulty:1,text:'分かれた時間が、まっすぐつづいている。',goal:'3体に分裂し、時間を集めて「＝4」へ。',hint:'下へ分裂。上へ3マス集めたら、右へ3マス。',board:base([actor(4,2,4)],{spikes:[{x:2,y:5,power:7}],exits:[{x:5,y:2,exact:4}]})},
 {title:'曲がる針',difficulty:2,text:'岩にぶつかると、針は右へ曲がった。',goal:'岩で90度曲がる分裂を使い、全員脱出。',hint:'下へ。上・上・右・右と集め、右上の出口へ。',board:base([actor(5,3,5)],{spikes:[{x:3,y:6,power:7}],walls:[[3,3]],exits:[{x:6,y:3,exact:5}]})},
 {title:'再会',difficulty:2,text:'ひとりじゃなかった。時間を合わせよう。',goal:'同じ種族の仲間と合体し、「＝4」の出口へ。',hint:'右へ進んで仲間と合体。そのまま出口へ。',board:base([actor(2,2,4),actor(2,4,4,'friend')],{exits:[{x:6,y:4,exact:4}]})},
 {title:'小さな迷路',difficulty:2,text:'曲がって、また曲がって。みんなを迎えに。',goal:'2回以上曲がる分裂。8まで集めて出口へ。',hint:'下へ分裂。上・上・右・右・下・下・左で回収。',board:base([actor(8,3,5)],{walls:[[3,3],[6,4],[5,7]],spikes:[{x:3,y:6,power:7}],exits:[{x:7,y:5,exact:8}]})},
 {title:'仲間の力',difficulty:3,text:'「ここで待つね。針の道を変えられるよ」',goal:'かえるで針の道を変え、全員で出口へ。',hint:'かえるを右へ。いぬは下へ分裂。時間を集めたら、かえるも出口へ。',board:base([actor(5,3,5),actor(1,2,3,'friend','frog')],{spikes:[{x:3,y:6,power:7}],exits:[{x:6,y:4}]})},
 {title:'斜めの道',difficulty:3,text:'「ぼくの上を通って。あとから行くよ」',goal:'仲間を足場に斜めのトゲへ。全員で出口へ。',hint:'いぬを右上へ。かえるの上で止まるよ。右の岩に乗って出口へ。残った仲間も忘れずに。',board:base([actor(2,2,6),actor(1,3,6,'friend','frog')],{gravity:true,walls:[[2,7],[3,7],[4,6],[4,7],[1,5],[2,4]],spikes:[{x:3,y:5,power:1}],exits:[{x:5,y:7},{x:5,y:5}]})},
 {title:'閉ざされた扉',difficulty:3,text:'古い門の向こうから、なつかしい声がする。',goal:'分裂して「＝1」の門を通り、全員脱出。',hint:'下のトゲへ。1のまま門を右へ通ろう。残った1も同じ門へ。',board:base([actor(2,2,4)],{walls:Array.from({length:8},(_,y)=>[4,y]).filter(p=>p[1]!==4),spikes:[{x:2,y:5,power:1}],gates:[{x:4,y:4,exact:1}],exits:[{x:6,y:4}]})},
 {title:'囚われの恋人',difficulty:3,text:'「見つけた」「待ってた。今度は、ふたりで」',goal:'分かれた時間を集め、恋人と一緒に出口へ。',hint:'下へ分裂、上へ回収して3に。恋人は岩の部屋の左側から出られるよ。ふたりで右下の出口へ。',board:base([actor(3,2,4),actor(1,6,3,'partner','penguin')],{walls:[[5,2],[6,2],[7,2],[5,4],[6,4],[7,4],[7,3]],spikes:[{x:2,y:5,power:7}],exits:[{x:7,y:6}]})}
].map((s,i)=>({...s,number:i+1,id:String(i+1).padStart(2,'0'),scene:i<3?'cell':i<6?'moss':i<9?'hall':'dawn',board:{...s.board,id:`time-hand-dungeon-${i+1}-v1`}}));
export const roadmap=['地下牢','地底洞窟','古城','光の森','水の谷','雪山','砂漠遺跡','深海遺跡','星の回廊','時の塔'];
