(() => {
  'use strict';

  const DEFAULT_MINS = Object.freeze([0, 3, 7, 12, 16, 22, 40, 70]);

  const PROFILES = Object.freeze({
    human: Object.freeze([0, 3, 7, 12, 16, 22, 40, 70]),
    earlyAnimal: Object.freeze([0, 2, 5, 9, 14, 22, 45, 75]),
    longLivedAnimal: Object.freeze([0, 4, 10, 18, 28, 42, 62, 82]),
    aquaticMetamorphosis: Object.freeze([0, 5, 12, 22, 34, 48, 66, 84]),
    butterfly: Object.freeze([0, 8, 20, 38, 48, 60, 78, 94]),
    beetle: Object.freeze([0, 16, 34, 60, 69, 78, 88, 96]),
    stagBeetle: Object.freeze([0, 14, 30, 54, 63, 73, 84, 94]),
    longLarval: Object.freeze([0, 18, 40, 70, 80, 87, 94, 98]),
    herbaceousPlant: Object.freeze([0, 6, 14, 26, 40, 55, 72, 88]),
    woodyPlant: Object.freeze([0, 5, 13, 24, 38, 54, 72, 90]),
    colonyGrowth: Object.freeze([0, 8, 18, 31, 45, 60, 77, 92]),
    jellyfish: Object.freeze([0, 14, 29, 44, 58, 71, 84, 95]),
    fungus: Object.freeze([0, 12, 29, 44, 57, 69, 82, 94]),
  });

  const LINE_PROFILE = Object.freeze({
    man: 'human',
    woman: 'human',
    ren: 'human',

    dog: 'earlyAnimal',
    cat: 'earlyAnimal',
    penguin: 'earlyAnimal',

    turtle: 'longLivedAnimal',
    hermit_crab: 'longLivedAnimal',
    dragon: 'longLivedAnimal',

    frog: 'aquaticMetamorphosis',
    salmon: 'aquaticMetamorphosis',
    clownfish: 'aquaticMetamorphosis',
    starfish: 'aquaticMetamorphosis',

    butterfly: 'butterfly',
    beetle: 'beetle',
    stagbeetle: 'stagBeetle',
    cicada: 'longLarval',
    antlion: 'longLarval',

    dandelion: 'herbaceousPlant',
    venus_flytrap: 'herbaceousPlant',
    sakura: 'woodyPlant',
    world_tree: 'woodyPlant',
    coral: 'colonyGrowth',
    jellyfish: 'jellyfish',
    mushroom: 'fungus',
  });

  // 生物学的な年齢より、現在の8段階の物語の進み方を優先する系統。
  const LINE_OVERRIDES = Object.freeze({
    phoenix: Object.freeze([0, 5, 12, 22, 35, 50, 68, 90]),
    god: Object.freeze([0, 4, 10, 20, 34, 50, 70, 90]),
    ghost: Object.freeze([0, 5, 12, 22, 35, 50, 70, 90]),
    star: Object.freeze([0, 8, 18, 32, 48, 64, 82, 94]),
    plush: Object.freeze([0, 4, 10, 18, 30, 45, 65, 85]),
    unknown: Object.freeze([0, 8, 18, 30, 44, 60, 78, 94]),
  });

  function minsForLine(line) {
    if (LINE_OVERRIDES[line]) return LINE_OVERRIDES[line];
    const profile = LINE_PROFILE[line];
    return (profile && PROFILES[profile]) || DEFAULT_MINS;
  }

  function stageForAge(age, line) {
    const numericAge = Number.isFinite(Number(age)) ? Number(age) : 0;
    const mins = minsForLine(line);
    for (let i = mins.length - 1; i >= 0; i -= 1) {
      if (numericAge >= mins[i]) return i;
    }
    return 0;
  }

  function transformAside(line, before, after) {
    if (!Number.isInteger(before) || !Number.isInteger(after) || before === after) return '';
    if (line === 'cicada' && after <= 2 && after < before) return 'まだ ちじょうには でないみたい。';
    if (line === 'butterfly' && after === 4) return 'こんどは さなぎの じかん。';
    if (after < before) return 'まだまだ これからみたい。';
    if (after >= 5) return 'こっちでは もう りっぱなおとな。';
    return 'こっちでは すこし さきまで育っているみたい。';
  }

  const api = Object.freeze({
    DEFAULT_MINS,
    PROFILES,
    LINE_PROFILE,
    LINE_OVERRIDES,
    minsForLine,
    stageForAge,
    transformAside,
  });

  if (typeof window !== 'undefined') window.NaotocchiLifeStages = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
