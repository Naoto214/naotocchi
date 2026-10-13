import { bindHold } from "./touch-input.mjs";
import { animationFrames } from "./animation.mjs";
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
let ready = true,
  tool = null,
  targetKind = null,
  toolPreview = null,
  currentFrame = null;
const holds = [];
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
  holds.forEach((h) => h.stop());
  clearTimeout(timer);
  busy = false;
  ready = true;
  tool = null;
  targetKind = null;
  toolPreview = null;
  currentFrame = null;
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
  const focused = document.activeElement;
  const focusSelector =
    focused?.dataset.kind !== undefined
      ? `#kindChoices [data-kind="${focused.dataset.kind}"]`
      : focused?.dataset.rank !== undefined
        ? `#eggChoices [data-rank="${focused.dataset.rank}"]`
        : focused?.dataset.x !== undefined
          ? `#board [data-x="${focused.dataset.x}"][data-y="${focused.dataset.y}"]`
          : null;
  let b = displayBoard || draft || s.board;
  const active = new Map(),
    ghost = new Map();
  if (!busy && !s.over && !draft && !tool) {
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
  $("board").dataset.phase = busy
    ? currentFrame?.phase || "connect"
    : ready
      ? "ready"
      : "falling";
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
  $("gauge").textContent =
    `${Math.floor(s.gauge / s.rules.gaugeUnit)}本 ＋${s.gauge % s.rules.gaugeUnit}/${s.rules.gaugeUnit}`;
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
    $(id).disabled = busy || !!s.over || !!draft || !!tool;
  for (const id of ["use", "preview"])
    $(id).disabled = busy || !!s.over || !!draft || !ready || !!tool;
  for (const id of ["stepWave", "finishWave"]) $(id).disabled = !busy;
  if (selected)
    $("selected").textContent =
      `選択：${selected.x + 1}列・${selected.y - 1}段`;
  renderTools();
  renderAnimation();
  if (focusSelector)
    document.querySelector(focusSelector)?.focus({ preventScroll: true });
}
function fail(e) {
  $("status").textContent = e.message;
}
function selectCell(x, y) {
  if (busy) return;
  selected = { x, y };
  if (tool) {
    updatePreview();
    render();
    return;
  }
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
  ready = true;
  currentFrame = null;
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
  currentFrame = frames[frameIndex++];
  displayBoard = currentFrame.board;
  const phaseNames = {
    connect: "つながる",
    evolve: "進化",
    fall: "落下",
    result: "成長",
  };
  const eggs = currentFrame.events
    .filter((e) => e.death)
    .reduce((n, e) => n + e.eggCount, 0);
  $("status").textContent =
    `${currentFrame.chain} / ${s.last.waves.length}連鎖 · ${phaseNames[currentFrame.phase]}${eggs ? ` · 卵＋${eggs}` : ""}`;
  render();
  if (!$("manualWave").checked) {
    const token = generation;
    timer = setTimeout(() => {
      if (token === generation) nextFrame();
    }, currentFrame.duration);
  }
}
function act(a) {
  if (busy || draft || s.over || tool) return;
  if (a.type !== "drop" && !ready) {
    fail(Error("道具は落下操作の開始前に使用してください"));
    return;
  }
  try {
    holds.forEach((h) => h.stop());
    let result = applyAction(s, a);
    actions.push(structuredClone(a));
    s = result;
    let n = s.last.waves.length;
    $("status").textContent =
      `${n ? n + "連鎖！" : "配置しました"}${s.last.created08 ? " · 08に成長" : ""}${s.over ? " · 終了：" + s.over : ""}`;
    frames = animationFrames(
      s.last.waves,
      Number($("tempo").value),
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );
    frameIndex = 0;
    busy = frames.length > 0;
    path = [];
    pose = spawnPose(s.rules);
    ready = !busy;
    if (busy) {
      generation++;
      nextFrame();
    } else {
      currentFrame = null;
      render();
    }
  } catch (e) {
    fail(e);
  }
}
function motion(op) {
  if (busy || s.over || draft || tool) return;
  ready = false;
  let q = movePose(s.board, pose, op);
  if (q) {
    pose = q;
    path.push(op);
    render();
  } else if (op === "down") act({ type: "drop", path: [...path, "hard"] });
  else render();
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
for (const op of ["left", "right", "down"])
  holds.push(bindHold($(op), () => motion(op)));
$("rotate").onclick = () => motion("rotate");
$("startFall").onclick = () => {
  if (!ready || busy || tool || s.over || draft) return;
  ready = false;
  render();
};
$("drop").onclick = () => act({ type: "drop", path: [...path, "hard"] });
$("pause").onclick = () => {
  auto = !auto;
  $("pause").textContent = "自動落下 " + (auto ? "ON" : "OFF");
};
setInterval(() => {
  if (auto && !ready && !tool && !document.hidden && !busy && !draft)
    motion("down");
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
$("newGame").onclick = () => reset(createSession(s.seed, s.rules));
$("toggleLab").onclick = () => {
  const on = !document.body.classList.contains("lab-mode");
  if (!on && draft) {
    fail(Error("編集盤面を開始してから試遊に戻ってください"));
    return;
  }
  if (!on) {
    $("action").value = "transform";
    selected = null;
    tool = null;
    toolPreview = null;
    $("manualWave").checked = false;
    if (busy) nextFrame();
  }
  document.body.classList.toggle("lab-mode", on);
  $("labPanel").hidden = !on;
  $("toggleLab").setAttribute("aria-expanded", String(on));
  render();
};
window.addEventListener("blur", () => {
  holds.forEach((h) => h.stop());
  auto = false;
  $("pause").textContent = "自動落下 OFF";
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    holds.forEach((h) => h.stop());
    auto = false;
    $("pause").textContent = "自動落下 OFF";
  }
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

function beginTool(type) {
  if (!ready || busy || s.over || draft) return;
  holds.forEach((h) => h.stop());
  tool = type;
  selected = null;
  targetKind = null;
  toolPreview = null;
  $("action").value = type;
  $("rank").value = String(
    Math.max(
      0,
      s.eggs.findIndex((n) => n > 0),
    ),
  );
  render();
}
function updatePreview() {
  toolPreview = null;
  if (!tool || !selected || targetKind === null) return;
  $("species").value = String(targetKind);
  try {
    toolPreview = preview(s, item());
  } catch (e) {
    $("toolHint").textContent = e.message;
  }
}
function renderTools() {
  const allowed = ready && !busy && !s.over && !draft;
  $("toolSheet").hidden = !tool;
  $("eggCount").textContent = `×${s.eggs.reduce((a, b) => a + b, 0)}`;
  $("tool-egg").disabled = !allowed || s.eggs.every((n) => !n);
  $("tool-transform").disabled =
    !allowed || s.gauge < s.rules.gaugeUnit || !s.board.flat().some(Boolean);
  $("tool-bulk").disabled =
    !allowed ||
    s.gauge < 3 * s.rules.gaugeUnit ||
    !s.board.flat().some(Boolean);
  $("startFall").disabled = !allowed || !!tool;
  $("turnHint").textContent = s.over
    ? "終了 · もう一度挑戦しよう"
    : busy
      ? "連鎖中"
      : ready
        ? "道具を使う？ 次の2体へ進む？"
        : "移動・回転して落とそう";
  $("board").classList.toggle("previewing", !!toolPreview);
  if (!tool) return;
  $("toolTitle").textContent = {
    egg: "🥚 卵を置く",
    transform: "✨ 1体を変える · 1本",
    bulk: "🌈 同じ種類すべて · 3本",
  }[tool];
  $("eggChoices").replaceChildren();
  $("eggChoices").hidden = tool !== "egg";
  if (tool === "egg")
    ["普通01", "銀02", "金03", "プラチナ04"].forEach((label, rank) => {
      const button = document.createElement("button");
      button.textContent = `${label} ×${s.eggs[rank]}`;
      button.dataset.rank = rank;
      button.disabled = !s.eggs[rank];
      button.setAttribute(
        "aria-pressed",
        String(Number($("rank").value) === rank),
      );
      button.onclick = () => {
        $("rank").value = String(rank);
        updatePreview();
        render();
      };
      $("eggChoices").append(button);
    });
  $("kindChoices").replaceChildren();
  names.slice(0, s.rules.kinds).forEach((name, k) => {
    const button = document.createElement("button");
    button.textContent = name;
    button.dataset.kind = k;
    button.style.setProperty("--color", colors[k]);
    button.setAttribute("aria-label", `${name}にする`);
    button.setAttribute("aria-pressed", String(targetKind === k));
    button.disabled =
      tool !== "egg" && !!selected && s.board[selected.y][selected.x]?.k === k;
    button.onclick = () => {
      targetKind = k;
      updatePreview();
      render();
    };
    $("kindChoices").append(button);
  });
  $("toolHint").textContent = !selected
    ? tool === "egg"
      ? "種類と置く列を選ぼう"
      : "盤面の変えたい個体をタップ"
    : targetKind === null
      ? "上の色から変更先を選ぼう"
      : !toolPreview
        ? "この組合せには使えません。対象・種類・在庫を確認してね"
        : `結果予告：${toolPreview.last.waves.length}連鎖 · 卵＋${toolPreview.last.eggs.reduce((a, b) => a + b, 0)}${toolPreview.over ? " · この手で終了" : ""}`;
  $("confirmTool").disabled = !toolPreview;
  if (toolPreview) {
    toolPreview.board.forEach((row, y) =>
      row.forEach((c, x) => {
        if (!c || y < 2) return;
        const ghost = document.createElement("span");
        ghost.className = "preview-piece";
        ghost.style.cssText = `--color:${colors[c.k]};left:${(100 * x) / s.rules.width}%;top:${(100 * (y - 2)) / 12}%;width:${100 / s.rules.width}%;height:${100 / 12}%`;
        ghost.textContent = `${names[c.k]}${String(c.s).padStart(2, "0")}`;
        $("board").append(ghost);
      }),
    );
  }
}
function renderAnimation() {
  if (!busy || !currentFrame) return;
  const frame = currentFrame;
  for (const e of frame.events)
    for (const id of e.consumed) {
      const c = frame.board.flatMap((row, y) =>
        row.flatMap((c, x) => (c?.id === id ? [{ x, y }] : [])),
      )[0];
      if (c)
        $("board")
          .querySelector(`[data-x="${c.x}"][data-y="${c.y}"]`)
          ?.classList.add("connected");
    }
  if (!frame.moves.length || !window.Element?.prototype.animate) return;
  const br = $("board").getBoundingClientRect();
  for (const m of frame.moves) {
    if (
      m.from.y < 2 ||
      m.to.y < 2 ||
      (frame.phase === "fall" && m.from.x === m.to.x && m.from.y === m.to.y)
    )
      continue;
    const from = $("board").querySelector(
        `[data-x="${m.from.x}"][data-y="${m.from.y}"]`,
      ),
      to = $("board").querySelector(`[data-x="${m.to.x}"][data-y="${m.to.y}"]`);
    if (!from || !to) continue;
    const a = from.getBoundingClientRect(),
      b = to.getBoundingClientRect(),
      actor = document.createElement("span");
    actor.className = "moving-piece";
    actor.style.cssText = `--color:${colors[m.from.cell.k]};left:${b.left - br.left}px;top:${b.top - br.top}px;width:${b.width}px;height:${b.height}px`;
    actor.textContent = `${names[m.from.cell.k]}${String(m.from.cell.s).padStart(2, "0")}`;
    to.classList.add("animation-covered");
    $("board").append(actor);
    actor.animate(
      [
        {
          transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(1)`,
          opacity: 1,
        },
        {
          transform: `translate(0,0) scale(${m.death ? 0.15 : 1})`,
          opacity: m.death ? 0 : 1,
        },
      ],
      {
        duration: frame.duration,
        easing:
          frame.phase === "fall" ? "cubic-bezier(.4,0,1,1)" : "ease-in-out",
        fill: "forwards",
      },
    );
  }
}
for (const type of ["egg", "transform", "bulk"])
  $("tool-" + type).onclick = () => beginTool(type);
$("cancelTool").onclick = () => {
  tool = null;
  toolPreview = null;
  selected = null;
  render();
};
$("confirmTool").onclick = () => {
  if (!toolPreview || !ready || busy) return;
  const a = item();
  tool = null;
  toolPreview = null;
  selected = null;
  act(a);
};
