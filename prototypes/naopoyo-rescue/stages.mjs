const a=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
const base=(id,title,lesson,actors,extra={})=>({id:String(id).padStart(2,'0'),title,lesson,w:8,h:6,walls:[],exits:[{x:6,y:2}],spikes:[],gates:[],actors,...extra});
const fence=[0,1,3,4,5].map(y=>[3,y]);
export const stages=[
base(1,'はじめての救出','なおぽよから出口まで、指でなぞろう。',[a('a',1,2)]),
base(2,'ふたりで、ひとつ','同じ種族・同じ段階の2体で、ひとつ上へ。',[a('a',1,2),a('b',3,2)],{exits:[{x:6,y:2,exact:2}]}),
base(3,'ぷにっと連続合体','01＋01→02。もう1体の02と合体して03へ。',[a('a',1,2),a('b',2,2),a('c',4,2,2)],{exits:[{x:6,y:2,exact:3}]}),
base(4,'とげで、ふたりに','トゲで1段階下の2体に。残った子も救出しよう。',[a('a',1,2,2)],{spikes:[[2,2]],exits:[{x:6,y:2,max:1}]}),
base(5,'もう一度、ひとつに','分裂したら、トゲを離れた場所で再合体。',[a('a',1,2,2)],{spikes:[[2,2]],walls:[...[0,1,2,3,4,5,6,7].flatMap(x=>[[x,1],[x,3]])],exits:[{x:6,y:2,exact:2}]}),
base(6,'小さな抜け道','01だけが通れる出口へ。曲がり道を進もう。',[a('a',1,3,2)],{spikes:[[2,3]],walls:[[3,3],[3,4],[3,5],[3,0]],exits:[{x:6,y:1,max:1}]}),
base(7,'番人の約束','02で番人を開けた後、分裂して小さな出口へ。',[a('a',1,2),a('b',2,2)],{walls:fence,gates:[{x:3,y:2,min:2,required:true}],spikes:[[4,2]],exits:[{x:6,y:2,max:1}]}),
base(8,'それぞれの帰り道','出口の種族アイコンを見て、それぞれの帰り道へ。',[a('a',1,2),a('f',1,4,1,'fish')],{exits:[{x:6,y:2,species:'dog'},{x:6,y:4,species:'fish'}]}),
base(9,'なかまの階段','さかなを足場に1段登ろう。上→右で着地。最後にさかなも救出。',[a('a',2,4),a('f',3,4,1,'fish')],{gravity:true,walls:[[4,3],[4,4],...[0,1,2,3,4,5,6,7].map(x=>[x,5])],exits:[{x:5,y:2,species:'dog'},{x:1,y:4,species:'fish'}]}),
base(10,'みんなで帰ろう','合体して番人へ。分裂した全員と、さかなも出口へ。',[a('a',1,2),a('b',2,2),a('f',1,4,1,'fish')],{gates:[{x:3,y:2,min:2,required:true}],spikes:[[4,2]],walls:[...fence,[4,3],[5,3]],exits:[{x:7,y:2,species:'dog',max:1},{x:7,y:4,species:'fish',exact:1}]}),
base(11,'ペンギンの大きな約束','03どうしで04へ。番人を開けたら03に分かれて帰ろう。',[a('p',1,2,3,'penguin'),a('q',2,2,3,'penguin')],{walls:fence,gates:[{x:3,y:2,species:'penguin',min:4}],spikes:[[5,2]],exits:[{x:6,y:2,species:'penguin',exact:3}]}),
base(12,'かえるの小さな鍵','先に01へ分裂して開門。向こう側で02に戻ろう。',[a('r',1,2,2,'frog')],{walls:fence,spikes:[[2,2]],gates:[{x:3,y:2,species:'frog',max:1}],exits:[{x:6,y:2,species:'frog',exact:2}]})
];

