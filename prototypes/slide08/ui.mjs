import { create, step, stage, kind, landing, validate } from './engine.mjs';
const $ = (id) => document.getElementById(id),
  names = ['A', 'B', 'C', 'D', 'E'];
let state,
  initial,
  proof = null,
  history = [],
  selected = -1,
  epoch = 0,
  timer = null,
  replaying = false,
  started = null,
  ended = null,
  replayIndex = 0,
  loading = true,
  assisted = false;
const digest = async (x) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(x)),
      ),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
async function checkProof(p) {
  validate(p.initial);
  if (
    p.generated &&
    (await digest(create(p.initial.seed, p.initial.config))) !== p.hashes[0]
  )
    throw Error('seed不一致');
  let s = p.initial;
  if ((await digest(s)) !== p.hashes[0]) throw Error('初期状態不一致');
  if (p.hashes.length !== p.actions.length + 1) throw Error('証明長不一致');
  for (let i = 0; i < p.actions.length; i++) {
    const r = step(s, p.actions[i]);
    if (!r.valid || (await digest(r.state)) !== p.hashes[i + 1])
      throw Error('解法検証失敗');
    s = r.state;
  }
  if (!s.won || (await digest(s)) !== (await digest(p.final)))
    throw Error('未クリアの解法');
  return p;
}
function stop() {
  epoch++;
  clearTimeout(timer);
  timer = null;
  replaying = false;
}
function reset(s = initial) {
  if (loading || !s) return;
  stop();
  state = structuredClone(s);
  initial = structuredClone(s);
  history = [];
  selected = -1;
  started = null;
  ended = null;
  replayIndex = 0;
  assisted = false;
  for (const id of ['kind', 'from'])
    $(id).replaceChildren(
      ...Array.from(
        { length: state.config.kinds },
        (_, i) => new Option(names[i], i),
      ),
    );
  $('lane').replaceChildren(
    ...Array.from(
      { length: state.config.size },
      (_, i) => new Option(i + 1, i),
    ),
  );
  $('status').textContent = '矢印またはスワイプでスライド';
  render();
}
function render() {
  $('reset').disabled = loading || !state;
  if (!state) return;
  const n = state.config.size,
    preview =
      $('mode').value === 'egg'
        ? landing(state, $('direction').value, +$('lane').value)
        : -1;
  $('board').style.gridTemplateColumns = `repeat(${n},1fr)`;
  $('board').replaceChildren(
    ...state.board.map((v, i) => {
      const b = document.createElement('button');
      b.dataset.index = i;
      b.className = v ? `k${kind(v)} ${stage(v) === 8 ? 'eight' : ''}` : '';
      if (i === selected || i === preview) b.classList.add('selected');
      b.setAttribute(
        'aria-label',
        `${Math.floor(i / n) + 1}行 ${(i % n) + 1}列 ${v ? names[kind(v)] + ' ' + stage(v) : '空き'}`,
      );
      if (v) {
        const small = document.createElement('small');
        small.textContent = names[kind(v)];
        const num = document.createElement('span');
        num.textContent = String(stage(v)).padStart(2, '0');
        b.append(small, num);
      }
      b.onclick = () => {
        selected = i;
        $('selection').textContent =
          `${Math.floor(i / n) + 1}行 ${(i % n) + 1}列を選択`;
        render();
      };
      return b;
    }),
  );
  $('moves').textContent = state.moves;
  $('score').textContent = state.score;
  $('gauge').textContent = `${state.gauge} / ${state.config.cap}`;
  $('stock').textContent = ['普通', '銀', '金', 'プラチナ']
    .map((x, i) => `${x} ${state.eggs[i]}`)
    .join(' · ');
  $('used').textContent =
    `使用数：卵 ${state.used.egg} / 単体 ${state.used.single} / 全体 ${state.used.bulk}　費用 ${state.config.single} / ${state.config.bulk}`;
  $('replayStatus').textContent = proof
    ? `確認解 ${proof.actions.length}手 / 再生位置 ${replayIndex}`
    : 'この盤面の解法は未証明';
  $('replayOne').disabled =
    loading ||
    !proof ||
    replaying ||
    history.length !== replayIndex ||
    state.won;
  $('replayAll').disabled = loading || !proof || replaying;
  $('use').disabled = loading || replaying || state.won;
  document
    .querySelectorAll('[data-dir]')
    .forEach((b) => (b.disabled = loading || replaying || state.won));
  if (state.won) $('status').textContent = '08寿命消滅 — クリア！';
}
function act(a, auto = false) {
  if (loading || !state || state.won || (replaying && !auto)) return;
  const r = step(state, a);
  if (!r.valid) {
    $('status').textContent = '無効な操作です（消費なし）';
    return;
  }
  if (started === null) started = performance.now();
  state = r.state;
  history.push(a);
  if (state.won) ended = performance.now();
  if (!auto) {
    replayIndex = 0;
  } else {
    replayIndex++;
    assisted = true;
  }
  $('status').textContent = r.waves.length
    ? `${r.waves.length}連鎖！`
    : '盤面を更新しました';
  render();
}
async function load() {
  stop();
  loading = true;
  render();
  const ticket = epoch;
  $('proofStatus').textContent = '証明を確認しています…';
  try {
    const p = await checkProof(
      await (await fetch(`results/${$('catalog').value}`)).json(),
    );
    if (ticket !== epoch) return;
    loading = false;
    proof = p;
    reset(p.initial);
    $('proofStatus').textContent =
      `解法確認済み · seed ${p.initial.seed} · 全${p.actions.length}手を再生検証`;
  } catch (e) {
    if (ticket === epoch) {
      loading = false;
      render();
      $('proofStatus').textContent = `読み込み失敗：${e.message}`;
    }
  }
}
$('catalog').onchange = load;
$('reset').onclick = () => {
  if (proof) reset(proof.initial);
  else reset();
};
document
  .querySelectorAll('[data-dir]')
  .forEach(
    (b) => (b.onclick = () => act({ type: 'slide', dir: b.dataset.dir })),
  );
