// Conversation v2 — クイックのあとの一言(Pilot)。
// クイックの結果(クリア数・コンボ・ライフ・どのゲームで失敗したか)は quick.js が数えたものを受け取るだけ。
// ここは「その結果から、どんなできごとだったか」を読む純関数と、「誰が何を言うか」の台詞データ。
// DOM・セーブ・タイマー・乱数は持たない。いつ出すかは script.js と Conversation Director が決める。
// クイックは次々遊べるのが魅力なので、台詞は 1〜2 行(まれに 3 行)。問いかけ(選択肢)は使わない。
// 設計: docs/design/conversation-quick-pilot-2026-10-23.md
(function(root) {
  'use strict';

  // Pilot で台詞を書いたクイックのゲーム(quick.js の GAMES の id)。結果の形がちがうものを選んだ:
  // eat=えらぶ、dodge=よけきる(時間切れで成功)、mash=れんだ、stop=タイミング、wait=なにもしない、
  // count=おぼえる・かぞえる、fish=まってから反応(はやすぎると失敗)、stack=タイミング+つみあげ
  const PILOT_GAMES = Object.freeze(['eat', 'dodge', 'mash', 'stop', 'wait', 'count', 'fish', 'stack']);
  const ALL = PILOT_GAMES;
  const MOMENTS = Object.freeze(['perfect', 'zero', 'newBest', 'firstTime', 'bigCombo', 'close', 'endedBy', 'plain']);

  const P = text => Object.freeze({role:'pet', text});
  const T = text => Object.freeze({role:'them', text});
  // when: {modes, games?, moments, with?, trait?}
  //  - modes: 'solo'(1本ずつ)/ 'mix'(まぜた 20 本)
  //  - games: solo はそのゲーム、mix は「最後に失敗したゲーム」(endedBy のとき)。なしなら どのゲームでも
  //  - with: null(本人だけ)/ 'partner' / 'companion' / 'any'
  //  - trait: 'persistence+' のように、生まれつきの気質が高い(4〜5)/ 低い(1〜2)ときだけ候補に入る
  const unit = (id, when, beats) => Object.freeze({kind:'quick', id, games:null, with:null, trait:null, ...when, beats:Object.freeze(beats)});
  const SOLO = ['solo'], MIX = ['mix'], BOTH = ['solo', 'mix'];

  const UNITS = Object.freeze([
    // たべろ!
    unit('q-eat-full', {modes:SOLO, games:['eat'], moments:['perfect', 'newBest']}, [P('ぜんぶたべた'), P('ごちそうさまは、あとで言う')]),
    unit('q-eat-maybe', {modes:BOTH, games:['eat'], moments:['zero', 'plain', 'endedBy']}, [P('うんちは、たべてない'), P('……たぶん')]),
    unit('q-eat-chew', {modes:SOLO, games:['eat'], moments:['plain', 'bigCombo', 'close'], with:'any'}, [T('はやかったね'), P('かむのは、あとでやる')]),
    // よけろ!
    unit('q-dodge-polite', {modes:SOLO, games:['dodge'], moments:['perfect', 'newBest']}, [P('ぜんぶよけた'), P('うんちのほうが、気をつかってた')]),
    unit('q-dodge-wind', {modes:BOTH, games:['dodge'], moments:['zero', 'plain', 'endedBy']}, [P('いまの、むこうから来た')]),
    unit('q-dodge-catch', {modes:SOLO, games:['dodge'], moments:['plain', 'close', 'newBest'], trait:'boldness+'}, [P('次は、よけないで受けとめる')]),
    // れんだ!
    unit('q-mash-run', {modes:SOLO, games:['mash'], moments:['perfect', 'newBest', 'bigCombo']}, [P('ゆびが、まだ走ってる')]),
    unit('q-mash-tired', {modes:BOTH, games:['mash'], moments:['zero', 'plain', 'endedBy', 'close']}, [P('ボタンが、つかれたって')]),
    unit('q-mash-more', {modes:SOLO, games:['mash'], moments:['zero', 'plain', 'close'], trait:'persistence+'}, [P('もっとおせば、もっとおせる')]),
    // とめろ!
    unit('q-stop-done', {modes:SOLO, games:['stop'], moments:['perfect', 'newBest']}, [P('たこやき、ちょうどいいやけかた'), P('たべてないけど')]),
    unit('q-stop-heart', {modes:BOTH, games:['stop'], moments:['zero', 'plain', 'endedBy']}, [P('とめたよ。心の中で')]),
    unit('q-stop-early', {modes:SOLO, games:['stop'], moments:['close', 'plain'], with:'any'}, [T('おしかったね'), P('タイミングが、先に帰った')]),
    // まて!
    unit('q-wait-itch', {modes:BOTH, games:['wait'], moments:['zero', 'plain', 'endedBy']}, [P('まてって言われると'), P('うごきたくなる')]),
    unit('q-wait-pro', {modes:SOLO, games:['wait'], moments:['perfect', 'newBest']}, [P('なにもしないの、とくい')]),
    unit('q-wait-what', {modes:BOTH, games:['wait'], moments:['zero', 'plain', 'endedBy'], trait:'curiosity+'}, [P('まってたら、何が来たの?')]),
    // いくつ?
    unit('q-count-grow', {modes:BOTH, games:['count'], moments:['zero', 'plain', 'endedBy']}, [P('ほし、数えてたら'), P('数のほうがふえた')]),
    unit('q-count-fingers', {modes:SOLO, games:['count'], moments:['perfect', 'newBest']}, [P('ぜんぶ数えた'), P('ゆびは10本しかないのに')]),
    unit('q-count-lots', {modes:SOLO, games:['count'], moments:['plain', 'close'], with:'any'}, [T('いくつだった?'), P('いっぱい'), T('数字で')]),
    // つれ!
    unit('q-fish-early', {modes:BOTH, games:['fish'], moments:['zero', 'plain', 'endedBy']}, [P('はやすぎた'), P('魚、まだ着がえてた')]),
    unit('q-fish-face', {modes:SOLO, games:['fish'], moments:['perfect', 'newBest']}, [P('10ぴきつれた'), P('ぜんぶ同じ顔だった')]),
    unit('q-fish-rest', {modes:SOLO, games:['fish'], moments:['zero', 'plain'], trait:'persistence-'}, [P('魚にも、休けいは要る')]),
    // つめ!
    unit('q-stack-sky', {modes:SOLO, games:['stack'], moments:['perfect', 'newBest']}, [P('つみすぎて、空がせまい')]),
    unit('q-stack-lean', {modes:BOTH, games:['stack'], moments:['zero', 'plain', 'endedBy', 'close']}, [P('タワーが、ちょっとよりかかった')]),
    // まぜた 20 本
    unit('q-mix-perfect', {modes:MIX, moments:['perfect']}, [P('20こぜんぶ'), P('……いまの、だれがやったの?')]),
    unit('q-mix-auto', {modes:MIX, moments:['bigCombo']}, [P('とちゅうから、ゆびが勝手にやってた')]),
    unit('q-mix-follow', {modes:MIX, moments:['newBest'], with:'any'}, [T('きろくだね'), P('きろくのほうが、ついてきた')]),
    unit('q-mix-eyes', {modes:MIX, moments:['firstTime']}, [P('はやい。目がまだ前のゲームにいる')]),
    unit('q-mix-talk', {modes:MIX, moments:['plain', 'close']}, [P('指示が、ちょっと早口だった')]),
    unit('q-mix-sorry', {modes:MIX, moments:['plain', 'close'], with:'partner'}, [T('いっしょにやりたかった'), P('ゆびが一本、あいてるよ')]),
    // どれでも
    unit('q-any-practice', {modes:BOTH, moments:['zero']}, [P('いまのは、れんしゅう'), P('本番は、まだ')]),
    unit('q-any-almost', {modes:BOTH, moments:['close']}, [P('あとちょっとは、ほぼできた')]),
    unit('q-any-again', {modes:BOTH, moments:['zero', 'plain', 'close'], trait:'persistence+'}, [P('あと一回。いまのは、なし')]),
    unit('q-any-fingers', {modes:BOTH, moments:['zero', 'plain'], trait:'persistence-'}, [P('ゆびが、きょうは休みたいって')]),
  ]);

  // quick.js の結果(onRunEnd の stats)と、その回の前の記録から、できごとを読む。判定は変えない(読むだけ)
  // stats: {cleared, total, maxCombo, lives, solo, lastMiss}
  // prev: {runs, best}(solo はそのゲームの 1本ずつの記録、mix はまぜた 20 本の記録。この回を足す前)
  function moments(stats, prev) {
    const s = stats || {}, p = prev || {runs:0, best:0};
    const total = Number(s.total) || 0, cleared = Number(s.cleared) || 0;
    const out = [];
    if (total && cleared >= total) out.push('perfect');
    if (cleared === 0) out.push('zero');
    if (p.runs > 0 && cleared > (p.best || 0)) out.push('newBest');
    if (!p.runs) out.push('firstTime');
    if (cleared < total && (Number(s.maxCombo) || 0) >= (s.solo ? 6 : 8)) out.push('bigCombo');
    if (total && cleared < total && cleared >= total - 2) out.push('close');
    if (!s.solo && s.lives <= 0 && s.lastMiss) out.push('endedBy');
    // 最後に失敗したゲーム・はじめての回は「おまけ」のきっかけ。ほかにできごとがなければ、ふつうの結果としても読む
    if (!out.some(m => m !== 'endedBy' && m !== 'firstTime')) out.push('plain');
    return out;
  }

  // 生まれつきの気質(individuality の temperament 1〜5)を、高い/低いの印に
  function traitMatches(trait, temperament) {
    if (!trait) return true;
    const m = /^([a-z]+)([+-])$/.exec(trait);
    if (!m || !temperament) return false;
    const v = Number(temperament[m[1]]);
    if (!Number.isFinite(v)) return false;
    return m[2] === '+' ? v >= 4 : v <= 2;
  }
  // そのゲームの台詞があるか(solo はそのゲーム、mix はいつでも)
  function covers(mode, soloId) {
    return mode === 'mix' || (mode === 'solo' && PILOT_GAMES.includes(soloId));
  }
  // ctx: {mode, soloId, lastMiss, moments, visitorKind, visitorQuiet, temperament}
  function candidates(ctx) {
    const c = ctx || {};
    if (!covers(c.mode, c.soloId)) return [];
    const moments = new Set(c.moments || []);
    // solo はそのゲーム。mix は最後に失敗したゲーム(endedBy のときだけ、そのゲームの台詞を使う)
    const gameId = c.mode === 'solo' ? c.soloId : (moments.has('endedBy') ? c.lastMiss : null);
    return UNITS.filter(u => {
      if (!u.modes.includes(c.mode)) return false;
      if (!u.moments.some(m => moments.has(m))) return false;
      if (u.games) {
        if (!gameId || !u.games.includes(gameId)) return false;
        if (c.mode === 'mix' && !u.moments.includes('endedBy')) return false;
      }
      if (!traitMatches(u.trait, c.temperament)) return false;
      if (u.with) {
        if (!c.visitorKind || c.visitorQuiet) return false;   // 寡黙な相手は、ゲームの話に乗ってこない
        if (u.with !== 'any' && u.with !== c.visitorKind) return false;
      }
      return true;
    });
  }
  // できごとが「話のきっかけになる」ものか(ふつうの結果より少し話しやすい)。
  // 最後に失敗したゲームは、そのゲームの台詞があるときだけ数える
  function isNotable(list, lastMiss) {
    return (list || []).some(m => m !== 'plain' && (m !== 'endedBy' || PILOT_GAMES.includes(lastMiss)));
  }

  function validate(gameIds) {
    const problems = [], ids = new Set();
    const text = (where, t) => {
      if (typeof t !== 'string' || !t.trim()) problems.push(`${where}: empty`);
      else if (/[ 　]/.test(t)) problems.push(`${where}: spaces`);
      else if ([...t].length > 22) problems.push(`${where}: too long`);
    };
    if (gameIds) for (const g of PILOT_GAMES) if (!gameIds.includes(g)) problems.push(`${g}: not a quick game`);
    for (const u of UNITS) {
      if (ids.has(u.id)) problems.push(`${u.id}: duplicate`); ids.add(u.id);
      if (!u.modes.length || u.modes.some(m => m !== 'solo' && m !== 'mix')) problems.push(`${u.id}: modes`);
      if (u.games && (!u.games.length || u.games.some(g => !PILOT_GAMES.includes(g)))) problems.push(`${u.id}: games`);
      if (!u.moments.length || u.moments.some(m => !MOMENTS.includes(m))) problems.push(`${u.id}: moments`);
      if (u.with && !['partner', 'companion', 'any'].includes(u.with)) problems.push(`${u.id}: with`);
      if (u.trait && !/^(curiosity|boldness|sociability|persistence)[+-]$/.test(u.trait)) problems.push(`${u.id}: trait`);
      if (u.beats.length < 1 || u.beats.length > 3) problems.push(`${u.id}: beats`);
      u.beats.forEach((b, i) => {
        text(`${u.id}[${i}]`, b.text);
        if (b.role !== 'pet' && b.role !== 'them') problems.push(`${u.id}[${i}]: role`);
        if (b.role === 'them' && !u.with) problems.push(`${u.id}[${i}]: a visitor line needs a visitor`);
      });
    }
    return problems;
  }

  const api = {PILOT_GAMES, MOMENTS, UNITS, moments, candidates, covers, isNotable, traitMatches, validate, VERSION:1};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiConversationQuick = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
