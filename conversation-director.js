// Conversation Director v1 — 会話の「記憶・間合い・鮮度」だけを受け持つ。
// 台詞は書かない・書き換えない。人間が書いた候補を、いつ・誰が言うかで並べ替えるだけ。
// DOM・セーブ(naotocchi-save-v1)には触れない。履歴は別キーへ best effort で保存する。
// 設計: docs/design/conversation-director-v1-2026-10-12.md
(function(root) {
  'use strict';

  const DEFAULTS = Object.freeze({
    // 鮮度(§4.1)
    windowLines: 48,            // 直近 n 発話以内に出た行は出さない(少数プールは eligible×smallPoolRatio まで縮む)
    smallPoolRatio: 0.6,
    lineCooldownMs: 15 * 60e3,  // 同じ行は Home 表示時間で 15 分あける
    recoverMs: 60 * 60e3,       // 1 時間出ていない行は通常の重みに戻る
    minWeight: 0.05,
    familyGapMs: 5 * 60e3,      // 近似台詞(family)は 5 分以内に重ねない
    // こいびと・なかま専用台詞(§4.3)
    ownCooldownMs: 20 * 60e3,
    ownShare: 0.7,
    quietGenericChance: 0.35,   // 寡黙なキャラが汎用台詞を言う確率(専用が出せないときだけ)
    quietGenericGapMs: 10 * 60e3,// 寡黙なキャラの汎用台詞は 10 分に 1 回まで(「はこが急に何か言う」は残す)
    quietOwnCooldownMs: 10 * 60e3,// 寡黙なキャラは言葉が少ないぶん、自分の台詞を少し早く繰り返してよい
    // 話者(§4.4)
    speakerRecentFactors: [0.35, 0.7],
    maxSameSpeakerRun: 2,
    visitorGapMs: 30e3,
    unwellVisitorFactor: 0.5,   // 本人が不調のとき、こいびと・なかまの陽気な放置会話を半分に
    // rare(§6)
    memoryShare: 0.12,          // 方言・rare 間隔・出来事ごとの間隔で実効は約1割になる
    dialectShare: 0.08,
    rareGapMs: 45e3,            // rare(思い出・方言)を立て続けにしない
    memoryEventGapMs: 6 * 60e3, // 同じ出来事の思い出は 6 分あける
    // 間合い(§5)
    // 操作直後は従来と同じ 5.2〜9.0 秒。放置が続くと 12〜24 秒へ
    pace: Object.freeze({activeMinMs: 5200, activeMaxMs: 9000, idleMinMs: 12000, idleMaxMs: 24000, activeWindowMs: 180e3, rampMs: 120e3}),
    paceScale: 1,
    // 時計・保存
    maxCountedGapMs: 60e3,      // これより長い空白(閉じていた・裏にいた)は Home 表示時間に数えない
    lineMemory: 512,
    saveEveryMs: 30e3,
    // Conversation v2 の「ひとかたまり」(掛け合い・問いかけ)。行ではなく単位で鮮度を見る
    unitCooldownMs: 45 * 60e3,
    storageKey: 'naotocchi-conversation-v1',
  });
  const VERSION = 1;

  // 既存の conversationLineKey と同じ正規化 + 絵文字除去
  function lineKey(text) {
    return String(text ?? '').normalize('NFKC')
      .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
      .replace(/[\s。、!?「」]/g, '');
  }
  function hashKey(text) {
    let h = 2166136261;
    for (const ch of lineKey(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
    return h.toString(16).padStart(8, '0');
  }

  function createDirector({now = () => Date.now(), random = Math.random, storage = null, families = [], quietSpeakers = [], config = {}} = {}) {
    const cfg = {...DEFAULTS, ...config, pace: {...DEFAULTS.pace, ...(config.pace || {})}};
    const rnd = () => { const v = Number(random()); return Number.isFinite(v) ? Math.min(0.999999, Math.max(0, v)) : 0; };
    const familyOf = new Map();
    for (const group of families || []) {
      if (!group || !Array.isArray(group.lines)) continue;
      for (const line of group.lines) familyOf.set(hashKey(line), String(group.id));
    }
    const quiet = new Set(quietSpeakers || []);

    let clock = 0, lastNow = null, seq = 0, dirty = false, lastSavedAt = 0, lastInteraction = 0;
    let rareLast = -Infinity, lastAgeRecall = null;
    const lines = new Map();      // hash → {t: clock, s: seq}
    const speakers = new Map();   // speakerKey → clock
    const familyLast = new Map(); // familyId → clock
    const memoryLast = new Map(); // eventKey → clock
    const quietGenericLast = new Map(); // speakerKey → clock
    const units = new Map();      // unitId → clock(掛け合い・問いかけを実際に始めた時刻)
    const unitKinds = new Map();  // 'banter' | 'question' → clock
    let lastSpeaker = null, prevSpeaker = null, run = 0;

    function advance() {
      const t = Number(now());
      if (Number.isFinite(t)) {
        if (lastNow != null) { const d = t - lastNow; if (d > 0 && d <= cfg.maxCountedGapMs) clock += d; }
        lastNow = t;
      }
      return clock;
    }

    function eligibleWindow(count) {
      return Math.max(0, Math.min(cfg.windowLines, Math.floor(count * cfg.smallPoolRatio)));
    }
    function freshness(text, count, cooldownMs) {
      const rec = lines.get(hashKey(text));
      if (!rec) return 1;
      if (seq - rec.s <= eligibleWindow(count)) return 0;
      const age = clock - rec.t;
      if (age < cooldownMs) return 0;
      return Math.max(cfg.minWeight, Math.min(1, age / cfg.recoverMs));
    }
    function familyBlocked(text, avoidFamilies) {
      const fam = familyOf.get(hashKey(text));
      if (!fam) return false;
      if (avoidFamilies.has(fam)) return true;
      const last = familyLast.get(fam);
      return last != null && clock - last < cfg.familyGapMs;
    }
    function oldest(cands) {
      let best = [], bestT = Infinity;
      for (const text of cands) {
        const rec = lines.get(hashKey(text));
        const t = rec ? rec.t : -Infinity;
        if (t < bestT) { bestT = t; best = [text]; } else if (t === bestT) best.push(text);
      }
      return best[Math.floor(rnd() * best.length)] ?? null;
    }

    // 候補から1行。avoid: いま上部欄・同じ会話の別 beat に出ている文(と同じ family)は避ける
    function pick(candidates, {avoid = [], cooldownMs = cfg.lineCooldownMs} = {}) {
      advance();
      const seen = new Set(), list = [];
      for (const c of candidates || []) {
        if (typeof c !== 'string' || !c) continue;
        const k = hashKey(c);
        if (seen.has(k)) continue;
        seen.add(k); list.push(c);
      }
      if (!list.length) return null;
      const avoidKeys = new Set(), avoidFamilies = new Set();
      for (const a of avoid || []) {
        if (!a) continue;
        const k = hashKey(a); avoidKeys.add(k);
        const f = familyOf.get(k); if (f) avoidFamilies.add(f);
      }
      let pool = list.filter(t => !avoidKeys.has(hashKey(t)));
      if (!pool.length) pool = list;  // 避けると空になるなら避けない(無言にしない)
      const weights = pool.map(t => familyBlocked(t, avoidFamilies) ? 0 : freshness(t, pool.length, cooldownMs));
      const total = weights.reduce((a, b) => a + b, 0);
      if (total > 0) {
        let r = rnd() * total;
        for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r < 0) return pool[i]; }
        return pool[pool.length - 1];
      }
      return oldest(pool);  // 全部が最近なら、いちばん前に出た行(LRU)
    }

    function ownAvailable(own, cooldownMs) {
      return (own || []).filter(t => typeof t === 'string' && t && freshness(t, own.length, cooldownMs) > 0);
    }
    // 専用(own)と汎用(shared)。寡黙なキャラは汎用をあまり使わない。null = 今回は言わない
    function pickOwnOrShared(own, shared, {speakerKey = null, avoid = []} = {}) {
      advance();
      const isQuiet = speakerKey != null && quiet.has(speakerKey);
      const ownCooldownMs = isQuiet ? cfg.quietOwnCooldownMs : cfg.ownCooldownMs;
      const fresh = ownAvailable(own, ownCooldownMs);
      const hasShared = Array.isArray(shared) && shared.length > 0;
      if (fresh.length && (!hasShared || isQuiet || rnd() < cfg.ownShare)) {
        return pick(fresh, {avoid, cooldownMs: ownCooldownMs});
      }
      if (isQuiet && hasShared) {
        const last = quietGenericLast.get(speakerKey);
        if ((last != null && clock - last < cfg.quietGenericGapMs) || rnd() >= cfg.quietGenericChance) return null;
        const line = pick(shared, {avoid});
        if (line) quietGenericLast.set(speakerKey, clock);
        return line;
      }
      if (hasShared) return pick(shared, {avoid});
      return own && own.length ? pick(own, {avoid, cooldownMs: cfg.ownCooldownMs}) : null;
    }

    // 実際に表示した行だけを記録する
    function noteShown(text, speakerKey = null) {
      if (!text) return;
      advance();
      seq += 1;
      const k = hashKey(text);
      lines.delete(k); lines.set(k, {t: clock, s: seq});
      while (lines.size > cfg.lineMemory) lines.delete(lines.keys().next().value);
      const fam = familyOf.get(k); if (fam) familyLast.set(fam, clock);
      if (speakerKey) {
        speakers.set(speakerKey, clock);
        if (speakerKey === lastSpeaker) run += 1; else { prevSpeaker = lastSpeaker; lastSpeaker = speakerKey; run = 1; }
      }
      dirty = true;
      if (clock - lastSavedAt >= cfg.saveEveryMs) save();
    }

    // 放置で話す順番。candidates: [{key, weight, visitor}]。先頭から試し、言えなければ次へ
    function orderSpeakers(candidates) {
      advance();
      let list = (candidates || []).filter(c => c && c.key && c.weight > 0).map(c => ({...c}));
      if (!list.length) return [];
      if (run >= cfg.maxSameSpeakerRun && list.some(c => c.key !== lastSpeaker)) list = list.filter(c => c.key !== lastSpeaker);
      for (const c of list) {
        if (c.key === lastSpeaker) c.weight *= cfg.speakerRecentFactors[0];
        else if (c.key === prevSpeaker) c.weight *= cfg.speakerRecentFactors[1] ?? 1;
        if (c.visitor) {
          const last = speakers.get(c.key);
          if (last != null && clock - last < cfg.visitorGapMs) c.weight *= 0.2;
        }
      }
      const order = [];
      while (list.length) {
        const total = list.reduce((a, c) => a + c.weight, 0);
        let r = rnd() * total, i = 0;
        for (; i < list.length - 1; i++) { r -= list[i].weight; if (r < 0) break; }
        order.push(list[i]); list.splice(i, 1);
      }
      return order;
    }
    // 本人が不調のとき、こいびと・なかまが今回は黙るか(陽気な放置会話を半分に)
    function visitorStaysQuiet(unwell) { return !!unwell && rnd() >= cfg.unwellVisitorFactor; }

    function rareReady() { advance(); return clock - rareLast >= cfg.rareGapMs; }
    function noteRare() { advance(); rareLast = clock; dirty = true; }
    function wantsMemory() { return rnd() < cfg.memoryShare; }
    function wantsDialect() { return rnd() < cfg.dialectShare; }
    function memoryFresh(eventKey) { advance(); const t = memoryLast.get(String(eventKey)); return t == null || clock - t >= cfg.memoryEventGapMs; }
    function noteMemory(eventKey) { advance(); memoryLast.set(String(eventKey), clock); while (memoryLast.size > 64) memoryLast.delete(memoryLast.keys().next().value); dirty = true; }
    function ageRecallAllowed(age) { return lastAgeRecall !== age; }
    function noteAgeRecall(age) { lastAgeRecall = age; dirty = true; }

    function markInteraction() { advance(); lastInteraction = clock; }
    function sinceInteraction() { advance(); return clock - lastInteraction; }

    // Conversation v2: 掛け合い・問いかけは「一つの単位」として扱う。途中の beat は通常どおり noteShown される
    // ids から、最近出ていないものを一つ。全部が cooldown 中なら null(同じ掛け合いの繰り返しより、出さないほうがよい)
    function pickUnit(ids, {cooldownMs = cfg.unitCooldownMs} = {}) {
      advance();
      const fresh = [...new Set((ids || []).filter(id => typeof id === 'string' && id))]
        .filter(id => { const t = units.get(id); return t == null || clock - t >= cooldownMs; });
      if (!fresh.length) return null;
      // まだ一度も出ていないものを先に。出たことがあるなら古いものほど出やすい
      const unseen = fresh.filter(id => !units.has(id));
      const pool = unseen.length ? unseen : fresh;
      const weights = pool.map(id => units.has(id) ? Math.max(cfg.minWeight, Math.min(1, (clock - units.get(id)) / cfg.recoverMs)) : 1);
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rnd() * total;
      for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r < 0) return pool[i]; }
      return pool[pool.length - 1];
    }
    function noteUnit(id, kind) {
      if (!id) return;
      advance();
      units.delete(id); units.set(id, clock);
      while (units.size > 256) units.delete(units.keys().next().value);
      if (kind) unitKinds.set(String(kind), clock);
      dirty = true;
    }
    // その種類の単位を、前回から gapMs 以上あけたか
    function unitReady(kind, gapMs) { advance(); const t = unitKinds.get(String(kind)); return t == null || clock - t >= gapMs; }
    function nextIdleDelay() {
      advance();
      const p = cfg.pace;
      const since = clock - lastInteraction;
      const f = Math.max(0, Math.min(1, (since - p.activeWindowMs) / Math.max(1, p.rampMs)));
      const lo = p.activeMinMs + (p.idleMinMs - p.activeMinMs) * f;
      const hi = p.activeMaxMs + (p.idleMaxMs - p.activeMaxMs) * f;
      return Math.round((lo + rnd() * (hi - lo)) * (cfg.paceScale > 0 ? cfg.paceScale : 1));
    }

    function snapshot() {
      return {v: VERSION, clock, seq, rareLast: Number.isFinite(rareLast) ? rareLast : null, ageRecall: lastAgeRecall,
        lines: [...lines].map(([k, r]) => [k, r.t, r.s]),
        speakers: [...speakers], families: [...familyLast], memories: [...memoryLast],
        units: [...units], unitKinds: [...unitKinds]};
    }
    function restore(data) {
      if (!data || data.v !== VERSION || !Array.isArray(data.lines)) return false;
      const num = (x, d = 0) => Number.isFinite(Number(x)) ? Number(x) : d;
      clock = Math.max(0, num(data.clock)); seq = Math.max(0, num(data.seq));
      rareLast = data.rareLast == null ? -Infinity : num(data.rareLast, -Infinity);
      lastAgeRecall = data.ageRecall ?? null;
      lines.clear();
      for (const row of data.lines.slice(-cfg.lineMemory)) {
        if (Array.isArray(row) && typeof row[0] === 'string' && /^[0-9a-f]{8}$/.test(row[0])) lines.set(row[0], {t: num(row[1]), s: num(row[2])});
      }
      const fill = (map, rows, limit) => { map.clear(); for (const row of (Array.isArray(rows) ? rows : []).slice(-limit)) if (Array.isArray(row) && typeof row[0] === 'string') map.set(row[0], num(row[1])); };
      fill(speakers, data.speakers, 64); fill(familyLast, data.families, 64); fill(memoryLast, data.memories, 64);
      // v2 以前の履歴には units がない(空のまま始める)
      fill(units, data.units, 256); fill(unitKinds, data.unitKinds, 8);
      lastInteraction = clock; lastSpeaker = null; prevSpeaker = null; run = 0;
      return true;
    }
    function load() {
      if (!storage) return false;
      try {
        const raw = storage.getItem(cfg.storageKey);
        if (!raw) return false;
        return restore(JSON.parse(raw));
      } catch (_) { return false; }  // 壊れた・読めない → 空の履歴で続ける
    }
    function save() {
      lastSavedAt = clock;
      if (!storage || !dirty) return false;
      try { storage.setItem(cfg.storageKey, JSON.stringify(snapshot())); dirty = false; return true; }
      catch (_) { return false; }     // 容量超過など。セーブ本体を優先して黙って諦める
    }

    // 「ぜんぶ さいしょから」: 記憶も保存先も消す
    function reset() {
      clock = 0; seq = 0; rareLast = -Infinity; lastAgeRecall = null; lastInteraction = 0; lastSavedAt = 0;
      lines.clear(); speakers.clear(); familyLast.clear(); memoryLast.clear(); quietGenericLast.clear(); units.clear(); unitKinds.clear();
      lastSpeaker = null; prevSpeaker = null; run = 0; dirty = false;
      if (storage) { try { storage.removeItem(cfg.storageKey); } catch (_) {} }
    }

    return {reset, pick, pickOwnOrShared, noteShown, orderSpeakers, visitorStaysQuiet, rareReady, noteRare, wantsMemory, wantsDialect,
      memoryFresh, noteMemory, ageRecallAllowed, noteAgeRecall, markInteraction, sinceInteraction, nextIdleDelay,
      pickUnit, noteUnit, unitReady, snapshot, restore, load, save,
      isQuiet: (key) => quiet.has(key), get clock() { return clock; }, config: cfg};
  }

  const api = {createDirector, lineKey, hashKey, DEFAULTS, VERSION};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NaotocchiConversationDirector = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
