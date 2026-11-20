// VERSION 8: writes integration/481-time-reversal-cards.md from candidate-cards.mjs (card texts and the rulebook section),
// so the card texts, the rulebook section and the catalog's source_sha256 always agree. Usage: node integration/make-card-doc.mjs
import {writeFileSync} from 'node:fs';
const m=await import('./candidate-cards.mjs?'+Date.now());
const L=['# 481 時のカード4種類と逆転カード3種類 — 正式導入候補の本文（VERSION 8・未採用）','',
 '**この文書は統合候補です。** 正式採用（本人の承認）の時に `docs/card-game/` へ置き、カタログの生成（`build_full_catalog.py`・`tools/check-design-data.py`）に登録します。それまで正式カタログには入りません。','',
 '効果・コスト・条件は本人が確定したものです（PR #498 VERSION 4〜8、REPORT §15〜§19）。本文は短縮版（U9、VERSION 8 で本人が決定）で、時のカードの共通ルールは §1 のルールブックの項に書きます。','',
 '## 1. ルールブックの項「時のカード」（案）','',...m.RULEBOOK_TIME_CARDS.map(t=>'- '+t),'',
 '## 2. 時のカード（せかい・時2・レアではない・同名3枚まで）',''];
for(const c of Object.values(m.CANDIDATE_CARDS))if(c.type==='world')L.push('### '+c.id+' — '+c.name,'',c.text,'');
L.push('## 3. 逆転カード（できごと・時2・すぐつかう・レアではない・同名3枚まで）','');
for(const c of Object.values(m.CANDIDATE_CARDS))if(c.type==='event')L.push('### '+c.id+' — '+c.name,'',c.text,'');
writeFileSync(new URL('./481-time-reversal-cards.md',import.meta.url),L.join('\n'));
console.log('written',Object.keys(m.CANDIDATE_CARDS).length,'cards');
