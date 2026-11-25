/* お世話の頻度 監査(2026-11-25)の 試遊ページ用ローダー。
 *
 * play.html は index.html の写し(tools/care-pace/build-play.cjs が生成)で、
 * care-status.js と script.js の <script> だけが このローダーの呼び出しに 置きかわっている。
 * ローダーは 本物の ファイルを 読み、tools/care-pace/plans.cjs の 案の差し替えを当ててから実行する。
 *
 *   play.html?plan=B        … B案で遊ぶ(current / A / B / C)
 *   play.html?plan=B&speed=4 … 時間を4倍にする(1生涯100分 → 25分。確認用)
 *
 * セーブは案ごとに別(naotocchi-carepace-<案>-v1)。本番の セーブ(naotocchi-save-v1)には書かない。
 */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var plan = params.get('plan') || 'current';
  if (!/^(current|A|B|C)$/.test(plan)) plan = 'current';
  var speed = Number(params.get('speed')) || 1;
  if (!(speed >= 1 && speed <= 10)) speed = 1;

  function fetchText(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // 本物の <script> と同じく、順番どおりに同期で実行する
    xhr.send(null);
    if (xhr.status !== 200 && xhr.status !== 0) throw new Error('読みこめません: ' + url + ' (' + xhr.status + ')');
    return xhr.responseText;
  }
  function run(source, name) {
    var el = document.createElement('script');
    el.textContent = source + '\n//# sourceURL=' + name;
    (document.currentScript && document.currentScript.parentNode || document.head).appendChild(el);
  }

  var api = window.__carePace;
  if (!api) {
    var mod = { exports: {} };
    new Function('module', 'exports', fetchText('tools/care-pace/plans.cjs'))(mod, mod.exports);
    api = window.__carePace = { plan: plan, speed: speed, plans: mod.exports, saveKey: 'naotocchi-carepace-' + plan + '-v1', errors: [] };
  }

  var which = document.currentScript && document.currentScript.dataset.file;
  try {
    if (which === 'care-status.js') {
      var cs = fetchText('care-status.js');
      run(api.plans.applyPatches(cs, api.plans.careStatusPatches(plan), plan), 'care-status.js?carepace=' + plan);
    } else if (which === 'script.js') {
      var src = fetchText('script.js');
      src = api.plans.applyPatches(src, api.plans.scriptPatches(plan), plan);
      // 案ごとに セーブを わける(本番の セーブには さわらない)
      src = src.split("'naotocchi-save-v1").join("'" + api.saveKey);
      if (speed !== 1) {
        var tick = 'const TICK_MS = 3000;';
        if (src.indexOf(tick) < 0) throw new Error('TICK_MS が見つかりません');
        src = src.replace(tick, 'const TICK_MS = ' + Math.round(3000 / speed) + ';');
      }
      run(src, 'script.js?carepace=' + plan);
    }
  } catch (e) {
    api.errors.push(String(e && e.message || e));
    console.error(e);
    document.addEventListener('DOMContentLoaded', function () {
      var box = document.createElement('div');
      box.style.cssText = 'position:fixed;inset:auto 8px 8px 8px;z-index:99999;background:#7a1f1f;color:#fff;padding:10px;border-radius:10px;font:13px/1.5 sans-serif';
      box.textContent = '試遊ページの準備に失敗しました: ' + api.errors.join(' / ');
      document.body.appendChild(box);
    });
  }
})();
