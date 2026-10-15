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
const leafSprig='<path d="M5 37Q4 10 26 4M5 23Q0 17 5 12Q11 17 5 23M9 14Q8 5 16 5Q18 12 9 14M16 8Q20 1 27 4Q25 10 16 8"/><path d="M6 31Q12 21 14 27Q14 33 6 31M3 39Q7 33 10 36Q8 42 3 39"/>';
const ornament=`<svg class="botanical" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".42"><rect x="2" y="2" width="96" height="146" rx="4"/><rect x="3.3" y="3.3" width="93.4" height="143.4" rx="3"/><path d="M23 5H77M23 145Q50 158 77 145M3 57l2-3 2 3-2 3ZM93 57l2-3 2 3-2 3Z"/></g><g class="leaf-filagree" stroke="currentColor" stroke-width=".25">${leafSprig}<g transform="translate(100 0) scale(-1 1)">${leafSprig}</g><g transform="translate(0 150) scale(1 -1)">${leafSprig}</g><g transform="translate(100 150) scale(-1 -1)">${leafSprig}</g></g></svg>`;

export function cardMarkup(c,{compact=false}={}){
 if(!c||c.hidden)return `<div class="card-back" role="img" aria-label="非公開のカード"><img src="ui-assets/card-back-approved.png" alt="" draggable="false"></div>`;
 const main=c.type==='main',id=c.cardId??c.id,category=CATEGORIES[c.type]??['カード','#A5A7AE'];
 const color=main?(ATTRIBUTES[c.attribute]??category[1]):category[1],species=main?c.name.replace(/[①-⑧]/g,''):'';
 const title=main?(c.form??species):c.name,ability=c.source?.match(/「([^」]+)」/)?.[1];
 let art;
 if(id==='M-beetle-04')art='<svg class="pupa-art" viewBox="52 285 920 620" preserveAspectRatio="xMidYMid meet" role="img" aria-label="承認済みのカブトムシのさなぎイラスト"><image href="ui-assets/pupa-reference-approved.png" width="1024" height="1536"/></svg>';
 else if(CARD_ART[id])art=`<img class="sprite-art" src="${h(CARD_ART[id])}" alt="${h(title)}の既存イラスト" loading="lazy" draggable="false"><small class="art-note">仮イラスト</small>`;
 else art=`<div class="art-placeholder" aria-label="仮イラスト">${icon(main?c.attribute:c.type)}<small>仮イラスト</small></div>`;
 return `<article class="card-face${main?' main-face':''}${compact?' compact':''}${c.text?.length>140?' long-copy':''}" style="--card-color:${color};--title-size:${[...title].length>13?5.8:[...title].length>8?6.8:8}cqw" aria-label="${h(c.name)}">
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
 return `<section data-player="${seat}" class="player-board ${own?'own':'opponent'}" data-depth="${own?'near':'far'}"><header class="player-heading"><strong>${own?'手前 · あなた':'奥 · 相手'} · ${seat}</strong><span>そだち <b>${p.growth}</b> / 時 <b>${p.time}</b></span></header>
 <div class="board-layout"><div class="board-field"><div class="egg-parking" data-egg-location="${parked?'parking':'main'}"><span>たまご置き場</span>${parked?egg:'<span class="egg-empty">―</span>'}</div>
 <div class="slots">${slots.map(([label,c],i)=>`<div class="slot" data-slot="${i}"><small>${label}</small>${c?`<div class="slot-content">${inspectButton(c).replace('</button>','<span class="board-card-name">'+h(c.hidden?'伏せ札':c.form??c.name)+'</span></button>')}</div>`:i===1?`<div class="egg-main">${egg}</div>`:'<span class="empty-slot">·</span>'}${c?.target?`<span class="attachment">${h(c.target)}</span>`:''}</div>`).join('')}</div></div>
 <aside class="management"><button type="button" data-zone="discard" data-seat="${seat}" aria-label="${seat}の捨て札 ${p.discard.length}枚"><span>捨て札</span><b>${p.discard.length}</b></button><div data-zone="activation"><span>発動領域</span><b>${chain.filter(l=>l.actor===seat).length}</b>${chain.filter(l=>l.actor===seat).map(l=>`<small>${h(l.name)}</small>`).join('')}</div><div data-zone="deck"><span>山札</span>${cardMarkup(null)}<b>${p.deckCount}</b></div></aside></div>
 <footer class="board-metrics"><span>${icon('fist')} ${p.stats?.power??'—'}</span><span>${icon('brain')} ${p.stats?.wisdom??'—'}</span><span>交際 ${p.relationship===null?'—':p.relationship===4?'結婚':p.relationship}</span><span>手札 ${p.handCount}</span></footer></section>`;
}
export function actionMarkup(actions,{selected=null}={}){return actions.map(a=>`<button type="button" data-kind="${h(a.kind)}" data-action="${h(a.id)}"${a.choiceCard?` data-choice-card="${h(a.choiceCard)}"`:''}${a.choiceCard===selected?' class="selected-choice"':''}>${h(a.displayLabel??a.label)}${a.destination?`<small class="action-destination">配置先：${['セカイ','メイン','こいびと','なかま①','なかま②','なかま③','準備①','準備②','準備③'][a.destination.index]}</small>`:''}</button>`).join('');}
export function phaseLabel(v){return v.result?'対戦終了':v.choice?'必須選択':v.phase==='normal'?'カードを使う':v.phase==='trigger'?'効果を使う':'応答を選ぶ';}
export function choiceGuide(v){
 if(v.effect?.instruction)return v.effect.instruction;
 if(v.choice?.kind==='egg_bottom')return 'たまごの準備：手札から1枚選び、山札の下へ戻してください。';
 if(v.choice?.kind==='activation_selection')return '対象・支払いを選んでください。最後の選択で確定する場合は確認が表示されます。';
 if(v.choice)return '必須選択：下の候補から選んでください。完了するまで通常行動はできません。';
 if(v.phase==='trigger')return '誘発能力を発動するか、選択肢にある場合は見送ってください。';
 if(v.phase!=='normal')return '応答できるカードを選ぶか、パスしてください。';
 return 'カードをタップ → 行動を選択。必要な対象・支払いは続けて選びます。';
}
export function cardActions(v,viewer,c){
 if(!v||!viewer||v.actor!==viewer||c.hidden)return [];
 return v.actions.filter(a=>v.choice?a.choiceCard===c.id:a.source===c.id);
}
function unavailableReason(v,viewer,c){
 if(c.hidden)return '相手の伏せ札は確認・操作できません。';
 if(!viewer||v?.actor!==viewer)return '今は相手の操作です。端末の受け渡し後に操作してください。';
 if(v.choice)return '今は必須選択中です。このカードは現在の選択候補ではありません。';
 if(v.phase==='trigger')return '今は誘発能力の選択中です。このカードの発動候補はありません。';
 if(v.phase!=='normal')return `${v.actor} の応答待ちです。このカードで応答はできません。${c.type==='main'?'通常のたんじょう等は、双方の応答が終わってから行えます。':'応答しなければパスしてください。'}`;
 return '今は使用できません。現在の時・配置枠・カード本文の使用条件を確認してください。';
}
export function detailMarkup(c,{v=null,viewer=null,catalog=false,handPosition=null}={}){
 const actions=cardActions(v,viewer,c),hidden=c.hidden,ability=c.source?.match(/「([^」]+)」/)?.[1],priority=v&&(v.choice||v.phase!=='normal');
 return `<header class="detail-toolbar"><span>${catalog?'カード図鑑':h(phaseLabel(v))+' · '+h(viewer??'—')+' の操作'}</span><button type="button" class="dialog-close" data-close>盤面へ ×</button></header><div class="detail-layout"><div class="detail-image"><div class="detail-card-canvas">${cardMarkup(c)}</div></div><div class="detail-copy"><header class="detail-summary"><h2>${h(hidden?'しかけたカード':c.form??c.name)}</h2>${!hidden?`<p>${h(CATEGORIES[c.type]?.[0])}${c.type==='main'?' · '+h(c.name.replace(/[①-⑧]/g,''))+' · '+h(c.attribute):''}</p><p>${c.type==='main'?`ちから <b>${c.power}</b> · ちえ <b>${c.wisdom}</b> · `:''}通常時コスト <b>${c.type==='main'?c.stage:c.cost}</b></p>`:''}</header><section class="effect-scroll" tabindex="0" aria-label="能力全文">${hidden?'<p>相手の伏せ札は確認できません。</p>':`${ability?`<h3>${h(ability)}</h3>`:''}<p class="full-effect">${h(c.text)}</p>`}</section>${!catalog&&!hidden?`<section class="detail-command"><h3>${v.choice?'必須選択：このカードを選ぶ':actions.length===1?'このカードでできる行動':'行動を選択'}</h3>${priority?`<p class="choice-guide">${v.effect?`${h(v.effect.name)}：`:''}${h(choiceGuide(v))}</p>`:''}<div class="detail-actions actions${actions.length===1?' single-action':''}">${actionMarkup(actions,{selected:c.id})}${!actions.length?`<p class="unavailable">${h(unavailableReason(v,viewer,c))}</p>`:''}</div>${priority?`<div class="detail-pass actions">${actionMarkup(v.actions.filter(a=>a.kind==='pass'))}</div>`:''}</section>`:''}</div></div>`;
}
function chainMarkup(v){return `<details class="chain"><summary>処理中のチェーン ${v.chain.length} · 履歴</summary>${[...v.chain].reverse().map((l,i)=>`<p>${v.chain.length-i}. ${l.actor}：${h(l.name)}${l.target?' → '+h(l.target):''}${l.declare?' / '+h(l.declare):''}</p>`).join('')||'<p>処理中のカードはありません。</p>'}<details class="history"><summary>公開ログ</summary><ol>${v.log.map(l=>`<li>${h(l)}</li>`).join('')}</ol></details></details>`;}
export function effectFocusMarkup(v){
 const e=v?.effect;if(!e)return '';
 return `<section class="effect-focus" aria-label="現在の効果"><div class="effect-thumb">${e.card?inspectButton(e.card):e.kind==='egg'?egg:icon('event')}</div><div><small>${h(e.actor)} · ${h(e.status)}</small><strong>${h(e.name)}${e.ability?' ／ '+h(e.ability):''}</strong><p>${h(e.instruction)}</p></div></section>`;
}
// A notification, not a second card picker. Exact engine actions remain in card
// detail and the expanded fallback (including private peek / numeric choices).
export function compactOperationMarkup(v,viewer){
 if(!viewer||viewer!==v.actor||v.result)return '';
 const e=v.effect,pass=v.actions.find(a=>a.kind==='pass');
 const indirect=v.actions.filter(a=>!a.source&&!a.choiceCard&&a.kind!=='pass');
 const priority=Boolean(v.choice||v.phase!=='normal');
 const inline=pass?[{...pass,displayLabel:'パスして進む'}]:indirect.length===1?indirect:[];
 const source=e?`${e.name}${e.ability?' · '+e.ability:''}`:'通常行動';
 const hint=v.choice?(v.actions.some(a=>a.choiceCard)?(v.choice.kind==='egg_bottom'?'手札をタップ → 山札の下へ戻す':'対象カードをタップして選択'):'選択肢から必要な操作を選ぶ'):v.phase==='response'?`${v.actor} の応答待ち${v.actions.some(a=>a.source)?' · 応答するカードをタップ':' · 応答できるカードなし'}`:v.phase==='trigger'?'効果を使うか選んでください':v.actions.some(a=>a.kind==='place'&&a.label.includes('たんじょう'))?'手札からたんじょうできます':'手札・盤面のカードをタップ';
 const more=indirect.length>1?'選択肢を開く':priority?'効果・選択肢の詳細':'操作・履歴';
 return `<div class="operation-notice" role="status" aria-live="polite"><button type="button" class="notice-expand" data-workflow aria-label="${h(source)}。${h(hint)}。${more}">${e?`<span class="notice-thumb" aria-hidden="true">${e.card?cardMarkup(e.card,{compact:true}):e.kind==='egg'?egg:icon('event')}</span>`:''}<span class="notice-copy"><strong>${h(source)}</strong><span>${h(hint)}</span></span><span class="notice-more">${indirect.length>1?'選択肢を開く':'詳細'} ›</span></button>${inline.length?`<div class="notice-actions actions">${actionMarkup(inline)}</div>`:''}</div>`;
}
export function operationMarkup(v,viewer){
 if(!viewer||viewer!==v.actor||v.result)return '';
 const priority=Boolean(v.choice||v.phase!=='normal'),actions=priority?v.actions:v.actions.filter(a=>!a.source);
 const summary=(v.selectionSummary??[]).map(x=>`<li>${h(x)}</li>`).join('');
 return `<header class="operation-heading"><strong>${h(phaseLabel(v))}</strong><small>${viewer} · 時 ${v.players[viewer].time}</small></header>${effectFocusMarkup(v)}${!v.effect?`<p class="operation-guide">${h(choiceGuide(v))}</p>`:''}<div class="operation-scroll">${v.choice?.peek?`<p class="notice">自分だけ確認：${h((Array.isArray(v.choice.peek)?v.choice.peek:[v.choice.peek]).filter(Boolean).map(c=>c.name).join(' / ')||'なし')}</p>`:''}${summary?`<ul class="selection-summary">${summary}</ul>`:''}<div class="actions${actions.length===1?' single-action':''}">${actionMarkup(actions)}</div>${v.phase==='response'&&!v.actions.some(a=>a.source)?'<p class="operation-note">応答できるカードはありません。パスで進みます。</p>':''}${!actions.length?'<p class="operation-note">手札や盤面のカードをタップしてください。</p>':''}${chainMarkup(v)}</div>`;
}
export function workflowMarkup(v,viewer){return `<header class="detail-toolbar"><h2>現在の操作</h2><button type="button" class="dialog-close" data-close>盤面へ ×</button></header><div class="workflow-body">${operationMarkup(v,viewer)}</div>`;}
export function needsConfirmation(action){
 if(action.kind==='choose'&&!/この選択を確定|支払い|時[1-9]\d*/.test(action.label))return false;
 return /時[1-9]\d*|支払い| → |対象を|と交代|この選択を確定/.test(action.label);
}
export function confirmationMarkup({action,details=[],paidTime=0}){
 return `<h2>この行動で確定しますか？</h2><p class="confirmation-label">${h(action.displayLabel??action.label)}</p>${paidTime?`<p>支払う時：<b>${paidTime}</b></p>`:''}${details.length?`<ul class="selection-summary">${details.map(line=>`<li>${h(line)}</li>`).join('')}</ul>`:''}<p>確定した行動は取り消せません。</p><div class="dialog-buttons"><button type="button" data-cancel>戻る</button><button type="button" class="primary" data-confirm>確定する</button></div>`;
}
export function gameMarkup(v,viewer,{selected=null,reordering=false,hand=null}={}){
 const mine=viewer??v.actor??'A',opponent=mine==='A'?'B':'A',priority=Boolean(v.choice||v.phase!=='normal');
 return `<header class="table-top"><div><small>ROUND ${v.round}/10 · 手番 ${v.turn}</small><strong>操作中 ${v.actor??'—'} · ${h(phaseLabel(v))}</strong></div>${viewer&&!v.result?`<button type="button" data-workflow aria-label="操作と履歴を開く">操作・履歴</button>`:''}<button type="button" data-menu aria-label="保存・受け渡しメニュー">☰</button></header>
 ${v.result?`<section id="result" class="panel"><h2>${v.result.winner?v.result.winner+' の勝利':'引き分け'}</h2><p>${h(v.result.reason)} · A ${v.result.growth.A} / B ${v.result.growth.B}</p><button type="button" data-home>開始画面へ</button></section>`:''}
 <div class="battle-area"><div class="board-shell opponent-shell" tabindex="0" aria-label="相手の盤面">${boardMarkup(v.players[opponent],opponent,viewer,v.chain)}</div><div class="board-shell own-shell" tabindex="0" aria-label="自分の盤面">${boardMarkup(v.players[mine],mine,viewer,v.chain)}</div>${viewer&&!v.result?`<aside id="operation-panel" aria-label="現在の操作">${compactOperationMarkup(v,viewer)}</aside>`:''}</div>
 ${viewer&&!v.result?`<section id="hand" class="hand-panel${reordering?' reordering':''}"><header class="hand-heading"><button type="button" data-hand-toggle aria-expanded="true">手札 ${v.players[viewer].hand.length}枚 <small>長押しで並び替え</small></button><button type="button" data-reorder aria-pressed="${reordering}" aria-label="左右ボタンで並び替え">${reordering?'補助操作を閉じる':'補助操作'}</button></header><div class="cards">${(hand??v.players[viewer].hand).map((c,i,list)=>`<div class="hand-entry${c.id===selected?' is-selected':''}" data-hand-entry="${h(c.id)}">${inspectButton(c,'card-tap hand-card')}${reordering?`<div class="hand-moves"><button type="button" data-move="-1" data-hand-id="${h(c.id)}" aria-label="${h(c.name)}を左へ" ${i===0?'disabled':''}>←</button><button type="button" data-move="1" data-hand-id="${h(c.id)}" aria-label="${h(c.name)}を右へ" ${i===list.length-1?'disabled':''}>→</button></div>`:''}</div>`).join('')}</div></section>`:''}`;
}
