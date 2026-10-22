// 実コードの bento を ハーネスで 動かし、2種類の ボットの 点数分布を はかる
// memorizer: 見本を 見ず、main の 固定配置(rice 左上, egg 右上, shrimp 左下, broccoli 右下)の とおりに おく
// reader: 見本を 正しく 読みとって おく
const {harness} = require(process.cwd() + '/tests/helpers/runtime-harness.cjs');
const OLD = {'26,30': 'rice', '74,30': 'egg', '26,68': 'shrimp', '74,68': 'broccoli'};
function play(seed, mode) {
  const h = harness({seed});
  const game = h.api.games.find((g) => g.id === 'dragDecorate-bento'); const scores = []; let box;
  h.api.startMinigame({id: game.id, start(c, done) { box = c; game.start(c, (s) => { scores.push(s); done(s); }); }});
  const view = h.get('minigameOverlay'), html = box.innerHTML;
  const at = (cls) => [...html.matchAll(new RegExp(`class="${cls}"[^>]*style="left:([\\d.]+)%;top:([\\d.]+)%"`, 'g'))].map((m) => `${+m[1]},${+m[2]}`);
  const targets = view.querySelectorAll('.mg-drop-target'), tPos = at('mg-drop-target');
  const items = view.querySelectorAll('.mg-drag-item');
  targets.forEach((t, i) => { t.getBoundingClientRect = () => ({left: 20 + i * 60, right: 66 + i * 60, top: 20, bottom: 66, width: 46, height: 46}); });
  items.forEach((i) => { i.getBoundingClientRect = () => ({left: 0, right: 46, top: 180, bottom: 226, width: 46, height: 46}); });
  h.advance(2200);
  targets.forEach((t, i) => {
    const key = mode === 'reader' ? t.dataset.key : OLD[tPos[i]];
    const item = items.find((it) => it.dataset.key === key);
    h.dispatch(item, 'pointerdown', {pointerId: 5, clientX: 23, clientY: 203});
    h.dispatch(item, 'pointerup', {pointerId: 5, clientX: t.getBoundingClientRect().left + 23, clientY: 43});
  });
  return scores[0];
}
const N = +process.argv[2] || 480;
for (const mode of (process.argv[3] ? [process.argv[3]] : ['memorizer', 'reader'])) {
  const dist = {}; let c = 0, b = 0;
  for (let seed = 1; seed <= N; seed++) { const s = play(seed, mode); dist[s] = (dist[s] || 0) + 1; if (s >= 35) c++; if (s >= 55) b++; }
  console.log(JSON.stringify({mode, n: N, dist, C_rate: +(c / N).toFixed(3), B_rate: +(b / N).toFixed(3)}));
}
