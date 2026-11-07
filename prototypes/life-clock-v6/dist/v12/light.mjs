const groups=[
 ['メイン数字',[['M0','A · ＋25%'],['M1','B · ＋30%'],['M2','C · ＋35%'],['M3','D · ＋40%']],'V9 B=40を基準に50/52/54/56。同じ書体・色で比較。10の余白は未解決です。'],
 ['10の拡大',[['M0-ten','A · ＋25%'],['M1-ten','B · ＋30%'],['M2-ten','C · ＋35%'],['M3-ten','D · ＋40%']],'同倍率の切り出し。銀リング・茎と数字の近さを確認してください。'],
 ['左右の数字',[['G0','A · 現行'],['G1','B · ＋10%'],['G2','C · ＋20%']],'左右同じ倍率。拡大案は半径を同条件で調整し、目盛り接触を回避。＋10%が第一比較候補。'],
 ['ローマ数字',[['R0','A · 現行'],['R1','B · ＋10%'],['R2','C · ＋15%']],'直径は現行維持。＋15%でも文字同士は分離しますが、VIII付近の目盛り余白は狭めです。'],
 ['書体',[['FA','A · 現行'],['FB','B · 太め'],['FC','C · Nimbus Roman']],'メイン52・ローマ17で固定。書体だけを比較。A/BはLinux代替描画。太めBは10で目盛り干渉も残ります。'],
 ['書体・小文字盤',[['FA-roman','A · 現行'],['FB-roman','B · 太め'],['FC-roman','C · Nimbus Roman']],'ローマ数字の名目サイズ・座標は共通。書体の違いによる印象を比較。'],
 ['スタンド',[['stand-A','A · 背面折りたたみ'],['stand-B','B · 背面固定'],['stand-C','C · 独立台座']],'左から正面・側面・背面。Aが第一検討候補。径240mmなどは仮定で、実物製作・安定性試験は未実施。'],
 ['総合候補',[['S1','S1 · 30/10/10・現行'],['S2','S2 · 35/20/15・現行'],['S3','S3 · 30/10/10・太め']],'メイン/左右/ローマの拡大率。S1が第一比較候補ですが、10の余白は未解決で正式採用ではありません。'],
 ['V11 E',[['V11E','V11 E · 保存版＋30%']],'V12と同じ針位置・数値の保存版。デザインの変化を比較できます。']
];
const $=id=>document.getElementById(id);let group=0,option=1;
function draw(){const [label,items,note]=groups[group],[id,name]=items[option];$('groups').innerHTML=groups.map(([n],i)=>`<button data-group="${i}" aria-pressed="${i===group}">${n}</button>`).join('');$('options').innerHTML=items.map(([id,n],i)=>`<button data-option="${i}" aria-pressed="${i===option}">${n}</button>`).join('');$('picture').src='light/'+id+'.jpg';$('picture').alt=label+'：'+name;$('caption').textContent=label+' · '+name;$('note').textContent=note;$('image-link').href='light/'+id+'.jpg';}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.group!==undefined){group=+b.dataset.group;option=0;draw();}else if(b.dataset.option!==undefined){option=+b.dataset.option;draw();}});draw();
