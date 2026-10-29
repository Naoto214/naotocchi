import {relatedChapter} from './rulebook-content.mjs';
// Presentation only. Input is the engine's safe view/catalog, never raw state.
import {visibleCards} from './ui-context.mjs';
import {CARD_ART} from './ui-art.mjs';
import {ATTRIBUTE_COLORS,CATEGORY_COLORS,cardArtColors} from './art-pilot/approved-colors.mjs';
import {attributeIcon,marks} from './art-pilot/symbols/attributes.mjs';
export const ATTRIBUTES = ATTRIBUTE_COLORS;
export const CATEGORIES = {main:['メイン',ATTRIBUTE_COLORS['むし']],...Object.fromEntries(Object.entries({companion:'なかま',partner:'こいびと',world:'セカイ',play:'あそび',item:'あいてむ',event:'できごと'}).map(([type,name])=>[type,[name,CATEGORY_COLORS[type]]]))};
export const escapeHTML = value => String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const h=escapeHTML;
// Unified line motifs are independent replaceable parts, not emoji/font glyphs.
const MOTIFS={
 'ひと':'M16 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM8 27v-6a8 8 0 0 1 16 0v6M12 19v8m8-8v8',
 'けもの':'M9 20c-6 9 20 9 14 0l-4-4c-2-2-4-2-6 0ZM7 10a2 3 0 1 0 0 .1M13 6a2 3 0 1 0 0 .1M21 6a2 3 0 1 0 0 .1M27 11a2 3 0 1 0 0 .1',
 'みずべ':'M16 3C12 9 7 14 7 19a9 9 0 0 0 18 0c0-5-5-10-9-16ZM11 20q1 4 5 4M3 29q4-3 8 0t8 0t10 0',
 'うみ':'M3 11q5-5 10 0t16 0M3 18q5-5 10 0t16 0M3 25q5-5 10 0t16 0',
 'むし':'M16 10v17M11 9l-2-5m12 5 2-5M11 13H6l-3-3m8 10H5l-2 3m18-10h5l3-3m-8 10h6l2 3M10 12q6-7 12 0v9a6 6 0 0 1-12 0ZM13 7h6',
 'くさ':'M7 26C2 9 16 5 27 4c0 17-9 26-20 22ZM7 26 23 9M12 20l0-7m5 2h7',
 'げんそう':'M16 3l3 9 9 4-9 4-3 9-3-9-9-4 9-4ZM3 3v5m-2-2h5M26 25v6m-3-3h6',
 'ふしぎ':'M23 4a12 12 0 1 0 5 18A12 12 0 0 1 23 4ZM24 8v6m-3-3h6M8 23q3-2 6 0',
 fist:'M9 26V16l-3-3q-2-4 1-4l5 4V7q0-4 3-2v8-9q3-3 4 0v9-7q3-3 4 0v9-4q4-2 4 2v8l-4 5v4H12v-4ZM13 18h10',
 brain:'M16 7c-4-6-10-2-9 2-5 0-6 8-2 10-3 6 3 10 7 8 2 3 4 1 4-2V7ZM16 7c4-6 10-2 9 2 5 0 6 8 2 10 3 6-3 10-7 8-2 3-4 1-4-2M7 10l4 3-3 4m-3 2h5l2 4m13-13-4 3 3 4m3 2h-5l-2 4',
 companion:'M11 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 27v-4a8 8 0 0 1 16 0v4m2-10a8 8 0 0 1 8 8v2',
 partner:'M16 27 4 15C-3 5 10 0 16 10c6-10 19-5 12 5Z',
 world:'M4 25 13 8l6 10 4-6 6 13ZM7 8a3 3 0 1 0 0-.1',
 play:'M7 8h18q3 0 3 3v16H4V11q0-3 3-3ZM11 5v6m10-6v6M9 17h5m-2-2v5m10-4v1m-3 4v1',
 item:'M5 11h22v17H5ZM3 7h26v7H3ZM16 7v21M16 7c-10 1-10-10-3-5l3 5c10 1 10-10 3-5Z',
 event:'M18 2 5 18h10l-1 12 13-18H17Z'
};
export function icon(key){if(marks[key])return attributeIcon(key);return `<svg class="icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${MOTIFS[key]??MOTIFS['くさ']}"/></svg>`;}
const leafSprig='<path d="M5 37Q4 10 26 4M5 23Q0 17 5 12Q11 17 5 23M9 14Q8 5 16 5Q18 12 9 14M16 8Q20 1 27 4Q25 10 16 8"/><path d="M6 31Q12 21 14 27Q14 33 6 31M3 39Q7 33 10 36Q8 42 3 39"/>';
const ornament=`<svg class="botanical" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".42"><rect x="2" y="2" width="96" height="146" rx="4"/><rect x="3.3" y="3.3" width="93.4" height="143.4" rx="3"/><path d="M23 5H77M23 145Q50 158 77 145M3 57l2-3 2 3-2 3ZM93 57l2-3 2 3-2 3Z"/></g><g class="leaf-filagree" stroke="currentColor" stroke-width=".25">${leafSprig}<g transform="translate(100 0) scale(-1 1)">${leafSprig}</g><g transform="translate(0 150) scale(1 -1)">${leafSprig}</g><g transform="translate(100 150) scale(-1 -1)">${leafSprig}</g></g></svg>`;

