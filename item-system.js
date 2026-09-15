(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NaotocchiItems = factory();
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Approved 2026-09-14 catalog. Effects live in the game runtime.
  const CATALOG = Object.freeze(Object.fromEntries(Object.entries({
  "flower": {
    "label": "おはな",
    "price": 120,
    "kind": "equipment",
    "desc": "恋愛対象が合う相手への求愛を10ポイント後押し。成功率は合わせて85%まで。",
    "guard": "既存の双方向の恋愛対象判定・初対面処理・85%上限を維持。"
  },
  "ribbon": {
    "label": "リボン",
    "price": 120,
    "kind": "equipment",
    "desc": "ごきげんが危険になったら、自動で100まで回復する。",
    "guard": "通常時の自然減を軽くしない。危険域に入った時だけ発動し、手動のじゃれる回数や実績は増やさない。"
  },
  "bowtie": {
    "label": "ちょうネクタイ",
    "price": 180,
    "kind": "equipment",
    "desc": "おなかが危険になったら、自動で100まで回復する。",
    "guard": "通常時の自然減を軽くしない。危険域に入った時だけ発動し、食べすぎ判定や手動のごはん回数は増やさない。"
  },
  "poop1": {
    "label": "トイレットペーパー",
    "price": 240,
    "kind": "equipment",
    "desc": "うんちが3個たまったら、全部自動でおそうじする。",
    "guard": "自動掃除では成長・掃除回数・掃除実績を加算しない。クールダウンは設けない。"
  },
  "scarf": {
    "label": "マフラー",
    "price": 300,
    "kind": "equipment",
    "desc": "病気になったら、自動でくすりを使って治す。",
    "guard": "発病率や季節・天気の負担は補正しない。自動治療は病気だけを対象にし、手動のくすり回数は増やさない。"
  },
  "glasses": {
    "label": "サングラス",
    "price": 360,
    "kind": "equipment",
    "desc": "ゲームの失敗判定に10点プラス。記録はそのまま。",
    "guard": "補正点を記録・Sランク・勧誘・日次スコアへ混ぜない。既存挙動からの変更点として確認対象。"
  },
  "energy1": {
    "label": "げんきバンド",
    "price": 360,
    "kind": "equipment",
    "desc": "げんきの自然な減りを18%、ゲームの消費を25%減らす。通常の消費12が9に。",
    "guard": "環境補正後に軽減して丸める。元気消費0にはしない。"
  },
  "hat": {
    "label": "シルクハット",
    "price": 540,
    "kind": "equipment",
    "desc": "ゲームの変身メーターが25から34に。通常は4回が3回に。年齢や変身回数の条件はそのまま。",
    "guard": "年齢・成長段階・候補の解放条件・恋愛の再判定を飛ばさない。"
  },
  "travel1": {
    "label": "リュックサック",
    "price": 480,
    "kind": "equipment",
    "desc": "旅で使うげんきとおなかが半分に。荷物の中身も土地しだい。",
    "guard": "連続旅行の疲れ判定・そだち70の旅先条件・訪問記録は維持。"
  },
  "sleepboost1": {
    "label": "ふかふかまくら",
    "price": 360,
    "kind": "equipment",
    "desc": "「ねる」を押すと、すぐげんきが100になる。",
    "guard": "睡眠後の時間限定バフは付けない。通常の睡眠状態・睡眠回数・十分に寝た時の成長判定は維持する。"
  },
  "star": {
    "label": "スターバッジ",
    "price": 360,
    "kind": "equipment",
    "desc": "身につけて実点30以上のゲーム3種類で15コイン。最初も次も5分待つ。クイックは全体で1種類。",
    "guard": "元の報酬とは別の固定15。倍率・ラッキーコインをかけない。購入後最初の受取も5分後で、100分に最大300。途中終了・切替連打は対象外。"
  },
  "bond1": {
    "label": "おともだちバッジ",
    "price": 600,
    "kind": "equipment",
    "desc": "この一生で離れたなかまと、10分に1回、再会のゲーム。加入にはいつもの点数が必要。",
    "guard": "既存の勧誘点・レア条件は維持。成功保証なし。使える相手がいなければ待ち時間を消費しない。 再会では加入シールを再付与しない。通常の初加入・別人生の本来の加入報酬とは経路を分ける。"
  },
  "partner1": {
    "label": "らぶれたー",
    "price": 720,
    "kind": "equipment",
    "desc": "なかよし度の自然な減りを25%やわらげる。交際や仲直り、結婚の手紙を読み返せる。",
    "guard": "現在すでに無料のデート・記録機能は維持。新しい専用手紙だけ追加。関係の成立・修復は自動化しない。"
  },
  "crown": {
    "label": "かんむり",
    "price": 900,
    "kind": "equipment",
    "desc": "いのちのダメージを15%減らす。けんこう0が続いて倒れる直前に、一生1回だけけんこう30へ。100歳のお別れは変わらない。",
    "guard": "けんこう0の連続カウンターが死亡閾値に達した時、死亡確定前に1回発動し、連続カウンターを0へ戻す。90歳の既存の奇跡があればそちらを先に使い、かんむりは温存。命は戻さず、命側の死亡・100歳のお別れ・病気の原因は止めない。付け替えで再使用不可。"
  },
  "c_coin2": {
    "label": "ラッキーコイン",
    "price": null,
    "kind": "consumable",
    "desc": "次の大成功でもらうゲームのコインが2ばい。",
    "guard": "新スターバッジ・節目・シールお題には掛けない。既存の購入済み未発動分は使える状態を維持。 在庫数のプレイ上の上限は設けず、日次達成時に1個加算。発動予約は同時に1個。既存在庫・発動中でもその日の1個を受け取れ、未達成日の遡り支給はない。"
  },
  "c_safety": {
    "label": "スコアほけん",
    "price": 20,
    "kind": "consumable",
    "desc": "次のゲーム失敗を1回守る。おとろえ・いのち・げんきの減少なし。",
    "guard": "成功・通常成績では消費しない。途中終了や故意の中断では無料再挑戦報酬を与えない。"
  },
  "c_mgsmall": {
    "label": "やる気のおまもり",
    "price": 40,
    "kind": "consumable",
    "desc": "次のゲームの失敗判定に25点プラス。記録はそのまま。",
    "guard": "実績・自己ベスト・Sランク・勧誘は実点。無効な終了では消費しない。"
  },
  "c_mgbig": {
    "label": "大成功のおまもり",
    "price": 120,
    "kind": "consumable",
    "desc": "次の実点70以上で、せいちょう28。2ばい中は56。実点70未満なら発動を待つ。",
    "guard": "実点70未満なら温存。追加せいちょう14は既存2倍ブーストの対象にして最大28、倍率を重ねない。"
  },
  "c_sickshield": {
    "label": "びょうきよけのおふだ",
    "price": 60,
    "kind": "consumable",
    "desc": "お世話不足で病気になりそうなとき、3回防ぐ。",
    "guard": "治療・食べ過ぎ予防・放置無敵にしない。発病条件を解除する世話が依然必要。"
  },
  "c_growth": {
    "label": "せいちょうドリンク",
    "price": 90,
    "kind": "consumable",
    "desc": "せいちょう2ばいを5分追加。合計10分まで。5分全部入るときに使える。",
    "guard": "そだち100・卵・無限・お別れ中では使わせない。未使用在庫と発動中の時間を分ける。"
  },
  "c_courtsmall": {
    "label": "こいのおまもり",
    "price": 50,
    "kind": "consumable",
    "desc": "恋愛対象が合う相手への初回求愛を20ポイント後押し。成功率は合わせて85%まで。初対面では使わない。",
    "guard": "初対面・候補なし・対象不一致では使わない。恋愛対象や性別を書き換えない。"
  },
  "c_courtbig": {
    "label": "こいの大おまもり",
    "price": null,
    "kind": "consumable",
    "desc": "「こいのおまもり」へ統合。買った分は引き継げる。",
    "guard": "移行済みの記録を付け、再読込・次の人生で二重返金しない。旧IDは履歴・互換用として保持し、必要な種類判定では統合先へ対応づける。"
  },
  "c_breakhalf": {
    "label": "なかなおりのおまもり",
    "price": 60,
    "kind": "consumable",
    "desc": "次のすれちがいの話し合いを、もう1回分進める。残り1回なら使わない。",
    "guard": "最低1回はプレイヤーが会話する。すでに残り1回なら使わない。別れた相手を自動で戻さない。"
  },
  "c_breakfull": {
    "label": "きずなのおまもり",
    "price": 100,
    "kind": "consumable",
    "desc": "なかよし度0を10に戻し、1分だけ自然な減りを止める。同じ相手には一生1回。",
    "guard": "猶予中の減衰だけ停止。放置すれば再び減り別れる。相性を変更しない。連続使用は同じ関係で一生1回。"
  },
  "c_travel": {
    "label": "たびのおまもり",
    "price": 70,
    "kind": "consumable",
    "desc": "次の旅は疲れ知らず。その土地の寄り道も選べる。",
    "guard": "解放済みの場所のみ。元気・満腹は消費。イベントの重複報酬・実績の自然観測条件を壊さない。"
  },
  "fun_candy": {
    "label": "キャンディ",
    "price": 10,
    "kind": "fun",
    "desc": "ごきげん+8。しばらく、口の中に小さなお楽しみ。",
    "guard": "満腹・命は回復しない。1分の反応中に重ねて使わせない。"
  },
  "fun_bubbles": {
    "label": "しゃぼんだま",
    "price": 25,
    "kind": "fun",
    "desc": "ごきげん+10。そばにいるなかまのきずなも+10。",
    "guard": "ミニゲームの得点・成長・クリア回数には加算しない。演出を閉じても損失なし。"
  },
  "fun_balloon": {
    "label": "ふうせん",
    "price": 35,
    "kind": "fun",
    "desc": "30秒準備して、おうちで通常のなかまを1人招く。加入にはいつものゲームが必要。",
    "guard": "呼べる未加入の通常なかまがいない時は使用不可。ゲーム・睡眠・他の招待中には割り込まず、その人生の次の有効なホーム場面へ保留。通常の遭遇予約と二重に招かず、対象資格を再確認。重ねて使用不可。"
  },
  "fun_fireworks": {
    "label": "はなび",
    "price": 60,
    "kind": "fun",
    "desc": "ごきげん+15。こいびとのなかよし度も+15。",
    "guard": "新規の恋人は作らない。自然の時間・天気の実績条件を満たしたことにはしない。"
  },
  "fun_camera": {
    "label": "カメラ",
    "price": 900,
    "kind": "tool",
    "desc": "今の姿と、いっしょにいるみんなを思い出に残せる。何度でも。",
    "guard": "撮影でコイン・シール・成長を無制限に生成しない。既存の無料の人生カード・保存機能は維持。一般ドロップから外す。"
  },
  "fun_musicbox": {
    "label": "オルゴール",
    "price": 1200,
    "kind": "tool",
    "desc": "旅で集めた小さな曲を聴こう。5分に1回、おとろえ-10。",
    "guard": "既存BGM設定は無料のまま。おとろえ軽減は育成5分ごと。再使用・画面開閉・再読込で待ち時間を戻さない。一般ドロップから外す。"
  },
  "fun_surprise": {
    "label": "びっくりばこ",
    "price": 600,
    "kind": "tool",
    "desc": "5分に1回、何が飛び出すかお楽しみ。なくならない箱。",
    "guard": "待ち時間は保存し、開閉・持ち替え・再読込でリセットしない。コイン・ごほうび・成長は抽選に入れない。一般ドロップから外す。"
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
    "desc": "いつものお楽しみに、見たことのない反応が加わる。",
    "guard": "4ステータス固定・無制限のコイン生成は付けない。新コレクションを既存PERFECT条件へ追加しない。"
  },
  "new_life_patch": {
    "label": "いのちのばんそうこう",
    "price": 160,
    "kind": "consumable",
    "desc": "命が40以下のとき、命30・けんこう20を戻す。一生に1回。",
    "guard": "病気・空腹・老いの原因は残る。100歳の終わりや死亡後は対象外。"
  },
  "new_transform_mirror": {
    "label": "へんしんのこかがみ",
    "price": 80,
    "kind": "consumable",
    "desc": "変身候補が出たとき、1候補だけを合法な同じ候補プールから引き直す。1回の候補提示につき1個まで。",
    "guard": "代替候補がなければ消費しない。年齢・段階・解放条件・隠し表示は維持。 元の候補と現在表示中の他候補は抽選から除外。代替なしなら不消費。"
  },
  "new_themed_pack": {
    "label": "テーマシールパック",
    "price": 60,
    "kind": "consumable",
    "desc": "「けしき／なかま／あいてむ」など選んだ分類から3枚。重複救済は通常パックと同じ。",
    "guard": "れんくんの隠し条件は共通。シールから本編加入・成長・図鑑発見は起こさない。"
  }
}).map(([id, item]) => [id, Object.freeze(item)])));
  const TOOL_IDS = ['fun_camera', 'fun_musicbox', 'fun_surprise'];
  const MEMORY_KINDS = ['photos', 'letters', 'lights', 'reactions', 'tunes', 'specials'];
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
  function normalize(state) {
    if (!object(state.lifetime)) state.lifetime = {};
    const l = state.lifetime;
    normalizeStickers(l);
    normalizeDuel(state);
    const legacy = !l.itemSystemVersion;
    if (!object(l.itemInventory)) l.itemInventory = object(state.items) ? state.items : {};
    const bag = l.itemInventory;
    for (const id of Object.keys(bag)) {
      if (!known(id) || !count(bag[id])) delete bag[id];
    }
    l.ownedTools = Array.isArray(l.ownedTools) ? [...new Set(l.ownedTools.filter(id => TOOL_IDS.includes(id)))] : [];
    if (!object(l.itemExtraScenes)) l.itemExtraScenes = {};
    for (const id of TOOL_IDS) {
      l.itemExtraScenes[id] = count(l.itemExtraScenes[id]);
      const legacyHistory = legacy && l.ownedConsumableItems?.includes(id);
      if (count(bag[id]) || legacyHistory) {
        const alreadyOwned = l.ownedTools.includes(id) || legacyHistory;
        if (!l.ownedTools.includes(id)) l.ownedTools.push(id);
        l.itemExtraScenes[id] += Math.max(0, count(bag[id]) - (alreadyOwned ? 0 : 1));
        delete bag[id];
      }
    }
    if (legacy) {
      // An infinite-mode snapshot can hold the reservation that will be restored.
      const reservations = [state.oneTimeBoosts, state.infiniteReturn?.oneTimeBoosts];
      if (reservations.some(b => b?.courtBoost === 'big')) {
        l.money = (Number.isFinite(l.money) && l.money >= 0 ? l.money : 0) + 350;
        reservations.forEach(b => { if (b?.courtBoost === 'big') b.courtBoost = null; });
      }
      l.itemSystemVersion = 1;
    }
    if (!object(l.itemPurchases)) l.itemPurchases = {};
    for (const id of Object.keys(l.itemPurchases)) {
      if (!known(id) || !count(l.itemPurchases[id])) delete l.itemPurchases[id];
    }
    if (!object(l.itemProgress)) l.itemProgress = {};
    const p = l.itemProgress;
    p.ticks = count(p.ticks); delete p.cloverMisses;
    if (!object(p.readyAt)) p.readyAt = {};
    for (const key of Object.keys(p.readyAt)) p.readyAt[key] = count(p.readyAt[key]);
    if (!Array.isArray(p.starGames)) p.starGames = [];
    p.starGames = [...new Set(p.starGames.filter(id => typeof id === 'string' && id))].slice(0, 3);
    if (p.readyAt.star === undefined && (l.ownedShopItems?.includes('star') || l.equippedItemId === 'star')) p.readyAt.star = p.ticks + 100;
    if (!object(l.itemMemories)) l.itemMemories = {};
    MEMORY_KINDS.forEach(kind => { if (!Array.isArray(l.itemMemories[kind])) l.itemMemories[kind] = []; });
    if (!object(state.itemLife)) state.itemLife = {};
    if (typeof state.itemLife.crownUsed !== 'boolean') state.itemLife.crownUsed = false;
    if (typeof state.itemLife.lifePatchUsed !== 'boolean') state.itemLife.lifePatchUsed = false;
    if (!object(state.itemLife.relationshipShields)) state.itemLife.relationshipShields = {};
    if (!object(state.itemLife.pendingItems)) state.itemLife.pendingItems = {};
    if (!Array.isArray(state.itemLife.departedCompanions)) state.itemLife.departedCompanions = [];
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
  function ownsTool(s, id) { normalize(s); return s.lifetime.ownedTools.includes(id); }
  function grant(s, id, amount = 1) {
    if (!known(id) || !count(amount)) return false;
    const bag = inventory(s);
    if (CATALOG[id].kind === 'tool') {
      if (!s.lifetime.ownedTools.includes(id)) s.lifetime.ownedTools.push(id);
      return true;
    }
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
  return {CATALOG, LEGACY_EQUIPMENT_IDS, validMatchId, duelStake, reserveDuel, settleDuel, abandonDuel, normalize, inventory, stock, grant, take, ownsTool, advance, ready, cooldown, remember};
});
