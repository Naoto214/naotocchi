import { naturalFixtures } from "./natural-fixtures.mjs";
import { configuration, OPTIONS, VERSION } from "./rules.mjs";
import { cloneBoard, gravity } from "./engine.mjs";
import {
  createSession,
  applyAction,
  preview,
  spawnPose,
  poseCells,
  movePose,
  landing,
  stateData,
  stateHash,
  validateSession,
  replay,
} from "./session.mjs";
import { chooseAction } from "./policy.mjs";
import { chainFixture } from "./fixtures.mjs";
const $ = (id) => document.getElementById(id),
  colors = ["#ef9fb3", "#81cce2", "#a6d594", "#f1d57f", "#bea6e4", "#efa77f"],
  names = ["A", "B", "C", "D", "E", "F"];
let s,
  initial,
  actions = [],
  pose,
  path = [],
  selected = null,
  frames = [],
  frameIndex = 0,
  busy = false,
  auto = false,
  timer = null,
  generation = 0,
  fixtureAction = null,
  draft = null,
  displayBoard = null;
const labels = {
  width: "盤面の列数",
  kinds: "登場種類",
  anchor: "進化位置",
  bulkAnchor: "大へんしん進化位置",
  consume: "6体以上の消費",
  competition: "候補競合",
  pairFirst: "セット内先行進化",
  deathSpecies: "08種類条件",
  eggCount: "卵獲得個数",
  eggThresholds: "卵ランク連鎖境界",
  gaugeMetric: "ゲージ獲得基準",
  gaugeUnit: "1本の必要量",
  scoreMode: "得点式",
  topOut: "終了条件",
  eggPlacement: "卵の配置",
  bag: "バッグ",
};
function setupRules(r) {
  $("rules").replaceChildren();
  for (const [key, value] of Object.entries({ seed: 1, ...r })) {
    if (key === "height") continue;
    const label = document.createElement("label");
    label.textContent = labels[key] || key;
    let input;
    if (OPTIONS[key] || ["width", "kinds", "pairFirst"].includes(key)) {
      input = document.createElement("select");
      for (const v of OPTIONS[key] ||
        (key === "width"
          ? [6, 7]
          : key === "kinds"
            ? [4, 5, 6]
            : [false, true])) {
        let o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        input.append(o);
      }
    } else {
      input = document.createElement("input");
      input.type = key === "eggThresholds" ? "text" : "number";
    }
    input.id = "rule-" + key;
    input.value = Array.isArray(value) ? value.join(",") : value;
    label.append(input);
    $("rules").append(label);
  }
}
function readRules() {
  let p = {};
  for (const key of Object.keys(configuration())) {
    if (key === "height") continue;
    const v = $("rule-" + key).value;
    p[key] =
      key === "eggThresholds"
        ? v.split(",").map(Number)
        : key === "pairFirst"
          ? v === "true"
          : ["width", "kinds", "gaugeUnit"].includes(key)
            ? Number(v)
            : v;
  }
  return configuration(p);
}
function reset(state, message = "新しい盤面を開始しました") {
  generation++;
  clearTimeout(timer);
  busy = false;
  frames = [];
  displayBoard = null;
  draft = null;
  s = state;
  initial = structuredClone(stateData(s));
  actions = [];
  path = [];
  pose = spawnPose(s.rules);
  selected = null;
  fixtureAction = null;
  auto = false;
  $("pause").textContent = "自動落下 OFF";
  $("status").textContent = message;
  setupRules(s.rules);
  $("rule-seed").value = s.seed;
  $("species").innerHTML = names
    .slice(0, s.rules.kinds)
    .map((n, i) => `<option value="${i}">${n}</option>`)
    .join("");
  $("stage").innerHTML = Array.from(
    { length: 8 },
    (_, i) =>
      `<option value="${i + 1}">${String(i + 1).padStart(2, "0")}</option>`,
  ).join("");
  $("resourceEggs").value = JSON.stringify(s.eggs);
  $("resourceGauge").value = s.gauge / s.rules.gaugeUnit;
  render();
}
function render() {
  let b = displayBoard || draft || s.board;
  const active = new Map(),
    ghost = new Map();
  if (!busy && !s.over && !draft) {
    poseCells(pose).forEach((c, i) =>
      active.set(c.y + "," + c.x, { k: s.queue[0][i], s: 1 }),
    );
    poseCells(landing(s.board, pose)).forEach((c, i) =>
      ghost.set(c.y + "," + c.x, { k: s.queue[0][i], s: 1 }),
    );
  }
  $("board").style.setProperty("--cols", s.rules.width);
  $("board").style.aspectRatio = `${s.rules.width}/12`;
  $("board").replaceChildren();
  for (let y = 2; y < b.length; y++)
    for (let x = 0; x < s.rules.width; x++) {
      let key = y + "," + x,
        c = b[y][x] || active.get(key) || ghost.get(key),
        el = document.createElement("button");
      el.className =
        "cell" +
        (c ? " piece" : "") +
        (active.has(key) ? " active" : "") +
        (!b[y][x] && !active.has(key) && ghost.has(key) ? " ghost" : "") +
        (selected?.x === x && selected?.y === y ? " selected" : "");
      el.dataset.x = x;
      el.dataset.y = y;
      el.ariaLabel = `${x + 1}列 ${y - 1}段 ${c ? names[c.k] + String(c.s).padStart(2, "0") : "空き"}`;
      if (c) {
        el.style.setProperty("--color", colors[c.k]);
        el.innerHTML = `<small>${names[c.k]}</small>${String(c.s).padStart(2, "0")}`;
      }
      el.onclick = () => selectCell(x, y);
      $("board").append(el);
    }
  $("current").innerHTML =
    '<div class="nextpair">' +
    s.queue[0]
      .map(
        (k) =>
          `<span class="mini" style="--color:${colors[k]}">${names[k]}01</span>`,
      )
      .join("") +
    "</div>";
  $("next").innerHTML = s.queue
    .slice(1)
    .map(
      (p) =>
        `<div class="nextpair">${p.map((k) => `<span class="mini" style="--color:${colors[k]}">${names[k]}01</span>`).join("")}</div>`,
    )
    .join("");
  $("eggs").innerHTML = ["普通", "銀", "金", "プラチナ"]
    .map((n, i) => `<div class="stock">${n} × ${s.eggs[i]}</div>`)
    .join("");
  $("gauge").textContent = (s.gauge / s.rules.gaugeUnit).toFixed(2) + " 本";
  $("stats").textContent =
    `落下 ${s.drops} · 得点 ${s.score}${s.over ? " · 終了" : ""}`;
  for (const id of [
    "left",
    "right",
    "rotate",
    "down",
    "drop",
    "use",
    "preview",
    "strategy",
    "random",
    "trigger",
  ])
    $(id).disabled = busy || !!s.over || !!draft;
  for (const id of ["use", "preview"])
    $(id).disabled = busy || !!s.over || !!draft || path.length > 0;
  for (const id of ["stepWave", "finishWave"]) $(id).disabled = !busy;
  if (selected)
    $("selected").textContent =
      `選択：${selected.x + 1}列・${selected.y - 1}段`;
}
function fail(e) {
  $("status").textContent = e.message;
}
function selectCell(x, y) {
  if (busy) return;
  selected = { x, y };
  if ($("action").value === "edit") {
    auto = false;
    $("pause").textContent = "自動落下 OFF";
    draft ??= cloneBoard(s.board);
    let max = Math.max(
      0,
      ...draft
        .flat()
        .filter(Boolean)
        .map((c) => c.id),
    );
    draft[y][x] = {
      id: max + 1,
      k: Number($("species").value),
      s: Number($("stage").value),
    };
    $("status").textContent = "編集中：盤面を開始で重力適用・安定性確認";
  }
  render();
}
function finish() {
  if (!busy) return;
  generation++;
  clearTimeout(timer);
  busy = false;
  displayBoard = null;
  frames = [];
  path = [];
  pose = spawnPose(s.rules);
  render();
}
function nextFrame() {
  clearTimeout(timer);
  if (!busy) return;
  if (frameIndex >= frames.length) {
    finish();
    return;
  }
  displayBoard = frames[frameIndex++];
  render();
  if (!$("manualWave").checked) {
    let token = generation;
    timer = setTimeout(
      () => {
        if (token === generation) nextFrame();
      },
      Number($("tempo").value),
    );
  }
}
function act(a) {
  if (busy || draft) return;
  if (a.type !== "drop" && path.length) {
    fail(Error("道具は落下操作の開始前に使用してください"));
    return;
  }
  try {
    let result = applyAction(s, a);
    actions.push(structuredClone(a));
    s = result;
    let n = s.last.waves.length;
    $("status").textContent =
      `${n ? n + "連鎖！" : "配置しました"}${s.last.created08 ? " · 08に成長" : ""}${s.over ? " · 終了：" + s.over : ""}`;
    frames = s.last.waves.map((w) => w.after);
    frameIndex = 0;
    busy = frames.length > 0;
    path = [];
    pose = spawnPose(s.rules);
    if (busy) {
      displayBoard = s.last.waves[0].before;
      render();
      if (!$("manualWave").checked) {
        let token = ++generation;
        timer = setTimeout(
          () => {
            if (token === generation) nextFrame();
          },
          Number($("tempo").value),
        );
      }
    } else render();
  } catch (e) {
    fail(e);
  }
}
function motion(op) {
  if (busy || s.over || draft) return;
  let q = movePose(s.board, pose, op);
  if (q) {
    pose = q;
    path.push(op);
    render();
  } else if (op === "down") act({ type: "drop", path: [...path, "hard"] });
}
function item() {
  if (!selected) throw Error("対象のマスを選んでください");
  const type = $("action").value,
    to = Number($("species").value),
    { x, y } = selected;
  if (type === "egg")
    return { type, rank: Number($("rank").value), k: to, x, y };
  if (type === "bulk") {
    const c = s.board[y][x];
    if (!c) throw Error("変更元の種類がいるマスを選んでください");
    return { type, from: c.k, to };
  }
  return { type, x, y, to };
}
for (const op of ["left", "right", "down", "rotate"])
  $(op).onclick = () => motion(op);
