(() => {
  const edition = {main:'現行 main', before:'今回の修正前', fixed:'今回の修正候補'}['__EDITION__'];
  const requested = new URLSearchParams(location.search).get('scene');
  const labels = {forest:'森28体', mountain:'山10体', jungle:'ジャングル10体'};
  const scene = Object.hasOwn(labels, requested) ? requested : 'forest';
  const panel = document.createElement('details');
  panel.id = 'comparison-panel';
  panel.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);left:50%;transform:translateX(-50%);z-index:2147483647;width:min(280px,calc(100vw - 8px));font-variant-numeric:tabular-nums;white-space:nowrap;background:#fffef4;color:#18372c;border:1px solid #566e60;border-radius:5px;font:13px/1.5 system-ui';
  panel.innerHTML = '<summary style="padding:3px 8px;cursor:pointer"></summary><div style="padding:4px 10px 8px"><div id="compare-screen"></div>主人公から見たクマの足元（画面px）<div id="initial-pair"></div><div id="current-pair"></div><div id="aged-pair"></div><a href="../#compare">比較条件の選択に戻る</a></div>';
  panel.querySelector('a').href = '../?scene=' + scene + '#compare';
  document.body.append(panel);
  let active = 0;
  let last = performance.now();
  let aged;
  function position(p) {
    if (!p) return '計測待ち';
    const side = p.dx >= 0 ? '右' : '左', depth = p.dy >= 0 ? '下' : '上';
    return side + Math.abs(p.dx).toFixed(1) + '・' + depth + Math.abs(p.dy).toFixed(1);
  }
  function modelTime(p) {
    return p ? '（モデル ' + p.clock.toFixed(1) + '秒）' : '';
  }
  function update() {
    const now = performance.now();
    const samples = window.comparisonFeet;
    // A paused native model can finish loading its backdrop between steps.
    if (samples && !samples.initial) samples.initial = samples.current();
    if (samples?.initial && !document.hidden) active += now - last;
    last = now;
    const sec = Math.floor(active / 1000);
    if (!aged && sec >= 180) aged = samples.current();
    const time = samples?.initial ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') : '準備中';
    panel.querySelector('summary').textContent = edition + ' __SHA__ · ' + labels[scene] + ' · ' + time;
    if (panel.open) {
      panel.querySelector('#compare-screen').textContent = '画面 ' + innerWidth + ' × ' + innerHeight + ' px・昼／晴れ';
      panel.querySelector('#initial-pair').textContent = '初回表示　' + position(samples?.initial) + modelTime(samples?.initial);
      panel.querySelector('#current-pair').textContent = '現在　　' + position(samples?.current());
      panel.querySelector('#aged-pair').textContent = '3分後　 ' + position(aged) + modelTime(aged);
    }
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  panel.addEventListener('toggle', update);
  update();
  setInterval(update, 500);
})();
