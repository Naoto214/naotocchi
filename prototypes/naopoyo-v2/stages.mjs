const a=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
const spike=(x,y,power)=>({x,y,power});
const closedExcept=cells=>{const walls=[];for(let y=0;y<7;y++)for(let x=0;x<7;x++)if(!cells.some(p=>p[0]===x&&p[1]===y))walls.push([x,y]);return walls};
const scene=(id,title,lesson,tags,actors,extra={})=>({id,title,lesson,tags,w:7,h:7,theme:'grove',walls:[],gates:[],spikes:[],exits:[{x:6,y:3}],gravity:false,actors,...extra});
export const stages=[
 scene('V01','ひと筆で、1 → 3 → 6 → 7','いぬ1から右へ、指を離さずなぞろう。数字は足し算で育つ。',['chain'],[a('a',0,3),a('b',1,3,2),a('c',2,3,3),a('d',3,3)],{gates:[{x:5,y:3,exact:7}]}),
 scene('V02','ちがう段階も、ひとつに','2を3へ。2＋3＝5、そのまま星へ。',['2+3'],[a('a',1,3,2),a('b',3,3,3)]),
 scene('V03','8まで、いっしょ','5から3へなぞると8に。いちばん大きな姿で帰ろう。',['5+3'],[a('a',1,3,5,'penguin'),a('b',3,3,3,'penguin')],{theme:'snow'}),
 scene('V04','9には、ならない','5＋4は合体できない。指を離さず上か下へ回り、別々に星へ。',['5+4'],[a('a',1,3,5),a('b',3,3,4)]),
 scene('V05','5から、3つの1','3連トゲへ。5は2＋1＋1＋1に。散らばった子もみんな星へ。',['split5'],[a('a',2,3,5)],{spikes:[spike(3,3,3)]}),
 scene('V06','2は、1と1','3連でも、2から取り出せる1はひとつだけ。',['split2'],[a('a',2,3,2,'frog')],{spikes:[spike(3,3,3)]}),
 scene('V07','空いているぶんだけ','空きは2マス。3連トゲでも、5は3＋1＋1になる。',['partial'],[a('a',1,3,5)],{walls:closedExcept([[0,3],[1,3],[2,3],[3,3]]),spikes:[spike(2,3,3)],exits:[{x:3,y:3}]}),
 scene('V08','生まれる場所がなくても','門の上からトゲへ。空きがないから、そのまま5で通れる。',['no-space'],[a('a',1,3,5)],{walls:closedExcept([[1,3],[2,3],[3,3]]),gates:[{x:1,y:3,open:true}],spikes:[spike(2,3,3)],exits:[{x:3,y:3}]}),
 scene('V09','1なら、すいすい','1はこれ以上わかれない。どのトゲも止まらず通れる。',['minimum'],[a('a',0,3)],{spikes:[spike(1,3,1),spike(2,3,2),spike(3,3,3)]}),
 scene('V10','集まって、わかれて、また集まる','2と3を合体→トゲで分裂→後ろの1を吸収。指はそのまま。',['remerge'],[a('a',1,3,2),a('b',2,3,3)],{spikes:[spike(3,3,3)]}),
 scene('V11','トゲの上でも、つながる A','2をトゲ上の3へ。先に5へ合体、そのあと2＋1＋1＋1に。',['occupied-A'],[a('a',2,3,2),a('b',3,3,3)],{spikes:[spike(3,3,3)]}),
 scene('V12','トゲの上では、待っている B','比較用：トゲ上の子へは進入できない。先に3を動かしてみよう。',['occupied-B'],[a('a',2,3,2),a('b',3,3,3)],{spikes:[spike(3,3,3)],occupiedSpikeMode:'block'}),
 scene('V13','落ちても、ひと筆','移動のたびに下へ。落下後も同じ子を操作。指を動かす方向で続けられる。',['gravity'],[a('a',1,1),a('b',2,6,2),a('c',4,6,3)],{spikes:[spike(3,6,2)],exits:[{x:6,y:6}],gravity:true,theme:'cave'}),
 scene('V14','それぞれの帰り道','同じ種族だけ合体できる。いぬ・かえる・魚をそれぞれ星へ。',['mixed'],[a('a',0,2,2),a('b',2,2,3),a('c',0,4,2,'frog'),a('d',2,4,3,'frog'),a('e',4,3,1,'fish')],{theme:'shore'}),
 scene('V15','2歩先に、生まれる','1歩目の空きは後ろだけ。次はそこから届く2歩先。壁の向こうには出ない。',['two-step'],[a('a',2,3,5)],{walls:[[2,2],[3,2],[4,2],[3,4],[4,4],[2,4]],spikes:[spike(3,3,3)],gates:[{x:4,y:3,exact:2}]}),
 scene('V16','1つずつ、ほどける','通常トゲを続けて通ると、5→4→3。指を離す必要はない。',['single'],[a('a',1,3,5)],{spikes:[spike(2,3,1),spike(3,3,1)]}),
 scene('V17','2つずつ、ほどける','2連を続けて通ると5→3→1。生まれた1も連れて帰ろう。',['double'],[a('a',1,3,5,'fish')],{spikes:[spike(2,3,2),spike(3,3,2)],theme:'shore'}),
 scene('V18','斜めにも、ひと筆','壁の角でも移動先が空いていれば通れる。斜め進入でも後ろから生まれる。',['diagonal'],[a('a',1,4,5,'penguin')],{walls:[[2,4],[1,3]],spikes:[spike(2,3,3)],theme:'snow'}),
];
