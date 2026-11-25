// Comparison only: a small switcher above the real home. Every change reloads the throwaway home.
(() => {
  const s = window.NaotocchiEnvCompare;
  const labels = {
    fx:{A:'A 現行', B:'B 雨雪花葉', C:'C 総合演出', D:'D 最大演出', E:'E 最終候補'}, count:{1:'1体', 4:'4体', 28:'28体'},
    region:['おうち','もり','かわ','とかい','いなか','やま','ゆきぐに','うみ','ジャングル','さばく','しんかい','ほしぞら','きおくのみずうみ'],
    season:['はる','なつ','あき','ふゆ'], weather:['晴れ','曇り','雨','雪'], time:['朝','昼','夕','夜']
  };
  const panel = document.createElement('details');
  panel.style.cssText = 'position:fixed;left:50%;top:2px;transform:translateX(-50%);z-index:2147483647;background:#fffef5ee;color:#293540;border:1px solid #9a917e;border-radius:10px;padding:4px 8px;font:12px/1.6 sans-serif;max-width:190px';
  const summary = document.createElement('summary');
  panel.append(summary);
  const meter = document.createElement('div');
  const go = () => { location.hash = '#g' + [s.fx, s.count, s.lists.region.indexOf(s.region), s.lists.season.indexOf(s.season), s.lists.weather.indexOf(s.weather), s.lists.time.indexOf(s.time)].join('-'); location.reload(); };
  function field(key, options) {
    const select = document.createElement('select');
    select.id = 'env-' + key; select.style.cssText = 'display:block;width:100%;margin:3px 0;font:inherit';
    for (const [value, text] of options) { const o = document.createElement('option'); o.value = value; o.textContent = text; select.append(o); }
    select.value = String(s[key]);
    select.onchange = () => { s[key] = key === 'count' ? Number(select.value) : select.value; go(); };
    panel.append(select);
  }
  field('fx', Object.entries(labels.fx));
  field('count', Object.entries(labels.count));
  for (const key of ['region','season','weather','time']) field(key, s.lists[key].map((value, i) => [value, labels[key][i]]));
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