$('use').onclick = () => {
  const type = $('mode').value,
    a =
      type === 'egg'
        ? {
            type,
            rank: +$('rank').value,
            kind: +$('kind').value,
            dir: $('direction').value,
            lane: +$('lane').value,
          }
        : type === 'single'
          ? { type, index: selected, kind: +$('kind').value }
          : { type, from: +$('from').value, kind: +$('kind').value };
  act(a);
};
$('cancel').onclick = () => {
  selected = -1;
  $('selection').textContent = '選択を取消しました（消費なし）';
  render();
};
for (const id of ['direction', 'lane', 'mode']) $(id).onchange = render;
$('replayOne').onclick = () => {
  if (proof && history.length === replayIndex) {
    act(proof.actions[replayIndex], true);
  }
};
$('replayAll').onclick = () => {
  if (!proof) return;
  const p = proof;
  reset(p.initial);
  replaying = true;
  const ticket = epoch;
  const next = () => {
    if (ticket !== epoch) return;
    if (replayIndex >= p.actions.length) {
      replaying = false;
      render();
      return;
    }
    act(p.actions[replayIndex], true);
    timer = setTimeout(next, 140);
  };
  render();
  next();
};
$('stop').onclick = () => {
  stop();
  render();
};
$('generate').onclick = () => {
  try {
    const cost = +$('cost').value,
      s = create(+$('seed').value, {
        size: +$('size').value,
        count: +$('count').value,
        kinds: +$('kinds').value,
        maxStage: +$('maxStage').value,
        single: cost,
        bulk: cost * 3,
        initialGauge: +$('initialGauge').value,
        reward: $('reward').value,
        initialEggs:
          $('initialEggs').value === 'none' ? [0, 0, 0, 0] : [2, 1, 0, 0],
      });
    loading = false;
    proof = null;
    reset(s);
    $('proofStatus').textContent = '未証明の試験盤面 — 採用対象外';
  } catch (e) {
    $('status').textContent = `設定エラー：${e.message}`;
  }
};
$('export').onclick = () => {
  if (!state) return;
  const blob = new Blob(
      [
        JSON.stringify(
          {
            initial,
            actions: history,
            final: state,
            elapsedMs:
              started === null ? 0 : (ended ?? performance.now()) - started,
            automated: assisted,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = `slide08-${state.seed}-play.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
window.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const dir = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
  }[e.key];
  if (dir) {
    e.preventDefault();
    act({ type: 'slide', dir });
  }
});
let touch = null;
$('board').addEventListener('pointerdown', (e) => {
  touch = { x: e.clientX, y: e.clientY, id: e.pointerId };
});
$('board').addEventListener('pointerup', (e) => {
  if (!touch || touch.id !== e.pointerId) return;
  const dx = e.clientX - touch.x,
    dy = e.clientY - touch.y;
  touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  act({
    type: 'slide',
    dir:
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'right'
          : 'left'
        : dy > 0
          ? 'down'
          : 'up',
  });
});
$('board').addEventListener('pointercancel', () => (touch = null));
setInterval(() => {
  const sec =
    started === null
      ? 0
      : Math.floor(((ended ?? performance.now()) - started) / 1000);
  $('time').textContent =
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}, 200);
load();
