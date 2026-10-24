import {expansionStages} from './expansion-stages.mjs';
const dog=(id,x,y,level)=>({id,x,y,level,species:'dog'});
const cat={name:'きまぐれなねこ',asset:'assets/characters/companions/cat_friend.png'};
const stage=(slug,number,title,actors,extra)=>({id:'komorebi-'+slug,number,title:`${number} ${title}`,w:8,h:8,revision:1,theme:'forest',showSpecies:false,gravity:true,walls:[],gates:[],spikes:[],exits:[],water:[],guests:[],events:[],actors,...extra,hint:extra.hints[0]});
export const stages=[
 stage('fall',11,'落ちる森',[dog('a',1,2,1),dog('b',3,6,2)],{
  difficulty:2,walls:[[1,3],[2,3],[3,7]],exits:[{x:6,y:7,exact:3}],
  discovery:'岩を離れ、落下先の仲間と自動合体する。',
  lesson:'岩の先には、下へ続く道。',story:'森の灯りをたどると、足もとの岩が途切れていた。下で仲間が、こちらを見上げている。',ending:'落ちた先で、ふたつの光がひとつになった。',
  hints:['触れる前から、重力は下向き。岩の上では止まるよ。','1の下にいる2と合わせたい。岩の右端を見よう。','上の1を右へ2マス。落ちて3になったら、右下の星へ。']
 }),
 stage('support',12,'支え合う仲間',[dog('a',1,7,4),dog('b',2,7,4),dog('c',0,7,2)],{
  difficulty:3,walls:[[3,6],[4,6],[4,7]],exits:[{x:4,y:5,exact:2},{x:3,y:7,exact:8}],
  discovery:'先に合体して段階8を作ると、合体しない安定した足場になる。',
  lesson:'同じ仲間でも、大きさで支え方が変わる。',story:'「みんな、すぐくっついちゃうね」岩の上から、ねこが首をかしげた。',narrator:cat,ending:'大きな仲間が、小さな仲間を高い星へ送り出した。',
  hints:['普通の仲間に落ちると合体。下が8なら、その上で止まれるよ。','4と4を先に合わせて、岩の左下に8を作ろう。','2を8の上へ、さらに右上の岩へ。2を上の星へ送ってから、8も下の星へ。']
 }),
 stage('last-friend',13,'最後のひとり',[dog('a',1,7,8),dog('b',0,7,4)],{
  difficulty:4,walls:[[2,6],[4,6],[5,6],[6,6]],gates:[{x:2,y:7,exact:8}],exits:[{x:4,y:5,exact:4},{x:7,y:7,exact:8}],
  discovery:'足場を残して先へ渡り、下の道から同じ足場を運び直す。最後に足場役を回収する。',
  lesson:'先へ進む仲間と、あとに残る仲間。',story:'星は見える。でも岩と岩のあいだには、もう一つのすきまがあった。「あとで、迎えにくるね」',ending:'最後のひとりも、星の向こうへ。森の奥で、木の葉が小さく揺れた。',
  hints:['8を先に帰すと、4は高い星へ届かない。','まず4を左の岩の上へ。8だけが、岩の下の門を通れるよ。','4を岩の上に残し、8を門の右のすきまへ運ぶ。4をその上に落として右上の星へ。最後に8を下の星へ。']
 })
];
stages.push(...expansionStages);
export const ids=stages.map(s=>s.id);
