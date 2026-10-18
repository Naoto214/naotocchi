import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('main menu links to same-origin two-player CARD GAME without replacing existing games',()=>{
 const root=new URL('../../../',import.meta.url),html=readFileSync(new URL('index.html',root),'utf8');
 const links=[...html.matchAll(/<a\b[^>]*class="independent-game"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
 const card=links.filter(m=>m[1]==='prototypes/card-game/');assert.equal(card.length,1);assert.match(card[0][2],/同一端末2人対戦/);assert.doesNotMatch(card[0][0],/onclick=|target=/);
 assert.ok(links.some(m=>m[1]==='prototypes/naopoyo/'));assert.match(html,/id="gamesBtn"/);
 assert.ok(existsSync(new URL(card[0][1]+'index.html',root)));
});
