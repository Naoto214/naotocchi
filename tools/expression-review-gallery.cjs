const fs=require('fs'),sharp=require('sharp');
const {buildSheet}=require('./expression-contact-sheet.cjs');
const out=process.argv[2];
if(!out)throw Error('Usage: node tools/expression-review-gallery.cjs OUTPUT_DIR');
const names=require('./expression-stage-names.json');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 for(const species of (process.argv[3]?process.argv[3].split(','):Object.keys(names))) {
  for(let i=1;i<=8;i++){const stage=String(i).padStart(2,'0');await sharp(Buffer.from(buildSheet(species,stage,names[species][i-1]))).png().toFile(`${out}/${species}${stage}.png`);}
  for(const start of [1,5]){
   const end=start+3;let header=`<svg xmlns="http://www.w3.org/2000/svg" width="1408" height="3340"><style>text{font-family:'M PLUS Rounded 1c',sans-serif;fill:#304341}</style><rect width="1408" height="3340" fill="#edf3ef"/><text x="24" y="42" font-size="30">${({cat:'猫',dog:'犬',man:'人間（男）',woman:'人間（女）',penguin:'ペンギン',turtle:'カメ',frog:'かえる',clownfish:'カクレクマノミ',salmon:'さけ',hermit_crab:'ヤドカリ',jellyfish:'クラゲ',starfish:'ヒトデ',coral:'サンゴ',butterfly:'ちょう',beetle:'カブトムシ',stagbeetle:'クワガタムシ',cicada:'セミ',antlion:'アリジゴク',dandelion:'タンポポ',sakura:'サクラ',mushroom:'キノコ',dragon:'りゅう',phoenix:'フェニックス',god:'かみさま'})[species]} ${start}〜${end}段階｜表情・マーク調整後</text><text x="24" y="73" font-size="18">ゲーム素材・座標の静止合成（2倍表示）。実機撮影ではありません。</text>`;
   const parts=[];
   for(let col=0;col<4;col++){
    const stage=String(start+col).padStart(2,'0');header+=`<text x="${24+col*348}" y="119" font-size="22">${names[species][start+col-1]}</text>`;
    for(let row=0;row<10;row++)parts.push({input:await sharp(`${out}/${species}${stage}.png`).extract({left:24+(row%2)*356,top:120+Math.floor(row/2)*328,width:340,height:312}).png().toBuffer(),left:12+col*348,top:140+row*316});
   }
   header+='<text x="24" y="3330" font-size="18">背景・動き・画面幅は省略。病気の汗は静止した近似表示です。</text></svg>';
   fs.writeFileSync(`${out}/${species}-${start}-${end}.png`,await sharp(Buffer.from(header)).composite(parts).png().toBuffer());
  }
 }
 console.log('Stage sheets and four-stage overviews generated');
})();
