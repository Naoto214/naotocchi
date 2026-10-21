import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as book from '../rulebook-content.mjs';

test('current rulings cover every chapter with precise source headings',()=>{
 assert.ok(Array.isArray(book.CURRENT_RULINGS),'current display data is separate from historical sources');
 for(const c of book.CHAPTERS){const rules=book.rulingsForChapter(c.id);assert.ok(rules.length,`chapter ${c.id}`);for(const r of rules){assert.equal(r.chapter,c.id);assert.ok(r.text&&r.title&&r.source.path&&r.source.heading);}}
 assert.equal(new Set(book.CURRENT_RULINGS.map(r=>r.id)).size,book.CURRENT_RULINGS.length);
});
test('search finds detailed rulings, respects chapter scope, normalizes width, and excludes obsolete policy',()=>{
 assert.equal(typeof book.searchRules,'function');
 assert.ok(book.searchRules('置換先を実行できない',15).length);
 assert.equal(book.searchRules('置換先を実行できない',3).length,0);
 assert.ok(book.searchChapters('置換先を実行できない').some(c=>c.id===15));
 assert.ok(book.searchRules('４５２').length);
 for(const term of ['発見済み','カード解禁','次に再開','ユーザー','設計','監査','再質問','未登録source','名称暫定','仮採用'])assert.equal(book.searchRules(term).length,0,term);
});
test('current collection policy and shared person placement are explicit and separate from relationship progress',()=>{
 assert.ok(Array.isArray(book.CURRENT_RULINGS));
 const all=book.CURRENT_RULINGS.map(r=>r.text).join('\n');
 assert.match(all,/452枚.*最初から/);assert.match(all,/453.*たまご/);
 const people=book.rulingsForChapter(9).map(r=>r.text).join('\n');
 assert.match(people,/合計1人/);assert.match(people,/時0/);assert.match(people,/交際進行.*別/);
 assert.match(people,/おともだちチケット/);assert.match(people,/手札に加える/);
 assert.doesNotMatch(people,/効果.*配置.*回数を消費しない/);
});
test('detailed order and exceptions remain searchable in the appropriate chapters',()=>{
 assert.equal(typeof book.searchRules,'function');
 for(const [chapter,term] of [[5,'解決に入る時点'],[8,'最後に下限'],[9,'相手効果だけを防ぐ'],[12,'終了前に適用されていた予約'],[13,'同じ発動区分'],[14,'期限切れと判定の間'],[15,'同じ一連の出来事'],[15,'固有名']])assert.ok(book.searchRules(term,chapter).length,`${chapter}: ${term}`);
});

test('each provenance heading exists in its untouched source document',()=>{
 for(const r of book.CURRENT_RULINGS){const source=readFileSync(new URL('../../../'+r.source.path,import.meta.url),'utf8');assert.ok(source.split('\n').some(line=>/^#{2,3} /.test(line)&&line.replace(/^#{2,3} /,'')===r.source.heading),r.id+' '+r.source.heading);}
});