// Presentation-only line breaks; canonical names, IDs and art stay untouched.
// Seven full-width glyphs fit the shared main-title band. Longer names have reviewed breaks.
const MAIN_TITLE_LINES = new Map(`丸い|あかちゃん
巣作り|アリジゴク
大きな|アリジゴク
まゆの中の|さなぎ
出たての|ウスバカゲロウ
飛び回る|ウスバカゲロウ
羽休めの|ウスバカゲロウ
うまれたての|幼虫
育ちざかりの|幼虫
出たての|カブトムシ
りっぱな|カブトムシ
長生き|カブトムシ
うまれたての|いもむし
育ちざかりの|いもむし
羽を広げた|ちょう
花めぐりの|ちょう
年を重ねた|ちょう
おとしよりの|ねこ
ぬけがらをぬぐ|セミ
透けた|あかちゃん
メスへ変わる|途中
群れの|リーダーのメス
小さな|サンゴの森
色とりどりの|サンゴ
大きな|サンゴの森
広がる|サンゴの海
葉がしげる|タンポポ
おとしよりの|いぬ
つのの生えた|りゅう
小さなつばさの|りゅう
つばさの育った|りゅう
いにしえの|りゅう
後ろ足が出た|おたま
しっぽつき|かえる
陸に上がった|かえる
おとしよりの|かえる
昔からいる|おばけ
おだやかな|おばけ
旅立ち前の|おばけ
大いなる|かみさま
ベテラン|ヤドカリ
年を重ねた|クラゲ
キノコの|小さな粒
広がる|キノコの糸
小さな|キノコの芽
育ちざかりの|キノコ
かさを広げた|キノコ
粉を飛ばす|キノコ
年を重ねた|キノコ
ベテラン|ペンギン
おとしより|ペンギン
燃えさかる|火の鳥
年を重ねた|火の鳥
灰から|よみがえる鳥
新品の|ぬいぐるみ
よごれた|ぬいぐるみ
ほつれた|ぬいぐるみ
おじいちゃん|れん
年を重ねた|サクラ
うまれたての|さけ
出たての|クワガタ
りっぱな|クワガタ
ぶつぶつ|子ヒトデ
うまれたての|かめ
若葉の|ハエトリグサ
花咲く|ハエトリグサ`.split('\n').map(row=>{const lines=row.split('|');return [lines.join(''),lines];}));

// Safe catalog/projected card data is the only rarity source; never infer from ID or art.
export function cardRarityLabel(c){return c.rare?'レア · 同名1枚まで':'通常 · 同名3枚まで';}

