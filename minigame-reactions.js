// なおとっち — ミニゲームの けっか → キャラの はんのう を えらぶ 共通の しくみ(v0)。
// けっか(score・きろく・かいすう・関係) → 文脈(context) → できごと(moment) → はんのうプラン(plan)
// を、DOM も state も さわらない 純関数と データの表 だけで きめる。
// じっさいに 話す・表情・うごき を 出すのは script.js(speakEvent / pet-expression / cast-motion)。
// ここでは あたらしい 育成効果・報酬・保存データを つくらない。
// v0 の 表は いまの はんのうを そのまま 再現する(70点以上=great、30点未満=bad、勧誘=companion_new、
// そのあいだは 会話なし)。台詞の 表(LINES)は から。あとから 表に 足すだけで ゲームごと・ジャンルごとの
// 一言を ふやせる(引き方は gameId → category → genre → any の じゅん)。
(function (root) {
  'use strict';

  // できごとの 判定(つよい じゅん)。条件は 既存の データだけで きまる。表示の えらびかたに だけ つかう
  const MOMENTS = Object.freeze([
    { id: 'companionRecruit', priority: 100, test: (c) => c.recruited === true },
    { id: 'companionMiss', priority: 90, test: (c) => c.source === 'companion' && c.recruited === false },
    { id: 'firstS', priority: 80, test: (c) => !!c.record && c.record.rank === 'S' && (c.record.prevBest == null || rankOf(c.record.prevBest) !== 'S') },
    { id: 'firstClear', priority: 70, test: (c) => !!c.record && c.record.prevBest == null },
    { id: 'newBest', priority: 60, test: (c) => !!c.record && c.record.isNewBest && c.record.prevBest != null },
    { id: 'milestone', priority: 50, test: (c) => MILESTONES.includes(c.playCount) },
    { id: 'nearMiss', priority: 40, test: (c) => !!c.record && !c.record.isNewBest && c.record.best - c.score > 0 && c.record.best - c.score <= 5 },
    { id: 'losingStreak', priority: 30, test: (c) => streak(c.recent, (r) => r.band === 'bad') >= 3 },
    { id: 'repeatPlay', priority: 20, test: (c) => streak(c.recent, (r) => r.gameId === c.gameId) >= 3 },
    { id: 'plain', priority: 0, test: () => true },
  ]);
  const MILESTONES = Object.freeze([10, 50, 100]);
  // script.js の MINIGAME_RANKS と おなじ しきい値(ランク S を はじめて とった かどうか だけに つかう)
  function rankOf(score) { return score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D'; }
  // recent の うしろから、条件を みたす ものが いくつ つづくか(さいごが いまの けっか)
  function streak(recent, pred) {
    let n = 0;
    for (let i = (recent || []).length - 1; i >= 0 && pred(recent[i]); i--) n++;
    return n;
  }

  // 帯 → 既存の 会話イベント(いまの はんのうを そのまま)。イベントキーは ふやさない
  const BAND_REACTIONS = Object.freeze({
    recruit: Object.freeze({ eventKey: 'companion_new', partnerChance: 0.5, companionChance: 0.6 }),
    great: Object.freeze({ eventKey: 'minigame_great', partnerChance: 0.5, companionChance: 0.6 }),
    bad: Object.freeze({ eventKey: 'minigame_bad', partnerChance: 0.45, companionChance: 0.5 }),
    mid: Object.freeze({ eventKey: null }),
  });

  // 本人の 一言の 表(v0 は から)。1行 = { moment, band?, scope, text } 。
  // scope は 'game:<id>' | 'category:<id>' | 'genre:<id>' | 'any'。せまい ほうが かつ
  const LINES = Object.freeze([]);

  // けっかの 文脈を つくる(純関数)。input は script.js が すでに もっている ものだけ
  function buildContext(input) {
    const i = input || {};
    return Object.freeze({
      kind: i.kind || 'normal',
      gameId: i.gameId || null,
      category: i.category || null,
      genre: i.genre || null,
      score: Number.isFinite(i.score) ? i.score : 0,
      band: i.band === 'great' || i.band === 'bad' ? i.band : 'mid',
      record: i.record || null,
      playCount: Number.isFinite(i.playCount) ? i.playCount : 0,
      recent: Object.freeze((i.recent || []).slice(-8)),
      source: i.source || 'play',
      recruited: i.recruited === true ? true : i.recruited === false ? false : null,
      hasPartner: !!i.hasPartner,
      companionCount: Number.isFinite(i.companionCount) ? i.companionCount : 0,
    });
  }

  function detectMoments(ctx) {
    return MOMENTS.filter((m) => m.test(ctx)).map((m) => m.id);
  }

  function scopesOf(ctx) {
    return [ctx.gameId && 'game:' + ctx.gameId, ctx.category && 'category:' + ctx.category, ctx.genre && 'genre:' + ctx.genre, 'any'].filter(Boolean);
  }
  // moment と 帯に あう 一言を、せまい scope から さがす。なければ null(既存の プールに まかせる)
  function pickLine(ctx, moments, lines = LINES, random = Math.random) {
    for (const moment of moments) {
      for (const scope of scopesOf(ctx)) {
        const hits = lines.filter((l) => l.moment === moment && l.scope === scope && (!l.band || l.band === ctx.band));
        if (hits.length) return hits[Math.floor(random() * hits.length)].text;
      }
    }
    return null;
  }

  // 文脈 → はんのうプラン。eventKey が null なら 会話は 出さない(いまの 30〜69点と おなじ)
  function resolve(ctx, options = {}) {
    const moments = detectMoments(ctx);
    const base = ctx.recruited === true ? BAND_REACTIONS.recruit : BAND_REACTIONS[ctx.band];
    const petText = base.eventKey ? pickLine(ctx, moments, options.lines || LINES, options.random || Math.random) : null;
    return Object.freeze({ ...base, petText: petText || null, moment: moments[0], moments: Object.freeze(moments) });
  }

  // 表の 点検(テスト・監査用): 知らない moment / scope の 形 / 空の 台詞
  function audit(lines = LINES) {
    const known = new Set(MOMENTS.map((m) => m.id));
    const problems = [];
    for (const l of lines) {
      if (!known.has(l.moment)) problems.push('unknown moment: ' + l.moment);
      if (!/^(any|game:.+|category:.+|genre:.+)$/.test(String(l.scope))) problems.push('bad scope: ' + l.scope);
      if (!l.text || /\{\w+\}|undefined/.test(l.text)) problems.push('bad text: ' + l.text);
      if (l.band && !['great', 'mid', 'bad'].includes(l.band)) problems.push('bad band: ' + l.band);
    }
    return problems;
  }

  const api = Object.freeze({ MOMENTS: Object.freeze(MOMENTS.map((m) => m.id)), BAND_REACTIONS, LINES, buildContext, detectMoments, pickLine, resolve, audit });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NaotocchiMinigameReactions = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
