(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NaotocchiPetExpression = api;
})(typeof window !== 'undefined' ? window : null, function () {
  const BASE_ASSET = 'assets/characters/cat/06.png';
  const EXPRESSIONS = Object.freeze([
    'normal','happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping',
  ]);
  const VARIANT_ASSETS = Object.freeze({
    happy: 'assets/characters/expressions/cat/06-happy-v3.png',
    strained: 'assets/characters/expressions/cat/06-strained.png',
    sulky: 'assets/characters/expressions/cat/06-sulky.png',
    hungry: 'assets/characters/expressions/cat/06-hungry.png',
    sick: 'assets/characters/expressions/cat/06-sick.png',
    tired: 'assets/characters/expressions/cat/06-tired.png',
    weak: 'assets/characters/expressions/cat/06-weak.png',
    critical: 'assets/characters/expressions/cat/06-critical.png',
    wantsPlay: 'assets/characters/expressions/cat/06-wantsPlay.png',
    sleeping: 'assets/characters/expressions/cat/06-sleeping-v3.png',
  });
  const STAGE_ASSETS = Object.freeze({
    [BASE_ASSET]: VARIANT_ASSETS,
    'assets/characters/cat/03.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/03-${name}.png`])
    )),
    'assets/characters/cat/04.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/04-${name}.png`])
    )),
  });
  const PERSISTENT = Object.freeze({
    hungry:'hungry', sick:'sick', tired:'tired', weak:'weak', unhappy:'sulky', wantsPlay:'wantsPlay', normal:'normal',
  });
  const ACCENTS = Object.freeze({
    happy: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-warm" d="M76 17l2.2 5.2 5.3 2.2-5.3 2.2-2.2 5.2-2.2-5.2-5.3-2.2 5.3-2.2zM88 34l1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4z"/></svg>',
    strained: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-warm-line accent-outline" d="M17 24l7-5 4 7 7-5"/><path class="accent-warm-line" d="M17 24l7-5 4 7 7-5"/></svg>',
    sulky: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-cloud" d="M67 24c1-6 10-7 13-2 5-4 13 1 10 7 6 2 5 11-2 12H68c-9 0-10-13-1-17z"/><path class="accent-cloud-line" d="M70 29c4-4 7 5 11 0s7 4 4 7"/></svg>',
    hungry: '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-thought" cx="71" cy="37" r="2.5"/><circle class="accent-thought" cx="77" cy="29" r="4"/><path class="accent-food" d="M82 17c6-5 12-2 14 2-2 4-8 7-14 2l-4 3v-10z"/><circle class="accent-food-eye" cx="91" cy="18.5" r="1"/></svg>',
    sick: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-cool" d="M69 15h23v5H69zM72 23h17v3H72z"/><path class="accent-cool-line accent-outline" d="M72 31h17M75 35h11"/><path class="accent-cool-line" d="M72 31h17M75 35h11"/></svg>',
    tired: '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-sleepy" cx="84" cy="23" r="7"/><circle class="accent-sleepy" cx="74" cy="34" r="3"/></svg>',
    weak: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-weak accent-outline" d="M72 16v13m0 0-4-5m4 5 4-5M83 18v15m0 0-4-5m4 5 4-5"/><path class="accent-weak" d="M72 16v13m0 0-4-5m4 5 4-5M83 18v15m0 0-4-5m4 5 4-5"/></svg>',
    critical: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-critical accent-outline" d="M69 13v20m0 0-6-7m6 7 6-7M84 13v22m0 0-6-7m6 7 6-7"/><path class="accent-critical" d="M69 13v20m0 0-6-7m6 7 6-7M84 13v22m0 0-6-7m6 7 6-7"/></svg>',
    wantsPlay: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-call accent-outline" d="M72 18l-6-7M82 16V7M91 20l7-6"/><path class="accent-call" d="M72 18l-6-7M82 16V7M91 20l7-6"/></svg>',
    sleeping: '<svg viewBox="0 0 104 104" focusable="false"><path class="accent-sleep-z accent-outline" d="M68 31h6l-6 6h6"/><path class="accent-sleep-z" d="M68 31h6l-6 6h6"/><path class="accent-sleep-z accent-outline" d="M78 21h8l-8 8h8"/><path class="accent-sleep-z" d="M78 21h8l-8 8h8"/><path class="accent-sleep-z accent-outline" d="M88 8h11L88 19h11"/><path class="accent-sleep-z" d="M88 8h11L88 19h11"/></svg>',
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
    if (settings.blocked === true) return 'normal';
    if (settings.sleeping === true) return 'sleeping';
    if (profile.state === 'weak' && profile.severity === 'critical') return 'critical';
    if (settings.reaction != null) {
      return EXPRESSIONS.includes(settings.reaction) ? settings.reaction : 'normal';
    }
    return Object.hasOwn(PERSISTENT,profile.state) ? PERSISTENT[profile.state] : 'normal';
  }

  function assetFor(baseAsset, expression) {
    if (!Object.hasOwn(STAGE_ASSETS,baseAsset)) return baseAsset;
    const variants=STAGE_ASSETS[baseAsset];
    return Object.hasOwn(variants,expression) ? variants[expression] : baseAsset;
  }

  function accentFor(baseAsset, expression) {
    if (!Object.hasOwn(STAGE_ASSETS,baseAsset) || !Object.hasOwn(ACCENTS,expression)) return '';
    // Stage-specific anchors follow the head within the transparent sprite canvas.
    let offset = null;
    if (baseAsset === 'assets/characters/cat/03.png' && expression === 'wantsPlay') offset = '-14 12';
    if (baseAsset === 'assets/characters/cat/04.png') {
      offset = expression === 'strained' ? '0 5' : expression === 'wantsPlay' ? '-32 18' : '-22 8';
    }
    const accent = offset
      ? ACCENTS[expression].replace(/(<svg[^>]*>)/, `$1<g transform="translate(${offset})">`).replace('</svg>', '</g></svg>')
      : ACCENTS[expression];
    return `<span class="pet-expression-accent pet-expression-accent--${expression}" aria-hidden="true">${accent}</span>`;
  }

  function reactionFor(event) {
    return Object.hasOwn(REACTIONS,event) ? REACTIONS[event] : null;
  }

  return Object.freeze({ resolve, assetFor, accentFor, reactionFor });
});
