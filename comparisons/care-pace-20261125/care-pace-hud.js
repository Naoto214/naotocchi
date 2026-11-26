/* お世話の頻度 監査(2026-11-25)の 試遊ページの 計測パネル。
 * ゲームには さわらず、セーブ(案ごとの localStorage)と ボタンの タップだけを 見る。
 * ?hud=0 で かくす。親ページ(index.html)には postMessage で 数字を おくる。 */
(function () {
  'use strict';
  var api = window.__carePace;
  if (!api) return;
  var params = new URLSearchParams(location.search);
  var CARE = { feedBtn: 'ごはん', cleanBtn: 'そうじ', playWithBtn: 'じゃれる', sleepBtn: 'ねる/おきる', medicineBtn: 'くすり', playBtn: 'あそぶ' };
  var taps = []; // {at: ホーム時間(tick), kind}
  var lastAge = null, homeTicks = 0, quietTicks = 0, longestQuiet = 0;
  var notice = (api.plans.PLANS[api.plan] || {}).poopNotice || 2;

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button');
    if (!b || !CARE[b.id] || b.disabled) return;
    taps.push({ at: homeTicks, kind: b.id });
  }, true);

  function readSave() {
    try { return JSON.parse(localStorage.getItem(api.saveKey) || 'null'); } catch (e) { return null; }
  }
  function signals(s) {
    var n = [];
    if (s.hunger <= 50) n.push('おなか');
    if (s.happiness <= 50) n.push('ごきげん');
    if (!s.isSleeping && s.energy <= 50) n.push('げんき');
    if (s.poopCount >= notice) n.push('うんち');
    if (s.isSick) n.push('びょうき');
    return n;
  }
  function fmtMin(ticks) { var m = ticks / 20; return m < 1 ? Math.round(m * 60) + '秒' : m.toFixed(1) + '分'; }

  var box, body, open = true;
  function build() {
    box = document.createElement('div');
    box.id = 'carePaceHud';
    box.style.cssText = 'position:fixed;left:6px;top:calc(6px + env(safe-area-inset-top,0px));z-index:99998;max-width:220px;' +
      'background:rgba(20,28,26,.78);color:#f2f7f4;border-radius:10px;font:11px/1.45 "Hiragino Sans","Noto Sans JP",sans-serif;' +
      'padding:6px 8px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;font-variant-numeric:tabular-nums';
    var head = document.createElement('button');
    head.type = 'button';
    head.style.cssText = 'all:unset;cursor:pointer;font-weight:700;display:block';
    head.textContent = '計測 ' + ((api.plans.PLANS[api.plan] || {}).short || api.plan) + (api.speed !== 1 ? ' ×' + api.speed : '');
    head.addEventListener('click', function () { open = !open; body.style.display = open ? 'block' : 'none'; });
    body = document.createElement('div');
    box.appendChild(head); box.appendChild(body);
    document.body.appendChild(box);
  }

  function update() {
    var s = readSave();
    if (!s) return;
    if (s.stage === 'growing' && lastAge != null && s.ageTicks > lastAge) {
      var d = s.ageTicks - lastAge;
      homeTicks += d;
      if (signals(s).length === 0) { quietTicks += d; longestQuiet = Math.max(longestQuiet, quietTicks); } else quietTicks = 0;
    }
    lastAge = s.ageTicks;
    var recent = taps.filter(function (t) { return homeTicks - t.at < 200; }).length;
    var per10 = homeTicks > 0 ? taps.length / (homeTicks / 200) : 0;
    var sig = s.stage === 'growing' ? signals(s) : [];
    var data = {
      plan: api.plan, homeTicks: homeTicks, taps: taps.length, recent10: recent, per10: per10,
      quietTicks: quietTicks, longestQuiet: longestQuiet, signals: sig, stage: s.stage,
      age: Math.floor((s.ageTicks || 0) / 20), hunger: s.hunger, happiness: s.happiness, energy: s.energy,
      poop: s.poopCount, sick: !!s.isSick, sleeping: !!s.isSleeping, sodachi: s.sodachi,
    };
    try { parent !== window && parent.postMessage({ type: 'care-pace', data: data }, '*'); } catch (e) { /* 親がなくてもよい */ }
    if (!body) return;
    body.innerHTML = '';
    var rows = [
      ['ホームの時間', fmtMin(homeTicks) + '(' + data.age + 'さい)'],
      ['お世話タップ', taps.length + '回 / 直近10分 ' + recent + '回'],
      ['サインなし', '今 ' + fmtMin(quietTicks) + ' / 最長 ' + fmtMin(longestQuiet)],
      ['いまのサイン', sig.length ? sig.join('・') : 'なし'],
      ['おなか/ごきげん/げんき', Math.round(s.hunger) + ' / ' + Math.round(s.happiness) + ' / ' + Math.round(s.energy)],
      ['うんち/そだち', s.poopCount + 'こ / ' + s.sodachi],
    ];
    rows.forEach(function (r) {
      var line = document.createElement('div');
      var k = document.createElement('span'); k.style.opacity = '.75'; k.textContent = r[0] + ' ';
      var v = document.createElement('span'); v.textContent = r[1];
      line.appendChild(k); line.appendChild(v); body.appendChild(line);
    });
  }

  function start() {
    if (params.get('hud') !== '0') build();
    update();
    setInterval(update, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'care-pace-reset') return;
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(api.saveKey) === 0) localStorage.removeItem(k); }); } catch (err) { /* noop */ }
    location.reload();
  });
})();