$("drop").onclick = () => act({ type: "drop", path: [...path, "hard"] });
$("pause").onclick = () => {
  auto = !auto;
  $("pause").textContent = "自動落下 " + (auto ? "ON" : "OFF");
};
setInterval(() => {
  if (auto && !document.hidden && !busy && !draft) motion("down");
}, 750);
$("restart").onclick = () => {
  try {
    reset(createSession(Number($("rule-seed").value), readRules()));
  } catch (e) {
    fail(e);
  }
};
$("preview").onclick = () => {
  try {
    let z = preview(s, item());
    $("prediction").textContent =
      `予告：${z.last.waves.length}連鎖 / 08生成 ${z.last.created08} / 卵 +${z.last.eggs.reduce((a, b) => a + b, 0)} / 残ゲージ ${(z.gauge / s.rules.gaugeUnit).toFixed(2)}本${z.over ? " / 終了" : ""}`;
  } catch (e) {
    $("prediction").textContent = e.message;
  }
};
$("use").onclick = () => {
  try {
    act(item());
  } catch (e) {
    fail(e);
  }
};
$("stepWave").onclick = nextFrame;
$("finishWave").onclick = finish;
for (const n of [3, 5])
  $("fixture" + n).onclick = () => {
    let f = chainFixture(n);
    reset(f.state, `合成${n}連鎖盤面：発火ボタンで卵を置く`);
    fixtureAction = f.action;
  };
