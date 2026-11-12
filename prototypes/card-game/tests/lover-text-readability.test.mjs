// 481：いわばのタコさん・とけないゆきだるまの「こいびとのとき」本文の言い換え（処理は不変）。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG} from '../full-catalog.mjs';
import {LOVER_MARRIED} from '../lover-married.mjs';

const evidence=JSON.parse(readFileSync(new URL('../../../docs/card-game/data/lover-text-readability-20261112.json',import.meta.url)));

test('481：変わったのはタコとゆきだるまの本文だけで、新本文は証拠JSONと一致する',()=>{
 assert.deepEqual(evidence.changed_cards.map(c=>c.id),['P-rock_octopus','P-snowman']);
 for(const c of evidence.changed_cards){assert.equal(CATALOG[c.id].text,c.after,c.id);assert.notEqual(c.before,c.after);}
});
test('481：意味を決める語句は残っている',()=>{
 const o=CATALOG['P-rock_octopus'].text,s=CATALOG['P-snowman'].text;
 for(const w of ['1ターンに1回。','自分のターンに','なかまがいて','準備枠にカードが2枚以上','時1を払い','適正にみにつけられる','今の装備先とは別の','対象として発動できる'])assert.ok(o.includes(w),w);
 for(const w of ['相手の効果で','こいびと枠を離れて','手札か捨て札','関係が終わった時','たまごでなければ','その移動先で発動できる','山札上2枚を見て、その中から1枚を手札に加え','山札の一番下'])assert.ok(s.includes(w),w);
});
test('481：「♥ 結婚したら」は変えない',()=>{
 assert.equal(LOVER_MARRIED['P-rock_octopus'].married,'「こいびとのとき」の能力は、時1を払わず、自分になかまがいなくても発動できる。');
 assert.equal(LOVER_MARRIED['P-snowman'].married,'結婚中に離れて「こいびとのとき」の能力が発動した時は、さらに1枚引く。');
});
test('481：保存の版は増やさない',()=>{assert.equal(evidence.save_compatibility.new_rule_version,null);});
