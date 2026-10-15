// Presentation only. Input is the engine's safe view/catalog, never raw state.
import {CARD_ART} from './ui-art.mjs';
export const ATTRIBUTES = {'ひと':'#E78E98','けもの':'#A97A50','みずべ':'#55BFC2','うみ':'#4D82C6','むし':'#A7C94B','くさ':'#3EA46B','げんそう':'#916AC3','ふしぎ':'#414B87'};
export const CATEGORIES = {main:['メイン','#A7C94B'],companion:['なかま','#E7B65A'],partner:['こいびと','#CB6487'],world:['セカイ','#4F9EAA'],play:['あそび','#E9A16C'],item:['あいてむ','#B49A70'],event:['できごと','#A5A7AE']};
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
export function icon(key){return `<svg class="icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${MOTIFS[key]??MOTIFS['くさ']}"/></svg>`;}
const ornament='<svg class="botanical" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".45"><rect x="2" y="2" width="96" height="146" rx="6"/><path d="M4 26Q6 9 23 5M6 20Q6 12 12 11Q14 18 6 20M11 11Q14 5 21 6Q18 12 11 11M96 26Q94 9 77 5M94 20Q94 12 88 11Q86 18 94 20M89 11Q86 5 79 6Q82 12 89 11M4 124Q6 141 23 145M6 130Q6 138 12 139Q14 132 6 130M96 124Q94 141 77 145M94 130Q94 138 88 139Q86 132 94 130"/></g></svg>';

