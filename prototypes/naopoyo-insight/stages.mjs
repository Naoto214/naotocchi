const actor=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
const barrier=(x,gap)=>Array.from({length:8},(_,y)=>[x,y]).filter(p=>p[1]!==gap);
const owl={id:'owl',name:'ものしりふくろう',category:'companion',asset:'assets/characters/companions/owl.png'};
const tide={id:'tide',kind:'wave',period:8000,warn:3000,on:600,rows:[4],dx:1,dy:0};
const light=(x,power=2)=>({id:'light',kind:'beam',period:8000,warn:3000,on:1800,cells:Array.from({length:8},(_,y)=>[x,y]),power});
const stage=(id,title,actors,extra)=>({id,title,showSpecies:true,w:8,h:8,revision:1,theme:'grove',walls:[],gates:[],spikes:[],exits:[],gravity:false,water:[],guests:[],events:[],narrator:owl,actors,...extra,hint:extra.hints[0]});
export const stages=[
 stage('I01','集まって、別々の星へ',[actor('a',0,4,1),actor('b',1,4,2)],{
  chapter:1,difficulty:1,insight:'門を通る数字と、帰る数字は違う。',
  lesson:'全員を星へ。門は3、星は2と1。トゲは1つずつほどきます。',
  walls:barrier(2,4),gates:[{x:2,y:4,exact:3}],spikes:[{x:4,y:4,power:1}],exits:[{x:7,y:3,exact:2},{x:7,y:5,exact:1}],
  hints:['まず、門と2つの星の数字を比べよう。','3で門を通った後に、2と1へ分かれる。','左の1を2へ重ね、そのまま3の門へ。'],
  story:'ふくろうが二つの星を指さした。「帰り道では、違う大きさになってもいいんだよ。」',ending:'一緒に通って、別々の星へ。どちらも同じ帰り道。',required:['gate','merge','split']
 }),
 stage('I02','余った3が、もう一つの鍵',[actor('a',1,3,6,'penguin'),actor('b',2,3,5,'penguin')],{
  chapter:4,difficulty:3,theme:'snow',insight:'余剰は失敗ではなく、もう一方の出口の鍵。',
  lesson:'6と5。星は8と3。8を超えた分は、動かす前のマスに残ります。',
  walls:barrier(4,2).filter(p=>p[1]!==5),gates:[{x:4,y:2,exact:8},{x:4,y:5,exact:3}],exits:[{x:7,y:2,exact:8},{x:7,y:5,exact:3}],
  hints:['二つの星の数字の合計は、今いる仲間の合計と同じ。','8より大きく合体すると、超えた分は後ろに残る。','6を5へ重ねよう。前に8、後ろに3ができる。'],
  story:'雪だるまの残した二つの足跡。大きな鍵だけでは、小さな扉は開かなかった。',ending:'余ったと思っていた光にも、帰るための役目があった。',required:['overflow']
 }),
 stage('I03','足場の友だちを、最後に',[actor('a',2,2,2),actor('b',3,6,3),actor('f',5,6,1,'frog')],{
  chapter:2,difficulty:4,theme:'grove',gravity:true,insight:'先に帰せる仲間を残して、登ったあとで迎えに行く。',
  lesson:'重力↓。犬は犬と合体。カエルは足場になります。犬の星は高い場所。',
  walls:[...Array.from({length:8},(_,x)=>[x,7]),[6,5],[7,5]],exits:[{x:6,y:4,exact:5,species:'dog'},{x:7,y:6,exact:1,species:'frog'}],
  hints:['高い星の一段下に、足場を作れないかな。','違う種族は合体せず、上に乗れる。カエルを先に帰さないで。','上の犬2を右へ落として犬3と合体。カエルの左から右上に登ろう。'],
  story:'「先に行ってて」と言った小さな友だち。その背中が、高い星へ届く一段になった。',ending:'最後に残したのは、置き去りにするためではなかった。',required:['merge','support']
 }),
 stage('I04','波が開ける、細い道',[actor('a',1,5,2,'fish'),actor('b',2,5,2,'fish')],{
  chapter:3,difficulty:3,theme:'shore',insight:'行けない門へ押し続けるより、一度波の道へ合わせる。',
  lesson:'波4の門は、4になって右向きの波で通れます。色の帯は上から5行目。',
  water:Array.from({length:32},(_,i)=>[i%8,3+Math.floor(i/8)]),walls:barrier(4,4),gates:[{x:4,y:4,exact:4,waveOnly:true}],spikes:[{x:5,y:5,power:2}],exits:[{x:7,y:4,exact:2,species:'fish'}],events:[tide],
  hints:['色のついた横一列と、波4の門を見よう。','4で波を受け、門の向こうで2と1と1に。1同士を結び直す。','二匹の2を合体し、門のすぐ左へ。波に押されたら指を保ったまま進める。'],
  story:'波は道を邪魔しているように見えた。けれど、門を開ける力も持っていた。',ending:'流れを味方にすると、細い道が広く感じられた。',required:['wave','gate','merge','split']
 }),
 stage('I05','光を浴びて、4を作る',[actor('a',1,4,5)],{
  chapter:6,difficulty:4,theme:'cave',insight:'光で分かれるだけでは足りない。一つだけ戻す。',
  lesson:'星は4と1。光は2つの1を取り出します。照射は金色の列。',
  walls:barrier(5,3).filter(p=>p[1]!==6),gates:[{x:5,y:3,exact:4},{x:5,y:6,exact:1}],exits:[{x:7,y:3,exact:4},{x:7,y:6,exact:1}],events:[light(3)],
  hints:['5のままでは、どちらの星にも入れない。','光で3・1・1にした後、1つだけ3へ戻す。','5を金色の列へ。照射のあと、光の外で3と1を合わせよう。'],
  story:'遠くから見ると、光は道を切り裂いていた。近づくと、ほどく場所を教えてくれた。',ending:'ほどいて、結び直す。それは、やり直すための光だった。',required:['beam','split','merge']
 }),
 stage('I06','陸と水、ふたりの役目',[actor('a',0,2,2),actor('b',1,2,1),actor('f',0,5,2,'fish'),actor('g',1,5,1,'fish')],{
  chapter:5,difficulty:3,theme:'shore',insight:'同じ数字でも、通れる場所が違う。各自の星から逆算する。',
  lesson:'青い水中は魚だけ。犬も魚も、3の門の先で2と1に。全員の星を探そう。',
  walls:barrier(3,2).filter(p=>p[1]!==5),gates:[{x:3,y:2,exact:3,species:'dog'},{x:3,y:5,exact:3,species:'fish'}],water:Array.from({length:16},(_,i)=>[i%8,5+Math.floor(i/8)]),spikes:[{x:5,y:2,power:1},{x:5,y:5,power:1}],exits:[{x:7,y:1,exact:2,species:'dog'},{x:7,y:3,exact:1,species:'dog'},{x:7,y:5,exact:2,species:'fish'},{x:7,y:6,exact:1,species:'fish'}],
  hints:['星の近くの種族と数字を確かめよう。','犬は陸の門、魚は水の門。合体できるのも同じ種族だけ。','まず犬2と犬1を合わせて上の門へ。魚も同じ考え方で下の道へ。'],
  story:'同じ道を歩かなくても、同じ場所へ帰れる。岸辺で二組の光がうなずいた。',ending:'違いは、みんなで帰るための手がかりだった。',required:['water','merge','split']
 }),
 stage('I07','タコさんの、結び直す試練',[actor('a',1,5,2,'fish'),actor('b',2,5,3,'fish')],{
  chapter:10,difficulty:5,theme:'shore',insight:'大きくして波を越え、小さくしてから必要な組だけ結び直す。',
  lesson:'波5の門の先で、光が5を3・1・1へ。星は3と2。タコさんが波と光を合図します。',
  walls:barrier(4,4),gates:[{x:4,y:4,exact:5,waveOnly:true}],water:Array.from({length:32},(_,i)=>[i%8,3+Math.floor(i/8)]),exits:[{x:7,y:3,exact:3,species:'fish'},{x:7,y:6,exact:2,species:'fish'}],events:[{...tide,host:'rock_octopus'},{...light(5),id:'boss-light',warn:4500,host:'rock_octopus'}],
  guests:[{id:'rock_octopus',name:'いわばのタコさん',role:'puzzle-host',category:'partner',x:6,y:1,operable:false,asset:'assets/characters/partners/rock_octopus.png'}],
  hints:['波の門・光の列・二つの星。必要な数字を順に並べて考えよう。','5で門を越え、光で3・1・1へ。3はそのまま、1と1を2へ。','2と3を合体して波5の門の左へ。波で入った後、右の金色の列で照射を待とう。'],
  story:'「今度は、ぼくの仕掛けをぜんぶ使ってみて」タコさんの試練は、倒す戦いではなく、みんなで帰る知恵比べ。',ending:'「おかえり！」タコさんの八本の腕が、七つの星の道をやさしく結んだ。',required:['wave','beam','gate','merge','split']
 })
];