export function cardMarkup(c,{compact=false,detail=false}={}){
 if(!c||c.hidden)return `<div class="card-back" role="img" aria-label="非公開のカード"><img src="ui-assets/card-back-approved.png" alt="" draggable="false"></div>`;
 const main=c.type==='main',id=c.cardId??c.id,category=CATEGORIES[c.type]??['カード','#A5A7AE'];
 const {color,markInk}=cardArtColors(c),species=main?c.name.replace(/[①-⑧]/g,''):'';
 const title=main?(c.form??species):c.name,ability=c.source?.match(/「([^」]+)」/)?.[1];
 const asset=CARD_ART[id],src=asset?.[detail?'large':'small'];
 const fallback=`<div class="art-fallback" role="img" aria-label="${h(title)}・画像を表示できません">${icon(main?c.attribute:c.type)}<small>画像を表示できません</small></div>`;
 const art=fallback+(src?`<img class="dedicated-art" src="${h(src)}" alt="${h(title)}の専用イラスト" width="${detail?1152:384}" height="${detail?768:256}" loading="${detail?'eager':'lazy'}" decoding="async" draggable="false">`:'');
 return `<article class="card-face${main?' main-face':''}${compact?' compact':''}${c.text?.length>140?' long-copy':''}" style="--card-color:${color};--mark-ink:${markInk??'#353024'};--title-size:${main?7.2:[...title].length>13?5.8:[...title].length>8?6.8:8}cqw" aria-label="${h(c.name)}">
 ${ornament}<div class="card-heading"><small class="card-category">${category[0]}</small>
 ${main?`<div class="card-attribute">${icon(c.attribute)}<span>${h(c.attribute)}</span></div>`:''}
 <span class="card-cost" aria-label="通常時コスト ${main?c.stage:c.cost}">${main?c.stage:c.cost}</span>
 <strong class="card-title">${main?(MAIN_TITLE_LINES.get(title)??[title]).map(line=>`<span>${h(line)}</span>`).join(''):h(title)}</strong>${main?`<span class="card-species">${h(species)}</span>`:''}</div>
 <div class="card-art">${art}</div>
 ${main?`<div class="card-stats"><span>${icon('fist')}${compact?'':'<small>ちから</small>'}<b>${c.power}</b></span><span>${icon('brain')}${compact?'':'<small>ちえ</small>'}<b>${c.wisdom}</b></span></div>`:''}
 ${!compact?`<div class="card-copy"${detail&&['M-cat-07','M-antlion-06','M-antlion-07'].includes(id)?' style="font-size:2.9cqw"':''}>${ability?`<strong>${h(ability)}</strong>`:''}<p>${h(c.text)}</p></div>
 `:''}<small class="card-footer">NAOTOCCHI</small>${c.rare?`<span class="card-rarity" role="img" aria-label="${cardRarityLabel(c)}">◆</span>`:''}</article>`;
}
export function canInspectCard(v,viewer,c){if(v?.mode==='cpu'&&viewer===v.humanSeat&&!c.hidden)return true;return !v||v.phase!=='response'||Boolean(viewer===v.actor&&!c.hidden&&v.actions.some(a=>a.kind!=='pass'&&a.source===c.id));}
export function inspectButton(c,cls='card-tap',v=null,viewer=null){const restricted=v?.phase==='response',allowed=canInspectCard(v,viewer,c),eligible=cardActions(v,viewer,c).length>0;return `<button type="button"${allowed?'':' disabled aria-disabled="true"'} class="${cls}${restricted?(eligible?' is-eligible':' response-unavailable'):''}" data-inspect="${h(c.id)}" aria-label="${h(c.hidden?'しかけたカード':c.name)}を拡大">${cardMarkup(c,{compact:true})}</button>`;}
// Browsing uses only the safe projected card; it never enumerates or executes actions.
export function browseButton(c,cls='card-tap',v=null,viewer=null){return `<button type="button" class="${cls}${cardActions(v,viewer,c).length?' is-eligible':''}" data-browse="${h(c.id)}" aria-label="${h(c.hidden?'裏向きカード':c.name)}の詳細を閲覧">${cardMarkup(c,{compact:true})}</button>`;}
export function zoneMarkup(v,seat,zone){
 const p=v.players[seat];if(!p||!['deck','discard','activation'].includes(zone))return '';
 const title={deck:'山札',discard:'捨て札',activation:'発動領域'}[zone];let body;
 if(zone==='deck')body=`<div class="deck-preview">${cardMarkup(null)}</div><p class="zone-count">残り ${p.deckCount}枚</p><p>カードの表面・順序は非公開です。</p>`;
 if(zone==='discard')body=`<p>${p.discard.length}枚 · 状態の並び順（先頭から）</p><div class="discard-cards">${p.discard.map((c,i)=>`<div>${browseButton(c)}<small class="zone-card-caption">${i+1}. ${h(c.name)}</small></div>`).join('')||'<p>捨て札はありません。</p>'}</div>`;
 if(zone==='activation'){
  const rows=[...v.chain].reverse().map((l,i)=>({l,e:v.effectQueue?.[i],order:i+1})).filter(x=>x.l.actor===seat);
  const current=v.choice&&v.effect?.actor===seat?v.effect:null;
  const entry=(e,name,caption)=>`<article class="activation-entry">${e?.card?browseButton(e.card):''}<div><strong>${caption}</strong><p>発動元：${seat} · ${h(name)}</p><p>${h(e?.ability??'カード効果')}</p></div></article>`;
  body=(current?entry(current,current.name,'処理中 · 必須選択待ち'):'')+rows.map(({l,e,order})=>entry(e,l.name,`解決順 ${order}${order===1?' · 次に解決':''}`)).join('');
  body=(body||'<p>処理中のカードはありません。</p>')+'<p>後から発動した効果から解決します。解決済みの結果は「操作・履歴」で確認できます。</p>';
 }
 return `<header class="detail-toolbar"><h2>${seat} の${title} · 閲覧</h2><button type="button" class="dialog-close" data-close>盤面へ ×</button></header><div class="workflow-body zone-body">${body}</div>`;
}
const egg='<img class="egg-image" src="../../assets/characters/egg/intact.png" alt="たまご" draggable="false">';
// State display only: no catalog ID, card instance, command or saved stack.
// Render the visible top layer; a future approved egg layer can be selected here.
export function eggCardMarkup({detail=false}={}){
 return `<article class="egg-card" aria-label="たまご・状態表示用"><img src="${detail?'ui-assets/egg-card-large.webp':'ui-assets/egg-card-small.webp'}" alt="たまご。メインがいない状態。通常ドロー後にさらに1枚引き、手札1枚を山札の下へ戻す。" draggable="false" decoding="async"></article>`;
}
export function eggDetailMarkup(){
 return `<header class="detail-toolbar"><span>たまご · 状態の説明</span><button type="button" class="dialog-close" data-close>盤面へ ×</button></header><div class="detail-layout"><div class="detail-image"><div class="detail-card-canvas">${eggCardMarkup({detail:true})}</div></div><div class="detail-copy"><header class="detail-summary"><h2>たまご</h2><p>メインがいない待機状態。デッキ外の状態表示用カードです。</p></header><section class="effect-scroll" tabindex="0" aria-label="たまごの正式ルール"><h3>自分のターン開始時</h3><ol><li>時を回復し、通常ドローで1枚引きます（先攻の最初のターンも同じ）。</li><li>通常ドロー後もたまごなら、追加ドローでさらに1枚引きます。</li><li>手札から1枚を選び、非公開で山札の一番下へ戻します。シャッフルしません。</li></ol><p>山札不足では引ける分だけ引きます。引けなくても、手札があれば1枚を戻します。この交換の途中にたんじょうや別の発動は挟めません。</p><h3>たんじょう</h3><p>自分の通常の行動機会に、手札の好きな段階のメインを、段階番号ぶんの通常時コストでたんじょうできます。①から始める必要はありません。個別の軽減・禁止等はカードの効果に従います。</p><p>たまごの上にメインを完全に重ねます。メインが離れてたまご状態に戻れば、下のたまごが再び見えます。へんしん・ときおくりでは新しいメインだけを表示します。</p><h3>たまごの間</h3><p>ちから・ちえを持たず、ちょうせんを行うことも受けることもありません。こいびとと交際・結婚状態は保持しますが、こいびとの能力と交際進行は停止します。</p><p>たまご自体はカード効果で除去・移動・奪取できず、山札・手札・捨て札には入りません。</p></section></div></div>`;
}
export function boardMarkup(p,seat,viewer,chain=[],v=null,frontSeat=viewer){
 const b=p.board,own=seat===frontSeat,slots=[['セカイ',b.world],['メイン',b.main],['こいびと',b.partner],...[0,1,2].map(i=>['なかま'+['①','②','③'][i],b.companions[i]]),...[0,1,2].map(i=>['準備'+['①','②','③'][i],b.prepared[i]])];
 return `<section data-player="${seat}" class="player-board ${own?'own':'opponent'}${v&&!v.result&&v.turn===seat?' field-turn-active field-turn-'+(own?'self':'other'):''}" data-depth="${own?'near':'far'}"><header class="player-heading"><strong>${own?'手前 · あなた':'奥 · 相手'} · ${seat}</strong><span>そだち <b>${p.growth}</b> / 時 <b>${p.time}</b></span></header>
 <div class="board-layout"><div class="board-field">
 <div class="slots">${slots.map(([label,c],i)=>({label,c,i})).sort((a,b)=>own?a.i-b.i:b.i-a.i).map(({label,c,i})=>`<div class="slot" data-slot="${i}"><small>${label}</small>${c?`<div class="slot-content">${(v&&cardActions(v,viewer,c).length&&(v.choice||v.phase!=='normal'||cardActions(v,viewer,c).some(a=>['challenge','relationship'].includes(a.kind)))?inspectButton(c,'card-tap',v,viewer):browseButton(c,'card-tap',v,viewer)).replace('</button>','<span class="board-card-name">'+h(c.hidden?'伏せ札':c.form??c.name)+'</span></button>')}</div>`:i===1?`<div class="slot-content main-stack" data-main-top="egg"><button type="button" class="card-tap" data-egg-detail="${seat}" aria-label="${seat}のたまごの詳細">${eggCardMarkup()}<span class="board-card-name">たまご</span></button></div>`:'<span class="empty-slot">·</span>'}${c?.target?`<span class="attachment">${h(c.target)}</span>`:''}</div>`).join('')}</div></div>
 <aside class="management"><button type="button" data-zone="discard" data-seat="${seat}" aria-label="${seat}の捨て札 ${p.discard.length}枚"><span>捨て札</span><b>${p.discard.length}</b></button><button type="button" data-zone="activation" data-seat="${seat}" aria-label="${seat}の発動領域を閲覧"><span>発動領域</span><b>${chain.filter(l=>l.actor===seat).length+(v?.choice&&v.effect?.actor===seat?1:0)}</b>${chain.filter(l=>l.actor===seat).map(l=>`<small>${h(l.name)}</small>`).join('')}</button><button type="button" data-zone="deck" data-seat="${seat}" aria-label="${seat}の山札 残り${p.deckCount}枚"><span>山札</span>${cardMarkup(null)}<b>${p.deckCount}</b></button></aside></div>
 <footer class="board-metrics"><span>${icon('fist')} ${p.stats?.power??'—'}</span><span>${icon('brain')} ${p.stats?.wisdom??'—'}</span><span>交際 ${p.relationship===null?'—':p.relationship===4?'結婚':p.relationship}</span><span>手札 ${p.handCount}</span></footer></section>`;
}
export function actionMarkup(actions,{selected=null}={}){
 const declared=new Set();
 return actions.map(a=>{
  if(a.declare){
   if(declared.has(a.source))return '';declared.add(a.source);
   const options=actions.filter(x=>x.source===a.source&&x.declare);
   return `<label class="declaration-picker">宣言するカード種を選ぶ<select data-declaration aria-label="宣言するカード種"><option value="" disabled selected>種類を選択してください</option>${options.map(x=>`<option value="${h(x.id)}">${h(x.displayLabel??x.label)}</option>`).join('')}</select></label>`;
  }
  return `<button type="button" data-kind="${h(a.kind)}"${a.kind==='pass'?` data-pass-intent="${a.displayLabel==='ターン終了を申し出る'?'end-turn':'response'}"`:''} data-action="${h(a.id)}"${a.choiceCard?` data-choice-card="${h(a.choiceCard)}"`:''}${a.choiceCard===selected?' class="selected-choice"':''}>${h(a.displayLabel??a.label)}${a.destination?`<small class="action-destination">配置先：${['セカイ','メイン','こいびと','なかま①','なかま②','なかま③','準備①','準備②','準備③'][a.destination.index]}</small>`:''}</button>`;}).join('');}
