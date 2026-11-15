import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const renderer=process.env.V11_BASELINE?'../design-comparison-v10-20261115/render.mjs':'./render.mjs';
const {renderCard}=await import(renderer);const d=JSON.parse(fs.readFileSync(process.env.V11_DATA));
const printed='自分のターン開始時、通常ドローの後にさらに1枚引き、手札1枚を山札の一番下に戻す。';
test('egg detail uses the formal printed face, not the rulebook expansion',()=>{const html=renderCard(null,{egg:true,detail:true,eggData:d.egg});assert(html.includes(printed));assert(!html.includes('シャッフルしません'));assert(!html.includes('交際進行'));});
test('egg normal face has no text or fabricated cost/stats/rarity',()=>{const html=renderCard(null,{egg:true,eggData:d.egg});for(const c of ['v10-copy','v8-cost','v8-stats','v8-rare'])assert(!html.includes(c));});
test('every real effect and projected stat remains unchanged',()=>{for(const c of d.cards){const html=renderCard(c,{detail:true});const text=c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');assert(html.includes(text),c.id);}const c=d.cards.find(c=>c.type==='main');assert(renderCard({...c,power:99,wisdom:88}).includes('>99<'));});
