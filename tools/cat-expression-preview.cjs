#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname,'..');
const SAVE_KEY = 'naotocchi-save-v1';
const PRESETS = Object.freeze({
  normal: Object.freeze({}),
  hungry: Object.freeze({hunger:40}),
  sick: Object.freeze({isSick:true,sicknessType:'かぜ'}),
  tired: Object.freeze({energy:40}),
  sulky: Object.freeze({happiness:40,affectionStreak:3}),
  weak: Object.freeze({deathMeter:60}),
  critical: Object.freeze({deathMeter:80}),
  wantsPlay: Object.freeze({happiness:40}),
  sleeping: Object.freeze({isSleeping:true}),
});

const FORMS = Object.freeze({adult:25,kitten:7,otemba:12,young:16});

function runtimeFreshCat(form='adult') {
  const previousDirectory=process.cwd();
  try {
    process.chdir(ROOT);
    const {harness}=require('../tests/helpers/runtime-harness.cjs');
    const runtime=harness();
    const state=runtime.api.freshState();
    Object.assign(state,{
      stage:'growing',speciesLine:'cat',stageIndex:runtime.api.stageForAge(FORMS[form]),ageTicks:FORMS[form]*20,
      hunger:80,happiness:80,energy:80,health:80,isSick:false,sicknessType:null,
      isSleeping:false,deathMeter:0,dying:false,affectionStreak:0,
      transformOptions:null,companions:[],partner:null,
      achievementsUnlocked:['age-10','age-25'],
    });
    return state;
  } finally {
    process.chdir(previousDirectory);
  }
}

function scriptJson(value) {
  return JSON.stringify(value).replace(/<\/script/gi,'<\\/script');
}

