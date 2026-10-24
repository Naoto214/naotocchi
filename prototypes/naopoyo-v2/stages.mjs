const a=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
const spike=(x,y,power)=>({x,y,power});
const closedExcept=cells=>{const walls=[];for(let y=0;y<7;y++)for(let x=0;x<7;x++)if(!cells.some(p=>p[0]===x&&p[1]===y))walls.push([x,y]);return walls};
const scene=(id,title,lesson,tags,actors,extra={})=>({id,title,lesson,tags,w:7,h:7,theme:'grove',walls:[],gates:[],spikes:[],exits:[{x:6,y:3}],gravity:false,actors,...extra});
export const stages=[
 scene('V01','ひと筆で、1 → 3 → 6 → 7','いぬ1から右へ、指を離さずなぞろう。数字は足し算で育つ。',['chain'],[a('a',0,3),a('b',1,3,2),a('c',2,3,3),a('d',3,3)],{gates:[{x:5,y:3,exact:7}]}),
 scene('V02','ちがう段階も、ひとつに','2を3へ。2＋3＝5、そのまま星へ。',['2+3'],[a('a',1,3,2),a('b',3,3,3)]),
 scene('V03','8まで、いっしょ','5から3へなぞると8に。いちばん大きな姿で帰ろう。',['5+3'],[a('a',1,3,5,'penguin'),a('b',3,3,3,'penguin')],{theme:'snow'}),
 scene('V04','8と1に、わかれてつながる','4を5へ。進入先に8、ひとつ前に1。8のまま、指を離さず続けよう。',['5+4','overflow'],[a('a',1,3,4),a('b',3,3,5)]),
 scene('V05','5から、3つの1','3連トゲへ。5は2＋1＋1＋1に。散らばった子もみんな星へ。',['split5'],[a('a',2,3,5)],{spikes:[spike(3,3,3)]}),
 scene('V06','2は、1と1','3連でも、2から取り出せる1はひとつだけ。',['split2'],[a('a',2,3,2,'frog')],{spikes:[spike(3,3,3)]}),
 scene('V07','空いているぶんだけ','空きは2マス。3連トゲでも、5は3＋1＋1になる。',['partial'],[a('a',1,3,5)],{walls:closedExcept([[0,3],[1,3],[2,3],[3,3]]),spikes:[spike(2,3,3)],exits:[{x:3,y:3}]}),
 scene('V08','生まれる場所がなくても','門の上からトゲへ。空きがないから、そのまま5で通れる。',['no-space'],[a('a',1,3,5)],{walls:closedExcept([[1,3],[2,3],[3,3]]),gates:[{x:1,y:3,open:true}],spikes:[spike(2,3,3)],exits:[{x:3,y:3}]}),
 scene('V09','1なら、すいすい','1はこれ以上わかれない。どのトゲも止まらず通れる。',['minimum'],[a('a',0,3)],{spikes:[spike(1,3,1),spike(2,3,2),spike(3,3,3)]}),
 scene('V10','ひと筆で、7から5、そして6','左から1→3→6→7→2連トゲで5。1マス戻って1を吸収し、6へ。',['remerge'],[a('a',0,3),a('b',1,3,2),a('c',2,3,3),a('d',3,3)],{spikes:[spike(4,3,2)]}),
 scene('V11','トゲの上でも、つながる','2をトゲ上の3へ。先に5へ合体、そのあと2＋1＋1＋1に。',['occupied'],[a('a',2,3,2),a('b',3,3,3)],{spikes:[spike(3,3,3)]}),
 scene('V12','7と7は、8と6','7から7へ。進入先は8、ひとつ前は6。どちらも星へ帰ろう。',['7+7'],[a('a',1,3,7),a('b',3,3,7)]),
 scene('V13','落ちて、1＋1','上の1を右へ。下の1と自然にくっついて2に。続けて右へ、星を目指そう。',['gravity','gravity-add'],[a('a',1,1),a('b',2,6)],{exits:[{x:6,y:6}],gravity:true,theme:'cave'}),
 scene('V14','それぞれの帰り道','同じ種族だけ合体できる。いぬ・かえる・魚をそれぞれ星へ。',['mixed'],[a('a',0,2,2),a('b',2,2,3),a('c',0,4,2,'frog'),a('d',2,4,3,'frog'),a('e',4,3,1,'fish')],{theme:'shore'}),
 scene('V15','2歩先に、生まれる','1歩目の空きは後ろだけ。次はそこから届く2歩先。壁の向こうには出ない。',['two-step'],[a('a',2,3,5)],{walls:[[2,2],[3,2],[4,2],[3,4],[4,4],[2,4]],spikes:[spike(3,3,3)],gates:[{x:4,y:3,exact:2}]}),
 scene('V16','1つずつ、ほどける','通常トゲを続けて通ると、5→4→3。指を離す必要はない。',['single'],[a('a',1,3,5)],{spikes:[spike(2,3,1),spike(3,3,1)]}),
 scene('V17','2つずつ、ほどける','2連を続けて通ると5→3→1。生まれた1も連れて帰ろう。',['double'],[a('a',1,3,5,'fish')],{spikes:[spike(2,3,2),spike(3,3,2)],theme:'shore'}),
 scene('V18','斜めにも、ひと筆','壁の角でも移動先が空いていれば通れる。斜め進入でも後ろから生まれる。',['diagonal'],[a('a',1,4,5,'penguin')],{walls:[[2,4],[1,3]],spikes:[spike(2,3,3)],theme:'snow'}),
 scene('V19','8と8は、そのまま','右へなぞっても8と8は合体しない。上下に回り道して、それぞれ帰ろう。',['8+8'],[a('a',1,3,8),a('b',2,3,8)]),
 scene('V20','落ちて、8と1','上の4を右へ。下の5と合体し、下に8、上に1が残る。',['gravity-overflow'],[a('a',1,1,4),a('b',2,6,5)],{exits:[{x:6,y:6}],gravity:true,theme:'cave'}),
 scene('V21','わかれた直後は、乗れる','3を右の2連トゲへ。生まれた1が上に乗り、すぐには合体しない。次の移動で通常に戻る。',['split-stack','foothold'],[a('a',2,5,3)],{spikes:[spike(3,5,2)],exits:[{x:6,y:6}],gravity:true,theme:'cave'}),
 scene('V22','ちがう種族は、足場','上のいぬを右へ。かえるの上に止まる。かえるが動けば、いぬも落ちる。',['mixed-gravity'],[a('a',1,1,2),a('b',2,6,1,'frog'),a('c',4,6,3)],{exits:[{x:6,y:6}],gravity:true,theme:'shore'}),
 scene('V23','すみっこでも、数字は頭の上','左上の1を右へ→右端で下へ。拡大した数字を見ながら、最後までひと筆。',['edge','digits','save-undo'],[a('a',0,0),a('b',2,0,2),a('c',6,0,3)],{exits:[{x:6,y:6}],theme:'snow'}),
 scene('V24','トゲの上の子も、足場','かえるを右上へ。トゲ上のいぬに乗り、指を離しても戻らない。右へ進んで、ふたりとも星へ。',['spike-foothold'],[a('a',2,6,1,'frog'),a('b',3,6,3)],{spikes:[spike(3,6,2)],exits:[{x:6,y:6}],gravity:true,theme:'cave'}),
];
