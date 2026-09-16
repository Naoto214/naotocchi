(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NaotocchiItems = factory();
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Current catalog; retired fun items exist only in the migration below.
  const CATALOG = Object.freeze(Object.fromEntries(Object.entries({
  "poop1": {
    "label": "トイレットペーパー",
    "price": 1000,
    "kind": "equipment",
    "desc": "うんちが3個たまると、自動できれいにする。",
    "guard": "自動掃除では成長・掃除回数・掃除実績を加算しない。クールダウンは設けない。"
  },
  "sleepboost1": {
    "label": "ふかふかまくら",
    "price": 3000,
    "kind": "equipment",
    "desc": "ねると、すぐに元気が満タンになる。",
    "guard": "睡眠後の時間限定バフは付けない。通常の睡眠状態・睡眠回数・十分に寝た時の成長判定は維持する。"
  },
  "bowtie": {
    "label": "おべんとうばこ",
    "price": 3000,
    "kind": "equipment",
    "desc": "おなかがへると、自動で満タンにする。",
    "guard": "おなか25以下で100。手動の食事回数・実績等を増やさない。"
  },
  "ribbon": {
    "label": "おもちゃばこ",
    "price": 3000,
    "kind": "equipment",
    "desc": "ごきげんが下がると、自動で満タンにする。",
    "guard": "ごきげん25以下で100。専用リアクションは維持し、手動のじゃれる回数・実績等を増やさない。"
  },
  "scarf": {
    "label": "きゅうきゅうばこ",
    "price": 3000,
    "kind": "equipment",
    "desc": "病気になると、自動で治してくれる。",
    "guard": "病気の予防ではなく発病後の自動治療。手動治療回数・実績等を増やさない。"
  },
  "travel1": {
    "label": "リュックサック",
    "price": 3000,
    "kind": "equipment",
    "desc": "たびで、おなかと元気が減らなくなる。",
    "guard": "連続旅行の疲れ判定・そだち70の旅先条件・訪問記録・ごきげん変化は維持。"
  },
  "partner1": {
    "label": "らぶれたー",
    "price": 5000,
    "kind": "equipment",
    "desc": "こいびとの仲良し度が下がると、自動で満タンにする。",
    "guard": "通常時の自然減は軽くしない。危険域に入った時だけ発動し、交際成立・仲直り・結婚は自動化しない。手紙の思い出表示は残す。"
  },
  "bond1": {
    "label": "おともだちバッジ",
    "price": 5000,
    "kind": "equipment",
    "desc": "なかまの仲良し度が下がると、自動で満タンにする。",
    "guard": "通常時の自然減は軽くしない。危険域に入った時だけ発動し、じゃれる回数・加入・シール・実績は増やさない。"
  },
  "gamepass1": {
    "label": "ゲームパス",
    "price": 8000,
    "kind": "equipment",
    "desc": "ミニゲームを遊ばず、通常成功にできる。",
    "guard": "実プレイ条件・点数条件・勧誘・日次・記録には数えず、通常成功固定。使用後5秒だけ再使用待ち。"
  },
  "star": {
    "label": "スターバッジ",
    "price": 10000,
    "kind": "equipment",
    "desc": "通常ミニゲームでもらえるコインが3倍になる。",
    "guard": "通常ミニゲーム本体のコインだけ3倍。通常成功30→90、大成功60→180、失敗0。Quick・ゲームパス・ラッキーコイン・うそつきしょうぶ・日次等には掛けない。"
  },
  "c_coin2": {
    "label": "ラッキーコイン",
    "price": 300,
    "kind": "consumable",
    "desc": "ルーレットでコインがもらえる。",
    "guard": "使用時に1個消費して即時抽選・即時支給。装備やゲーム報酬とは独立。日次達成時の1個加算は継続。"
  },
  "c_life": {
    "label": "いのちのくすり",
    "price": 300,
    "kind": "consumable",
    "desc": "いのちを満タンにする。",
    "guard": "効果が成立するときだけ1個消費する。"
  },
  "c_time_back": {
    "label": "ときのチケット・まえ",
    "price": 300,
    "kind": "consumable",
    "desc": "ひとつ前の姿に5分だけ変わる。",
    "guard": "実種族と実年齢から合法な前段階を選ぶ。"
  },
  "c_time_forward": {
    "label": "ときのチケット・あと",
    "price": 300,
    "kind": "consumable",
    "desc": "ひとつ後の姿に5分だけ変わる。",
    "guard": "実種族と実年齢から合法な次段階を選ぶ。"
  },
  "c_life_charm": {
    "label": "いのちのおまもり",
    "price": 1000,
    "kind": "consumable",
    "desc": "死んでしまうとき、1回だけ助かる。",
    "guard": "自動発動が成立したときだけ1個消費する。"
  },
  "c_friend": {
    "label": "おともだちチケット",
    "price": 3000,
    "kind": "consumable",
    "desc": "好きな未加入のなかまを呼べる。",
    "guard": "現在未加入の合法な候補だけを表示する。"
  },
  "c_match": {
    "label": "おみあいチケット",
    "price": 3000,
    "kind": "consumable",
    "desc": "恋愛できる相手を1人選んで呼べる。",
    "guard": "現在地での通常の求愛条件を維持する。"
  },
  "c_transform": {
    "label": "へんしんチケット",
    "price": 6000,
    "kind": "consumable",
    "desc": "3つの候補から、好きな姿にへんしんできる。",
    "guard": "通常変身と同じ合法な候補だけを表示する。"
  },
  "c_rare_friend": {
    "label": "レアなかまチケット",
    "price": 8000,
    "kind": "consumable",
    "desc": "好きな未加入のレアなかまを呼べる。",
    "guard": "通常加入条件を維持する。"
  },
  "c_egg_normal": {
    "label": "ふしぎなたまご",
    "price": 8000,
    "kind": "consumable",
    "desc": "次の人生が、まだ育てていない通常種族になる。",
    "guard": "予約は1件だけ保持し、孵化成功時に消費する。"
  },
  "c_egg_rare": {
    "label": "レアなたまご",
    "price": 10000,
    "kind": "consumable",
    "desc": "次の人生が、まだ育てていないレア種族になる。",
    "guard": "れんくんを除く未経験レア種族から予約する。"
  },
  "c_dex": {
    "label": "ずかんチケット",
    "price": 10000,
    "kind": "consumable",
    "desc": "好きな姿を選んで、5分だけへんしんできる。",
    "guard": "未発見を含む通常種族と8種のレア種族の姿から選び、実種族の判定は変えない。"
  },
  "naoto_charm": {
    "label": "なおとのおまもり",
    "price": null,
    "kind": "goal",
    "desc": "一生を終えた経験が、次の70歳からをそっと守る。",
    "guard": "全ダメージ28%軽減や病気無効と誤記しない。通常のお世話は必要。"
  },
  "naoto_lantern": {
    "label": "なおとのランタン",
    "price": null,
    "kind": "goal",
    "desc": "訪れた土地の、まだ見ぬあかりを探しに行こう。",
    "guard": "未解放の場所・未達条件のレアキャラを直接出さない。コイン報酬は追加しない。"
  },
  "naoto_ring": {
    "label": "なおとのリング",
    "price": null,
    "kind": "goal",
    "desc": "ふたりだけの合言葉が、いつものデートに増えていく。",
    "guard": "不死・病気無効・関係固定には戻さない。交際相手がいない場合も所有と鑑賞はできる。"
  },
  "naoto_crown": {
    "label": "なおとのかんむり",
    "price": null,
    "kind": "goal",
    "desc": "一生をやりきった記録を示す、記念のかんむり。",
    "guard": "4ステータス固定・無制限のコイン生成は付けない。新コレクションを既存PERFECT条件へ追加しない。"
  },
  "new_themed_pack": {
    "label": "テーマシールパック",
    "price": 60,
    "kind": "consumable",
    "desc": "「けしき／なかま／あいてむ」など選んだ分類から3枚。重複救済は通常パックと同じ。",
    "guard": "れんくんの隠し条件は共通。シールから本編加入・成長・図鑑発見は起こさない。"
  }
}).map(([id, item]) => [id, Object.freeze(item)])));
  const RETIRED_FUN_PRICES = Object.freeze({fun_candy:10,fun_bubbles:25,fun_balloon:35,fun_fireworks:60,fun_camera:900,fun_musicbox:1200,fun_surprise:600});
  const RETIRED_CONSUMABLE_PRICES = Object.freeze({
    c_safety:20,c_mgsmall:40,c_mgbig:120,c_sickshield:60,c_growth:90,
    c_courtsmall:50,c_breakhalf:60,c_breakfull:100,c_travel:70,new_transform_mirror:80
  });
  const RETIRED_PENDING_IDS = Object.freeze(Object.keys(RETIRED_CONSUMABLE_PRICES));
  const RETIRED_TOOLS = ['fun_camera','fun_musicbox','fun_surprise'];
  const retired = id => Object.prototype.hasOwnProperty.call(RETIRED_FUN_PRICES, id);
  const MEMORY_KINDS = ['letters', 'lights', 'specials'];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const count = value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0;
  const known = id => Object.prototype.hasOwnProperty.call(CATALOG, id);
  const LEGACY_EQUIPMENT_IDS = {
    flower2:'flower', flower3:'flower', ribbon2:'ribbon', ribbon3:'ribbon', bowtie2:'bowtie', bowtie3:'bowtie',
    poop2:'poop1', poop3:'poop1', scarf2:'scarf', scarf3:'scarf', glasses2:'glasses', glasses3:'glasses',
    energy2:'energy1', energy3:'energy1', hat2:'hat', hat3:'hat', travel2:'travel1', travel3:'travel1',
    sleepboost2:'sleepboost1', sleepboost3:'sleepboost1', star2:'star', star3:'star', bond2:'bond1', bond3:'bond1',
    partner2:'partner1', partner3:'partner1', crown2:'crown', crown3:'crown'};
  function normalizeStickers(l) {
    const stickers = l.stickers;
    if (!object(stickers)) return;
    const canonical = id => typeof id === 'string' && id.startsWith('item:') && LEGACY_EQUIPMENT_IDS[id.slice(5)]
      ? 'item:' + LEGACY_EQUIPMENT_IDS[id.slice(5)] : id;
    if (object(stickers.owned)) {
      for (const id of Object.keys(stickers.owned)) {
        const next = canonical(id);
        if (next === id) continue;
        stickers.owned[next] = count(stickers.owned[next]) + count(stickers.owned[id]);
        delete stickers.owned[id];
      }
    }
    if (object(stickers.pages)) Object.values(stickers.pages).forEach(page => {
      if (Array.isArray(page)) page.forEach(p => { if (object(p)) p.id = canonical(p.id); });
    });
    if (Array.isArray(stickers.seen)) stickers.seen = [...new Set(stickers.seen.map(canonical))];
  }
  const validMatchId = id => typeof id === 'string' && /^m-[a-zA-Z0-9-]{8,100}$/.test(id);
  function duelStake(s) {
    const d = s.duel, stake = d && s.lifetime.duelStakes?.[d.matchId];
    return validMatchId(d?.matchId) && object(stake) && stake.bet === d.bet && stake.role === d.role ? stake : null;
  }
  function normalizeDuel(s) {
    const l = s.lifetime;
    if (!object(l.duelStakes)) l.duelStakes = {};
    l.duelSerial = count(l.duelSerial);
    const d = s.duel;
    if (!d || d.step === 'done') return; // Old completed matches already paid under their original rules.
    const stake = duelStake(s);
    if (stake?.status === 'reserved') return;
    l.duelNotice = '以前の形式、または予約を確認できない対戦を終了しました。お金は動かしていません。新しいコードで始めてね。';
    s.duel = null; // No inferred refund or payout for an unfunded old match.
  }
  function reserveDuel(s, matchId, bet, role, published) {
    normalize(s);
    if (s.duel || !validMatchId(matchId) || Object.prototype.hasOwnProperty.call(s.lifetime.duelStakes, matchId)
        || !Number.isSafeInteger(bet) || bet < 1 || bet > 999999 || s.lifetime.money < bet
        || !['challenger','guesser'].includes(role)) return false;
    s.lifetime.money -= bet;
    s.lifetime.duelStakes[matchId] = {bet, role, published:!!published, status:'reserved'};
    return true;
  }
  function settleDuel(s, outcome) {
    const stake = duelStake(s);
    if (!stake || stake.status !== 'reserved' || !['win','lose','draw'].includes(outcome)) return false;
    s.lifetime.money += outcome === 'win' ? stake.bet * 2 : outcome === 'draw' ? stake.bet : 0;
    stake.status = 'settled'; stake.outcome = outcome;
    s.duel.moneyDelta = outcome === 'win' ? stake.bet : outcome === 'lose' ? -stake.bet : 0;
    return true;
  }
  function abandonDuel(s) {
    const stake = duelStake(s);
    if (!stake || stake.status !== 'reserved') return false;
    if (!stake.published && stake.role === 'challenger') {
      s.lifetime.money += stake.bet; stake.status = 'refunded';
    } else stake.status = 'forfeited';
    s.duel = null;
    return true;
  }
  function retireFunItems(state, l, bag, legacy) {
    if (!l.funItemsRetiredVersion) {
      let refund = 0;
      for (const [id, price] of Object.entries(RETIRED_FUN_PRICES)) {
        const owned = RETIRED_TOOLS.includes(id)
          ? count(bag[id]) > 0 || (Array.isArray(l.ownedTools) && l.ownedTools.includes(id))
            || (legacy && Array.isArray(l.ownedConsumableItems) && l.ownedConsumableItems.includes(id))
          : count(bag[id]);
        refund += Number(owned) * price;
      }
      l.money = (Number.isFinite(l.money) && l.money >= 0 ? l.money : 0) + refund;
      l.funItemsRetiredVersion = 1;
    }
    // Reservations never held separate stock. Clear them without a second credit,
    // including the life restored when leaving infinite mode.
    for (const life of [state.itemLife, state.infiniteReturn?.itemLife]) {
      if (!object(life)) continue;
      delete life.balloon; delete life.candyUntil;
      if (object(life.pendingItems)) for (const id of Object.keys(life.pendingItems)) if (retired(id)) delete life.pendingItems[id];
    }
    delete l.ownedTools; delete l.itemExtraScenes;
    if (Array.isArray(l.ownedConsumableItems)) l.ownedConsumableItems = l.ownedConsumableItems.filter(id => !retired(id));
    if (object(l.itemProgress)) {
      delete l.itemProgress.visitedSeasons;
      if (object(l.itemProgress.readyAt)) for (const key of ['camera','musicbox','surprise']) delete l.itemProgress.readyAt[key];
    }
    if (object(l.itemMemories)) {
      for (const kind of ['photos','tunes','reactions']) delete l.itemMemories[kind];
      if (Array.isArray(l.itemMemories.specials)) l.itemMemories.specials = l.itemMemories.specials.filter(record =>
        !retired(record?.itemId) && record?.event !== 'fireworks' && !/^fireworks:/.test(record?.key || ''));
    }
    const retiredSticker = id => typeof id === 'string' && id.startsWith('item:') && retired(id.slice(5));
    const stickers = l.stickers;
    if (object(stickers)) {
      if (object(stickers.owned)) for (const id of Object.keys(stickers.owned)) if (retiredSticker(id)) delete stickers.owned[id];
      if (Array.isArray(stickers.seen)) stickers.seen = stickers.seen.filter(id => !retiredSticker(id));
      if (object(stickers.pages)) for (const key of Object.keys(stickers.pages)) if (Array.isArray(stickers.pages[key])) stickers.pages[key] = stickers.pages[key].filter(p => !retiredSticker(p?.id));
    }
    for (const snapshot of [state, state.infiniteReturn]) {
      if (!object(snapshot)) continue;
      if (Array.isArray(snapshot.achievementsUnlocked)) snapshot.achievementsUnlocked = snapshot.achievementsUnlocked.filter(id => id !== 'consumable-all');
      if (snapshot !== state && object(snapshot.items)) for (const id of Object.keys(snapshot.items)) if (retired(id)) delete snapshot.items[id];
    }
    if (object(l.achievementUnlockedAt)) delete l.achievementUnlockedAt['consumable-all'];
  }
  function safeSum(a, b) {
    return Number.isSafeInteger(a) && a >= 0 && Number.isSafeInteger(b) && b >= 0 && Number.isSafeInteger(a + b) ? a + b : null;
  }
  function addRefund(l, refund) {
    const money = Number.isSafeInteger(l.money) && l.money >= 0 ? l.money : 0;
    const total = safeSum(money, refund);
    if (total !== null) l.money = total;
  }
  function migrateConsumablesV2(state, l, bag, legacy) {
    if (!object(l.itemMigrations)) l.itemMigrations = {};
    const snapshots = [state, state.infiniteReturn].filter(object);
    const boosts = snapshots.map(snapshot => snapshot.oneTimeBoosts).filter(object);
    const lives = snapshots.map(snapshot => snapshot.itemLife).filter(object);
    const pending = id => count(bag[id]) > 0 && lives.some(life => object(life.pendingItems) && life.pendingItems[id]);
    if (l.itemMigrations.consumablesV2 !== true) {
      let refund = 0;
      for (const [id, price] of Object.entries(RETIRED_CONSUMABLE_PRICES)) {
        const quantity = count(bag[id]);
        const value = quantity && Number.isSafeInteger(quantity * price) ? quantity * price : 0;
        refund = safeSum(refund, value) ?? refund;
      }
      const patches = count(bag.new_life_patch), medicine = count(bag.c_life);
      const merged = safeSum(medicine, patches);
      if (merged !== null && merged > 0) bag.c_life = merged;

      const hasBigMinigame = boosts.some(b => b.greatReward === true || b.minigameBoost === 'big');
      const hasSmallMinigame = !hasBigMinigame && boosts.some(b => b.minigameBoost === 'small');
      const reservationRefunds = [
        ['c_safety',20, boosts.some(b => b.safetyNet === true)],
        ['c_mgsmall',40, hasSmallMinigame],
        ['c_mgbig',120, hasBigMinigame],
        ['c_courtsmall',50, boosts.some(b => b.courtBoost === 'small')],
        ['c_breakhalf',60, (boosts.find(b => b.breakupShield)?.breakupShield || null) === 'half'],
        ['c_breakfull',100, (boosts.find(b => b.breakupShield)?.breakupShield || null) === 'full'],
        ['c_travel',70, boosts.some(b => b.travelGuarantee === true)],
      ];
      for (const [id, price, reserved] of reservationRefunds) {
        if (reserved && !pending(id)) refund = safeSum(refund, price) ?? refund;
      }
      const sicknessCounts = boosts.map(b => b.sicknessShieldCount).filter(n => Number.isSafeInteger(n) && n > 0);
      if (sicknessCounts.length && sicknessCounts.every(n => n === 3) && !pending('c_sickshield')) refund = safeSum(refund, 60) ?? refund;
      if (legacy && boosts.some(b => b.courtBoost === 'big')) refund = safeSum(refund, 350) ?? refund;
      addRefund(l, refund);
      for (const id of [...Object.keys(RETIRED_CONSUMABLE_PRICES),'new_life_patch']) delete bag[id];
      for (const snapshot of snapshots) snapshot.boostTicks = 0;
      l.itemMigrations.consumablesV2 = true;
    }
    if (l.itemMigrations.dreamEggsV2 !== true) {
      const dreams = object(l.dreamEggs) ? l.dreamEggs : {};
      for (const [kind,id] of [['normal','c_egg_normal'],['rare','c_egg_rare']]) {
        const merged = safeSum(count(bag[id]), count(dreams[kind]));
        if (merged !== null && merged > 0) bag[id] = merged;
      }
      l.itemMigrations.dreamEggsV2 = true;
    }
    l.dreamEggs = {};
    // Cleanup is deliberately unconditional: an old return snapshot can be
    // restored after the authoritative lifetime has already been migrated.
    for (const b of boosts) {
      for (const key of ['safetyNet','minigameBoost','greatReward','sicknessShieldCount','courtBoost','breakupShield','travelGuarantee']) delete b[key];
    }
    for (const life of lives) {
      delete life.lifePatchUsed;
      delete life.relationshipShields;
      if (object(life.pendingItems)) for (const id of RETIRED_PENDING_IDS) delete life.pendingItems[id];
    }
    for (const snapshot of snapshots) if (snapshot !== state && object(snapshot.items)) {
      for (const id of [...Object.keys(RETIRED_CONSUMABLE_PRICES),'new_life_patch']) delete snapshot.items[id];
    }
    for (const snapshot of snapshots) if (object(snapshot.partner)) delete snapshot.partner.itemGraceUntil;
  }
  function normalize(state) {
    if (!object(state.lifetime)) state.lifetime = {};
    const l = state.lifetime;
    normalizeStickers(l);
    normalizeDuel(state);
    const legacy = !l.itemSystemVersion;
    if (!object(l.itemInventory)) l.itemInventory = object(state.items) ? state.items : {};
    const bag = l.itemInventory;
    retireFunItems(state, l, bag, legacy);
    migrateConsumablesV2(state, l, bag, legacy);
    for (const id of Object.keys(bag)) {
      if (!known(id) || !count(bag[id])) delete bag[id];
    }
    // The saved life and infinite return may describe the same spent reservation.
    // Credit the authoritative lifetime bag once, then remove both old effects.
    const luckyReservations = [state.oneTimeBoosts, state.infiniteReturn?.oneTimeBoosts];
    const luckyLives = [state.itemLife, state.infiniteReturn?.itemLife];
    const luckyStillFunded = luckyLives.some(life => life?.pendingItems?.c_coin2);
    if (!luckyStillFunded && luckyReservations.some(boosts => boosts?.doubleCoins === true)) {
      const restored = safeSum(count(bag.c_coin2), 1);
      if (restored !== null) bag.c_coin2 = restored;
    }
    luckyReservations.forEach(boosts => { if (object(boosts)) delete boosts.doubleCoins; });
    luckyLives.forEach(life => { if (object(life?.pendingItems)) delete life.pendingItems.c_coin2; });
    if (legacy) l.itemSystemVersion = 1;
    if (!object(l.itemPurchases)) l.itemPurchases = {};
    for (const id of Object.keys(l.itemPurchases)) {
      if (!known(id) || !count(l.itemPurchases[id])) delete l.itemPurchases[id];
    }
    if (!object(l.itemProgress)) l.itemProgress = {};
    const p = l.itemProgress;
    p.ticks = count(p.ticks); delete p.cloverMisses;
    if (!object(p.readyAt)) p.readyAt = {};
    for (const key of Object.keys(p.readyAt)) p.readyAt[key] = count(p.readyAt[key]);
    // Retired equipment state has no V2 payout or reunion action.
    delete p.starGames;
    delete p.readyAt.star;
    delete p.readyAt.reunion;
    if (!object(l.itemMemories)) l.itemMemories = {};
    MEMORY_KINDS.forEach(kind => { if (!Array.isArray(l.itemMemories[kind])) l.itemMemories[kind] = []; });
    if (!object(state.itemLife)) state.itemLife = {};
    if (!object(state.itemLife.pendingItems)) state.itemLife.pendingItems = {};
    delete state.itemLife.departedCompanions;
    p.relationshipSerial = count(p.relationshipSerial);
    p.sceneSerial = count(p.sceneSerial);
    p.guestSerial = count(p.guestSerial);
    // One compatibility binding; readers always follow the current lifetime.
    Object.defineProperty(state, 'items', {configurable:true, enumerable:true,
      get() { return this.lifetime.itemInventory; },
      set(value) { this.lifetime.itemInventory = object(value) ? value : {}; }});
    return state;
  }
  function inventory(s) { normalize(s); return s.lifetime.itemInventory; }
  function stock(s, id) { return known(id) ? count(inventory(s)[id]) : 0; }
  function grant(s, id, amount = 1) {
    if (!known(id) || !count(amount)) return false;
    const bag = inventory(s);
    if (!Number.isSafeInteger(stock(s,id) + amount)) return false;
    bag[id] = stock(s,id) + amount; return true;
  }
  function take(s, id, amount = 1) {
    if (!count(amount) || !known(id) || stock(s,id) < amount) return false;
    const bag = inventory(s); bag[id] -= amount; if (!bag[id]) delete bag[id]; return true;
  }
  function advance(s) { normalize(s); s.lifetime.itemProgress.ticks += 1; }
  function ready(s, key) { normalize(s); return s.lifetime.itemProgress.ticks >= count(s.lifetime.itemProgress.readyAt[key]); }
  function cooldown(s, key, ticks) { normalize(s); if (typeof key !== 'string' || ['__proto__','constructor','prototype'].includes(key)) return; s.lifetime.itemProgress.readyAt[key] = s.lifetime.itemProgress.ticks + count(ticks); }
  function remember(s, kind, record) {
    normalize(s); if (!MEMORY_KINDS.includes(kind) || !object(record)) return null;
    // Store metadata only: bitmap exports are generated on demand.
    const saved = JSON.parse(JSON.stringify(record, (key,value) => typeof value === 'string' && /^data:image\//i.test(value) ? undefined : value));
    s.lifetime.itemMemories[kind].push(saved); return saved;
  }
  return {CATALOG, LEGACY_EQUIPMENT_IDS, validMatchId, duelStake, reserveDuel, settleDuel, abandonDuel, normalize, inventory, stock, grant, take, advance, ready, cooldown, remember};
});
