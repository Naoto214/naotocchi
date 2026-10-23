// Append-only expansion. Existing stage definitions and engine rules stay intact.
const a=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
const column=(x,holes)=>Array.from({length:6},(_,y)=>[x,y]).filter(([,y])=>!holes.includes(y));
const floor=Array.from({length:8},(_,x)=>[x,5]);
const base=(id,title,lesson,actors,extra)=>({id:String(id),title,lesson,w:8,h:6,walls:[],exits:[],spikes:[],gates:[],actors,...extra});
export const advancedStages=[
 base(13,'大きな鍵、小さな四人','門の向こうで、段階3を四人の1へ。残した子の順番も考えよう。',
 [a('a',0,2),a('b',1,2),a('c',2,3,2)],{walls:column(3,[2]),gates:[{x:3,y:2,exact:3}],spikes:[[5,2]],exits:[{x:7,y:2,exact:1}]}),
 base(14,'四つにほどく約束','小さな門を渡ってから、四人の力をひとつに戻そう。',
 [a('p',0,2,3,'penguin')],{walls:column(3,[2]),gates:[{x:3,y:2,max:1}],spikes:[[1,2]],exits:[{x:7,y:2,exact:3,species:'penguin'}]}),
 base(15,'小さく、大きく、小さく','最初の門は1、次の門は2。合流する場所を選ぼう。',
 [a('r',0,2,2,'frog')],{walls:[...column(2,[2]),...column(5,[2])],gates:[{x:2,y:2,exact:1},{x:5,y:2,exact:2}],spikes:[[1,2],[6,2]],exits:[{x:7,y:2,exact:1}]}),
 base(16,'二重の番人','3で入り、2以下で出る。出口は1だけ。どこで分かれる？',
 [a('a',0,1),a('b',1,1),a('c',1,3,2)],{walls:[...column(2,[2]),...column(5,[2])],gates:[{x:2,y:2,min:3},{x:5,y:2,max:2}],spikes:[[3,2],[6,2]],exits:[{x:7,y:2,exact:1}]}),
 base(17,'逆向きの約束','いぬは合体して門へ。さかなは分裂して門へ。出口では逆の姿に。',
 [a('a',1,1),a('b',2,1),a('f',1,4,2,'fish')],{walls:column(3,[1,4]),gates:[{x:3,y:1,species:'dog',exact:2},{x:3,y:4,species:'fish',exact:1}],spikes:[[2,4],[5,1]],exits:[{x:7,y:1,species:'dog',exact:1},{x:7,y:4,species:'fish',exact:2}]}),
 base(18,'三人の分かれ道','全員1で最初の門へ。その先で二人組と一人に分かれて帰ろう。',
 [a('p',0,2,2,'penguin'),a('q',1,4,1,'fish')],{walls:[...column(2,[2]),...column(5,[1,4]),[6,2],[7,2]],gates:[{x:2,y:2,exact:1},{x:5,y:1,species:'penguin',exact:2},{x:5,y:4,species:'fish',exact:1}],spikes:[[1,2]],exits:[{x:7,y:1,species:'penguin',exact:2},{x:7,y:4,species:'fish',exact:1}],
 // Separate the final exits: each branch must receive the correct group.
 }),
 base(19,'ほどいて架ける階段','いぬを二人にして足場へ。かえるを送ったら、いぬを再合体。',
 [a('r',1,4,1,'frog'),a('a',2,4,2)],{gravity:true,walls:[...floor,[4,3],[4,4]],spikes:[[3,4]],exits:[{x:5,y:3,species:'frog',exact:1},{x:0,y:4,species:'dog',exact:2}]}),
 base(20,'上で待っている君','さかなの足場で上のいぬに会おう。さかなも二人のまま残さないで。',
 [a('a',1,4),a('b',5,2),a('f',2,4,2,'fish')],{gravity:true,walls:[...floor,[4,3],[4,4],[5,3]],spikes:[[3,4]],exits:[{x:6,y:4,species:'dog',exact:2},{x:0,y:4,species:'fish',exact:2}]}),
 base(21,'最後の足場係','二人の旅人を先に高い出口へ。足場のいぬは最後にひとつへ。',
 [a('p',0,3,1,'penguin'),a('r',1,4,1,'frog'),a('a',2,4,2)],{gravity:true,walls:[...floor,[4,3],[4,4],[5,3],[3,2]],spikes:[[3,4]],exits:[{x:5,y:2,species:'frog'},{x:6,y:4,species:'penguin'},{x:0,y:4,species:'dog',exact:2}]}),
 base(22,'三種族の鍵束','種族ごとに門と出口の段階が違う。分かれる場所と合流場所を選ぼう。',
 [a('a',0,1),a('b',1,1),a('f',1,3,2,'fish'),a('r',1,5,2,'frog')],{walls:column(3,[1,3,5]),gates:[{x:3,y:1,species:'dog',exact:2},{x:3,y:3,species:'fish',exact:1},{x:3,y:5,species:'frog',exact:2}],spikes:[[2,3],[5,1],[5,5]],exits:[{x:7,y:1,species:'dog',exact:1},{x:7,y:3,species:'fish',exact:2},{x:7,y:5,species:'frog',exact:1}]}),
 base(23,'空中の大きな鍵','さかなを足場に、上で合体して門へ。向こうで分裂、足場も回収。',
 [a('a',1,4),a('b',4,2),a('f',2,4,2,'fish')],{gravity:true,walls:[...floor,...column(5,[2]).filter(([,y])=>y!==5),[4,3],[4,4],[6,3],[7,3]],gates:[{x:5,y:2,species:'dog',exact:2}],spikes:[[3,4],[6,2]],exits:[{x:7,y:2,species:'dog',exact:1},{x:0,y:4,species:'fish',exact:2}]}),
 base(24,'みんなの帰り道、最後の橋','足場は最後まで残そう。いぬは大きな門、かえるは小さな門へ。',
 [a('r',0,3,1,'frog'),a('a',1,4),a('b',4,2),a('f',2,4,2,'fish')],{gravity:true,walls:[...floor,...column(5,[1,2]).filter(([,y])=>y!==5),[4,3],[4,4],[6,3],[7,3]],gates:[{x:5,y:2,species:'dog',exact:2},{x:5,y:1,species:'frog',exact:1}],spikes:[[3,4],[6,2]],exits:[{x:7,y:2,species:'dog',exact:1},{x:7,y:1,species:'frog',exact:1},{x:0,y:4,species:'fish',exact:2}]})
];
