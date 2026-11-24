// Shared between the owner trial, its comparison controls and the policy tests.
(function (root, factory) {
  const policy = factory();
  if (typeof module === 'object' && module.exports) module.exports = policy;
  else root.HomePopulationPolicy = policy;
})(typeof window === 'undefined' ? null : window, () => {
  const ceilings = Object.freeze({current: 0, A: 10, B: 15, C: 20});

  function normalizeCount(value) {
    const count = Number(value);
    const numeric = typeof value === 'number' || typeof value === 'string';
    return numeric && Number.isInteger(count) && count >= 1 && count <= 28 ? count : 28;
  }

  function evaluate(input = {}) {
    const selected = input.policy ?? input.variant;
    const policy = Object.hasOwn(ceilings, selected) ? selected : 'B';
    const count = normalizeCount(input.count);
    const curve = input.curve === 'step' ? 'step' : 'linear';
    const width = Number.isFinite(input.width) ? Math.max(0, input.width) : 0;
    const t = Math.max(0, Math.min(1, (width - 320) / 55));
    const widthFactor = t * t * (3 - 2 * t);
    const populationFactor = count <= 18 ? 0 : curve === 'step' ? 1 : (count - 18) / 10;
    const ceiling = ceilings[policy];
    const extra = ceiling * populationFactor * widthFactor;
    const size = baseline => baseline * (100 + extra) / 100;
    return {policy, curve, count, width, ceiling, populationFactor, widthFactor, extra,
      hero: size(120), partner: size(120), companions: size(105)};
  }

  return Object.freeze({ceilings, normalizeCount, evaluate});
});
