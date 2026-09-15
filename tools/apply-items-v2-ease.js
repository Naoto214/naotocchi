const fs = require('node:fs');

function edit(path, fn) {
  const before = fs.readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`No change made to ${path}`);
  fs.writeFileSync(path, after);
}

function once(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`Duplicate ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

edit('script.js', (src) => {
  src = once(src,
`    // らぶれたーけいの アイテムを そうびしていると、なかよし度が へりにくい
    const affectionDecayFactor = isEquipped('partner1') ? 0.75 : 1;
    // すれちがい中は きもちが はなれるのが はやい。ほうっておくと
    // ふつうより ずっと はやく わかれに ちかづく
    const mismatchFactor = p.mismatched ? 2.5 : 1;
    p.affection = clamp((p.affection ?? 100) - PARTNER_AFFECTION_DECAY_PER_TICK * affectionDecayFactor * mismatchFactor, 0, 100);
    if (p.affection > 0) return;`,
`    // すれちがい中は きもちが はなれるのが はやい。ほうっておくと
    // ふつうより ずっと はやく わかれに ちかづく
    const mismatchFactor = p.mismatched ? 2.5 : 1;
    p.affection = clamp((p.affection ?? 100) - PARTNER_AFFECTION_DECAY_PER_TICK * mismatchFactor, 0, 100);
    if (isEquipped('partner1') && p.affection <= ITEM_AUTO_CARE_DANGER) {
      p.affection = 100;
      itemContextReaction('partner1', 'なかよし度が危なくなる前に、らぶれたーを読み返して100にもどった。');
      return;
    }
    if (p.affection > 0) return;`, 'partner V2 decay');

  src = once(src,
`    // バッジは再会のゲームを開く。自然減は既存のそだち特典だけ。
    const bondDecayFactor = hasPerk(40) ? 0.5 : 1;
    state.companions = state.companions.filter((c) => {
      c.bond = clamp((c.bond ?? 100) - COMPANION_BOND_DECAY_PER_TICK * bondDecayFactor, 0, 100);
      if (c.bond > 0) return true;`,
`    const bondDecayFactor = hasPerk(40) ? 0.5 : 1;
    state.companions = state.companions.filter((c) => {
      c.bond = clamp((c.bond ?? 100) - COMPANION_BOND_DECAY_PER_TICK * bondDecayFactor, 0, 100);
      if (isEquipped('bond1') && c.bond <= ITEM_AUTO_CARE_DANGER) {
        c.bond = 100;
        itemContextReaction('bond1', 'きずなが危なくなる前に、おともだちバッジが合図して100にもどった。');
        return true;
      }
      if (c.bond > 0) return true;`, 'friend badge V2 decay');

  src = once(src,
`    state.energy = clamp(state.energy - (isEquipped('travel1') ? 3 : 6), 0, 100);
    state.hunger = clamp(state.hunger - (isEquipped('travel1') ? 2 : 4), 0, 100);
    if (isEquipped('travel1')) itemContextReaction('travel1', \`${'${region.label}'}で荷物を広げた。げんきとおなかの消費が半分になった。\`);`,
`    if (isEquipped('travel1')) {
      itemContextReaction('travel1', \`${'${region.label}'}へ身軽に出発。げんきとおなかを消費しなかった。\`);
    } else {
      state.energy = clamp(state.energy - 6, 0, 100);
      state.hunger = clamp(state.hunger - 4, 0, 100);
    }`, 'backpack V2 travel');

  src = once(src,
`    const progress = state.lifetime.itemProgress;
    if (isGreat) {`,
`    if (isGreat) {`, 'obsolete star progress local');

  src = once(src,
`    } else if (!isBad) {
      applyGrowth(7); applyDecline(-3);
      state.lifetime.money += 2;
      itemMessage += '／2コインをもらった';`,
`    } else if (!isBad) {
      applyGrowth(7); applyDecline(-3);
      const ordinaryCoins = equipped('star') ? 4 : 2;
      state.lifetime.money += ordinaryCoins;
      itemMessage += \`／${'${ordinaryCoins}'}コインをもらった\`;`, 'star V2 ordinary payout');

  src = once(src,
`    if (equipped('star') && rawScore >= 30 && game?.id) {
      const starGameId = game.id === 'quick-solo' ? 'quick-run' : game.id;
      if (!progress.starGames.includes(starGameId) && progress.starGames.length < 3) progress.starGames.push(starGameId);
      if (claimStarReward()) itemMessage += '／星が3つそろった。15コイン!';
    }
`, '', 'old star collection reward');

  src = once(src,
`  function updateItemEffectTick() {
    if (isEquipped('star') && claimStarReward()) setMessage('星が3つそろった。15コイン!');
  }`,
`  function updateItemEffectTick() {
    // V2 equipment effects are action- or danger-triggered; no timed star payout.
  }`, 'old star timed payout');

  src = once(src,
`        if (item.id === 'star') {
          const missing = Math.max(0, 3 - progress.starGames.length);
          statusText += \`／星${'${progress.starGames.length}'}/3${'${missing ? `／あと${missing}種類` : \'／星がそろった\'}'}${'${remaining(\'star\') ? `／受取まで${remaining(\'star\') * 3}秒` : missing ? \'\' : equipped ? \'／次の活動で受取\' : \'／身につけると受取\'}'}\`;
        }
`, '', 'old star shop status');

  return src;
});

edit('item-system.js', (src) => {
  src = once(src,
`    "desc": "旅で使うげんきとおなかが半分に。荷物の中身も土地しだい。",
    "guard": "連続旅行の疲れ判定・そだち70の旅先条件・訪問記録は維持。"`,
`    "desc": "旅でげんきとおなかを消費しない。",
    "guard": "連続旅行の疲れ判定・そだち70の旅先条件・訪問記録・ごきげん変化は維持。"`, 'backpack catalog');
  src = once(src,
`    "desc": "身につけて実点30以上のゲーム3種類で15コイン。最初も次も5分待つ。クイックは全体で1種類。",
    "guard": "元の報酬とは別の固定15。倍率・ラッキーコインをかけない。購入後最初の受取も5分後で、100分に最大300。途中終了・切替連打は対象外。"`,
`    "desc": "通常のミニゲーム成功でもらうコインが2倍になる。",
    "guard": "通常成功の2コインだけを4コインにする。大成功・日次・レア報酬・そのほかのコインには倍率をかけない。"`, 'star catalog');
  src = once(src,
`    "desc": "この一生で離れたなかまと、10分に1回、再会のゲーム。加入にはいつもの点数が必要。",
    "guard": "既存の勧誘点・レア条件は維持。成功保証なし。使える相手がいなければ待ち時間を消費しない。 再会では加入シールを再付与しない。通常の初加入・別人生の本来の加入報酬とは経路を分ける。"`,
`    "desc": "なかまとのきずなが危険になったら、自動で100まで回復する。",
    "guard": "通常時の自然減は軽くしない。危険域に入った時だけ発動し、じゃれる回数・加入・シール・実績は増やさない。"`, 'friend badge catalog');
  src = once(src,
`    "desc": "なかよし度の自然な減りを25%やわらげる。交際や仲直り、結婚の手紙を読み返せる。",
    "guard": "現在すでに無料のデート・記録機能は維持。新しい専用手紙だけ追加。関係の成立・修復は自動化しない。"`,
`    "desc": "こいびととのなかよし度が危険になったら、自動で100まで回復する。",
    "guard": "通常時の自然減は軽くしない。危険域に入った時だけ発動し、交際成立・仲直り・結婚は自動化しない。手紙の思い出表示は残す。"`, 'love letter catalog');
  return src;
});

// Retire assertions for the old star collection/reunion effects; the new V2
// behavior is covered in items-v2-ease-automation-test.cjs.
edit('tests/item-care-game-test.cjs', (src) => {
  src = src.replace(/test\('star three distinct real scores[\s\S]*?\n\}\);\n\ntest\('star excludes assisted low scores[\s\S]*?\n\}\);\n\n/, '');
  return src;
});

edit('tests/item-relations-travel-test.cjs', (src) => {
  src = once(src,
`test('backpack halves travel costs but does not prevent fatigue',()=>{
 const {h,s}=setup('travel1');s.travelStreak=100;const e=s.energy,f=s.hunger,m=s.happiness;travel(h,'forest');assert.equal(s.energy,e-3);assert.equal(s.hunger,f-2);assert.equal(s.happiness,m-3);
});`,
`test('backpack removes travel hunger and energy costs but does not prevent fatigue',()=>{
 const {h,s}=setup('travel1');s.travelStreak=100;const e=s.energy,f=s.hunger,m=s.happiness;travel(h,'forest');assert.equal(s.energy,e);assert.equal(s.hunger,f);assert.equal(s.happiness,m-3);
});`, 'old backpack test');
  src = src.replace(/test\('badge retries a departed known companion[\s\S]*?\n\}\);\n\n/, '');
  src = src.replace(/test\('reunion cancel has no cooldown[\s\S]*?\n\}\);\n\n/, '');
  src = src.replace(/test\('reunion rechecks equipment[\s\S]*?\n\}\);\n\n/, '');
  return src;
});
