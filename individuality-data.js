/* Life-scoped personality definitions. Species IDs are references to the world master. */
(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.NaotocchiIndividualityData=data;})(globalThis,()=>{
 const temperaments={curiosity:['こうきしん','じっくり','こうきしんいっぱい'],boldness:['だいたんさ','こわがり','だいたん'],sociability:['ひとなつっこさ','ひとり好き','ひとなつっこい'],persistence:['ねばりづよさ','きりかえ上手','ねばりづよい']};
 const hearts={wonder:'ときめき',courage:'ゆうき',kindness:'やさしさ',perseverance:'がんばり'};
 const biases={dog:{sociability:1},cat:{curiosity:1,sociability:-1},penguin:{sociability:1,persistence:1},turtle:{persistence:1},frog:{curiosity:1},salmon:{persistence:1},clownfish:{sociability:1},butterfly:{curiosity:1},beetle:{boldness:1},stagbeetle:{boldness:1,persistence:1},cicada:{persistence:1},antlion:{persistence:1},hermit_crab:{boldness:-1},coral:{persistence:1},dandelion:{curiosity:1},sakura:{persistence:1},venus_flytrap:{boldness:1},dragon:{boldness:1},phoenix:{persistence:1},world_tree:{persistence:1},ghost:{curiosity:1},plush:{sociability:1}};
 const distributions={'0':[15,20,30,20,15],'1':[10,15,30,25,20],'-1':[20,25,30,15,10]};
 const categories={wonder:['新しい場所','印象的な景色','印象的な出会い'],courage:['未経験の遊び','未知の場所','初対面の交流'],kindness:['話を受け止める','分かち合う','相手を支える'],perseverance:['最初の達成','次の段階の達成','別の遊びへの応用']};
 const games={action:'アクション',drive3d:'3D・のりもの',sports:'スポーツ',puzzle:'パズル',board:'ボード・テーブル',strategy:'ストラテジー・RPG'};
 const rows=[
 [3,'はじめての発見','近くで見てみる','そっと触ってみる','誰かに見せる',null],
 [7,'あそびの発見','新しい遊びを試す','難しそうな遊びに挑む',null,'好きな遊びを練習'],
 [12,'小さな挑戦',null,'思い切って挑む','一緒に取り組む','もう一度やってみる'],
 [16,'あこがれ','未知の世界を見たい','新しい自分を目指したい','大切な人を支えたい',null],
 [22,'これからの道','世界を知りたい',null,'誰かの力になりたい','好きなことを深めたい'],
 [44,'しゅみ','新しい趣味を見つける',null,'誰かと楽しむ','好きなことを続ける'],
 [50,'おいわい','思い出を楽しむ','新しい目標に挑む','ありがとうを伝える',null],
 [56,'アルバム','懐かしい景色を眺める',null,'大切な相手を思い出す','できるようになったことを振り返る'],
 [62,'にわの花',null,'初めての花を育てる','誰かに贈る花を育てる','手入れを続ける'],
 [66,'たびの計画','好きな場所へ行く','初めての場所へ行く',null,'旅の準備を整える'],
 [70,'これからの時間','新しい世界を見る','まだ挑戦してみる','誰かと過ごす',null],
 [90,'のこりの時間','まだ見ぬ世界を楽しみにする',null,'大切な人たちと過ごす','続けてきたことを大切にする']];
 const events=rows.map(([age,title,...choices])=>({id:`life-${age}`,age,title,choices:choices.flatMap((label,i)=>label?[{heart:Object.keys(hearts)[i],label}]:[])}));
 const affinityHeart={cat_ceo:'courage',cliff_goat:'courage',high_eagle:'courage',desert_scorpion:'courage',swamp_croc:'courage',field_cow:'kindness',forest_bear:'kindness',snowman:'kindness',gentle_gorilla:'kindness',sunflower_partner:'wonder',sea_mermaid:'wonder',snow_spirit:'wonder',anglerfish:'wonder',robot_neighbor:'perseverance',grove_deer:'perseverance',rock_octopus:'perseverance',knitting_spider:'perseverance',oasis_cactus:'perseverance'};
 // Authored situations, not a name-substitution generator. Each tuple has a stable ID.
 const exchanges=[
 ['owl',0,'owl-night','ふくろうが、昨夜の森の音を思い出している。','最後まで話を聞く','風の音まで聞こえてくるようだった。'],
 ['owl',1,'owl-cloud','ふくろうと、枝の向こうの雲を見上げた。','見つけた形を教える','雲の形を見比べて、ふたりで首をかしげた。'],
 ['owl',2,'owl-rest','ふくろうが、まぶしそうに目を細めた。','木陰でひと休みする','葉っぱの影で、静かな時間を過ごした。'],
 ['cat_friend',0,'cat-quiet','ねこは今日は、黙ってとなりに座っている。','静かにそばにいる','しばらくすると、しっぽがそっと触れた。'],
 ['cat_friend',1,'cat-sun','ねこが小さな日なたを見つけた。','となりを少し空ける','ちょうどふたり分の暖かさがあった。'],
 ['cat_friend',2,'cat-leaf','ねこの足に、枯れ葉がくっついている。','取れるまで待ってあげる','ねこは自分で外して、こちらを見た。'],
 ['rabbit_friend',0,'rabbit-sound','うさぎの耳がぴんと立った。何か伝えたそう。','同じ音に耳をすます','遠くの小さな音を、いっしょに聞いた。'],
 ['rabbit_friend',1,'rabbit-find','うさぎの近くに、小さな花が咲いている。','見つけた花を知らせる','ふたりでしゃがむと、花がよく見えた。'],
 ['rabbit_friend',2,'rabbit-step','うさぎが段差の前で、少し迷っている。','急かさず待つ','自分のタイミングで、一歩を踏み出した。'],
 ['squirrel',0,'squirrel-story','リスが、大きな木の話を身ぶりで伝えている。','枝の形まで聞いてみる','どんな木だったか、少しわかった気がした。'],
 ['squirrel',1,'squirrel-view','リスが見晴らしのよい枝を教えてくれた。','下からの景色も教える','同じ場所にも、違う景色があった。'],
 ['squirrel',2,'squirrel-nut','リスが落とした木の実を探している。','足元を一緒に探す','葉っぱの下に見つけて、そっと知らせた。'],
 ['shiba',0,'shiba-walk','しばいぬが散歩の出来事を話したそう。','歩いた道の話を聞く','うれしかったところで、しっぽが動いた。'],
 ['shiba',1,'shiba-breeze','しばいぬが涼しい風に鼻を向けた。','いっしょに風を感じる','言葉がなくても、気持ちよさが伝わった。'],
 ['shiba',2,'shiba-pace','しばいぬの歩幅が、少しゆっくりになった。','歩調を合わせる','いつもの道を、いつもよりゆっくり歩いた。'],
 ['penguin_friend',0,'penguin-slip','ペンギンが、さっき滑った話をしている。','笑わずに聞く','話し終えると、少しほっとしたようだった。'],
 ['penguin_friend',1,'penguin-shadow','ペンギンの影が、長く伸びている。','自分の影と並べる','ふたつの影が、同じ方を向いた。'],
 ['penguin_friend',2,'penguin-path','ペンギンが歩きやすい道を探している。','平らな道を一緒に探す','遠回りでも、並んで進める道が見つかった。']
 ].map(([companion,category,id,text,label,reaction])=>({companion,category,id,text,label,reaction}));
 return {temperaments,hearts,biases,distributions,categories,games,events,affinityHeart,exchanges};
});
