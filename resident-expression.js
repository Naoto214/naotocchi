// なおとっち — めぐる Resident Expression System(住民の きもち → 表情 の 1 か所)。
//
// つくり:  resident life / event → canonical emotion → expression mapping → Expression asset resolver → renderer / dialogue
//   ・emotion の 名まえは ここだけが きめる(renderer には いっさい 埋めこまない)
//   ・表情の 画像と resolver は Home の 正本を そのまま つかう。複製しない
//       すがた(ずかんの 1 コマ)      → pet-expression.js の assetFor(base, expression)(31 系統 × 8 段 × 10 表情)
//       なかま / こいびと             → relationship-expression.js の resolve(positive / lonely / normal)
//   ・新しい 画像は つくらない。画像が ない / resolver が こたえられない ときは production では「ふつう(base)」へ
//     安全に もどす。dev / test では strict で 欠けを 明示的に 検出する(だまって ちがう 顔を 出さない)
//   ・将来 3D キャラ(Blend Shape / animation)へ うつる ときも、emotion → {expression} までは このまま。
//     asset の 解決(resolve)だけを 差しかえる
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NaotocchiResidentExpression = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';
  // Home の 正本(ブラウザ: window に のった もの / Node: require)。よみこみ順に よらない ように あとから ひく
  function homePet() {
    if (root && root.NaotocchiPetExpression) return root.NaotocchiPetExpression;
    try { return typeof require === 'function' ? require('./pet-expression.js') : null; } catch (_) { return null; }
  }
  function homeRelationship() {
    if (root && root.NaotocchiRelationshipExpression) return root.NaotocchiRelationshipExpression;
    try { return typeof require === 'function' ? require('./relationship-expression.js') : null; } catch (_) { return null; }
  }

  // ---- canonical emotion(めぐる と Home が 共有する きもちの 語彙) ----
  // sick は いまの 住民生活に 病気の 信号が ない ので、どの 生活イベントからも 発火しない(将来の 拡張用に のこす)
  const EMOTIONS = Object.freeze(['normal', 'positive', 'dislike', 'tired', 'sleeping', 'strained', 'wantsPlay', 'sick']);
  // 住民生活(meguru.js の RESIDENT_EMOTIONS)の 名まえ → canonical
  const LIFE_EMOTION = Object.freeze({
    normal: 'normal', happy: 'positive', unhappy: 'dislike', tired: 'tired', sleeping: 'sleeping', strained: 'strained', wantsPlay: 'wantsPlay',
    // canonical の 名まえ そのものも とおす(テスト・QA の 強制 / 将来の 信号)
    positive: 'positive', dislike: 'dislike', sick: 'sick',
  });
  function canonicalEmotion(lifeEmotion) {
    return Object.hasOwn(LIFE_EMOTION, lifeEmotion) ? LIFE_EMOTION[lifeEmotion] : 'normal';
  }

  // ---- asset family(どの Expression System が 画像を もって いるか) ----
  //   stage        : ずかんの 1 コマ(assets/characters/<line>/<0n>.png)。Home の 11 表情
  //   relationship : なかま / こいびと(positive / lonely / normal)。lonely は「さみしい」で「いや」では ないので、
  //                  dislike には あてない(未使用のまま のこす)
  //   none         : ナオト など。いつも base
  const STAGE_BASE = /^assets\/characters\/([^/]+)\/(0[1-8])\.png$/;
  const EXPRESSION_FOR = Object.freeze({
    stage: Object.freeze({ normal: 'normal', positive: 'happy', dislike: 'sulky', tired: 'tired', sleeping: 'sleeping', strained: 'strained', wantsPlay: 'wantsPlay', sick: 'sick' }),
    relationship: Object.freeze({ normal: 'normal', positive: 'positive', dislike: 'normal', tired: 'normal', sleeping: 'normal', strained: 'normal', wantsPlay: 'normal', sick: 'normal' }),
    none: Object.freeze({ normal: 'normal', positive: 'normal', dislike: 'normal', tired: 'normal', sleeping: 'normal', strained: 'normal', wantsPlay: 'normal', sick: 'normal' }),
  });
  function baseAssetOf(resident) {
    if (!resident) return null;
    const s = resident.sprites;
    return (s && s.front) || resident.asset || null;
  }
  function familyOf(resident) {
    if (!resident) return 'none';
    if (resident.kind === 'companion' || resident.kind === 'partner') return 'relationship';
    if (resident.kind === 'form') return STAGE_BASE.test(baseAssetOf(resident) || '') ? 'stage' : 'none';
    return 'none';
  }
  function expressionFor(family, emotion) {
    const table = EXPRESSION_FOR[family] || EXPRESSION_FOR.none;
    return Object.hasOwn(table, emotion) ? table[emotion] : 'normal';
  }

  // ---- resolver: resident × canonical emotion → 表情 の 画像 ----
  // かえす もの: { emotion, family, expression, asset, base, fallback }
  //   fallback が null なら 意図どおり。'unknown-emotion' / 'no-resolver' / 'unsupported-id' / 'missing-variant' は
  //   「本来 ちがう 顔を 出す はず だったが base(ふつう)に もどした」しるし。strict では throw する
  function resolve(resident, emotion, opts = {}) {
    const strict = !!(opts && opts.strict);
    const base = baseAssetOf(resident);
    const known = EMOTIONS.includes(emotion);
    const em = known ? emotion : 'normal';
    const family = familyOf(resident);
    const expression = expressionFor(family, em);
    const out = { emotion: em, family, expression, asset: base, base, fallback: known ? null : 'unknown-emotion' };
    if (expression === 'normal' || !base) {
      if (!base && expression !== 'normal') out.fallback = 'missing-variant';
      return finish(out, strict);
    }
    if (family === 'stage') {
      const PET = homePet();
      if (!PET || typeof PET.assetFor !== 'function') { out.fallback = 'no-resolver'; return finish(out, strict); }
      const asset = PET.assetFor(base, expression);
      if (!asset || asset === base) { out.fallback = 'missing-variant'; return finish(out, strict); }
      out.asset = asset;
      return finish(out, strict);
    }
    if (family === 'relationship') {
      const REL = homeRelationship();
      if (!REL || typeof REL.resolve !== 'function') { out.fallback = 'no-resolver'; return finish(out, strict); }
      const supported = REL.SUPPORTED && Array.isArray(REL.SUPPORTED[resident.kind]) && REL.SUPPORTED[resident.kind].includes(resident.id);
      if (!supported) { out.fallback = 'unsupported-id'; return finish(out, strict); }
      const r = REL.resolve({ kind: resident.kind, id: resident.id, positive: expression === 'positive', value: expression === 'lonely' ? 0 : 100, normal: base });
      if (!r || r.expression !== expression || !r.asset || r.asset === base) { out.fallback = 'missing-variant'; return finish(out, strict); }
      out.asset = r.asset;
      return finish(out, strict);
    }
    return finish(out, strict);
  }
  function finish(out, strict) {
    if (out.fallback) {
      out.expression = 'normal'; out.asset = out.base;   // production: ちがう 顔を 出さず「ふつう」へ
      if (strict) throw new Error(`resident expression missing: ${out.family}/${out.emotion} (${out.fallback}) base=${out.base}`);
    }
    return out;
  }

  // ---- actor に つける 表情の 状態。emotion が かわった とき だけ resolve する(毎 frame 再解決しない) ----
  function sync(actor, lifeEmotion, opts) {
    if (!actor) return null;
    const emotion = canonicalEmotion(lifeEmotion);
    const base = baseAssetOf(actor);
    const cur = actor.expr;
    if (cur && cur.emotion === emotion && cur.base === base) return cur;
    const next = resolve(actor, emotion, opts);
    actor.expr = next;
    return next;
  }
  function clear(actor) { if (actor && actor.expr) actor.expr = null; }

  // ---- temporary reaction(一瞬の 出来事)と persistent state(いまの 生活の 状態) ----
  // reaction は 秒(せかいの dt)で へる。きれたら そのときの persistent(tired / sleeping / strained / normal)へ もどる。
  // 「normal に 固定」では ない
  const REACTION = Object.freeze({
    positive: Object.freeze({ min: 10, max: 26 }),   // はなす・あつまりが おわる など よい 出来事
    dislike: Object.freeze({ min: 6, max: 12 }),     // ねむって いる ところを おこされる・しつこく はなしかけられる
  });
  // 出来事 → reaction(Home の pet-expression.reactionFor と おなじ 向き)
  const EVENT_REACTION = Object.freeze({
    talk: 'positive', talk_end: 'positive', gather_end: 'positive', play_end: 'positive',
    talk_wake: 'dislike', talk_pester: 'dislike',
  });
  function reactionFor(event) { return Object.hasOwn(EVENT_REACTION, event) ? EVENT_REACTION[event] : null; }
  // プレイヤーが はなしかけた ときの 出来事の 名まえ。ねむって いた / しつこい なら いやがる、それ いがいは うれしい
  const PESTER_SEC = 20;
  function talkEvent({ sleeping = false, sinceLastTalk = Infinity } = {}) {
    if (sleeping) return 'talk_wake';
    if (sinceLastTalk < PESTER_SEC) return 'talk_pester';
    return 'talk';
  }
  // persistent(生活の 状態)と reaction(出来事)から、いま 見せる きもちを 1 つに。順番は 住民生活 v1 と おなじ
  function effectiveEmotion({ persistent = 'normal', reaction = null } = {}) {
    if (persistent === 'sleeping') return 'sleeping';
    return reaction || persistent;
  }

  // ---- ことば(dialogue)。表情と おなじ emotion から えらぶ ので、顔と 台詞が くいちがわない ----
  const DIALOGUE = Object.freeze({
    positive: Object.freeze(['はなしかけてくれて うれしい！', 'きょうは いいことが あったんだ', 'きみと いると たのしいな', 'えへへ、なんだか うれしい']),
    dislike: Object.freeze(['…いまは そっとして おいて', 'むう、なんども…', 'ねむかったのに…', 'ちょっと やめてよ']),
    tired: Object.freeze(['ふぁ… ちょっと つかれた', 'あるきすぎたみたい… やすみたい', 'ねむく なってきた…']),
    sleeping: Object.freeze(['…すぅ… すぅ…', 'zzz…', '…むにゃむにゃ']),
    strained: Object.freeze(['うう、ぬれちゃう…', 'どこかで やどりたいな…', 'この てんきは こたえるよ…']),
    wantsPlay: Object.freeze(['ねえ、なにか して あそぼうよ', 'ひまだなあ… だれか いないかな', 'いっしょに あそぼう！']),
    sick: Object.freeze(['うう… ぐあいが わるい…', 'ちょっと よこに なりたい…']),
  });
  const LINE_EMOTION = new Map();
  for (const em of Object.keys(DIALOGUE)) for (const line of DIALOGUE[em]) LINE_EMOTION.set(line, em);
  function dialogueFor(emotion, pick) {
    const pool = DIALOGUE[emotion];
    if (!pool) return null;
    return typeof pick === 'function' ? pick(pool) : pool[0];
  }
  // 台詞 → それが どの きもちの ことば か('normal' = きもちの 台詞では ない ふつうの 会話)
  function dialogueEmotion(line) { return LINE_EMOTION.get(line) || 'normal'; }
  // 顔と 台詞の 意味が あって いるか。きもちが ふつう なら きもちの 台詞は 出ない。きもちが ある なら その きもちの 台詞だけ
  function consistent(emotion, line) {
    const em = canonicalEmotion(emotion);
    const le = dialogueEmotion(line);
    return em === 'normal' ? le === 'normal' : le === em;
  }

  // ---- 監査(dev / test): 住民の 一覧 × すべての emotion で、fallback が 出る 組を ならべる ----
  function audit(residents, opts = {}) {
    const rows = [], gaps = [];
    for (const r of residents || []) {
      for (const em of EMOTIONS) {
        const out = resolve(r, em);
        rows.push({ key: r.key, kind: r.kind, emotion: em, family: out.family, expression: out.expression, asset: out.asset, fallback: out.fallback });
        if (out.fallback) gaps.push(rows[rows.length - 1]);
      }
    }
    if (opts.strict && gaps.length) throw new Error(`resident expression gaps: ${gaps.length} (first: ${gaps[0].key} ${gaps[0].emotion} ${gaps[0].fallback})`);
    return { rows, gaps };
  }

  return Object.freeze({
    EMOTIONS, LIFE_EMOTION, EXPRESSION_FOR, REACTION, EVENT_REACTION, PESTER_SEC, DIALOGUE,
    canonicalEmotion, familyOf, expressionFor, baseAssetOf, resolve, sync, clear,
    reactionFor, talkEvent, effectiveEmotion, dialogueFor, dialogueEmotion, consistent, audit,
  });
});
