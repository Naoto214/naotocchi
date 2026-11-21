// Builds the owner-only comparison page from the official catalog (read-only) and proposals-v2.json.
// Output: page/index.html (+ page/img/*.webp copied from the official art-delivery/small files, unchanged).
// Usage: node build-page.mjs
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
const HERE=new URL('.',import.meta.url).pathname,CG=join(HERE,'../../../');
const {CATALOG}=await import(join(CG,'full-catalog.mjs'));
const {CARD_ART}=await import(join(CG,'ui-art.mjs'));
const P=JSON.parse(readFileSync(join(HERE,'../proposals-v3.json'),'utf8'));
rmSync(join(HERE,'img'),{recursive:true,force:true});mkdirSync(join(HERE,'img'),{recursive:true});
const cards=P.cards.map(c=>{const o=CATALOG[c.id];if(!o||o.type!=='partner')throw Error('not a partner '+c.id);
 const src=CARD_ART[c.id]?.small;if(!src)throw Error('no art '+c.id);const img='img/'+c.id+'.webp';copyFileSync(join(CG,src),join(HERE,img));
 return {...c,name:o.name,text:o.text,img,artSource:src};});
if(cards.length!==18||new Set(cards.map(c=>c.id)).size!==18)throw Error('need 18 distinct lovers');
const fact='<span class="tag fact">実測</span>',est='<span class="tag est">推定</span>';
const balanceHtml=`
<h2>共通ルール（正式・PR #515）</h2>
<ul>
<li>こいびとを出す：そだちは変わらない。結婚前（交際0〜3）の別れ：−5。結婚：+10。結婚後の別れ（離婚）：−10。</li>
<li>減少はエンジンの共通処理1か所で決まり、すれちがい・タンポポ⑧など、どの経路でも同じ数値。旧保存（hotseat-2〜6）は−10のまま再生。</li>
</ul>

<h2>バランス比較</h2>
<p>${fact} は対戦記録の数値、${est} は数値やカード本文からの判断（対戦で未確認）。得点率は勝ち1・引き分け0.5、かっこ内は95%の信頼区間。</p>
<div class="tablebox"><table>
<thead><tr><th>何を比べたか</th><th>対戦数</th><th>現行との差</th><th>読み方</th></tr></thead><tbody>
<tr><td>${fact} 別れ−5と−10（相手がすれちがい2枚入り、PR #481）</td><td class="num">2,960戦の一部</td><td class="num">恋人側 +4.1（+0.8〜+7.3）</td><td>正式採用。公式CPUデッキにすれちがいはないので、CPU戦ではほぼ差が出ない</td></tr>
<tr><td>${fact} 全恋人に「結婚中、毎ターン1枚」</td><td class="num">120対</td><td class="num">+7.5（+2.5〜+12.5）</td><td>継続ドローは強い</td></tr>
<tr><td>${fact} 全恋人に「結婚中、ちから・ちえ+1」</td><td class="num">120対</td><td class="num">+6.2（+1.3〜+11.2）</td><td>常時の能力値も強い</td></tr>
<tr><td>${fact} 全恋人に「結婚時さらに+5」</td><td class="num">120対</td><td class="num">−0.4（−2.2〜+1.4）</td><td>1回だけのそだちは勝敗をほぼ変えない</td></tr>
<tr><td>${fact} V2：シカA＋ワシA</td><td class="num">120対</td><td class="num">+3.3（−1.7〜+8.3）</td><td>有意差なし</td></tr>
<tr><td>${fact} <b>V3：シカ新案＋ワシ新案</b></td><td class="num">120対</td><td class="num">+4.6（+0.6〜+8.6）</td><td>V2との差 +1.3（−1.9〜+4.4、有意差なし）。結婚時に1枚引くワシは、変化が分かりやすい</td></tr>
<tr><td>${fact} V2：サソリB案（ワシ3→サソリ3）</td><td class="num">120対</td><td class="num">+0.4（−0.4〜+1.2）</td><td>このデッキでは弱い。V3は1回型にした</td></tr>
<tr><td>${fact} V2：ロボットA（常時+1/+1、ワシ3→ロボット3）</td><td class="num">120対</td><td class="num">+4.2（+0.8〜+7.6）</td><td>有意に強くなる</td></tr>
<tr><td>${fact} <b>V3：ロボット新案（自分のターンだけちえ+1）</b></td><td class="num">120対</td><td class="num">+3.3（+0.3〜+6.3）</td><td>常時との差 −0.8（−2.5〜+0.8）。少し控えめで、強さはほぼ同じ</td></tr>
</tbody></table></div>
<p style="font-size:12px;color:var(--muted)">中級CPU同士、公式の恋人デッキ（または恋人だけ入れ替えたもの）と他の公式6デッキ、10グループ×先後入替。再生一致は全試合。CPUは結婚後の能力を判断に使っていません。代理実験は共通ルール改定前の版（hotseat-6、別れ−10）で、相手デッキにすれちがいがないので別れは起きず、改定の影響を受けません。</p>

<h2>VERSION 3 の考え方</h2>
<ul>
<li>${est} 「結婚した時、〜」の1回型を増やした（アンコウ・ねこ社長・サソリ・ワシ・クモ）。結婚の瞬間に変化が分かり、結婚が遅くても意味がある。勝敗への影響は小さく、強すぎない。</li>
<li>${est} V2の推奨では「上の能力は〜にも使える」という条件緩和が10種類あった。V3の推奨では、ゴリラ・タコ・ひまわり・ワニ・シカ（一部）の5種類に減らした。</li>
<li>${est} 毎ターン強くなる継続型は、うし（入れ替え）・サボテン（+1）・ロボット（自分のターンの+1）・にんぎょ（セカイ−1）・クマ（守り）に限った。</li>
<li>${est} 無限ループの心配：結婚は自分のターン4回かけないと起きず、1回型が使えるのは1試合で最大2回（再婚した時）。手札に戻す・引く効果は、どれも出し直しの手順を増やさない。</li>
</ul>

<h2>注意が必要な組み合わせ</h2>
<ul>
<li>${est} ワシ：上の能力（結婚中、毎ターン1枚）が18種類で一番強い。追加は1枚だけにした。</li>
<li>${est} ロボット：新案でも、現行より+3.3ポイント（実測）。</li>
<li>${est} シカ：新案は公式デッキに3枚入っている恋人で、実測+4.6（ワシ新案と合わせて）。恋人デッキの総当たり（0.560）が0.60を超えないか、実装後に確認したい。</li>
<li>${est} ねこ社長の新案：コネクトフォー（時2・そだち+10）が1回だけ時1になる。毎ターンではない。</li>
<li>${est} クマの新案：らぶれたーと同じ「手札に戻るのを防ぐ」働き。らぶれたーと重ねると、すれちがいを2回まで防げる。</li>
</ul>

<h2>140字を超えるカード</h2>
<ul>
<li>推奨案で140字を超えるのは、クマ（154）・シカ（146）・タコ（163）・ゆきだるま（144）。カード面は既存の縮小表示、拡大表示では全文。</li>
<li>タコ・ゆきだるまは、意味を変えずに読みやすくした本文案を詳細画面に表示した（タコ 132→126字、ゆきだるま 117→97字）。正式本文を書き換える場合は、本人の承認と、文書74・カタログの更新が必要。</li>
</ul>

<h2>CPUに必要な変更（実装は承認後）</h2>
<ul>
<li>1回型は「結婚の価値」に足すだけでよい。継続型は、結婚後に残るターン数で重み付けする。</li>
<li>すれちがいは、結婚している恋人を優先して狙う（−10）。結婚前は−5になったので、序盤に使う価値は下がった。</li>
<li>クマ新案・らぶれたーがある時は、すれちがいの価値を下げる。</li>
</ul>`;
const html=readFileSync(join(HERE,'template.html'),'utf8').replace('/*DATA*/null',()=>JSON.stringify({cards,balanceHtml}).replace(/</g,'\\u003c'));
writeFileSync(join(HERE,'index.html'),html);
console.log('wrote index.html',Buffer.byteLength(html),'bytes;',cards.length,'cards');
