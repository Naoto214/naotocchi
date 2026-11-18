import {normalCard as baseNormal,backCard as baseBack,detailCopy} from '../design-comparison-v8-20261115/cards.mjs';
import {escapeHTML as h} from '../design-comparison-v8-20261115/title.mjs';
import {displayRecord,deckLimit,currentPolicy} from './policy.mjs';
export function normalCard(c,options={}){return baseNormal(displayRecord(c,options.names),options);}
export function backCard(){return baseBack().replace('assets/back.png','../v8/assets/back.png');}
export function fullCopy(c){return c.type==='egg'?c.detailHTML.match(/<section class="effect-scroll"[\s\S]*?<\/section>/)[0]:detailCopy(c);}
export function identity(c,cards){if(c.type==='egg')return '<dl class="v9-identity"><div><dt>カードの役割</dt><dd>状態表示 · デッキ外</dd></div></dl>';return `<dl class="v9-identity"><div><dt>レアリティ</dt><dd>${c.rare?'◆ レア':'通常'}</dd></div><div><dt>デッキ投入上限</dt><dd>同じカードIDで${deckLimit(c.id,cards,currentPolicy())}枚</dd></div></dl>`;}
export function detailCard(c,{names='formal',art='contain',cards=[],flipButton=false}={}){const named=displayRecord(c,names);return `<article class="v9-detail-paper" data-detail-key="${h(c.id||'egg')}"><div class="v9-detail-art${c.type==='main'?' main':''}">${normalCard(c,{names,art,egg:c.type==='egg',large:true})}</div><section class="v9-full-copy" data-full-copy>${named.title!==c.title?`<p class="v9-candidate-note">名称比較候補 · 現在の正式名：${h(c.title)}</p>`:''}${fullCopy(c)}${identity(c,cards)}${c.type==='egg'?'':`<p class="v9-source-name">正式識別名：${h(c.name)}<br>${h(c.id)}</p>`}<div class="v9-detail-brand">NAOTOCCHI</div></section></article>`;}
