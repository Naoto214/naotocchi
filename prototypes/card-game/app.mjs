import {createGame,TYPE_NAMES,CARDS,supported,DEFAULT_DECK,validateDeck} from './engine.mjs';
import {HotseatSession} from './ui-session.mjs';
import {cardMarkup,gameMarkup,actionMarkup,needsConfirmation,escapeHTML as h} from './ui-presentation.mjs';
const $=id=>document.getElementById(id),KEY='naotocchi-hotseat-v1',session=new HotseatSession();
let busy=false,pending=null,dialogOrigin=null;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function button(text,handler){const n=el('button',text);n.type='button';n.addEventListener('click',handler);return n;}
function message(text){$('status').textContent=text;}
function persist(){try{localStorage.setItem(KEY,session.save());message('この端末に保存しました');}catch{message('自動保存できません。保存ファイルを書き出してください。');}}
function closeDialogs({focus=true}={}){
 for(const id of ['card-dialog','confirm-dialog']){const d=$(id);if(d.open)d.close();d.replaceChildren();}
 pending=null;if(focus&&dialogOrigin?.isConnected)dialogOrigin.focus();dialogOrigin=null;
}
function hide(){
 if(!session.active)return;
 session.hide();closeDialogs({focus:false});$('game').replaceChildren();
 $('curtain').hidden=session.finished;$('handoff-title').textContent=`プレイヤー ${session.actor} に端末を渡してください`;$('hide').hidden=true;
 if(session.finished)render();else $('reveal').focus();
}
function start(next){session.start(next);$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');$('deck-list').replaceChildren();$('catalog-list').replaceChildren();hide();}
function render(){const v=session.projection;$('game').innerHTML=gameMarkup(v,session.viewer);$('hide').hidden=!session.viewer||!!v.result;}
function visibleCards(v){return Object.values(v.players).flatMap(p=>[...(p.hand??[]),...p.discard,p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared]).filter(Boolean);}
function inspect(id,{catalog=false,origin=null}={}){
 const v=session.active?session.projection:null,c=catalog?CARDS[id]:visibleCards(v).find(c=>c.id===id);
 if(!c)return;closeDialogs({focus:false});dialogOrigin=origin;
 const actions=!catalog&&!c.hidden&&v?.actor===session.viewer?v.actions.filter(a=>a.source===id):[];
 const d=$('card-dialog');d.innerHTML=`<button type="button" class="dialog-close" data-close aria-label="詳細を閉じる">閉じる ×</button><div class="detail-layout"><div class="detail-image">${cardMarkup(c)}</div><div class="detail-copy"><h2>${h(c.hidden?'しかけたカード':c.form??c.name)}</h2>${c.hidden?'<p>相手の伏せ札は確認できません。</p>':`<p class="detail-category">${h(TYPE_NAMES[c.type])}${c.type==='main'?' · '+h(c.name.replace(/[①-⑧]/g,''))+' · '+h(c.attribute):''}</p>${c.type==='main'?`<p>ちから <b>${c.power}</b> · ちえ <b>${c.wisdom}</b></p>`:''}<p>通常時コスト ${c.type==='main'?c.stage:c.cost}${c.rare?' · レア':''}</p><p class="full-effect">${h(c.text)}</p>${c.target?`<p>配置対象：${h(c.target)}</p>`:''}`}
 ${!catalog&&!c.hidden?`<section><h3>${v.choice?'必須選択を優先':v.phase==='trigger'?'誘発能力':actions.length>1?'行動・対象を選択':'選択できる行動'}</h3>${v.choice?'<p>必須選択パネルで選択を続けてください。</p>':`<div class="detail-actions actions">${actionMarkup(actions)}</div>${!actions.length?'<p>このカードで今できる行動はありません。</p>':''}`}</section>`:''}</div></div>`;
 d.showModal();d.querySelector('[data-close]').focus();
}
function perform(action,revision,who){
 if(busy)return;busy=true;
 try{const handoff=session.commit(action.id,revision,who);closeDialogs({focus:false});persist();if(handoff)hide();else render();}
 catch(e){message(e.message);closeDialogs();}finally{busy=false;}
}
function requestAction(id){
 const v=session.projection,a=v?.actions.find(a=>a.id===id);if(!a||!session.viewer)return;
 if(!needsConfirmation(a)){perform(a,v.revision,v.actor);return;}
 closeDialogs({focus:false});pending={action:a,revision:v.revision,who:v.actor};
 const d=$('confirm-dialog');d.innerHTML=`<h2>この行動で確定しますか？</h2><p class="confirmation-label">${h(a.label)}</p><p>確定した行動は取り消せません。時・対象は上の表示を確認してください。</p><div class="dialog-buttons"><button type="button" data-cancel>戻る</button><button type="button" class="primary" data-confirm>確定する</button></div>`;d.showModal();d.querySelector('[data-cancel]').focus();
}
function showDiscard(seat,origin){
 const p=session.projection.players[seat];closeDialogs({focus:false});dialogOrigin=origin;
 const d=$('card-dialog');d.innerHTML=`<button type="button" class="dialog-close" data-close>閉じる ×</button><h2>${seat} の捨て札 · ${p.discard.length}枚</h2><div class="discard-cards">${p.discard.map(c=>`<button type="button" class="card-tap" data-inspect="${h(c.id)}" aria-label="${h(c.name)}を拡大">${cardMarkup(c,{compact:true})}</button>`).join('')||'<p>捨て札はありません。</p>'}</div>`;d.showModal();d.querySelector('[data-close]').focus();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-close')||b.hasAttribute('data-cancel')){closeDialogs();return;}
 if(b.hasAttribute('data-confirm')){const p=pending;if(p)perform(p.action,p.revision,p.who);return;}
 if(b.dataset.action){requestAction(b.dataset.action);return;}
 if(b.dataset.inspect){inspect(b.dataset.inspect,{catalog:b.hasAttribute('data-catalog'),origin:b});return;}
 if(b.dataset.zone==='discard'){showDiscard(b.dataset.seat,b);return;}
 if(b.hasAttribute('data-home')){session.clear();closeDialogs();$('game').replaceChildren();$('welcome').hidden=false;$('game').hidden=true;$('export').hidden=true;document.body.classList.remove('playing');renderDeck();$('new').focus();}
});
for(const id of ['card-dialog','confirm-dialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();closeDialogs();});
$('new').onclick=()=>{try{const seed=crypto.getRandomValues(new Uint32Array(1))[0];validateDeck(decks.A);validateDeck(decks.B);start(createGame(seed,decks));persist();}catch(e){message(e.message);}};
$('restore').onclick=()=>{try{const raw=localStorage.getItem(KEY);if(!raw)throw Error('保存された対戦がありません');session.restore(raw);$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');$('deck-list').replaceChildren();$('catalog-list').replaceChildren();hide();message('保存を検証して復帰しました');}catch(e){message(`復帰できません：${e.message}`);}};
$('reveal').onclick=()=>{if(!session.active)return;session.reveal();$('curtain').hidden=true;render();$('hide').focus();};$('hide').onclick=hide;
$('export').onclick=()=>{if(!session.active)return;hide();const url=URL.createObjectURL(new Blob([session.save()],{type:'application/json'})),a=el('a');a.href=url;a.download='naotocchi-hotseat.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;hide();try{if(file.size>2000000)throw Error('保存ファイルが大きすぎます');session.restore(await file.text());$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;document.body.classList.add('playing');$('deck-list').replaceChildren();$('catalog-list').replaceChildren();hide();persist();}catch(error){message(`読込を拒否しました：${error.message}`);}finally{e.target.value='';}};
window.addEventListener('blur',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});window.addEventListener('pagehide',hide);
const DECK_KEY='naotocchi-deck-drafts-v1';
let decks={A:[...DEFAULT_DECK],B:[...DEFAULT_DECK]};
try{const saved=JSON.parse(localStorage.getItem(DECK_KEY));if(saved&&['A','B'].every(a=>Array.isArray(saved[a])&&saved[a].length<=40&&saved[a].every(id=>typeof id==='string'&&CARDS[id]))){decks={A:[...saved.A],B:[...saved.B]};}}catch{}
function saveDraft(){try{localStorage.setItem(DECK_KEY,JSON.stringify(decks));}catch{message('デッキを保存できません。書き出して保管してください。');}renderDeck();}
function renderDeck(){
 const seat=$('deck-seat').value,deck=decks[seat],counts={};for(const id of deck)counts[id]=(counts[id]??0)+1;
 const valid=a=>{try{validateDeck(decks[a]);return '準備OK';}catch(e){return e.message;}};
 $('deck-count').textContent=`A：${decks.A.length}/40枚 · ${valid('A')} ／ B：${decks.B.length}/40枚 · ${valid('B')}`;
 $('new').disabled=!['A','B'].every(a=>{try{validateDeck(decks[a]);return true;}catch{return false;}});
 const list=$('deck-list');list.replaceChildren();for(const [id,n] of Object.entries(counts)){const row=el('div',undefined,'deck-row');row.append(el('span',`${CARDS[id].name} × ${n}${supported(id)?'':' · 未対応'}`),button('− 1枚',()=>{deck.splice(deck.indexOf(id),1);saveDraft();}));list.append(row);}
 const query=$('card-search').value.trim().toLowerCase(),type=$('card-type').value;
 const entries=Object.values(CARDS).filter(c=>(!type||c.type===type)&&(!query||`${c.id} ${c.name} ${c.text}`.toLowerCase().includes(query)));
 $('catalog-count').textContent=`${entries.length} / ${Object.keys(CARDS).length}種類を表示`;
 const catalog=$('catalog-list');catalog.replaceChildren();for(const c of entries){const ok=supported(c.id),row=el('article',undefined,'catalog-card');row.dataset.cardId=c.id;const preview=button('',()=>inspect(c.id,{catalog:true,origin:preview}));preview.className='card-tap catalog-preview';preview.setAttribute('aria-label',c.name+'を拡大');preview.innerHTML=cardMarkup(c,{compact:true});row.append(preview);row.append(el('strong',c.name),el('small',`${c.id} · ${TYPE_NAMES[c.type]} · 時 ${c.cost} · ${c.rare?'レア：上限1枚':'通常：上限3枚'} · ${ok?'対応済み':'未対応（閲覧のみ）'}`));if(c.type==='main')row.append(el('p',`段階 ${c.stage} · ちから ${c.power} / ちえ ${c.wisdom}`));const detail=el('details');detail.append(el('summary','カード効果'),el('p',c.text));row.append(detail);const add=button(`＋ ${seat}に追加 (${counts[c.id]??0}/${c.rare?1:3})`,()=>{deck.push(c.id);saveDraft();});add.disabled=!ok||deck.length>=40||(counts[c.id]??0)>=(c.rare?1:3);add.dataset.add=c.id;row.append(add);catalog.append(row);}
}
$('coverage').textContent=`全${Object.keys(CARDS).length}種類を収録・実行対応${Object.keys(CARDS).filter(supported).length}種類。`;
for(const [id,name] of Object.entries(TYPE_NAMES)){const option=el('option',name);option.value=id;$('card-type').append(option);}
$('deck-seat').onchange=renderDeck;$('card-search').oninput=renderDeck;$('card-type').onchange=renderDeck;
$('deck-default').onclick=()=>{decks[$('deck-seat').value]=[...DEFAULT_DECK];saveDraft();};$('deck-clear').onclick=()=>{decks[$('deck-seat').value]=[];saveDraft();};
$('deck-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,decks},null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='naotocchi-decks.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('deck-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('ファイルが大きすぎます');const data=JSON.parse(await file.text()),next=data.decks??data;validateDeck(next.A);validateDeck(next.B);decks={A:[...next.A],B:[...next.B]};saveDraft();message('A・Bのデッキを読み込みました');}catch(error){message(`デッキ読込を拒否しました：${error.message}`);}finally{e.target.value='';}};
renderDeck();