$("trigger").onclick = () => {
  if (fixtureAction) act(fixtureAction);
  else fail(Error("先に再現盤面を選んでください"));
};
for (const policy of ["strategic", "random"])
  $(policy === "strategic" ? "strategy" : policy).onclick = () => {
    try {
      let a = chooseAction(
        s,
        policy,
        { state: (s.seed + s.actions) >>> 0 },
        { items: "none" },
      );
      if (a) act(a);
    } catch (e) {
      fail(e);
    }
  };
$("erase").onclick = () => {
  if (busy || !selected) return;
  draft ??= cloneBoard(s.board);
  draft[selected.y][selected.x] = null;
  render();
};
$("empty").onclick = () => {
  if (busy) return;
  draft = s.board.map((row) => row.map(() => null));
  render();
};
$("applyBoard").onclick = () => {
  try {
    reset(
      createSession(s.seed, s.rules, {
        board: gravity(draft || s.board),
        eggs: JSON.parse($("resourceEggs").value),
        gauge: Number($("resourceGauge").value) * s.rules.gaugeUnit,
      }),
      "編集盤面を開始（資源付与あり）",
    );
  } catch (e) {
    fail(e);
  }
};
$("export").onclick = () => {
  $("json").value = JSON.stringify(
    { version: VERSION, initial, actions, hash: stateHash(s) },
    null,
    2,
  );
};
$("exportBoard").onclick = () => {
  $("json").value = JSON.stringify(
    {
      version: VERSION,
      initial: stateData(s),
      actions: [],
      hash: stateHash(s),
    },
    null,
    2,
  );
};
$("import").onclick = () => {
  try {
    let data = JSON.parse($("json").value);
    if (data.initial && !data.actions) data.actions = [];
    validateSession(data.initial);
    let end = replay(data);
    reset(end, "再現データを読み込みました");
    initial = structuredClone(data.initial);
    actions = structuredClone(data.actions);
  } catch (e) {
    fail(e);
  }
};
window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  let map = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "rotate",
    ArrowDown: "down",
  };
  if (map[e.key]) {
    e.preventDefault();
    motion(map[e.key]);
  } else if (e.code === "Space") {
    e.preventDefault();
    $("drop").click();
  } else if (e.key.toLowerCase() === "p") $("pause").click();
});
setupRules(configuration());
reset(createSession(1));

for (const n of [3, 5])
  $("natural" + n).onclick = () => {
    let f = structuredClone(naturalFixtures[n]);
    reset(
      f.state,
      `通常プレイ由来 ${n}連鎖 · seed ${f.seed} · ${f.drop}組目（発火で再現）`,
    );
    fixtureAction = f.action;
  };
