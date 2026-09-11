(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NaotocchiCareStatus = api;
})(typeof window !== 'undefined' ? window : null, function () {
  const SNAPSHOT_FIELDS = [
    'hunger',
    'happiness',
    'energy',
    'health',
    'sodachi',
    'growth',
    'decline',
    'deathMeter',
    'isSick',
    'isSleeping',
    'stage',
  ];

  function notice(kind, severity, title, detail, icon, action, motion) {
    return { kind, severity, title, detail, icon, action, motion };
  }

  function numeric(state, key, fallback) {
    const value = Number(state && state[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function nextHealthCare(state, petAvailable, lifeRecovery) {
    const hunger = numeric(state, 'hunger', 100);
    const happiness = numeric(state, 'happiness', 100);
    const energy = numeric(state, 'energy', 100);
    const needsHunger = lifeRecovery ? hunger < 60 : hunger <= 50;
    const needsHappiness = lifeRecovery ? happiness < 60 : happiness <= 50;
    const needsEnergy = lifeRecovery ? energy < 60 : energy <= 25;

    if (state.isSick) {
      const sickness = state.sicknessType || 'びょうき';
      return {
        action: 'medicineBtn',
        // Saved disease names can be long. Put the care before that unbounded
        // text so the fixed two-line notice exposes the next action first.
        detail: `くすりでなおそう：${sickness}`,
      };
    }
    if (state.isSleeping && needsHunger) {
      return { action: 'sleepBtn', detail: lifeRecovery ? 'おきておなかを60以上にしよう' : 'おきてごはんをあげよう' };
    }
    if (needsHunger) {
      return { action: 'feedBtn', detail: lifeRecovery ? 'おなかを60以上にしよう' : 'ごはんをあげよう' };
    }
    if (state.isSleeping && needsHappiness) {
      if (needsEnergy) return { action: '', detail: lifeRecovery ? 'ねてげんきを60以上にしよう' : 'まずはねてげんきを回復しよう' };
      return { action: 'sleepBtn', detail: lifeRecovery ? 'おきてごきげんを60以上にしよう' : 'おきてごきげんをととのえよう' };
    }
    if (needsHappiness) {
      if (energy <= 25) return { action: 'sleepBtn', detail: 'まずはねてげんきを回復しよう' };
      if (petAvailable) return { action: 'playWithBtn', detail: lifeRecovery ? 'じゃれてごきげんを60以上にしよう' : 'やさしくじゃれよう' };
      if (lifeRecovery && energy < 60) return { action: 'sleepBtn', detail: 'まずげんきを60以上にしよう' };
      return { action: 'playBtn', detail: lifeRecovery ? 'あそんでごきげんを60以上にしよう' : 'あそんでごきげんをととのえよう' };
    }
    if (needsEnergy) {
      if (state.isSleeping) return { action: '', detail: lifeRecovery ? 'ねてげんきを60以上にしよう' : 'ねむりながらげんきを回復中' };
      return { action: 'sleepBtn', detail: lifeRecovery ? 'ねてげんきを60以上にしよう' : 'ねてげんきを回復しよう' };
    }
    if (numeric(state, 'poopCount', 0) >= 2) {
      return { action: 'cleanBtn', detail: 'うんちが原因。そうじしよう' };
    }
    return { action: '', detail: 'おせわを続けて、少しずつ回復するのを待とう' };
  }

  function assess(input, options) {
    const state = input || {};
    const stage = String(state.stage || '').toLowerCase();
    if (stage === 'egg' || stage === 'dead' || stage === 'farewell') return null;

    const config = options || {};
    const immortal = Object.prototype.hasOwnProperty.call(config, 'immortal')
      ? Boolean(config.immortal)
      : Boolean(state.infinite);
    const petAvailable = Object.prototype.hasOwnProperty.call(config, 'petAvailable')
      ? Boolean(config.petAvailable)
      : true;
    const health = numeric(state, 'health', 100);
    const deathMeter = numeric(state, 'deathMeter', 0);
    const lowHealthStreak = numeric(state, 'lowHealthStreak', 0);
    const lifeRisk = Boolean(state.dying) || deathMeter >= 80;
    const healthLimit = health <= 0 || (health < 20 && lowHealthStreak > 0);

    if (!immortal && (lifeRisk || healthLimit)) {
      const care = nextHealthCare(state, petAvailable, lifeRisk);
      const title = lifeRisk ? 'いのちがあぶない' : 'けんこうがげんかい';
      return notice('life', 'critical', title, care.detail, 'danger', care.action, 'droop');
    }

    // Match the world's warning band (remaining life <= 40). Start useful
    // recovery advice before the critical band, using the real 60+ care rule.
    if (!immortal && deathMeter >= 60) {
      const care = nextHealthCare(state, petAvailable, true);
      return notice('life', 'warning', 'いのちがすくない', care.detail, 'danger', care.action, 'droop');
    }

    if (health <= 25) {
      const care = nextHealthCare(state, petAvailable, false);
      return notice('health', 'warning', 'けんこうがひくい', care.detail, 'danger', care.action, 'droop');
    }

    if (state.isSick) {
      const sickness = state.sicknessType || 'びょうき';
      return notice('sick', 'warning', 'びょうき。くすりでなおそう', `${sickness}（ねていても使えるよ）`, 'sick', 'medicineBtn', 'droop');
    }

    const hunger = numeric(state, 'hunger', 100);
    if (hunger <= 25) {
      if (state.isSleeping) {
        return notice('hunger', 'warning', 'おなかがすいている', 'おきてからごはんをあげよう', 'hunger', 'sleepBtn', 'droop');
      }
      return notice('hunger', 'warning', 'おなかがすいている', 'ごはんをあげよう', 'hunger', 'feedBtn', 'droop');
    }

    const energy = numeric(state, 'energy', 100);
    if (!state.isSleeping && energy <= 25) {
      return notice('energy', 'warning', 'げんきがすくない', 'あそばずにねて回復しよう', 'sleep', 'sleepBtn', 'droop');
    }

    const happiness = numeric(state, 'happiness', 100);
    if (happiness <= 25) {
      if (state.isSleeping) {
        const detail = energy <= 25
          ? 'まずはねてげんきを回復しよう'
          : 'おきてごきげんをととのえよう';
        return notice('happiness', 'info', 'ごきげんがひくい', detail, 'play', energy <= 25 ? '' : 'sleepBtn', 'droop');
      }
      if (!petAvailable) {
        return notice('happiness', 'info', 'ごきげんがひくい', 'あそんでごきげんをととのえよう', 'play', 'playBtn', 'droop');
      }
      return notice('happiness', 'info', 'ごきげんがひくい', 'やさしくじゃれよう', 'play', 'playWithBtn', 'droop');
    }

    if (numeric(state, 'poopCount', 0) >= 2) {
      return notice('poop', 'info', 'うんちがたまっている', 'そうじしてきれいにしよう', 'clean', 'cleanBtn', 'droop');
    }

    if (numeric(state, 'decline', 0) >= 70) {
      return notice('decline', 'info', 'おとろえがたまっている', 'いつものおせわをととのえよう', 'decline', '', 'droop');
    }

    if (state.isSleeping) {
      if (energy >= 100) {
        return notice('sleep', 'info', 'げんきがもどった', '十分休んだよ。おきよう', 'recovery', 'sleepBtn', '');
      }
      return notice('sleep', 'info', 'すやすやねている', 'ねむりながらげんきを回復中', 'sleep', '', '');
    }

    return null;
  }

  function snapshot(state) {
    const result = {};
    for (const key of SNAPSHOT_FIELDS) result[key] = state ? state[key] : undefined;
    return result;
  }

  function signed(value) {
    const rounded = Math.round(Math.abs(value) * 10) / 10;
    return `${value > 0 ? '+' : '−'}${rounded}`;
  }

  function changes(before, after) {
    if (!before || !after) return null;
    const metrics = [
      { key: 'sodachi', name: 'そだち', icon: () => 'growth' },
      { key: 'health', name: 'けんこう', icon: (delta) => (delta > 0 ? 'recovery' : 'danger') },
      { key: 'energy', name: 'げんき', icon: () => 'sleep' },
      { key: 'hunger', name: 'おなか', icon: () => 'food' },
      { key: 'happiness', name: 'ごきげん', icon: () => 'play' },
      { key: 'decline', name: 'おとろえ', icon: () => 'decline' },
      { key: 'growth', name: 'せいちょう', icon: () => 'growth' },
      { key: 'life', name: 'いのち', icon: (delta) => (delta > 0 ? 'recovery' : 'danger') },
    ];
    const found = [];

    for (const metric of metrics) {
      let oldValue;
      let newValue;
      if (metric.key === 'life') {
        oldValue = 100 - Number(before.deathMeter);
        newValue = 100 - Number(after.deathMeter);
      } else {
        oldValue = Number(before[metric.key]);
        newValue = Number(after[metric.key]);
      }
      if (!Number.isFinite(oldValue) || !Number.isFinite(newValue)) continue;
      const delta = newValue - oldValue;
      if (Math.abs(delta) < 1) continue;
      found.push({ text: `${metric.name} ${signed(delta)}`, icon: metric.icon(delta) });
      if (found.length === 2) break;
    }

    if (found.length === 0) return null;
    return { text: found.map((item) => item.text).join(' / '), icon: found[0].icon };
  }

  return { assess, snapshot, changes };
});
