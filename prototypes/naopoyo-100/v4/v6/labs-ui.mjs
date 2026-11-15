import {LabPlayback, createLab} from './lab-playback.mjs';
import {searchLab} from './lab-session.mjs';
import {renderLab} from './lab-render.mjs';
import {TouchController} from '../../interaction.mjs';
import {loadArt} from '../../render.mjs';
import {loadCharacterArt} from './character-art.mjs';
import {speciesRegistry, speciesLabel} from './characters.mjs';
const $ = id => document.getElementById(id), canvas = $('board');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const play = new LabPlayback(createLab('F1'));
let ready = false, solution = null, solutionIndex = 0, last = performance.now();
const descriptions = {
  D1: '隣の土をタップ／ドラッグすると、掘ってそのマスへ進む1手。犬d（段階2）だけの実験役です。土を支えに残す順序が大切です。',
  D2: '隣の土への操作は掘る1手。その後、開いたマスへもう一度操作すると移動する1手です。長く押しただけで2手にはなりません。D1と同じ初期盤面です。',
  F1: '隣のマスへ1マスずつ飛び、空中で止まれる案。気流に入ると上へ1マス。地上の仲間と協力して二人の出口を目指します。',
  F2: '隣のマスで方向を指定し、空間を直線で渡って次の足場へ着地する案。経路全体と風の先を検査します。着地できなければ移動しません。'
};
const touch = new TouchController(canvas, {
  state: () => play.state, presentation: play.presentation,
  enabled: () => ready && play.session.state.actors.length > 0,
  begin: () => play.begin(), end: () => play.end(), render: () => draw(),
  step: (id, dx, dy) => {
    const result = play.step(id, dx, dy, reduced());
    invalidate(); announce(result); return result;
  }
});
function invalidate() {
  solution = null; solutionIndex = 0;
  $('example').disabled = true; $('result').textContent = '';
}
function announce(result) {
  $('message').textContent = result.ok ? (play.session.state.actors.length ? '操作しました' : 'みんな、星にとどいた！') : result.reason;
}
function draw() {
  if (!ready) return;
  play.presentation.sync(play.state); play.presentation.focus = touch.input.selected;
  const frame = play.presentation.frame(performance.now(), reduced());
  const held = touch.input.down && frame.state.actors.find(a => a.id === touch.input.gestureActor);
  renderLab(canvas, play.session.state, {...frame, selected: held ? [held.x, held.y] : null});
  $('moves').textContent = `${play.session.variant} · ${play.session.actions.length}手 · ${play.session.state.actors.length ? '実験中' : '全員到達'}`;
  $('actor').innerHTML = '<option value="">盤面で仲間を選択</option>' + play.session.state.actors.map(a => `<option value="${a.id}">${a.id}：${speciesLabel(a.species)} ${a.level}段階</option>`).join('');
  $('actor').value = touch.input.selected || '';
  $('undo').disabled = !play.gestures.groups.length;
}
function updateVariant() {
  const variant = play.session.variant;
  $('variant').value = variant; $('description').textContent = descriptions[variant];
  $('roles').textContent = play.session.kind === 'flight'
    ? 'f（上の出口）：飛行役。g（下の出口）：地上役。岩と閉じた通路は飛行中も通れません。'
    : 'd：犬2段階の実験役、右下の出口へ。g：蛙1段階、左上の出口へ。箱は段階2以上で押せます。早く支えを掘ると蛙の通路が塞がります。';
}
function start(variant) {
  touch.end(); play.load(createLab(variant)); touch.input.select(null);
  invalidate(); updateVariant(); $('message').textContent = '仲間をタップして選び、隣をタップ／なぞって移動'; draw();
}
$('variant').onchange = () => start($('variant').value);
$('actor').onchange = () => { touch.end(); touch.input.select($('actor').value || null); draw(); };
$('retry').onclick = () => start(play.session.variant);
$('undo').onclick = () => { touch.end(); play.undo(); touch.input.select(null); invalidate(); draw(); };
$('species').innerHTML = speciesRegistry.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
$('level').innerHTML = Array.from({length: 8}, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
$('transform').onclick = () => {
  touch.end(); play.begin();
  announce(play.act({type: 'transform', id: touch.input.selected, species: $('species').value, level: Number($('level').value)}, reduced()));
  play.end(); invalidate(); draw();
};
$('solve').onclick = () => {
  touch.end(); const r = searchLab(play.session.state, play.session.step);
  solution = r.solution || null; solutionIndex = 0; $('example').disabled = !solution?.length;
  $('result').textContent = r.status === 'shortest' ? `現在位置から移動・掘削操作の最短${r.solution.length}手（変身テストは除外）` : r.status === 'exhausted' ? '移動・掘削操作の全探索で解なし（変身操作は除外）' : '探索上限により未確定';
};
$('example').onclick = () => {
  const action = solution?.[solutionIndex]; if (!action) return;
  touch.end(); play.begin(); const r = play.act(action, reduced()); play.end();
  announce(r); if (r.ok) solutionIndex++; $('example').disabled = solutionIndex >= solution.length; draw();
};
const key = kind => 'naopoyo.v6.experiment.' + kind;
$('save').onclick = () => {
  try {
    touch.end(); const k = key(play.session.kind);
    localStorage.setItem(k, play.session.serialize());
    localStorage.setItem(k + '.strokes', JSON.stringify(play.strokeMetadata()));
    $('message').textContent = '実験とひと筆Undoの境界を保存しました';
  } catch (e) { $('message').textContent = e.message; }
};
function restore(text, metadata = null) {
  touch.end(); play.restore(text, metadata); touch.input.select(null); invalidate(); updateVariant(); draw();
  $('message').textContent = metadata ? '実験を復元しました' : '実験を復元しました。旧形式JSONのUndoは1手ずつです。';
}
$('restore').onclick = () => {
  try {
    const k = key(play.session.kind), raw = localStorage.getItem(k); if (!raw) throw Error('この実験の保存がありません');
    let metadata = null; try { metadata = JSON.parse(localStorage.getItem(k + '.strokes')); } catch {}
    restore(raw, metadata);
  } catch (e) { $('message').textContent = e.message; }
};
$('export').onclick = () => {
  touch.end(); const url = URL.createObjectURL(new Blob([play.session.serialize()], {type: 'application/json'})), a = document.createElement('a');
  a.href = url; a.download = 'naopoyo-v6-' + play.session.variant + '.json'; a.click(); URL.revokeObjectURL(url);
};
$('import').onchange = async () => {
  try { const file = $('import').files[0]; if (file) { if (file.size > 500000) throw Error('実験JSONが大きすぎます'); restore(await file.text()); } }
  catch (e) { $('message').textContent = e.message; }
};
$('message').textContent = '正式画像を読み込み中…';
const failures = [...await loadArt(), ...await loadCharacterArt()]; if (failures.length) throw Error(failures.join(','));
ready = true; start('F1'); new ResizeObserver(draw).observe(document.querySelector('.board-column'));
window.addEventListener('resize', () => touch.end());
document.addEventListener('visibilitychange', () => { if (document.hidden) touch.end(); });
function tick(now) {
  if (!document.hidden) { play.presentation.advance(Math.min(100, now - last), reduced()); draw(); }
  last = now; requestAnimationFrame(tick);
}
requestAnimationFrame(tick); document.documentElement.dataset.ready = 'true';
