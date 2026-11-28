// Comparison only: a small switcher above the real home. Every change reloads the throwaway home.
(() => {
  const s = window.NaotocchiEnvCompare;
  const labels = {
    fx:{A:'現行の本番', E:'最終統合版'}, count:{1:'1体', 4:'4体', 28:'28体'},
    region:['おうち','もり','かわ','とかい','いなか','やま','ゆきぐに','うみ','ジャングル','さばく','しんかい','ほしぞら','きおくのみずうみ'],
    season:['はる','なつ','あき','ふゆ'], weather:['晴れ','曇り','雨','雪'], time:['朝','昼','夕','夜']
  };
  const panel = document.createElement('details');
  panel.style.cssText = 'position:fixed;left:50%;top:2px;transform:translateX(-50%);z-index:2147483647;background:#fffef5ee;color:#293540;border:1px solid #9a917e;border-radius:10px;padding:4px 8px;font:12px/1.6 sans-serif;max-width:190px';
  const summary = document.createElement('summary');
  panel.append(summary);
  const meter = document.createElement('div');
  const go = () => { location.hash = '#g' + [s.fx, s.count, s.lists.region.indexOf(s.region), s.lists.season.indexOf(s.season), s.lists.weather.indexOf(s.weather), s.lists.time.indexOf(s.time), s.lists.sway.indexOf(s.sway)].join('-'); location.reload(); };
  function field(key, options) {
    const select = document.createElement('select');
    select.id = 'env-' + key; select.style.cssText = 'display:block;width:100%;margin:3px 0;font:inherit';
    for (const [value, text] of options) { const o = document.createElement('option'); o.value = value; o.textContent = text; select.append(o); }
    select.value = String(s[key]);
    select.onchange = () => { s[key] = key === 'count' ? Number(select.value) : select.value; go(); };
    panel.append(select);
  }
  field('fx', Object.entries(labels.fx));
  if (s.fx === 'E') field('sway', [['tips2','植物：揺れる（B2）'],['still','植物：静止']]);
  field('count', Object.entries(labels.count));
  for (const key of ['region','season','weather','time']) field(key, s.lists[key].map((value, i) => [value, labels[key][i]]));
  // Wind and particle amount can be pinned without reloading; "自動" lets them drift on their own.
  if (s.fx === 'E') {
    const pin = {};
    window.NaotocchiClimate = pin;
    const live = (key, options) => {
      const select = document.createElement('select');
      select.id = 'env-' + key; select.style.cssText = 'display:block;width:100%;margin:3px 0;font:inherit';
      for (const [value, text] of options) { const o = document.createElement('option'); o.value = value; o.textContent = text; select.append(o); }
      select.onchange = () => { if (select.value === '') delete pin[key]; else pin[key] = Number(select.value); };
      panel.append(select);
    };
    // Plant colours by season: C by default in this trial, switchable without reloading.
    window.NaotocchiSeasonTint = {strength:1, far:true, rich:true, subtle:true};
    const tint = document.createElement('select');
    tint.id = 'env-tint'; tint.style.cssText = 'display:block;width:100%;margin:3px 0;font:inherit';
    for (const [value, text] of [['1r','景色：B 遠景まで強化＋花・霜'],['1f','景色：A 現在のD案'],['0','景色：原画の色']]) { const o = document.createElement('option'); o.value = value; o.textContent = text; tint.append(o); }
    const subtle = document.createElement('select');
    subtle.id = 'env-subtle'; subtle.style.cssText = tint.style.cssText;
    for (const [value, text] of [['1','ジャングル等：ごく控えめ'],['','ジャングル等：変えない']]) { const o = document.createElement('option'); o.value = value; o.textContent = text; subtle.append(o); }
    tint.onchange = subtle.onchange = () => { window.NaotocchiSeasonTint = {strength:parseFloat(tint.value), far:/[fr]$/.test(tint.value), rich:tint.value.endsWith('r'), subtle:subtle.value === '1'}; };
    panel.append(tint, subtle);
    live('wind', [['','風：自動で変化'],['0.22','風：無風に近い'],['0.6','風：弱い'],['1','風：普通'],['1.45','風：強い']]);
    // Faces of the one two-layer sky; empty lets it drift by itself.
    const looks = {clear:{cover:.03, bright:1, thick:.6, size:1}, cumulus:{cover:.44, bright:1, thick:1, size:1.35}, thin:{cover:.62, bright:1, thick:.25, size:1.25},
      high:{cover:.92, bright:.95, thick:.55, size:1.25}, broken:{cover:.6, bright:.8, thick:.9, size:1}, white:{cover:1, bright:.62, thick:1, size:1.05},
      bluegrey:{cover:.9, bright:.38, thick:.9, size:1.1}, dark:{cover:1, bright:.05, thick:1, size:1.2}};
    const look = document.createElement('select');
    look.id = 'env-look'; look.style.cssText = 'display:block;width:100%;margin:3px 0;font:inherit';
    for (const [value, text] of [['','空：自動で変化'],['clear','空：快晴'],['cumulus','空：大きな綿雲'],['thin','空：薄く広がる雲'],['high','空：明るい高曇り'],['broken','空：青空の残る雲'],['white','空：厚い白灰色'],['bluegrey','空：青灰色'],['dark','空：厚く暗い雲']]) { const o = document.createElement('option'); o.value = value; o.textContent = text; look.append(o); }
    look.onchange = () => { if (look.value) pin.sky = looks[look.value]; else delete pin.sky; };
    panel.append(look);
    live('density', [['','量：自動で変化'],['0.55','量：小'],['1','量：中'],['1.45','量：大']]);
    live('speed', [['','時間：ふつう'],['12','時間：12倍速']]);
  }
  panel.append(meter);
  const back = document.createElement('button');
  back.type = 'button'; back.textContent = '← 比較ページへ'; back.style.cssText = 'font:inherit;margin-top:4px;width:100%';
  back.onclick = () => { location.href = './#' + 'v' + [s.lists.region.indexOf(s.region), s.lists.season.indexOf(s.season), s.lists.weather.indexOf(s.weather), s.lists.time.indexOf(s.time), 0].join('-'); };
  panel.append(back);
  // Frame pacing as the browser presents it, updated once a second.
  let last = performance.now(), frames = 0, worst = 0, mark = last;
  const tick = now => {
    const gap = now - last; last = now; frames++; worst = Math.max(worst, gap);
    if (now - mark >= 1000) {
      const fps = Math.round(frames * 1000 / (now - mark));
      summary.textContent = `${labels.fx[s.fx]}・${labels.count[s.count]}・${fps}fps`;
      meter.textContent = `最長フレーム ${Math.round(worst)}ms`;
      window.NaotocchiEnvCompare.pace = {fps, worst};
      frames = 0; worst = 0; mark = now;
    }
    requestAnimationFrame(tick);
  };
  summary.textContent = labels.fx[s.fx];
  requestAnimationFrame(tick);
  addEventListener('DOMContentLoaded', () => document.body.append(panel));
  if (document.body) document.body.append(panel);
})();