function attribute(value) {
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function buildBootstrap(defaultPreset,defaultForm) {
  const bases=Object.fromEntries(Object.keys(FORMS).map(form=>[form,runtimeFreshCat(form)]));
  return `<script id="cat-expression-preview-bootstrap">
(() => {
  'use strict';
  const allowedPresets=${scriptJson(Object.keys(PRESETS))};
  const requestedPreset=window.frameElement?.dataset.preset
    || new URLSearchParams(window.parent.location.search).get('preset');
  const preset=allowedPresets.includes(requestedPreset) ? requestedPreset : ${scriptJson(defaultPreset)};
  const forms=${scriptJson(bases)};
  const requestedForm=window.frameElement?.dataset.form || new URLSearchParams(window.parent.location.search).get('form');
  const form=Object.hasOwn(forms,requestedForm) ? requestedForm : ${scriptJson(defaultForm)};
  const state=Object.assign(forms[form],${scriptJson(PRESETS)}[preset]);
  const values=new Map([[${scriptJson(SAVE_KEY)},JSON.stringify(state)]]);
  const memoryStorage={
    getItem(key) { key=String(key); return values.has(key) ? values.get(key) : null; },
    setItem(key,value) { values.set(String(key),String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); },
    key(index) { return [...values.keys()][index] ?? null; },
    get length() { return values.size; },
  };
  Object.defineProperty(window,'localStorage',{
    configurable:true,enumerable:true,value:memoryStorage,writable:false,
  });
})();
</script>`;
}

function gameDocument(defaultPreset,defaultForm) {
  let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  html=html.replace(/<head>/i,'<head>\n  <base href="./">');
  const bootstrap=buildBootstrap(defaultPreset,defaultForm);
  const firstScript=html.search(/<script\b/i);
  if (firstScript < 0) throw new Error('index.html has no game scripts');
  return html.slice(0,firstScript)+bootstrap+'\n  '+html.slice(firstScript);
}

function buildPreview({preset='hungry',form='adult'}={}) {
  if (!Object.hasOwn(FORMS,form)) throw new TypeError(`Unknown preview form: ${form}`);
  if (!Object.hasOwn(PRESETS,preset)) throw new TypeError(`Unknown preview preset: ${preset}`);
  const links=Object.keys(PRESETS).map(key=>
    `<a href="?preset=${key}">${({
      normal:'通常',hungry:'空腹',sick:'病気',tired:'疲労',sulky:'不機嫌',weak:'いのち低下',
      critical:'危険',wantsPlay:'かまって',sleeping:'睡眠',
    })[key]}</a>`).join('');
  const child=attribute(gameDocument(preset,form));
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>猫の表情テスト</title>
  <style>
    *{box-sizing:border-box}
    html,body{width:100%;height:100%;height:100dvh;margin:0;overflow:hidden}
    body{display:grid;grid-template-rows:auto minmax(0,1fr);background:#f7f2e9;color:#312a24;font-family:system-ui,sans-serif}
    header{position:relative;z-index:1;padding:max(.45rem,env(safe-area-inset-top)) max(.65rem,env(safe-area-inset-right)) .45rem max(.65rem,env(safe-area-inset-left));background:#fffaf1;border-bottom:1px solid #d9cbb8;box-shadow:0 1px 5px #3c2d1e24}
    .banner{display:flex;align-items:baseline;gap:.55rem;min-width:0}
    h1{font-size:1rem;line-height:1.2;margin:0;white-space:nowrap}
    p{font-size:.75rem;line-height:1.2;margin:0;color:#725f4e;white-space:nowrap}
    nav{display:flex;gap:.35rem;margin-top:.4rem;overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:.1rem}
    select{flex:0 0 auto;font:inherit;border:1px solid #9b7a58;border-radius:999px;background:#fff;color:#4b3625;font-size:16px;padding:.2rem}
    a{flex:0 0 auto;padding:.3rem .62rem;border:1px solid #9b7a58;border-radius:999px;background:#fff;color:#4b3625;font-size:.78rem;font-weight:700;text-decoration:none}
    a:focus-visible,select:focus-visible{outline:3px solid #e49942;outline-offset:1px}
    iframe{display:block;width:100%;height:100%;min-height:0;border:0;background:#fff}
    @media(max-width:390px){header{padding-bottom:.35rem}.banner{justify-content:space-between;gap:.25rem}h1{font-size:.9rem}p{font-size:.67rem}nav{margin-top:.3rem}a{padding:.25rem .52rem;font-size:.72rem}}
  </style>
</head>
<body>
  <header data-preview-controls>
    <div class="banner"><h1>猫の表情テスト</h1><p>このページでは保存しません</p></div>
    <nav aria-label="猫の状態"><select data-preview-form aria-label="ねこの姿"><option value="adult" ${form==='adult'?'selected':''}>大人のねこ</option><option value="kitten" ${form==='kitten'?'selected':''}>こねこ</option><option value="otemba" ${form==='otemba'?'selected':''}>おてんばねこ</option><option value="young" ${form==='young'?'selected':''}>若いねこ</option></select>${links}</nav>
  </header>
  <iframe title="なおとっち 猫の表情プレビュー" srcdoc="${child}"></iframe>
  <script id="cat-expression-preview-controls">
  (() => {
    const frame=document.querySelector('iframe');
    const nav=document.querySelector('nav');
    const game=frame.srcdoc;
    const allowed=${scriptJson(Object.keys(PRESETS))};
    document.querySelector('[data-preview-form]')?.addEventListener('change',event=>{
      const form=event.target.value;
      if (!['adult','kitten','otemba','young'].includes(form)) return;
      frame.dataset.form=form;
      frame.srcdoc=game;
    });
    nav.addEventListener('click',event => {
      const link=event.target.closest('a');
      if (!link || !nav.contains(link)) return;
      const preset=new URLSearchParams(link.getAttribute('href')).get('preset');
      if (!allowed.includes(preset)) return;
      event.preventDefault();
      frame.dataset.preset=preset;
      frame.srcdoc=game;
    });
  })();
  </script>
</body>
</html>
`;
}

if (require.main === module) {
  const [outputPath,preset='hungry',form='adult']=process.argv.slice(2);
  if (!outputPath) {
    process.stderr.write('Usage: node tools/cat-expression-preview.cjs <output.html> [preset] [adult|kitten|otemba|young]\n');
    process.exitCode=1;
  } else {
    fs.writeFileSync(path.resolve(outputPath),buildPreview({preset,form}));
    process.stdout.write(`${path.resolve(outputPath)}\n`);
  }
}

module.exports={buildPreview};
