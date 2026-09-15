(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NaotocchiPetExpression = api;
})(typeof window !== 'undefined' ? window : null, function () {
  const BASE_ASSET = 'assets/characters/cat/06.png';
  const EXPRESSIONS = Object.freeze(['normal','happy','strained','sulky']);
  const VARIANT_ASSETS = Object.freeze({
    happy: 'assets/characters/expressions/cat/06-happy.png',
    strained: 'assets/characters/expressions/cat/06-strained.png',
    sulky: 'assets/characters/expressions/cat/06-sulky.png',
  });
  const REACTIONS = Object.freeze({
    play_with: 'happy',
    play_with_annoyed: 'sulky',
    overfeed: 'strained',
    medicine_wrong: 'strained',
    feed: 'normal',
    medicine_cure: 'normal',
    sleep: 'normal',
    wake: 'normal',
  });

  function resolve(emotion, options = {}) {
    const profile = emotion && typeof emotion === 'object' ? emotion : {};
    const settings = options && typeof options === 'object' ? options : {};
    if (settings.sleeping === true) return 'normal';
    if (profile.state === 'weak' && profile.severity === 'critical') return 'strained';
    if (settings.reaction != null) {
      return EXPRESSIONS.includes(settings.reaction) ? settings.reaction : 'normal';
    }
    if (['hungry','tired','sick','weak'].includes(profile.state)) return 'strained';
    if (profile.state === 'unhappy') return 'sulky';
    return 'normal';
  }

  function assetFor(baseAsset, expression) {
    if (baseAsset !== BASE_ASSET) return baseAsset;
    return Object.hasOwn(VARIANT_ASSETS, expression) ? VARIANT_ASSETS[expression] : baseAsset;
  }

  function reactionFor(event) {
    return Object.hasOwn(REACTIONS,event) ? REACTIONS[event] : null;
  }

  return Object.freeze({ resolve, assetFor, reactionFor });
});