export function cardMarkup(c,{compact=false}={}){
 if(!c||c.hidden)return `<div class="card-back" role="img" aria-label="非公開のカード"><img src="ui-assets/card-back-approved.png" alt="" draggable="false"></div>`;
 const main=c.type==='main',id=c.cardId??c.id,category=CATEGORIES[c.type]??['カード','#A5A7AE'];
 const color=main?(ATTRIBUTES[c.attribute]??category[1]):category[1],species=main?c.name.replace(/[①-⑧]/g,''):'';
 const title=main?(c.form??species):c.name,ability=c.source?.match(/「([^」]+)」/)?.[1];
 let art;
 if(id==='M-beetle-04')art='<svg class="pupa-art" viewBox="52 285 920 620" preserveAspectRatio="xMidYMid slice" role="img" aria-label="承認済みのカブトムシのさなぎイラスト"><image href="ui-assets/pupa-reference-approved.png" width="1024" height="1536"/></svg>';
 else if(CARD_ART[id])art=`<img class="sprite-art" src="${h(CARD_ART[id])}" alt="${h(title)}の既存イラスト" loading="lazy" draggable="false"><small class="art-note">仮イラスト</small>`;
 else art=`<div class="art-placeholder" aria-label="仮イラスト">${icon(main?c.attribute:c.type)}<small>仮イラスト</small></div>`;
 return `<article class="card-face${compact?' compact':''}${c.text?.length>140?' long-copy':''}" style="--card-color:${color}" aria-label="${h(c.name)}">
 ${ornament}<div class="card-heading"><small class="card-category">${category[0]}</small>
 ${main?`<div class="card-attribute">${icon(c.attribute)}<span>${h(c.attribute)}</span></div>`:''}
 <span class="card-cost" aria-label="通常時コスト ${main?c.stage:c.cost}">${main?c.stage:c.cost}</span>
 <strong class="card-title">${h(title)}</strong>${main?`<span class="card-species">${h(species)}</span>`:''}</div>
 <div class="card-art">${art}</div>
 ${main?`<div class="card-stats"><span>${icon('fist')}<small>ちから</small><b>${c.power}</b></span><span>${icon('brain')}<small>ちえ</small><b>${c.wisdom}</b></span></div>`:''}
 <div class="card-copy">${ability?`<strong>${h(ability)}</strong>`:''}<p>${h(c.text)}</p></div>
 <small class="card-footer">${c.rare?'◆ RARE':'NAOTOCCHI'}</small></article>`;
}
function inspectButton(c,cls='card-tap'){return `<button type="button" class="${cls}" data-inspect="${h(c.id)}" aria-label="${h(c.hidden?'しかけたカード':c.name)}を拡大">${cardMarkup(c,{compact:true})}</button>`;}
const egg='<img class="egg-image" src="../../assets/characters/egg/intact.png" alt="たまご" draggable="false">';
export function boardMarkup(p,seat,viewer,chain=[]){
 const b=p.board,own=seat===viewer,parked=Boolean(b.main),slots=[['セカイ',b.world],['メイン',b.main],['こいびと',b.partner],...[0,1,2].map(i=>['なかま'+['①','②','③'][i],b.companions[i]]),...[0,1,2].map(i=>['準備'+['①','②','③'][i],b.prepared[i]])];
 return `<section data-player="${seat}" class="player-board ${own?'own':'opponent'}"><header class="player-heading"><strong>${own?'あなた':'相手'} · ${seat}</strong><span>そだち <b>${p.growth}</b> / 時 <b>${p.time}</b></span></header>
 <div class="board-layout"><div class="board-field"><div class="egg-parking" data-egg-location="${parked?'parking':'main'}"><span>たまご置き場</span>${parked?egg:'<span class="egg-empty">―</span>'}</div>
 <div class="slots">${slots.map(([label,c],i)=>`<div class="slot" data-slot="${i}"><small>${label}</small>${c?inspectButton(c):i===1?`<div class="egg-main">${egg}</div>`:'<span class="empty-slot">·</span>'}${c?.target?`<span class="attachment">${h(c.target)}</span>`:''}</div>`).join('')}</div></div>
 <aside class="management"><button type="button" data-zone="discard" data-seat="${seat}" aria-label="${seat}の捨て札 ${p.discard.length}枚"><span>捨て札</span><b>${p.discard.length}</b></button><div data-zone="activation"><span>発動領域</span><b>${chain.filter(l=>l.actor===seat).length}</b>${chain.filter(l=>l.actor===seat).map(l=>`<small>${h(l.name)}</small>`).join('')}</div><div data-zone="deck"><span>山札</span>${cardMarkup(null)}<b>${p.deckCount}</b></div></aside></div>
 <footer class="board-metrics"><span>${icon('fist')} ${p.stats?.power??'—'}</span><span>${icon('brain')} ${p.stats?.wisdom??'—'}</span><span>交際 ${p.relationship===null?'—':p.relationship===4?'結婚':p.relationship}</span><span>手札 ${p.handCount}</span></footer></section>`;
}
export function actionMarkup(actions){return actions.map(a=>`<button type="button" data-kind="${h(a.kind)}" data-action="${h(a.id)}">${h(a.label)}</button>`).join('');}
export function needsConfirmation(action){
 if(action.kind==='choose'&&!/この選択を確定|支払い|時[1-9]\d*/.test(action.label))return false;
 return /時[1-9]\d*|支払い| → |対象を|と交代|この選択を確定/.test(action.label);
}
export function confirmationMarkup({action,details=[],paidTime=0}){
 return `<h2>この行動で確定しますか？</h2><p class="confirmation-label">${h(action.label)}</p>${paidTime?`<p>支払う時：<b>${paidTime}</b></p>`:''}${details.length?`<ul class="selection-summary">${details.map(line=>`<li>${h(line)}</li>`).join('')}</ul>`:''}<p>確定した行動は取り消せません。</p><div class="dialog-buttons"><button type="button" data-cancel>戻る</button><button type="button" class="primary" data-confirm>確定する</button></div>`;
}
export function gameMarkup(v,viewer){
 const mine=viewer??v.actor??'A',opponent=mine==='A'?'B':'A';
 const phase=v.result?'対戦終了':v.phase==='normal'?'通常行動':v.phase==='choice'?'必須選択':v.phase==='trigger'?'誘発能力':'応答・チェーン';
 return `<div class="table-top"><span>ROUND <b>${v.round}</b> / 10</span><span>${v.turn} のターン · ${h(phase)}</span></div>
 ${v.result?`<section id="result" class="panel"><h2>${v.result.winner?v.result.winner+' の勝利':'引き分け'}</h2><p>${h(v.result.reason)} · A ${v.result.growth.A} / B ${v.result.growth.B}</p><button type="button" data-home>開始画面へ</button></section>`:''}
 <div class="arena">${boardMarkup(v.players[opponent],opponent,viewer,v.chain)}${boardMarkup(v.players[mine],mine,viewer,v.chain)}
 <aside class="control-panel panel"><h2>${h(phase)}</h2><p class="actor-label">${v.actor??'—'} の操作</p>
 ${viewer&&!v.result?`<div class="resource-strip">そだち <b>${v.players[viewer].growth}</b> · 時 <b>${v.players[viewer].time}</b></div>${v.choice?`<div class="notice">${v.choice.peek?`自分だけ確認：${h((Array.isArray(v.choice.peek)?v.choice.peek:[v.choice.peek]).filter(Boolean).map(c=>c.name).join(' / ')||'なし')}`:'選択を終えると次へ進みます。'}</div>`:''}<div id="actions" class="actions">${actionMarkup(v.actions)}</div>`:''}
 <details class="chain" ${v.chain.length?'open':''}><summary>チェーン ${v.chain.length}</summary>${[...v.chain].reverse().map((l,i)=>`<p>${v.chain.length-i}. ${l.actor}：${h(l.name)}${l.target?' → '+h(l.target):''}${l.declare?' / '+h(l.declare):''}</p>`).join('')||'<p>双方がパスすると解決します。</p>'}</details>
 <details class="history"><summary>公開ログ</summary><ol>${v.log.map(l=>`<li>${h(l)}</li>`).join('')}</ol></details></aside></div>
 ${viewer&&!v.result?`<section id="hand" class="hand-panel"><h2>${viewer} の手札 <small>タップして詳細・行動</small></h2><div class="cards">${v.players[viewer].hand.map(c=>inspectButton(c,'card-tap hand-card')).join('')}</div></section>`:''}`;
}
