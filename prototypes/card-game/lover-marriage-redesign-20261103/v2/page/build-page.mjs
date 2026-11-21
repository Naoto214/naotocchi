// Builds the owner-only comparison page from the official catalog (read-only) and proposals-v2.json.
// Output: page/index.html (+ page/img/*.webp copied from the official art-delivery/small files, unchanged).
// Usage: node build-page.mjs
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
const HERE=new URL('.',import.meta.url).pathname,CG=join(HERE,'../../../');
const {CATALOG}=await import(join(CG,'full-catalog.mjs'));
const {CARD_ART}=await import(join(CG,'ui-art.mjs'));
const P=JSON.parse(readFileSync(join(HERE,'../proposals-v2.json'),'utf8'));
rmSync(join(HERE,'img'),{recursive:true,force:true});mkdirSync(join(HERE,'img'),{recursive:true});
const cards=P.cards.map(c=>{const o=CATALOG[c.id];if(!o||o.type!=='partner')throw Error('not a partner '+c.id);
 const src=CARD_ART[c.id]?.small;if(!src)throw Error('no art '+c.id);const img='img/'+c.id+'.webp';copyFileSync(join(CG,src),join(HERE,img));
 return {...c,name:o.name,text:o.text,img,artSource:src};});
if(cards.length!==18||new Set(cards.map(c=>c.id)).size!==18)throw Error('need 18 distinct lovers');
const fact='<span class="tag fact">実測</span>',est='<span class="tag est">推定</span>';
const balanceHtml=`
<h2>バランス比較</h2>
<p>${fact} は保存済みの対戦記録と代理実験の数値です。${est} は数値やカード本文からの判断で、まだ対戦で確かめていません。得点率は勝ち1・引き分け0.5。かっこ内は95%の信頼区間です。</p>
<div class="tablebox"><table>
<thead><tr><th>何を比べたか</th><th>対戦数</th><th>結果</th><th>読み方</th></tr></thead><tbody>
<tr><td>${fact} 別れ−5（B）と−10（A）　相手がすれちがい2枚入り</td><td class="num">2,960戦の一部</td><td class="num">恋人側 +4.1（+0.8〜+7.3）<br>初級 +6.2</td><td>すれちがいを使う側は同じだけ下がる。公式CPUデッキにすれちがいはないので、CPU戦ではほぼ差が出ない</td></tr>
<tr><td>${fact} 全恋人に「結婚中、毎ターン1枚引く」</td><td class="num">120対</td><td class="num">+7.5（+2.5〜+12.5）</td><td>継続ドローは強い。ワシは既存能力でこれを持っている</td></tr>
<tr><td>${fact} 全恋人に「結婚中、ちから・ちえ+1」</td><td class="num">120対</td><td class="num">+6.2（+1.3〜+11.2）</td><td>常時の能力値も強い</td></tr>
<tr><td>${fact} 全恋人に「結婚した時、さらにそだち+5」</td><td class="num">120対</td><td class="num">−0.4（−2.2〜+1.4）</td><td>1回だけの効果は勝敗をほぼ変えない</td></tr>
<tr><td>${fact} V2：シカA案＋ワシA案（公式の恋人デッキ）</td><td class="num">120対</td><td class="num">+3.3（−1.7〜+8.3）</td><td>有意差なし。公式デッキを強くしすぎない</td></tr>
<tr><td>${fact} V2：サソリB案（前回の推奨）　ワシ3→サソリ3のデッキ</td><td class="num">120対</td><td class="num">+0.4（−0.4〜+1.2）</td><td>このデッキでは弱い（あそび・あいてむが少ない）。発動は120試合で9回→39回</td></tr>
<tr><td>${fact} V2：ロボットA案　ワシ3→ロボット3のデッキ</td><td class="num">120対</td><td class="num">+4.2（+0.8〜+7.6）</td><td>有意に強くなる。ただしデッキは0.429→0.471で、公式デッキ（0.458）と同じくらい</td></tr>
</tbody></table></div>
<p style="font-size:12px;color:var(--muted)">V2の対戦は、中級CPU同士、公式の恋人デッキ（または恋人だけ入れ替えたもの）と他の公式6デッキ、10グループ×先後入替。現行の対戦（A0）は前回の代理実験と120/120で同じ結果。CPUは結婚後の能力を判断に使っていません。</p>

<h2>結婚の時期と、先攻・後攻</h2>
<ul>
<li>${fact} 結婚した平均ラウンドは R7.0（R5〜R10）。結婚後に残る自分のターンは平均 約3回。先攻 R6.99、後攻 R7.09 で差はない。</li>
<li>${fact} V2の3つの比較で、先攻・後攻の差（追加能力の効き方）は 3.3/3.3、0.0/0.8、5.0/3.3 ポイントで、どちらかに偏っていない。</li>
<li>${est} 継続型の能力は、早く結婚するほど強い（最速R4なら6ターン、平均R7なら3ターン）。1回型（シカ・ワシ・せいれい）は時期の影響が小さい。せいれいはR10まで結婚を続けることが条件なので、遅い結婚でも働く。</li>
</ul>

<h2>恋人18種類の間の差</h2>
<ul>
<li>${fact} 公式の恋人デッキのワシ3枚を入れ替えると、得点率は ワシ 0.458、ロボット 0.429、サソリ 0.408。現行でも恋人の間に差があり、ワシが強い。</li>
<li>${est} V2の推奨案での合計の強さ：強＝ワシ（結婚後）。中〜強＝アンコウ（しんかい限定）・ロボット。中＝ねこ社長・ヤギ・サソリ・うし・クマ・ゴリラ・シカ・クモ・サボテン・にんぎょ。小〜中＝せいれい・ひまわり・ワニ。小＝タコ・ゆきだるま。</li>
<li>${est} 極端な差は、ワシ（強）と タコ・ゆきだるま（小）の間。タコとゆきだるまは既存能力の条件が狭いため。タコを強くしたい場合はB案（なかまがいなくても使える）。ゆきだるまのC案（離婚−5）は共通ルールの例外になるので推奨しない。</li>
</ul>

<h2>強すぎ・弱すぎの確認</h2>
<ul>
<li>${est} 継続型で注意するもの：ロボットA（実測+4.2）、ねこ社長B（コネクトフォーが時1）、クモB（アイテム系）、サソリB（あそび・あいてむの多いデッキ）。V2ではねこ社長・クモ・サソリの推奨を弱めた。</li>
<li>${fact}/${est} 1回だけの能力は、勝敗への影響が小さい（そだち+5で−0.4、シカ＋ワシで+3.3・有意差なし）。公式デッキに入っているシカ・ワシは、あえて1回型にしている。もっと結婚の楽しさを出したい場合は、シカB（手札2枚以下の時に続けて使える）が候補。</li>
<li>${est} 恋人デッキは7デッキの総当たりで上位（0.560、PR #444）。推奨案の組み合わせで実装したら、総当たりをもう一度行い、0.60を超えないことを目安に確認したい。</li>
</ul>

<h2>CPUに必要な変更（実装は承認後）</h2>
<ul>
<li>恋人カードの価値を一律12から、恋人ごとに「恋人能力＋結婚後の能力×残りターン」で評価する（中級）。初級は「結婚能力のある恋人を少し優先」だけ。</li>
<li>結婚は今と同じく優先してよい（どの案でも結婚した方が得）。交際を進める時の値に、結婚後の能力の価値を足す。</li>
<li>すれちがいは、結婚している恋人を優先して狙う（−10と結婚能力の両方を奪う）。らぶれたーは結婚後に付ける価値を上げる。</li>
<li>CPUを変える時は判断の版を heuristic-3 にして、保存済みの対戦は元のCPUのまま再生する。</li>
</ul>`;
const html=readFileSync(join(HERE,'template.html'),'utf8').replace('/*DATA*/null',()=>JSON.stringify({cards,balanceHtml}).replace(/</g,'\\u003c'));
writeFileSync(join(HERE,'index.html'),html);
console.log('wrote index.html',Buffer.byteLength(html),'bytes;',cards.length,'cards');
