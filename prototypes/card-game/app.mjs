import {createGame,actor,act,view,save,restore,TYPE_NAMES} from './engine.mjs';
const $=id=>document.getElementById(id),KEY='naotocchi-hotseat-v1';
let state=null,viewer=null,selected=null,busy=false;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function message(text){$('status').textContent=text;}
function persist(){try{localStorage.setItem(KEY,save(state));message('この端末に保存しました');}catch{message('自動保存できません。保存ファイルを書き出してください。');}}
function hide(){if(!state)return;viewer=null;selected=null;$('game').replaceChildren();$('curtain').hidden=state.phase==='finished';$('handoff-title').textContent=`プレイヤー ${actor(state)} に端末を渡してください`;$('hide').hidden=true;if(state.phase==='finished')render();}
function start(next){state=next;$('welcome').hidden=true;$('game').hidden=false;$('export').hidden=false;hide();}
function button(text,handler){const n=el('button',text);n.type='button';n.addEventListener('click',handler);return n;}
function perform(action,revision,who){if(busy)return;busy=true;try{const next=act(state,who,revision,action.id);state=next;selected=null;persist();if(actor(state)!==viewer||state.phase==='finished')hide();else render();}catch(e){message(e.message);}finally{busy=false;}}
function render(){
 const v=view(state,viewer),root=$('game');root.replaceChildren();$('hide').hidden=!viewer||!!v.result;
 const top=el('section',undefined,'panel turn');top.append(el('h2',`ROUND ${v.round} / 10 · ${v.turn} のターン`),el('p',v.result?'対戦終了':`${v.actor} の操作 · ${v.phase==='normal'?'通常行動':v.phase==='choice'?'必須選択':v.phase==='trigger'?'誘発能力を選択':'応答・チェーン'}`));root.append(top);
 if(v.result){const result=el('section',undefined,'panel');result.id='result';result.append(el('h2',v.result.winner?`${v.result.winner} の勝利`:'引き分け'),el('p',`${v.result.reason} · A ${v.result.growth.A} / B ${v.result.growth.B}`),button('開始画面へ',()=>{state=null;viewer=null;root.replaceChildren();$('welcome').hidden=false;$('export').hidden=true;}));root.append(result);}
 const boards=el('div',undefined,'boards');
 for(const a of ['A','B']){const p=v.players[a],box=el('section',undefined,'panel');box.dataset.player=a;box.append(el('h2',`PLAYER ${a}${a===viewer?' · あなた':''}`));const metrics=el('p',`成長 ${p.growth} / 時 ${p.time} / 手札 ${p.handCount} / 山札 ${p.deckCount}`,'metrics');box.append(metrics);if(p.stats)box.append(el('p',`ちから ${p.stats.power} · ちえ ${p.stats.wisdom} · 交際 ${p.relationship===null?'—':p.relationship===4?'結婚':p.relationship}`));
 const slots=el('div',undefined,'slots');for(const [label,card] of [['セカイ',p.board.world],['メイン',p.board.main],['こいびと',p.board.partner],...[0,1,2].map(i=>['なかま',p.board.companions[i]]),...[0,1,2].map(i=>['みにつけ',p.board.prepared[i]])]){const slot=el('div',undefined,'slot');slot.append(el('small',label),el('span',card?.name??(label==='メイン'?'たまご':'空き')));if(card){const details=el('details');details.append(el('summary','効果'),el('p',card.text));if(card.target)details.append(el('p',`対象：${card.target}`));slot.append(details);}slots.append(slot);}box.append(slots);const discard=el('details');discard.append(el('summary',`捨て札 ${p.discard.length}枚`),el('p',p.discard.map(c=>c.name).join(' / ')||'なし'));box.append(discard);boards.append(box);}
 root.append(boards);
 if(viewer&&!v.result){const hand=el('section',undefined,'panel');hand.id='hand';hand.append(el('h2',`${viewer} の手札`));const cards=el('div',undefined,'cards');for(const c of v.players[viewer].hand){const b=button('',()=>{selected=selected===c.id?null:c.id;render();});b.className=`card${selected===c.id?' selected':''}`;b.dataset.card=c.id;b.append(el('small',`${TYPE_NAMES[c.type]} · 時 ${c.cost}`),el('strong',c.name),...(c.type==='main'?[el('p',`段階 ${c.stage} · ちから ${c.power} / ちえ ${c.wisdom}`)]:[]),el('p',c.text));cards.append(b);}hand.append(cards);root.append(hand);
 const controls=el('section',undefined,'panel');controls.append(el('h2',v.choice?'必須選択':selected?'選んだカードの行動・対象':'今できる行動'));
 if(v.choice){controls.append(el('p',v.choice.kind==='look'?`自分だけ確認：${v.choice.peek.name}`:'山札の一番下に置く手札を選んでください','notice'));}
 if(selected)controls.append(button('すべての行動を表示',()=>{selected=null;render();}));
 const actions=el('div',undefined,'actions');actions.id='actions';const choices=v.actions.filter(a=>!selected||a.source===selected||a.kind==='choose');for(const action of choices){const b=button(action.label,()=>perform(action,v.revision,v.actor));b.dataset.kind=action.kind;b.dataset.action=action.id;actions.append(b);}if(!choices.length)actions.append(el('p','このカードは今使えません。時・タイミング・対象・配置枠を確認してください。'));controls.append(actions);root.append(controls);}
 const chain=el('section',undefined,'panel chain');chain.append(el('h2',`チェーン ${v.chain.length}`));for(const l of [...v.chain].reverse())chain.append(el('p',`${l.actor}：${l.name}${l.target?' → '+l.target:''}${l.declare?' / '+l.declare:''}`));if(!v.chain.length)chain.append(el('p','チェーンは空です。応答中は双方がパスして次へ進みます。'));root.append(chain);
 const history=el('details',undefined,'panel');history.append(el('summary','公開ログ'));const log=el('ol',undefined,'log');for(const line of v.log)log.append(el('li',line));history.append(log);root.append(history);
}
$('new').onclick=()=>{try{const seed=crypto.getRandomValues(new Uint32Array(1))[0];start(createGame(seed));persist();}catch(e){message(e.message);}};
$('restore').onclick=()=>{try{const raw=localStorage.getItem(KEY);if(!raw)throw Error('保存された対戦がありません');start(restore(raw));message('保存を検証して復帰しました');}catch(e){message(`復帰できません：${e.message}`);}};
$('reveal').onclick=()=>{if(!state)return;viewer=actor(state);$('curtain').hidden=true;render();};$('hide').onclick=hide;
$('export').onclick=()=>{if(!state)return;hide();const blob=new Blob([save(state)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='naotocchi-hotseat.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;hide();try{if(file.size>2000000)throw Error('保存ファイルが大きすぎます');const next=restore(await file.text());start(next);persist();}catch(error){message(`読込を拒否しました：${error.message}`);}finally{e.target.value='';}};
window.addEventListener('blur',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});window.addEventListener('pagehide',hide);
