// Fixed position requested by the owner: opponent's challenge, TWO かくとうバトル in hand, time 1 (tools/fixed-b14.mjs).
// B1 alone: the two copies' correct modes cancel each other to 0 (tie with passing). B4 alone: no cancellation, but the
// modes tie (wrong stat chosen by the tie hash). B1+B4: always the correct mode.  Run: node --test tests/b14.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {twoFights,evaluate,PROFILES} from '../tools/fixed-b14.mjs';
for(const key of ['fight:wisdom:opp','fight:power:opp']){
 const {f,s}=twoFights(key),R=Object.fromEntries(Object.entries(PROFILES).map(([n,p])=>[n,evaluate(s,f.seat,p)]));
 const fights=n=>R[n].rows.filter(x=>x.card==='G-street-fight'),best=(n,right)=>Math.max(...fights(n).filter(x=>x.right===right).map(x=>x.score));
 test(`${key} 正式：2枚が相殺し、全ての型が0点（パスと同点）`,()=>{for(const x of fights('off'))assert.equal(x.score,0);assert.ok(R.off.dist['パス']>0);});
 test(`${key} B1単独：正しい型も相殺で0点のまま、パスが残る`,()=>{assert.equal(best('b1',true),0);assert.ok(R.b1.dist['パス']>0&&!R.b1.dist['種目違いの型']);});
 test(`${key} B4単独：相殺は消えるが、正しい型と種目違いの型が同点`,()=>{assert.equal(best('b4',true),best('b4',false));assert.ok(best('b4',true)>0&&R.b4.dist['種目違いの型']>0);});
 test(`${key} B1＋B4：正しい型だけが正の評価で、200 seed すべて正しい型`,()=>{assert.ok(best('b1b4',true)>0&&best('b1b4',true)>best('b1b4',false));assert.deepEqual(R.b1b4.dist,{'正しい型':200});});
}
