// VERSION 8 (U8): end round 9–12 on the official life clock — what is needed, checked against the official modules (read only).
// Finding: the adopted clock (life-clock-render.mjs → v23 → … → v9 variant B) already accepts end 1–12 and points the end hand
// at end×30° (IX = 270°, printed on the dial). The [10,11,12] check in life-clock/clock.mjs is only reached by older preview
// versions (v5–v8), not by the game. So U8 needs NO change to the clock's code or design; the only integration step is that
// life-clock-view.mjs passes the match's final round to clockState (today it uses the default 10) — the one-line change the
// private trial makes ('clock-end' in trial-time/build-trial.mjs).
// Run: node --test integration/test-clock-u8.mjs
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {renderClock} from '../../life-clock-render.mjs';
import {clockState} from '../../life-clock-state.mjs';
const hand=svg=>svg.match(/<g[^>]*data-hand="5"[^>]*>/)?.[0]??'';
const base={round:5,firstTime:4,secondTime:9,firstGrowth:65,secondGrowth:40};
test('U8：採用版の時計は、そのままで終了ラウンド 9〜12 を描ける（小針＝終了ラウンド×30度）',()=>{
 for(const [end,angle] of [[9,270],[10,300],[11,330],[12,0]]){const h=hand(renderClock({...base,end}));assert.match(h,new RegExp(`data-angle="${angle}"`),'end '+end);assert.match(h,new RegExp(`rotate\\(${angle} 512 688\\)`),'end '+end);}
});
test('U8：終了ラウンドを変えても、小針以外の描画は1文字も変わらない（デザインは不変）',()=>{
 // Each render numbers its SVG filter ids (v6-1-…, v6-2-…); the counter is not part of the design, so it is normalized.
 const rest=svg=>svg.replace(/<g[^>]*data-hand="5"[^>]*>/,'').replace(/\bv6-\d+-/g,'v6-N-');const ref=rest(renderClock({...base,end:10}));
 for(const end of [9,11,12])assert.equal(rest(renderClock({...base,end})),ref,'end '+end);
});
test('U8：正式の画面は今、終了ラウンドを渡していない（既定の10）。統合で必要なのは、この1か所だけ',()=>{
 const view=fs.readFileSync(new URL('../../life-clock-view.mjs',import.meta.url),'utf8');
 assert.equal(view.split('const state=clockState(view)').length,2,'渡す場所は1か所');
 const v={round:5,players:{A:{time:4,growth:65},B:{time:9,growth:40}}};
 assert.equal(clockState(v).end,10);assert.equal(clockState(v,{endRound:9}).end,9);assert.equal(clockState(v,{endRound:12}).end,12);
});