export function phaseLabel(v){return v.result?'対戦終了':v.choice?'必須選択':v.phase==='normal'?'カードを使う':v.phase==='trigger'?'効果を使う':'応答を選ぶ';}
// Shared public state labels: response priority is independent of turn ownership.
export function turnStatus(v){
 if(v.result)return '対戦終了';
 if(v.phase==='normal'&&!v.choice)return `${v.turn}の通常行動`;
 const work=v.choice||v.phase==='choice'?'選択待ち':v.phase==='trigger'?'効果選択待ち':'応答待ち';
 // Name the operator only when it is not the turn owner (e.g. Aのターン・Bの応答待ち).
 return `${v.turn}のターン・${v.actor===v.turn?'':v.actor+'の'}${work}`;
}
export function handoffMessage(v){
 return `${turnStatus(v)}。${v.actor!==v.turn?'応答・選択のための操作交代です。ターン交代ではありません。':'現在の処理を続けます。'}プレイヤー ${v.actor} に端末を渡してください`;
}
export function responseGuide(v){
 const reasons={start:'ターン開始時の処理後',normal:'行動後の応答',end_request:'ターン終了の申し出',end:'ターン終了時の処理後',compare:'ちょうせんの比較前',challenge_end:'ちょうせんの終了処理'};
 const reason=v.chain.length?'発動した効果を解決する前':reasons[v.progress?.window]??'現在の処理の応答';
 const available=v.actions.some(a=>a.kind!=='pass');
 return `${reason}。${available?'応答するカードを選ぶか、パスしてください。':`${v.actor}は応答できるカードがありません。`}連続パス ${v.progress?.passes??0}/2。`;
}
export function passLabel(v){
 if(v.phase==='normal')return 'ターン終了を申し出る';
 if(v.autoEnabled)return '応答しない（パス）';
 if(!v.progress)return '応答せず進む（パス）';
 if(v.progress.passes<1)return `パスして${v.actor==='A'?'B':'A'}の応答へ`;
 if(v.chain.length)return 'パスして効果を解決';
 if(v.progress.pending)return 'パスして次の効果選択へ';
 return ({end_request:`パスして${v.turn}の終了処理へ`,end:'パスしてターン終了処理を進める',compare:'パスしてちょうせんの処理を進める',challenge_end:'パスしてちょうせんの終了処理へ'})[v.progress.window]??`パスして${v.turn}の通常行動へ`;
}
export function choiceGuide(v){
 if(v.phase==='response'&&!v.choice)return v.autoEnabled?'光るカードで応答するか、パスしてください。':responseGuide(v);
 if(v.effect?.instruction)return v.effect.instruction;
 if(v.choice?.kind==='egg_bottom')return 'たまごの準備：手札から1枚選び、山札の下へ戻してください。';
 if(v.choice?.kind==='activation_selection')return '対象・支払いを選んでください。最後の選択で確定する場合は確認が表示されます。';
 if(v.choice)return '必須選択：下の候補から選んでください。完了するまで通常行動はできません。';
 if(v.phase==='trigger')return '誘発能力を発動するか、選択肢にある場合は見送ってください。';
 if(v.phase!=='normal')return '応答できるカードを選ぶか、パスしてください。';
 return 'カードをタップ → 行動を選択。必要な対象・支払いは続けて選びます。';
}
export function cardActions(v,viewer,c){
 if(!v||!viewer||v.actor!==viewer||v.result||c.hidden)return [];
 const own=v.players[viewer]?.board,other=v.players[viewer==='A'?'B':'A']?.board;
 // Shortcuts only associate existing legal actions with their public field cards.
 // Challenge participants remain the two engine-selected mains; no UI-made target.
 return v.actions.filter(a=>{
  if(v.choice)return a.choiceCard===c.id;
  if(a.source===c.id)return true;
  if(v.phase!=='normal')return false;
  if(a.kind==='challenge')return c.id===own?.main?.id||c.id===other?.main?.id;
  if(a.kind==='relationship')return c.id===own?.partner?.id;
  return false;
 });
}
function unavailableReason(v,viewer,c){
 if(c.hidden)return '相手の伏せ札は確認・操作できません。';
 if(!viewer||v?.actor!==viewer)return v?.mode==='cpu'?'CPUの操作中です。自分の番までお待ちください。':'今は相手の操作です。端末の受け渡し後に操作してください。';
 if(v.choice)return '今は必須選択中です。このカードは現在の選択候補ではありません。';
 if(v.phase==='trigger')return '今は誘発能力の選択中です。このカードの発動候補はありません。';
 if(v.phase!=='normal')return `${turnStatus(v)}です。このカードで応答はできません。${c.type==='main'?'通常のたんじょう等は、双方の応答が終わってから行えます。':'応答しなければパスしてください。'}`;
 return '今は使用できません。現在の時・配置枠・カード本文の使用条件を確認してください。';
}
export function detailMarkup(c,{v=null,viewer=null,catalog=false,handPosition=null,readOnly=false}={}){
 const actions=cardActions(v,viewer,c),hidden=c.hidden,ability=c.source?.match(/「([^」]+)」/)?.[1],priority=v&&(v.choice||v.phase!=='normal');
 return `<header class="detail-toolbar"><span>${catalog?'カード図鑑':readOnly?'カード閲覧':h(turnStatus(v))}</span><button type="button" class="dialog-close" data-close>盤面へ ×</button></header><div class="detail-layout"><div class="detail-image"><div class="detail-card-canvas">${cardMarkup(c,{detail:true})}</div></div><div class="detail-copy"><header class="detail-summary"><h2>${h(hidden?'しかけたカード':c.form??c.name)}</h2>${!hidden?`<p>${h(CATEGORIES[c.type]?.[0])}${c.type==='main'?' · '+h(c.name.replace(/[①-⑧]/g,''))+' · '+h(c.attribute):''}</p><p>${c.type==='main'?`ちから <b>${c.power}</b> · ちえ <b>${c.wisdom}</b> · `:''}通常時コスト <b>${c.type==='main'?c.stage:c.cost}</b></p><p class="card-rarity-description">${cardRarityLabel(c)}</p>`:''}</header><section class="effect-scroll" tabindex="0" aria-label="能力全文">${hidden?'<p>相手の伏せ札は確認できません。</p>':`${ability?`<h3>${h(ability)}</h3>`:''}<p class="full-effect">${h(c.text)}</p>`}</section>${!hidden?`<button type="button" class="learning-related" data-related-rule="${relatedChapter(c)}">関連ルールを読む</button>`:''}${readOnly&&!hidden&&actions.length?`<button type="button" data-inspect="${h(c.id)}">このカードの操作を開く</button>`:''}${!catalog&&!readOnly&&!hidden?`<section class="detail-command"><h3>${v.choice?'必須選択：このカードを選ぶ':actions.length===1?'このカードでできる行動':'行動を選択'}</h3>${priority?`<p class="choice-guide">${v.effect?`${h(v.effect.name)}：`:''}${h(choiceGuide(v))}</p>`:''}<div class="detail-actions actions${actions.length===1?' single-action':''}">${actionMarkup(actions,{selected:c.id})}${!actions.length?`<p class="unavailable">${h(unavailableReason(v,viewer,c))}</p>`:''}</div>${priority?`<div class="detail-pass actions">${actionMarkup(v.actions.filter(a=>a.kind==='pass'))}</div>`:''}</section>`:''}</div></div>`;
}
const MOVE_RESULTS={bottom:'山札の一番下へ戻します',top:'山札の一番上へ戻します',discard:'捨て札に置きます',hand:'手札に戻します',reveal:'公開します'};
const SLOT_NAMES=['セカイ','メイン','こいびと','なかま①','なかま②','なかま③','準備①','準備②','準備③'];
// Short label + small outcome note for one action, used inside the card-detail buttons.
// The note only states what the existing projection already knows (where a picked card goes, cost/target, placement slot).
export function actionParts(v,a){
 const label=a.displayLabel??a.label;
 if(a.kind==='choose'&&a.choiceCard&&a.pickName){
  if(a.moveKey)return {main:`${a.pickName}を${a.moveCost?'支払いに':''}選ぶ`,note:`${a.moveCost?'支払いとして':''}${MOVE_RESULTS[a.moveKey]}`};
  if(a.pickKind==='activation_selection')return {main:`${a.pickName}を選ぶ`,note:a.moveCost?'支払いに使います':`${v?.effect?.name&&v.effect.kind==='card'?`${v.effect.name}の`:''}対象にします`};
 }
 if(a.destination){
  // Swapping out the card that sits in that slot: the engine removes it and the new card joins at the end of the row,
  // so name the card being replaced instead of promising the slot. Otherwise the slot is where the card goes.
  const b=v?.players?.[a.destination.seat]?.board,i=a.destination.index;
  const there=b?(i===0?b.world:i===1?b.main:i===2?b.partner:i<6?b.companions?.[i-3]:b.prepared?.[i-6]):null;
  if(a.targetCard&&there?.id===a.targetCard)return {main:label,note:`${SLOT_NAMES[i]}の${there.name}と入れ替えます`};
  return {main:label,note:`配置先：${SLOT_NAMES[i]}`};
 }
 return {main:label,note:''};
}
export function detailActionMarkup(v,actions,{selected=null}={}){
 const declared=new Set();
 return actions.map(a=>{
  if(a.declare){if(declared.has(a.source))return '';declared.add(a.source);return actionMarkup(actions.filter(x=>x.source===a.source&&x.declare));}
  const {main,note}=actionParts(v,a);
  return `<button type="button" data-kind="${h(a.kind)}"${a.kind==='pass'?` data-pass-intent="${a.displayLabel==='ターン終了を申し出る'?'end-turn':'response'}"`:''} data-action="${h(a.id)}"${a.choiceCard?` data-choice-card="${h(a.choiceCard)}"`:''}${a.choiceCard===selected?' class="selected-choice"':''}><span class="action-main">${h(main)}</span>${note?`<small class="action-note">※ ${h(note)}</small>`:''}</button>`;
 }).join('');
}
// Card detail in play: the official card itself, large, plus the actions it allows.
// Name, cost, art and ability text are read on the card; nothing on it is repeated outside.
export function cardStageMarkup(c,{v=null,viewer=null,catalog=false,readOnly=false}={}){
 const actions=cardActions(v,viewer,c),hidden=c.hidden,priority=v&&(v.choice||v.phase!=='normal');
 const passes=priority?v.actions.filter(a=>a.kind==='pass'):[];
 const play=!catalog&&!readOnly&&!hidden;
 const band=play?`<div class="stage-actions actions">${detailActionMarkup(v,actions,{selected:c.id})}${detailActionMarkup(v,passes)}</div>${!actions.length?`<p class="stage-note">${h(unavailableReason(v,viewer,c))}</p>`:''}`
  :hidden?'<p class="stage-note">相手の伏せ札は確認できません。</p>'
  :readOnly&&actions.length?`<div class="stage-actions actions"><button type="button" data-inspect="${h(c.id)}"><span class="action-main">このカードの操作を開く</span></button></div>`:'';
 return `<header class="detail-toolbar"><span>${catalog?'カード図鑑':readOnly?'カード閲覧':h(turnStatus(v))}</span><button type="button" class="stage-zoom" data-stage-zoom hidden>＋ 拡大</button><button type="button" class="dialog-close" data-close>盤面へ ×</button></header><div class="card-stage"><div class="stage-scroll"><div class="stage-card" data-stage-zoom role="button" tabindex="0" aria-label="${h(hidden?'非公開のカード':c.name)}・タップで拡大／縮小"><div class="stage-card-canvas">${cardMarkup(c,{detail:true})}</div></div></div>${band?`<section class="stage-band">${band}</section>`:''}</div>`;
}
// Derived solely from audience-filtered result rows.
export function importantResult(g){
 const rows=g?.rows??[];
 if(rows.some(r=>r.kind==='finish'))return {kind:'finish',title:'対戦終了！',symbol:'⚑'};
 if(rows.some(r=>r.kind==='marriage'))return {kind:'marriage',title:'けっこん！',symbol:'♥'};
 if(rows.some(r=>r.kind==='birth'))return {kind:'birth',title:'たんじょう！',symbol:'✦'};
 if(rows.some(r=>r.kind==='main'&&r.text.includes('ときおくり')))return {kind:'main',title:'成長！',symbol:'↑'};
 // Ten points is a display threshold, never a rule or a changed amount.
 if(rows.some(r=>r.kind==='growth'&&Math.abs(r.delta)>=10))return {kind:'growth',title:'そだちが変化！',symbol:'✦'};
 return null;
}
export function resultNoticeMarkup(g){
 if(!g)return '';
 const special=importantResult(g);
 if(special){
  const eventRows=g.rows.filter(r=>['marriage','birth','main','finish'].includes(r.kind)),numbers=g.rows.filter(r=>['growth','time','power','wisdom','relationship'].includes(r.kind));
  return `<section class="result-notice result-important" data-milestone="${special.kind}"><button type="button" class="result-collapse" data-result-collapse aria-label="結果通知を収納">×</button><strong><span class="milestone-symbol" aria-hidden="true">${special.symbol}</span> ${special.title}</strong><p class="milestone-cause">${h(eventRows.map(r=>r.text).join(' / ')||g.heading)}</p><div class="milestone-values">${numbers.map(r=>`<span>${h(r.text)}</span>`).join('')}</div><small>${g.combined?'この処理全体の変化 · ':''}次は上部の操作担当を確認 · 詳細は操作・履歴</small></section>`;
 }
 const rows=g.rows.slice(0,1);
 return `<section class="result-notice"><button type="button" class="result-collapse" data-result-collapse aria-label="結果通知を収納">×</button><strong>結果 · ${h(g.heading)}</strong><ul>${rows.map(r=>`<li class="result-${h(r.kind)}">${r.cards.slice(0,3).map(c=>`<span class="result-mini" aria-hidden="true">${cardMarkup(c,{compact:true})}</span>`).join('')}<span>${h(r.cards.length>3?r.text.replace(r.cards.map(c=>c.name).join('・'),r.cards.slice(0,3).map(c=>c.name).join('・')+` ほか${r.cards.length-3}枚`):r.text)}</span></li>`).join('')}</ul><small>${g.rows.length>1?`ほか${g.rows.length-1}件 · `:''}${g.combined?'処理全体の変化 · ':''}詳細は操作・履歴</small></section>`;
}
// One chronological presentation of existing committed logs and audience-filtered results.
function historyLines(g){
 const rows=g.rows??[],kinds=new Set(rows.map(r=>r.kind));
 const trace=(g.trace??[]).filter(t=>{
  if(/^[AB][：:]?\s*パス$/.test(t))return false;
  if(/手札.*山札/.test(t)&&kinds.has('return'))return false;
  if(/を配置/.test(t)&&['birth','main','move'].some(k=>kinds.has(k)))return false;
  return true;
 });
 const texts=rows.filter(r=>!(r.kind==='activate'&&trace.some(t=>/発動/.test(t)))).map(r=>r.text);
 return [...trace,...(g.historyNotes??[]),...texts.filter(t=>!trace.includes(t))];
}
function historyCards(g){
 const cards=[...new Map((g.rows??[]).flatMap(r=>r.cards??[]).filter(c=>!c.hidden).map(c=>[c.id,c])).values()];
 return cards.length?`<div class="history-cards" aria-label="この手順のカード">${cards.map(c=>`<span>${cardMarkup(c,{compact:true})}</span>`).join('')}</div>`:'';
}
export function resultHistoryMarkup(v,viewer){
 const groups=[...(v.results??[])].reverse().map(g=>({g,lines:historyLines(g)})).filter(({lines})=>lines.length);
 return `<details class="result-history"><summary>対戦履歴 · 最新から過去へ${viewer?'（自分だけのカード情報を含む）':'（公開情報）'}</summary>${groups.map(({g,lines})=>`<section data-result-revision="${g.revision}"><h3>${g.round?'R'+h(g.round)+' · ':''}${h(g.turn??'')}のターン${g.actor?' · 操作 '+h(g.actor):''} <small>手順${g.revision}</small></h3>${g.combined?'<p>解決は記載順。数値・移動はこの手順全体の結果です。</p>':''}<ul>${lines.map(t=>`<li>${h(t)}</li>`).join('')}</ul>${historyCards(g)}</section>`).join('')||'<p>履歴はまだありません。</p>'}</details>`;
}

