(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NaotocchiEmotionState = api;
})(typeof window !== 'undefined' ? window : null, function () {
  const profiles = Object.freeze({
    normal: Object.freeze({ state: 'normal', severity: 'none', motion: null, cueMinMs: 0, cueMaxMs: 0, gentle: false, suppressPetIdle: false }),
    lifeCritical: Object.freeze({ state: 'weak', severity: 'critical', motion: null, cueMinMs: 0, cueMaxMs: 0, gentle: false, suppressPetIdle: true }),
    lifeWarning: Object.freeze({ state: 'weak', severity: 'mild', motion: 'droop', cueMinMs: 9000, cueMaxMs: 14000, gentle: true, suppressPetIdle: false }),
    sick: Object.freeze({ state: 'sick', severity: 'strong', motion: 'shake', cueMinMs: 5000, cueMaxMs: 8000, gentle: true, suppressPetIdle: false }),
    healthStrong: Object.freeze({ state: 'weak', severity: 'strong', motion: 'droop', cueMinMs: 8000, cueMaxMs: 12000, gentle: true, suppressPetIdle: false }),
    energyStrong: Object.freeze({ state: 'tired', severity: 'strong', motion: 'doze', cueMinMs: 12000, cueMaxMs: 16000, gentle: true, suppressPetIdle: false }),
    energyMild: Object.freeze({ state: 'tired', severity: 'mild', motion: 'doze', cueMinMs: 8000, cueMaxMs: 12000, gentle: true, suppressPetIdle: false }),
    hungerStrong: Object.freeze({ state: 'hungry', severity: 'strong', motion: 'hungry', cueMinMs: 4500, cueMaxMs: 7500, gentle: false, suppressPetIdle: false }),
    hungerMild: Object.freeze({ state: 'hungry', severity: 'mild', motion: 'hungry', cueMinMs: 7000, cueMaxMs: 11000, gentle: true, suppressPetIdle: false }),
    happinessStrong: Object.freeze({ state: 'unhappy', severity: 'strong', motion: 'sulk', cueMinMs: 6000, cueMaxMs: 9000, gentle: true, suppressPetIdle: false }),
    wantsPlay: Object.freeze({ state: 'wantsPlay', severity: 'mild', motion: 'curious', cueMinMs: 6000, cueMaxMs: 10000, gentle: true, suppressPetIdle: false }),
    happinessMild: Object.freeze({ state: 'unhappy', severity: 'mild', motion: 'sulk', cueMinMs: 8000, cueMaxMs: 12000, gentle: true, suppressPetIdle: false }),
  });

  function copy(profile) {
    return { ...profile };
  }

  function resolve(signals) {
    const value = signals || {};
    if (value.playable === false || value.sleeping === true) return copy(profiles.normal);
    if (value.life === 'critical') return copy(profiles.lifeCritical);
    if (value.life === 'warning') return copy(profiles.lifeWarning);
    if (value.sick) return copy(profiles.sick);
    if (value.health === 'strong') return copy(profiles.healthStrong);
    if (value.energy === 'strong') return copy(profiles.energyStrong);
    if (value.energy === 'mild') return copy(profiles.energyMild);
    if (value.hunger === 'strong') return copy(profiles.hungerStrong);
    if (value.hunger === 'mild') return copy(profiles.hungerMild);
    if (value.happiness === 'strong') return copy(profiles.happinessStrong);
    if (value.happiness === 'mild' && value.petAvailable) return copy(profiles.wantsPlay);
    if (value.happiness === 'mild') return copy(profiles.happinessMild);
    return copy(profiles.normal);
  }

  return Object.freeze({ resolve });
});
