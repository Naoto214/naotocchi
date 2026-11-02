const actor=(level,x,y,id='parent',species='dog')=>({id,species,level,x,y});
const base=(actors,extra={})=>({w:8,h:8,gravity:false,gravityRules:'supported-v1',movementRules:'contact-v2',terrainRules:'magic-gate-v2',splitRules:'recombine-once-v1',splitPriority:'D',timeHand:{maxSteps:7,resetHeading:false,passGenerated:false},actors,walls:[],gates:[],exits:[],spikes:[],water:[],...extra});
const corridor=y=>Array.from({length:8},(_,x)=>[[x,y-1],[x,y+1]]).flat();
export const stages=[
 {title:'めざめ',difficulty:1,text:'石の床の向こうに、小さな光が見える。',goal:'いぬを選んで、光の出口へ。',hint:'右へ3マス進もう。',board:base([actor(1,2,2)],{walls:corridor(2),exits:[{x:5,y:2}]})},
 {title:'はじめての分裂',difficulty:1,text:'トゲへ進むと、うしろに小さな自分が！',goal:'1をひとつ生み、ふたりとも「＝1」の出口へ。',hint:'右のトゲへ。先に本体を出口へ、そのあと小さな1を動かそう。',board:base([actor(2,3,3)],{walls:corridor(3),spikes:[{x:4,y:3,power:1}],exits:[{x:5,y:3,exact:1}]})},
 {title:'時の針',difficulty:1,text:'うしろへ、うしろへ。時の針がまっすぐ伸びる。',goal:'2体の1を生み、3体とも出口へ。',hint:'右へ分裂。右にいる1から順番に出口へ送ろう。',board:base([actor(3,4,5)],{walls:corridor(5),spikes:[{x:5,y:5,power:2}],exits:[{x:6,y:5,exact:1}]})},
 {title:'曲がり角',difficulty:2,text:'石の壁に出会うと、針は時計回りに曲がった。',goal:'壁で90度曲がる分裂を見て、全員脱出。',hint:'右のトゲへ。後ろの針は左、壁の前で上へ。',board:base([actor(4,4,4)],{walls:[[2,4],[2,5],[3,5],[4,5],[5,5]],spikes:[{x:5,y:4,power:3}],exits:[{x:6,y:4,exact:1}]})},
 {title:'再会',difficulty:2,text:'同じ姿の仲間と、時間を合わせよう。',goal:'同じ種族の2と2を合わせ、「＝4」の出口へ。',hint:'下へ進んで合体。そこから右へ2マス。',board:base([actor(2,3,2),actor(2,3,4,'friend')],{walls:[[2,2],[2,3],[2,4],[4,2],[4,3],[3,5],[4,5],[5,5]],exits:[{x:5,y:4,exact:4}]})},
 {title:'石の迷路',difficulty:2,text:'左へ、上へ、右へ。石の間を針が進む。',goal:'2回曲がる針から、7体を出口へ送ろう。',hint:'右へ分裂。左へ伸びた針は、壁と天井で2回曲がるよ。',board:base([actor(7,5,5)],{walls:[[2,5],[3,3],[4,3],[5,3],[6,3]],spikes:[{x:6,y:5,power:6}],exits:[{x:7,y:5,exact:1}]})},
 {title:'仲間の力',difficulty:3,text:'「針の前に立ってみるね」かえるが道を変える。',goal:'かえるを動かして分裂の道を変え、全員脱出。',hint:'かえるを下へ1マス。それからいぬを右のトゲへ。',board:base([actor(4,4,5),actor(1,2,4,'friend','frog')],{walls:[[2,3],[3,3],[4,3]],spikes:[{x:5,y:5,power:3}],exits:[{x:6,y:5,exact:1}]})},
 {title:'ななめの道',difficulty:3,text:'ななめに進んでも、針は時計回り。閉じた角には入れない。',goal:'右下のトゲへ斜めに入り、全員出口へ。',hint:'右下へ。後ろは左上、岩に会ったら右上へ曲がるよ。',board:base([actor(4,4,2)],{walls:[[2,0],[2,1],[3,0]],spikes:[{x:5,y:3,power:3}],exits:[{x:6,y:3,exact:1}]})},
 {title:'地下回廊',difficulty:3,text:'石の足場から一歩。落ちた時間が、またひとつになる。',goal:'足場からトゲへ進み、落下と合体で4を取り戻そう。',hint:'右へ分裂。落ちた時間を集めて、床の「＝4」の出口へ。',board:base([actor(4,4,4)],{gravity:true,walls:[[3,4],[4,5]],spikes:[{x:5,y:4,power:3}],exits:[{x:6,y:7,exact:4}]})},
 {title:'地下牢の出口',difficulty:3,text:'石の向こうにも仲間がいた。みんなの時間を合わせよう。',goal:'曲がる針で分裂し、仲間と5になって出口へ。',hint:'右のトゲを渡ろう。1ずつ右側へ渡し、同じ種族の仲間と合わせて5へ。',board:base([actor(4,3,4),actor(1,6,4,'friend')],{walls:[...Array.from({length:8},(_,y)=>[4,y]).filter(p=>p[1]!==4),[1,4]],spikes:[{x:4,y:4,power:3}],exits:[{x:7,y:4,exact:5}]})}
].map((s,i)=>({...s,number:i+1,id:String(i+1).padStart(2,'0'),scene:i<3?'cell':i<6?'moss':i<9?'hall':'dawn',board:{...s.board,id:`time-hand-dungeon-${i+1}-v5`}}));
export const roadmap=['地下牢','地底洞窟','古城','光の森','水の谷','雪山','砂漠遺跡','深海遺跡','星の回廊','時の塔'];