function chainMarkup(v,viewer){return `<details class="chain"><summary>処理中のチェーン ${v.chain.length} · 履歴</summary>${[...v.chain].reverse().map((l,i)=>`<p>${v.chain.length-i}. ${l.actor}：${h(l.name)}${l.target?' → '+h(l.target):''}${l.declare?' / '+h(l.declare):''}</p>`).join('')||'<p>処理中のカードはありません。</p>'}${resultHistoryMarkup(v,viewer)}</details>`;}
export function effectFocusMarkup(v){
 const e=v?.effect;if(!e)return '';
 return `<section class="effect-focus" aria-label="現在の効果"><div class="effect-thumb">${e.card?inspectButton(e.card,'card-tap',v,v.actor):e.kind==='egg'?egg:icon('event')}</div><div><small>${h(e.actor)} · ${h(e.status)}</small><strong>${h(e.name)}${e.ability?' ／ '+h(e.ability):''}</strong><p>${h(choiceGuide(v))}</p></div></section>`;
}
// Persistent operation guidance, separate from transient results. Exact actions remain in card
// detail and the expanded fallback (including private peek / numeric choices).
export function responseOptionsMarkup(v,viewer){
 if(v.phase!=='response'||viewer!==v.actor)return '';
 const inHand=new Set((v.players[viewer].hand??[]).map(c=>c.id));
 const ids=new Set(v.actions.filter(a=>a.kind!=='pass'&&!inHand.has(a.source)).map(a=>a.source)),cards=[...new Map(visibleCards(v).filter(c=>!c.hidden&&ids.has(c.id)).map(c=>[c.id,c])).values()];
 return cards.length?`<div class="response-options" aria-label="応答可能なカード">${cards.map(c=>`<button type="button" class="is-eligible" data-inspect="${h(c.id)}">${h(c.name)}</button>`).join('')}</div>`:'';
}
export function compactOperationMarkup(v,viewer){
 if(!viewer||viewer!==v.actor||v.result)return '';
 const e=v.effect,pass=v.actions.find(a=>a.kind==='pass');
 const indirect=v.actions.filter(a=>!a.source&&!a.choiceCard&&a.kind!=='pass');
 const priority=Boolean(v.choice||v.phase!=='normal');
 const inline=pass?[pass]:indirect.length===1?indirect:[];
 const source=v.phase==='response'?(v.chain.length?`${e?.name??'効果'}への応答`:({start:'ターン開始時の応答',normal:'行動後の応答',end_request:'ターン終了の確認',end:'ターン終了時の応答',compare:'ちょうせん比較前の応答',challenge_end:'ちょうせん終了時の応答'})[v.progress?.window]??'応答待ち'):e?`${e.name}${e.ability?' · '+e.ability:''}`:turnStatus(v);
 const hint=v.choice?(v.actions.some(a=>a.choiceCard)?(v.choice.kind==='egg_bottom'?'手札をタップ → 山札の下へ戻す':'対象カードをタップして選択'):'選択肢から必要な操作を選ぶ'):v.phase==='response'?v.autoEnabled?'光るカードで応答／パス':`${v.actor} の応答待ち · ${v.actions.some(a=>a.kind!=='pass')?'カードで応答／パス':'応答できるカードなし'} · 連続パス ${v.progress?.passes??0}/2`:v.phase==='trigger'?'効果を使うか選んでください':v.actions.some(a=>a.kind==='place'&&a.label.includes('たんじょう'))?'手札からたんじょうできます':'カードを選んでください';
 const stage=v.choice?'必須選択':v.phase==='response'?'応答':v.phase==='trigger'?'効果選択':'通常行動';
 const more=indirect.length>1?'選択肢を開く':priority?'効果・選択肢の詳細':'操作・履歴';
 return `<div class="operation-notice" role="status" aria-live="polite"><button type="button" class="notice-expand" data-workflow aria-label="${h(source)}。操作 ${h(v.actor)} · ${stage}。${h(hint)}。${more}"><span class="notice-copy"><strong>${v.phase==='response'?h(source):`操作 ${h(v.actor)} · ${stage}`}</strong><span>${h(hint)}</span></span><span class="notice-more">${indirect.length>1?'選択肢を開く':'詳細'} ›</span></button>${pass?`<div class="pass-rail actions"><span data-pass-slot="response">${v.phase!=='normal'?actionMarkup([pass]):''}</span><span data-pass-slot="end-turn">${v.phase==='normal'?actionMarkup([pass]):''}</span></div>`:inline.length?`<div class="notice-actions actions">${actionMarkup(inline)}</div>`:''}</div>${responseOptionsMarkup(v,viewer)}`;
}
export function operationMarkup(v,viewer){
 if(!viewer||viewer!==v.actor||v.result)return '';
 const priority=Boolean(v.choice||v.phase!=='normal'),actions=priority?v.actions:v.actions.filter(a=>!a.source);
 const summary=(v.selectionSummary??[]).map(x=>`<li>${h(x)}</li>`).join('');
 return `<header class="operation-heading"><strong>${h(turnStatus(v))}</strong><small>${viewer} · 時 ${v.players[viewer].time}</small></header>${effectFocusMarkup(v)}${!v.effect?`<p class="operation-guide">${h(choiceGuide(v))}</p>`:''}<div class="operation-scroll">${v.choice?.peek?`<p class="notice">自分だけ確認：${h((Array.isArray(v.choice.peek)?v.choice.peek:[v.choice.peek]).filter(Boolean).map(c=>c.name).join(' / ')||'なし')}</p>`:''}${summary?`<ul class="selection-summary">${summary}</ul>`:''}<div class="actions${actions.length===1?' single-action':''}">${actionMarkup(actions)}</div>${v.phase==='response'&&!v.actions.some(a=>a.source)?'<p class="operation-note">応答できるカードはありません。パスで進みます。</p>':''}${!actions.length?'<p class="operation-note">手札や盤面のカードをタップしてください。</p>':''}${chainMarkup(v,viewer)}</div>`;
}
export function workflowMarkup(v,viewer){return `<header class="detail-toolbar"><h2>現在の操作</h2><button type="button" class="dialog-close" data-close>盤面へ ×</button></header><div class="workflow-body">${operationMarkup(v,viewer)}</div>`;}
export function needsConfirmation(action){
 if(action.kind==='choose'&&!/この選択を確定|支払い|時[1-9]\d*/.test(action.label))return false;
 return /時[1-9]\d*|支払い| → |対象を|と交代|この選択を確定/.test(action.label);
}
export function confirmationMarkup({action,details=[],paidTime=0}){
 return `<h2>この行動で確定しますか？</h2><p class="confirmation-label">${h(action.displayLabel??action.label)}</p>${paidTime?`<p>支払う時：<b>${paidTime}</b></p>`:''}${details.length?`<ul class="selection-summary">${details.map(line=>`<li>${h(line)}</li>`).join('')}</ul>`:''}<p>確定した行動は取り消せません。</p><div class="dialog-buttons"><button type="button" data-cancel>戻る</button><button type="button" class="primary" data-confirm>確定する</button></div>`;
}
export function turnIndicatorMarkup(v){
 const name=seat=>v.mode==='cpu'?(seat===v.humanSeat?'あなた':'CPU'):seat;
 const owner=name(v.turn),operator=name(v.actor),work=v.choice?'選択中':v.phase==='response'?'応答中':v.phase==='trigger'?'選択中':'操作中';
 const tone=v.result?'finished':v.turn===(v.humanSeat??'A')?'self':'other';
 return `<div class="turn-indicator turn-${tone}" data-turn-owner="${h(v.turn)}" role="status" aria-live="polite"><strong>${v.result?'⚑ 対戦終了':`${tone==='self'?'▶':'◆'} ${h(owner)}のターン`}</strong><small>ROUND ${v.round}/10${v.result?'':` · ${h(operator)}が${work}`}</small></div>`;
}
export function gameMarkup(v,viewer,{selected=null,reordering=false,hand=null}={}){
 const mine=viewer??v.humanSeat??v.actor??'A',opponent=mine==='A'?'B':'A',priority=Boolean(v.choice||v.phase!=='normal');
 return `<header class="table-top">${turnIndicatorMarkup(v)}${viewer&&!v.result?`<button type="button" ${v.cpuThinking?'data-result-history':'data-workflow'} aria-label="操作と履歴を開く">操作・履歴</button>`:v.result?'<button type="button" data-result-history>結果履歴</button>':''}<button type="button" class="result-reopen" data-result-reopen hidden aria-label="直近の結果通知を再表示">↺<small>結果</small></button><button type="button" data-menu aria-label="保存・受け渡しメニュー">☰</button></header>
 ${v.result?`<section id="result" class="panel"><h2>${v.result.winner?v.result.winner+' の勝利':'引き分け'}</h2><p>${h(v.result.reason)} · A ${v.result.growth.A} / B ${v.result.growth.B}</p>${v.cpuDeckName?`<p class="cpu-deck-reveal">CPUのデッキ：${h(v.cpuDeckName)}</p>`:''}<button type="button" data-home>開始画面へ</button></section>`:''}
 <div class="battle-area"><div class="board-shell opponent-shell" tabindex="0" aria-label="相手の盤面">${boardMarkup(v.players[opponent],opponent,viewer,v.chain,v,mine)}</div><div class="board-shell own-shell" tabindex="0" aria-label="自分の盤面">${boardMarkup(v.players[mine],mine,viewer,v.chain,v,mine)}</div>${viewer&&!v.result?`<aside id="operation-panel" aria-label="操作案内" data-operation-stage="${v.choice?'choice':v.phase}">${v.cpuThinking?'<div class="operation-notice cpu-thinking" role="status"><span class="notice-copy"><strong>CPUが考えています</strong><span>カードの詳細・履歴を開くと一時停止します</span></span></div>':compactOperationMarkup(v,viewer)}</aside>`:''}</div>
 ${viewer&&!v.result?`<section id="hand" class="hand-panel${reordering?' reordering':''}"><header class="hand-heading"><button type="button" data-hand-toggle aria-expanded="true">手札 ${v.players[viewer].hand.length}枚 <small>長押しで並び替え</small></button><button type="button" data-reorder aria-pressed="${reordering}" aria-label="左右ボタンで並び替え">${reordering?'補助操作を閉じる':'補助操作'}</button></header><div class="cards">${(hand??v.players[viewer].hand).map((c,i,list)=>`<div class="hand-entry${c.id===selected?' is-selected':''}" data-hand-entry="${h(c.id)}">${inspectButton(c,'card-tap hand-card',v,viewer)}${reordering?`<div class="hand-moves"><button type="button" data-move="-1" data-hand-id="${h(c.id)}" aria-label="${h(c.name)}を左へ" ${i===0?'disabled':''}>←</button><button type="button" data-move="1" data-hand-id="${h(c.id)}" aria-label="${h(c.name)}を右へ" ${i===list.length-1?'disabled':''}>→</button></div>`:''}</div>`).join('')}</div></section>`:''}`;
}
