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
  // BEGIN GENERATED FACE PLACEMENT
  const MARK_PLACEMENT = {
    "cat/01": {"face":[52,98],"sweat":{"leftInner":27.25,"rightInner":76.75,"centerY":79.625},"marks":{"happy":[-27.5,27],"strained":[2.5,39.5],"hungry":[-26.5,23.5],"sick":[-23,28.5],"tired":[-23.5,27],"sulky":[-22,22],"weak":[-24.5,33],"critical":[-21.5,28],"wantsPlay":[-39.5,43],"sleeping":[-30.5,24.5]}},
    "cat/02": {"face":[55,77],"sweat":{"leftInner":25.1875,"rightInner":78.6875,"centerY":62.5625},"marks":{"happy":[-10.5,9.5],"strained":[-15.5,34.5],"hungry":[-23.5,5],"sick":[-22,6],"tired":[-23,7.5],"sulky":[-18.5,1],"weak":[-19,8],"critical":[-10,8],"wantsPlay":[-37,17.5],"sleeping":[-23.5,6]}},
    "cat/03": {"face":[49,70],"sweat":{"leftInner":20.3125,"rightInner":41.8125,"centerY":19.875},"marks":{"happy":[-15.5,-2],"strained":[-21.5,28],"hungry":[-25.5,0.5],"sick":[-4.5,2.5],"tired":[-25.5,4],"sulky":[-22.5,-6],"weak":[-20,2],"critical":[-21.5,-1],"wantsPlay":[-42,7.5],"sleeping":[-25,1]}},
    "cat/04": {"face":[34,74],"sweat":{"leftInner":9.625,"rightInner":51.125,"centerY":41.125},"marks":{"happy":[-28,8],"strained":[-28.5,33.5],"hungry":[-38.5,5.5],"sick":[-37.5,0],"tired":[-38,8],"sulky":[-36,0],"weak":[-36.5,6.5],"critical":[-28,7],"wantsPlay":[-54,15],"sleeping":[-37,5]}},
    "cat/05": {"face":[39,55],"sweat":{"leftInner":15.1875,"rightInner":88.6875,"centerY":44.6875},"marks":{"happy":[-26.5,-10],"strained":[-24,18],"hungry":[-33,-12],"sick":[-34,-13.5],"tired":[-36.5,-9.5],"sulky":[-34.5,-18.5],"weak":[-25.5,-8],"critical":[-26.5,-11.5],"wantsPlay":[-50,-3.5],"sleeping":[-35.5,-15]}},
    "cat/06": {"face":[42,52],"sweat":{"leftInner":14.625,"rightInner":66.625,"centerY":23.75},"marks":{"happy":[-30.5,-24],"strained":[-23.5,15],"hungry":[-30.5,-15.5],"sick":[-31.5,-16.5],"tired":[-30.5,-12.5],"sulky":[-27.5,-23.5],"weak":[-28.5,-15.5],"critical":[-26.5,-18],"wantsPlay":[-47.5,-9.5],"sleeping":[-29.5,-16]}},
    "cat/07": {"face":[48,54],"sweat":{"leftInner":16.5,"rightInner":61.5,"centerY":43.875},"marks":{"happy":[-10,-5.5],"strained":[-22.5,15],"hungry":[-6,10.5],"sick":[-26.5,-16],"tired":[-7.5,11.5],"sulky":[-23,-21],"weak":[-0.5,12.5],"critical":[-18,-14],"wantsPlay":[-42.5,-2.5],"sleeping":[-2.5,13]}},
    "cat/08": {"face":[48,66],"sweat":{"leftInner":13,"rightInner":88.5,"centerY":53.125},"marks":{"happy":[-5,-5.5],"strained":[-26.5,23.5],"hungry":[-24.5,-6.5],"sick":[-20.5,-10],"tired":[-23.5,-5],"sulky":[-16.5,-15.5],"weak":[-18,-8],"critical":[-19.5,-12],"wantsPlay":[-42.5,6],"sleeping":[-23.5,-6.5]}},
    "dog/01": {"face":[52,108],"sweat":{"leftInner":26.75,"rightInner":77.25,"centerY":87.75},"marks":{"happy":[-26,32],"strained":[-2,50],"hungry":[-26.5,30],"sick":[-22,34.5],"tired":[-25.5,32.5],"sulky":[-21.5,28.5],"weak":[-23.5,39],"critical":[-21,34.5],"wantsPlay":[-39.5,48],"sleeping":[-26,31]}},
    "dog/02": {"face":[63,79],"sweat":{"leftInner":24.1875,"rightInner":79.6875,"centerY":64.1875},"marks":{"happy":[-2.5,9.5],"strained":[7,8.5],"hungry":[-12,2.5],"sick":[-10,4.5],"tired":[-11,4],"sulky":[-6.5,-0.5],"weak":[-5,10],"critical":[-6,6],"wantsPlay":[-30.5,16.5],"sleeping":[-10.5,2.5]}},
    "dog/03": {"face":[46,73],"sweat":{"leftInner":18.875,"rightInner":84.875,"centerY":59.3125},"marks":{"happy":[-7.5,0.5],"strained":[-20.5,32],"hungry":[-29,-5],"sick":[-26.5,-4.5],"tired":[-28.5,-2],"sulky":[-23,-9.5],"weak":[-24,-2.5],"critical":[-21.5,-5.5],"wantsPlay":[-44.5,8.5],"sleeping":[-28.5,-4]}},
    "dog/04": {"face":[46,76],"sweat":{"leftInner":22.875,"rightInner":39.375,"centerY":16.75},"marks":{"happy":[-18,-4.5],"strained":[-18.5,32],"hungry":[-28,-5],"sick":[-6,-21],"tired":[-29,2],"sulky":[-26,-11.5],"weak":[-24,0.5],"critical":[-25.5,-5],"wantsPlay":[-44.5,4.5],"sleeping":[-27,-5.5]}},
    "dog/05": {"face":[39,53],"sweat":{"leftInner":13.6875,"rightInner":52.6875,"centerY":35.0625},"marks":{"happy":[-27.5,-16.5],"strained":[-26.5,15.5],"hungry":[-16.5,7],"sick":[-14.5,-10],"tired":[-20,12.5],"sulky":[-33,-26],"weak":[-10,0.5],"critical":[-24,-18],"wantsPlay":[-50,-4.5],"sleeping":[-14,13.5]}},
    "dog/06": {"face":[34,53],"sweat":{"leftInner":14.625,"rightInner":52.625,"centerY":24.5625},"marks":{"happy":[-26,-18],"strained":[-26,17],"hungry":[-36,-17.5],"sick":[-40.5,-20],"tired":[-39,-15],"sulky":[-37,-26.5],"weak":[-37.5,-19],"critical":[-36,-21.5],"wantsPlay":[-54,-9.5],"sleeping":[-34,-19.5]}},
    "dog/07": {"face":[45,66],"sweat":{"leftInner":19.0625,"rightInner":69.0625,"centerY":53.125},"marks":{"happy":[-15,1.5],"strained":[-21.5,26],"hungry":[-29.5,-11.5],"sick":[-28.5,-7],"tired":[-25,-7],"sulky":[-24.5,-13.5],"weak":[-20,0],"critical":[-24,-6.5],"wantsPlay":[-45,-4.5],"sleeping":[-28.5,-12]}},
    "dog/08": {"face":[45,73],"sweat":{"leftInner":15.0625,"rightInner":77.0625,"centerY":59.3125},"marks":{"happy":[-12.5,5],"strained":[-28,29.5],"hungry":[-28.5,-9],"sick":[-23.5,-2.5],"tired":[-23.5,-4.5],"sulky":[-23.5,-10.5],"weak":[-18.5,3.5],"critical":[-19,-2],"wantsPlay":[-45,7],"sleeping":[-28,-8]}},
    "man/01": {"face":[65,91],"sweat":{"leftInner":32.3125,"rightInner":72.3125,"centerY":73.9375},"marks":{"happy":[-9,24.5],"strained":[3,34],"hungry":[8,41.5],"sick":[1,27],"tired":[5.5,42],"sulky":[1,15],"weak":[-4,26.5],"critical":[14,39],"wantsPlay":[-29,28.5],"sleeping":[10.5,43.5]}},
    "man/02": {"face":[65,67],"sweat":{"leftInner":29.3125,"rightInner":78.3125,"centerY":54.4375},"marks":{"happy":[-3.5,3],"strained":[0.5,12],"hungry":[11.5,20.5],"sick":[5.5,8],"tired":[9.5,21],"sulky":[19.5,11],"weak":[12,20],"critical":[18,18],"wantsPlay":[-29,6.5],"sleeping":[14,22.5]}},
    "man/03": {"face":[65,60],"sweat":{"leftInner":28.3125,"rightInner":74.8125,"centerY":48.75},"marks":{"happy":[-3.5,-3],"strained":[1.5,2.5],"hungry":[11,15],"sick":[5,2.5],"tired":[8.5,15.5],"sulky":[18.5,10],"weak":[11,18],"critical":[17,17],"wantsPlay":[-29,0],"sleeping":[13,17.5]}},
    "man/04": {"face":[65,46],"sweat":{"leftInner":28.3125,"rightInner":74.8125,"centerY":37.375},"marks":{"happy":[-3,-10.5],"strained":[-6.5,6],"hungry":[11,3.5],"sick":[1.5,-10.5],"tired":[8.5,4.5],"sulky":[11,-15],"weak":[4.5,-4.5],"critical":[10,-8],"wantsPlay":[-29,-8],"sleeping":[13,6]}},
    "man/05": {"face":[65,45],"sweat":{"leftInner":28.3125,"rightInner":75.8125,"centerY":36.5625},"marks":{"happy":[-3.5,-10.5],"strained":[1,-5.5],"hungry":[11.5,2.5],"sick":[-1,-13.5],"tired":[9.5,3],"sulky":[-8.5,-29],"weak":[2.5,-8],"critical":[7.5,-11.5],"wantsPlay":[-29,-8.5],"sleeping":[14,4.5]}},
    "man/06": {"face":[65,44],"sweat":{"leftInner":27.3125,"rightInner":76.8125,"centerY":35.75},"marks":{"happy":[-5,-14.5],"strained":[5.5,-10.5],"hungry":[13,1],"sick":[-0.5,-15],"tired":[10.5,2],"sulky":[-8.5,-30],"weak":[2.5,-9],"critical":[7.5,-12.5],"wantsPlay":[-29,-9.5],"sleeping":[15,3.5]}},
    "man/07": {"face":[65,45],"sweat":{"leftInner":27.3125,"rightInner":75.8125,"centerY":36.5625},"marks":{"happy":[-5.5,-13],"strained":[1,-5.5],"hungry":[12,2.5],"sick":[4.5,-9],"tired":[8.5,0],"sulky":[-5,-27.5],"weak":[3,-8.5],"critical":[7.5,-12],"wantsPlay":[-29,-8],"sleeping":[14,4.5]}},
    "man/08": {"face":[64,48],"sweat":{"leftInner":30,"rightInner":73,"centerY":39},"marks":{"happy":[-3,-5.5],"strained":[2,-1],"hungry":[9,5.5],"sick":[0,-8],"tired":[6,6.5],"sulky":[-10.5,-23.5],"weak":[6.5,3],"critical":[5.5,-8],"wantsPlay":[-29.5,-4],"sleeping":[11.5,7.5]}},
    "woman/01": {"face":[65,90],"sweat":{"leftInner":30.8125,"rightInner":72.3125,"centerY":73.125},"marks":{"happy":[-3,29.5],"strained":[3.5,34],"hungry":[8.5,40.5],"sick":[0.5,26.5],"tired":[6,41],"sulky":[16.5,35],"weak":[6.5,37.5],"critical":[6,26.5],"wantsPlay":[-29,28.5],"sleeping":[10.5,42.5]}},
    "woman/02": {"face":[66,64],"sweat":{"leftInner":23.125,"rightInner":80.625,"centerY":52},"marks":{"happy":[-1,3.5],"strained":[5.5,10],"hungry":[1,-2.5],"sick":[-1,2.5],"tired":[-3.5,-1.5],"sulky":[8,-2.5],"weak":[-0.5,6.5],"critical":[4.5,2.5],"wantsPlay":[-28,4.5],"sleeping":[2.5,-2]}},
    "woman/03": {"face":[64,61],"sweat":{"leftInner":27,"rightInner":77,"centerY":49.5625},"marks":{"happy":[8,13],"strained":[-2.5,5],"hungry":[11,15.5],"sick":[5,3],"tired":[8.5,16.5],"sulky":[17,7],"weak":[9.5,15.5],"critical":[15.5,13.5],"wantsPlay":[-29.5,-3],"sleeping":[13,17.5]}},
    "woman/04": {"face":[66,59],"sweat":{"leftInner":26.625,"rightInner":76.625,"centerY":47.9375},"marks":{"happy":[-2.5,-4],"strained":[-8,19],"hungry":[9.5,15],"sick":[5.5,2],"tired":[7.5,15.5],"sulky":[18.5,9.5],"weak":[11,14],"critical":[18,16],"wantsPlay":[-28,-2.5],"sleeping":[12.5,17]}},
    "woman/05": {"face":[65,54],"sweat":{"leftInner":26.8125,"rightInner":76.8125,"centerY":43.875},"marks":{"happy":[0,-6.5],"strained":[-2.5,3.5],"hungry":[13,9.5],"sick":[6.5,-3],"tired":[10.5,10],"sulky":[21,4.5],"weak":[9.5,2.5],"critical":[18.5,7],"wantsPlay":[-29,-5.5],"sleeping":[15,11.5]}},
    "woman/06": {"face":[65,54],"sweat":{"leftInner":23.3125,"rightInner":79.8125,"centerY":43.875},"marks":{"happy":[-1,-6],"strained":[-8,12],"hungry":[12,9.5],"sick":[6,-3],"tired":[9.5,10.5],"sulky":[20,5],"weak":[12,9],"critical":[18,7.5],"wantsPlay":[-29,-5.5],"sleeping":[14,12]}},
    "woman/07": {"face":[64,53],"sweat":{"leftInner":27,"rightInner":76.5,"centerY":43.0625},"marks":{"happy":[-0.5,-8],"strained":[-3,3],"hungry":[13,8],"sick":[4,-8],"tired":[10.5,9],"sulky":[21,3.5],"weak":[13.5,11.5],"critical":[19.5,10],"wantsPlay":[-29.5,-6.5],"sleeping":[15,10.5]}},
    "woman/08": {"face":[65,55],"sweat":{"leftInner":29.8125,"rightInner":74.3125,"centerY":44.6875},"marks":{"happy":[-3,1],"strained":[-4.5,10.5],"hungry":[10.5,11],"sick":[0.5,-2],"tired":[8,12],"sulky":[-6,-17],"weak":[-1.5,-0.5],"critical":[8,1],"wantsPlay":[-29,-2],"sleeping":[12.5,13.5]}}
  };
  // END GENERATED FACE PLACEMENT
  const HUMAN_LINES = ['man','woman'];
  const STAGE_ASSETS = Object.freeze({
    ...Object.fromEntries(HUMAN_LINES.flatMap(line => Array.from({length:8},(_,index) => {
      const stage=String(index+1).padStart(2,'0');
      return [`assets/characters/${line}/${stage}.png`,Object.freeze(Object.fromEntries(
        Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/${line}/${stage}-${name}.png`])
      ))];
    }))),
    'assets/characters/dog/01.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/01-${name}.png`])
    )),
    'assets/characters/dog/02.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/02-${name}.png`])
    )),
    'assets/characters/dog/08.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/08-${name}.png`])
    )),
    'assets/characters/dog/04.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/04-${name}.png`])
    )),
    'assets/characters/dog/05.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/05-${name}.png`])
    )),
    'assets/characters/dog/07.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/07-${name}.png`])
    )),
    'assets/characters/dog/03.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/03-${name}.png`])
    )),
    'assets/characters/dog/06.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/dog/06-${name}.png`])
    )),
    [BASE_ASSET]: VARIANT_ASSETS,
    'assets/characters/cat/03.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/03-${name}.png`])
    )),
    'assets/characters/cat/04.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/04-${name}.png`])
    )),
    'assets/characters/cat/05.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/05-${name}.png`])
    )),
    'assets/characters/cat/07.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/07-${name}.png`])
    )),
    'assets/characters/cat/08.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/08-${name}.png`])
    )),
    'assets/characters/cat/02.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/02-${name}.png`])
    )),
    'assets/characters/cat/01.png': Object.freeze(Object.fromEntries(
      Object.keys(VARIANT_ASSETS).map(name => [name,`assets/characters/expressions/cat/01-${name}.png`])
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
    const human = /^assets\/characters\/(man|woman)\/(0[1-8])\.png$/.exec(baseAsset);
    const placement = MARK_PLACEMENT[baseAsset.slice(18,-4)];
    const offset = placement.marks[expression].join(' ');
    // Dogs think of a food bowl; keep the shared yellow palette and thought bubbles.
    const artwork = ['assets/characters/dog/01.png','assets/characters/dog/02.png','assets/characters/dog/03.png','assets/characters/dog/04.png','assets/characters/dog/05.png','assets/characters/dog/06.png','assets/characters/dog/07.png','assets/characters/dog/08.png'].includes(baseAsset) && expression === 'hungry'
      ? '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-thought" cx="71" cy="37" r="2.5"/><circle class="accent-thought" cx="77" cy="29" r="4"/><path class="accent-food" d="M79 18h18l-3 7H82z"/><circle class="accent-food" cx="84" cy="16" r="2"/><circle class="accent-food" cx="91" cy="16" r="2"/></svg>'
      : human && expression === 'hungry'
        ? '<svg viewBox="0 0 104 104" focusable="false"><circle class="accent-thought" cx="71" cy="37" r="2.5"/><circle class="accent-thought" cx="77" cy="29" r="4"/><path class="accent-thought accent-rice" d="M80 19c0-4 4-7 8-7s8 3 8 7z"/><path class="accent-food" d="M79 19h18l-3 8H82z"/></svg>'
        : ACCENTS[expression];
    const accent = artwork.replace(/(<svg[^>]*>)/, `$1<g transform="translate(${offset})">`).replace('</svg>', '</g></svg>');
    return `<span class="pet-expression-accent pet-expression-accent--${expression}" aria-hidden="true">${accent}</span>`;
  }

  function sweatFor(baseAsset, width, height, artOffsetY=0) {
    const placement=MARK_PLACEMENT[typeof baseAsset==='string' ? baseAsset.slice(18,-4) : ''];
    if(!placement || !Object.hasOwn(STAGE_ASSETS,baseAsset)) return null;
    const dropWidth=Math.max(6,Math.min(11,width*.1));
    const dropHeight=Math.max(9,Math.min(16,height*.15));
    const travel=Math.min(7,height*.07);
    const spread=(dropWidth*Math.cos(Math.PI/10)+dropHeight*Math.sin(Math.PI/10)-dropWidth)/2+2;
    return {
      left:width*placement.sweat.leftInner/104-dropWidth-spread,
      right:width-width*placement.sweat.rightInner/104-dropWidth-spread,
      top:height*placement.sweat.centerY/104+artOffsetY-dropHeight/2-travel/2,
      travel,
    };
  }

  function reactionFor(event) {
    return Object.hasOwn(REACTIONS,event) ? REACTIONS[event] : null;
  }

  return Object.freeze({ resolve, assetFor, accentFor, sweatFor, reactionFor });
});
