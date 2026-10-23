// Conversation v2 — ほかのあそび(なおぽよ。・CARD GAME)から帰ってきたときの一言。
// それぞれのゲームが自分で保存している記録を、読むだけ。ゲームのコード・ルール・保存の形は変えない。
// ここは「前に見たときから何が増えたか」を読む純関数と、台詞のデータ。DOM・タイマー・乱数は持たない。
// 読み取りの約束(どの保存キーの、どの項目を読むか)は docs/design/conversation-full-rollout-2026-10-23.md §6。
(function(root) {
  'use strict';

  // 読むだけの保存キー(各ゲームの正本。形が変わったら、ここが null を返して黙るだけ)
  const KEYS = Object.freeze({naopoyo:'naopoyo-rescue-v1', card:'naotocchi-card-records-v1'});
  // 会話側が「どこまで見たか」を覚えておくキー(本体のセーブとは別。消えても困らない)
  const MARKER_KEY = 'naotocchi-conversation-away-v1';
  const FRESH_MS = 30 * 60e3;   // CARD GAME は、終わってから 30 分以内の対戦だけ話題にする

  const parse = raw => { try { return typeof raw === 'string' && raw ? JSON.parse(raw) : null; } catch (_) { return null; } };
  // なおぽよ。: {version:1, index, state, history, cleared:[ステージ id]}。cleared だけ読む
  function readNaopoyo(raw) {
    const d = parse(raw);
    if (!d || d.version !== 1 || !Array.isArray(d.cleared)) return null;
    const cleared = [...new Set(d.cleared.filter(x => typeof x === 'number' || typeof x === 'string').map(String))];
    return {cleared};
  }
  // CARD GAME: {format:'naotocchi-records', version:1, rows:[[id, startedAt, endedAt, mode, human, difficulty, cpuDeck, winner, growthA, growthB, round, ...]]}
  function readCard(raw) {
    const d = parse(raw);
    if (!d || d.format !== 'naotocchi-records' || d.version !== 1 || !Array.isArray(d.rows)) return null;
    const rows = d.rows.filter(r => Array.isArray(r) && typeof r[0] === 'string');
    let last = null;
    for (const r of rows) if (Number.isFinite(r[2]) && (!last || r[2] > last[2])) last = r;
    if (!last) return {count:rows.length, last:null};
    const [id, , endedAt, mode, human, difficulty, , winner, , , round] = last;
    const result = mode === 'cpu'
      ? (winner == null ? 'draw' : winner === human ? 'win' : 'loss')
      : mode === 'hotseat' ? 'pair' : null;
    return {count:rows.length, last:{id, endedAt, mode, difficulty:difficulty || null, result, round:Number(round) || 0}};
  }
  // 前に見たとき(marker)と、いまの記録をくらべて、話題になることを 1 つ返す。next はつぎの marker
  // marker がない(はじめて)ときは、いまの状態を覚えるだけで話題にしない(昔の記録を急に話さない)
  function detect(marker, raws, now) {
    const naopoyo = readNaopoyo(raws.naopoyo), card = readCard(raws.card);
    const next = {v:1, naopoyo:naopoyo ? naopoyo.cleared : (marker?.naopoyo || null), card:card?.last ? card.last.id : (marker?.card || null)};
    if (!marker || marker.v !== 1) return {event:null, next};
    let event = null;
    if (card?.last && card.last.id !== marker.card && card.last.result && Number.isFinite(card.last.endedAt) && now - card.last.endedAt <= FRESH_MS && card.last.endedAt <= now + 60e3) {
      const kind = card.last.result === 'win' && card.last.difficulty === 'intermediate' ? 'bigwin' : card.last.result;
      event = {source:'card', kind, round:card.last.round};
    } else if (naopoyo && Array.isArray(marker.naopoyo)) {
      const before = new Set(marker.naopoyo.map(String));
      const added = naopoyo.cleared.filter(id => !before.has(id));
      if (added.length) event = {source:'naopoyo', kind:added.length >= 2 ? 'clears' : 'clear', count:added.length};
    }
    return {event, next};
  }

  const P = text => Object.freeze({role:'pet', text});
  const T = text => Object.freeze({role:'them', text});
  // when: {source, kinds, with?}
  const unit = (id, when, beats) => Object.freeze({kind:'away', id, with:null, ...when, beats:Object.freeze(beats)});
  const UNITS = Object.freeze([
    // なおぽよ。(なかまを助けて出口へ連れていくパズル)
    unit('a-poyo-welcome', {source:'naopoyo', kinds:['clear', 'clears']}, [P('おかえり。だれか助けてきた?'), P('顔に、ぷにっとしたのがついてる')]),
    unit('a-poyo-exit', {source:'naopoyo', kinds:['clear']}, [P('出口って、入口のうらがわ?')]),
    unit('a-poyo-merge', {source:'naopoyo', kinds:['clear', 'clears']}, [P('ふたりでひとつになるやつ、やってた?'), P('ぼくはひとりでひとつ')]),
    unit('a-poyo-many', {source:'naopoyo', kinds:['clears']}, [P('いっぱい助けてきたね'), P('こっちのお世話も、ひとつ')]),
    unit('a-poyo-jealous', {source:'naopoyo', kinds:['clear', 'clears'], with:'any'}, [T('どこ行ってたの?'), P('ぷにぷにの国'), T('……おみやげは?')]),
    unit('a-poyo-finger', {source:'naopoyo', kinds:['clear']}, [P('指、まだなぞる形してる')]),
    // CARD GAME(カードの対戦)
    unit('a-card-win', {source:'card', kinds:['win', 'bigwin']}, [P('勝った顔してる'), P('カードの角、ちょっと光ってる')]),
    unit('a-card-bigwin', {source:'card', kinds:['bigwin']}, [P('つよいほうに勝ったの?'), P('……ぼくのことも、たまに引いて')]),
    unit('a-card-loss', {source:'card', kinds:['loss']}, [P('カードって、紙なのにつよいね')]),
    unit('a-card-loss-deck', {source:'card', kinds:['loss']}, [P('おかえり。デッキ、反省会する?'), P('ぼくは、まぜる係ならできる')]),
    unit('a-card-draw', {source:'card', kinds:['draw']}, [P('引き分けって、ふたりとも勝ち?')]),
    unit('a-card-pair', {source:'card', kinds:['pair']}, [P('ふたりで遊んでた?'), P('……ぼくの席は?')]),
    unit('a-card-long', {source:'card', kinds:['win', 'loss', 'draw', 'bigwin']}, [P('長い勝負だった?'), P('カードも、すこし眠そう')]),
    unit('a-card-visitor', {source:'card', kinds:['win', 'bigwin'], with:'any'}, [T('何してたの?'), P('カードで勝ってきたって'), T('きみが言うの?')]),
    unit('a-card-visitor-loss', {source:'card', kinds:['loss'], with:'any'}, [T('元気ない?'), P('カードが、きょうはだめだって')]),
  ]);
  // event: detect の event。ctx: {visitorKind, visitorQuiet}
  function candidates(event, ctx = {}) {
    if (!event) return [];
    return UNITS.filter(u => u.source === event.source && u.kinds.includes(event.kind)
      && (u.source !== 'card' || u.id !== 'a-card-long' || (event.round || 0) >= 8)
      && (!u.with || (ctx.visitorKind && !ctx.visitorQuiet && (u.with === 'any' || u.with === ctx.visitorKind))));
  }
  function validate() {
    const problems = [], ids = new Set();
    for (const u of UNITS) {
      if (ids.has(u.id)) problems.push(`${u.id}: duplicate`); ids.add(u.id);
      if (!['naopoyo', 'card'].includes(u.source)) problems.push(`${u.id}: source`);
      if (!u.kinds.length) problems.push(`${u.id}: kinds`);
      u.beats.forEach((b, i) => {
        if (!b.text || /[ 　]/.test(b.text) || [...b.text].length > 22) problems.push(`${u.id}[${i}]: text`);
        if (b.role === 'them' && !u.with) problems.push(`${u.id}[${i}]: visitor line without a visitor`);
      });
    }
    for (const [source, kinds] of [['naopoyo', ['clear', 'clears']], ['card', ['win', 'bigwin', 'loss', 'draw', 'pair']]])
      for (const kind of kinds) if (!UNITS.some(u => u.source === source && u.kinds.includes(kind) && !u.with)) problems.push(`${source}/${kind}: no line`);
    return problems;
  }

  const api = {KEYS, MARKER_KEY, FRESH_MS, readNaopoyo, readCard, detect, UNITS, candidates, validate, VERSION:1};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiConversationAway = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
