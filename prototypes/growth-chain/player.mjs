import { playerProfile } from "./player-profile.mjs";
import { Player } from "./player-model.mjs";
import { PlayerStore, ownPlayer } from "./player-store.mjs";
import {
  readRoster,
  selectFive,
  imagePath,
  INITIAL_SPECIES,
} from "./roster.mjs";
import { createSession, poseCells, landing } from "./session.mjs";
import { standardRules } from "./rules.mjs";
import { board } from "./engine.mjs";
import { animationFrames } from "./animation.mjs";
import { bindHold } from "./touch-input.mjs";
const $ = (id) => document.getElementById(id),
  roster = readRoster(localStorage),
  profile = playerProfile(location.search),
  store = new PlayerStore(localStorage, profile.storeKey);
let data,
  player = null,
  screen = "title",
  mode = "clear",
  selected = [...INITIAL_SPECIES],
  tool = null,
  token = null,
  frameList = [],
  frameAt = 0,
  frameMs = 0,
  currentFrame = null,
  owned = false,
  practice = -1,
  practiceDone = false,
  practiceMoves = new Set(),
  lastTime = performance.now();
const holds = [],
  pointers = new Map();
let gesture = null;
const categoryNames = {
  clear: "08消滅",
  endless: "通常エンドレス",
  "post-clear": "クリア後エンドレス",
};
const eggNames = ["普通", "銀", "金", "プラチナ"];
const image = (id, s) => {
  const c = roster.find((c) => c.id === id);
  return window.GROWTH_CHAIN_IMAGES?.[imagePath(c, s)] || imagePath(c, s);
};
// Saved sessions keep stable kind IDs even if the main dex grows later.
function runRoster() {
  return player?.state.species
    ? player.state.species.map((id) => roster.find((c) => c.id === id))
    : roster;
}
function piece(c) {
  const id = player?.state.species?.[c.k] || roster[c.k]?.id;
  return `<img class="character" src="${image(id, c.s)}" alt="" draggable="false"><span class="stage">${String(c.s).padStart(2, "0")}</span>`;
}
function setStatus(text) {
  $("status").textContent = text;
}
function save() {
  if (!owned) return;
  const snap = player && !player.practice ? player.snapshot() : data.snapshot;
  if (player && !player.practice && !snap) return;
  try {
    data = store.save(snap, player?.practice ? [] : player?.records || [], {
      selected,
      reduced: $("reduced").checked,
      tutorialDone: data.preferences.tutorialDone,
    });
    $("restore").hidden = !data.snapshot;
  } catch (e) {
    fatal(e.message);
  }
}
function fatal(text) {
  owned = false;
  player?.pause();
  stopInput();
  $("bootError").textContent = text;
  $("playStart").disabled = true;
  dialog(
    "保存を確認してください",
    text,
    [["再読み込み", () => location.reload()]],
    "PAUSED",
  );
}
function show(name) {
  stopInput();
  document.body.classList.toggle(
    "paused",
    name === "game" && player?.phase === "paused",
  );
  screen = name;
  for (const el of document.querySelectorAll(".screen,#game"))
    el.hidden = el.id !== name;
  $("overlay").hidden = true;
  if (name === "characters") renderGallery();
  if (name === "records") renderRecords();
  resize();
}
function dialog(title, text, actions, eyebrow = "NAOPOYO") {
  $("dialogTitle").textContent = title;
  $("dialogText").textContent = text;
  $("dialogEyebrow").textContent = eyebrow;
  $("dialogActions").replaceChildren();
  for (const [label, fn, id] of actions) {
    const b = document.createElement("button");
    b.textContent = label;
    if (id) b.id = id;
    b.onclick = fn;
    $("dialogActions").append(b);
  }
  $("dialogActions").firstElementChild?.classList.add("primary");
  $("overlay").hidden = false;
  $("dialogActions").firstElementChild?.focus();
}
function pause() {
  if (!player || !["playing", "animating", "paused"].includes(player.phase))
    return;
  player.pause();
  document.body.classList.add("paused");
  stopInput();
  save();
  dialog(
    "ひとやすみ",
    practice >= 0
      ? "練習は記録に加算されません。"
      : "ゆっくりで大丈夫。準備ができたら、また育てよう。",
    [
      [
        "再開",
        () => {
          if (!owned || document.hidden) return;
          player.resume();
          document.body.classList.remove("paused");
          $("overlay").hidden = true;
          lastTime = performance.now();
          if (player.phase !== "animating") render();
        },
        "resume",
      ],
      [
        "タイトルへ",
        () => {
          if (player.resumePhase === "animating") {
            player.resume();
            player.settle();
            player.pause();
            currentFrame = null;
            frameList = [];
            save();
          }
          show("title");
        },
      ],
    ],
    "A LITTLE BREAK",
  );
}
function stopInput() {
  holds.forEach((h) => h.stop());
  pointers.clear();
  gesture = null;
}
function start(practiceStep = -1) {
  if (!owned) return;
  practice = practiceStep;
  practiceDone = false;
  practiceMoves.clear();
  tool = null;
  token = null;
  currentFrame = null;
  frameList = [];
  const rules = standardRules({ kinds: roster.length, gaugeUnit: profile.gaugeUnit }),
    initial = {
      species: roster.map((c) => c.id),
      selected: selectFive(roster, practice >= 0 ? INITIAL_SPECIES : selected),
    };
  if (practice >= 0) {
    initial.selected = selectFive(roster, INITIAL_SPECIES);
    const b = board(rules);
    initial.board = b;
    if (practice === 1) b[13][2] = { id: 1, k: 0, s: 1 };
    if (practice === 2)
      for (let s = 1; s <= 3; s++) b[14 - s][0] = { id: s, k: 0, s };
    if (practice === 3) initial.eggs = [1, 1, 1, 1];
    if (practice === 4) {
      b[13][0] = { id: 1, k: 0, s: 2 };
      b[13][1] = { id: 2, k: 1, s: 2 };
      initial.gauge = rules.gaugeUnit * 3;
    }
    if (practice === 5) {
      b[13][0] = { id: 1, k: 0, s: 8 };
      b[13][1] = { id: 2, k: 1, s: 8 };
      initial.gauge = rules.gaugeUnit;
    }
  }
  const state = createSession(
    crypto.getRandomValues(new Uint32Array(1))[0],
    rules,
    initial,
  );
  if (practice === 1) state.queue[0] = [0, 1];
  if (practice === 2) state.queue[0] = [0, 1];
  player = new Player(state, { mode, practice: practice >= 0 });
  player.resume();
  show("game");
  renderPractice();
  render();
  save();
  lastTime = performance.now();
}
function renderGallery() {
  const root = $("gallery");
  root.replaceChildren();
  for (const c of roster) {
    const label = document.createElement("label");
    label.className =
      "gallery-card" + (selected.includes(c.id) ? " selected" : "");
    label.style.display = "block";
    label.innerHTML = `<span class="gallery-head"><input type="checkbox" value="${c.id}" ${selected.includes(c.id) ? "checked" : ""}>${c.label}</span><span class="gallery-stages">${Array.from({ length: 8 }, (_, i) => `<span><img src="${image(c.id, i + 1)}" alt="${c.label} ${String(i + 1).padStart(2, "0")}"><small>${String(i + 1).padStart(2, "0")}</small></span>`).join("")}</span>`;
    label.querySelector("input").onchange = (e) => {
      if (e.target.checked) selected.push(c.id);
      else selected = selected.filter((id) => id !== c.id);
      renderGallery();
    };
    root.append(label);
  }
  $("selectionCount").textContent = `${selected.length} / 5 系統を選択`;
  $("startSelected").disabled = selected.length !== 5;
}
function renderRecords() {
  $("recordSummary").innerHTML = Object.entries(categoryNames)
    .map(([key, name]) => {
      const t = data.totals[key] || { best: 0, plays: 0, deaths: 0 };
      return `<div class="record-card">${name}<strong>${t.best.toLocaleString()} <small>BEST</small></strong>${t.plays}回の記録 · 08消滅 ${t.deaths}回</div>`;
    })
    .join("");
  $("history").innerHTML = data.history.length
    ? data.history
        .map(
          (r) =>
            `<div class="record-row"><span>${categoryNames[r.category]}<br>${new Date(r.date).toLocaleDateString("ja-JP")}</span><span>${r.score.toLocaleString()}点<br>${r.drops}セット</span></div>`,
        )
        .join("")
    : '<p class="subtle">これから、思い出を育てよう。</p>';
}
function resize() {
  if (screen !== "game") return;
  const app = $("app"),
    style = getComputedStyle(app),
    w =
      app.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    height = window.visualViewport?.height || innerHeight;
  const practiceHeight = $("practiceBar").hidden
    ? 0
    : $("practiceBar").getBoundingClientRect().height + 7;
  const budget =
    height -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom) -
    58 -
    4 -
    30 -
    99 -
    practiceHeight;
  const bw = Math.floor(Math.min(w - 112, budget / 2));
  app.style.setProperty("--board", `${Math.max(96, bw)}px`);
}
function render() {
  if (!player || screen !== "game") return;
  const s = player.state,
    display = currentFrame?.board || s.board,
    b = $("board");
  b.replaceChildren();
  const active = new Map(),
    ghost = new Map();
  if (!currentFrame && !s.over) {
    poseCells(player.pose).forEach((c, i) =>
      active.set(`${c.x},${c.y}`, { k: s.queue[0][i], s: 1 }),
    );
    poseCells(landing(s.board, player.pose)).forEach((c, i) =>
      ghost.set(`${c.x},${c.y}`, { k: s.queue[0][i], s: 1 }),
    );
  }
  const direct = new Set(token?.direct.cells.map((c) => `${c.x},${c.y}`) || []);
  const changed = new Set(
    currentFrame?.events.map((e) => `${e.anchor.x},${e.anchor.y}`) || [],
  );
  for (let y = 2; y < 14; y++)
    for (let x = 0; x < 6; x++) {
      const key = `${x},${y}`,
        previewCell =
          token?.direct.placed?.x === x && token.direct.placed.y === y
            ? token.direct.board[y][x]
            : null,
        c = display[y][x] || active.get(key) || previewCell || ghost.get(key),
        el = document.createElement("button");
      el.className =
        "cell" +
        (c?.s === 8 ? " stage-eight" : "") +
        (!display[y][x] && active.has(key) ? " active" : "") +
        (!display[y][x] && !active.has(key) && !previewCell && ghost.has(key)
          ? " ghost"
          : "") +
        (direct.has(key) ? " direct" : "") +
        (changed.has(key) ? " target" : "") +
        (previewCell ? " egg-preview" : "");
      el.dataset.x = x;
      el.dataset.y = y;
      el.tabIndex = tool ? 0 : -1;
      el.setAttribute(
        "aria-label",
        `${x + 1}列 ${y - 1}段 ${c ? (runRoster()[c.k]?.label || "") + String(c.s).padStart(2, "0") : "空き"}`,
      );
      if (c) el.innerHTML = piece(c);
      el.onclick = (e) => {
        if (e.detail === 0 && tool) chooseCell(x, y);
      };
      b.append(el);
    }
  b.classList.toggle("evolving", currentFrame?.phase === "evolve");
  b.dataset.phase = player.phase;
  $("score").textContent = s.score.toLocaleString();
  $("eight").textContent = display.flat().filter((c) => c?.s === 8).length;
  $("next").innerHTML = s.queue
    .slice(1)
    .map(
      (pair) =>
        `<div class="next-pair">${pair.map((k) => `<span class="mini">${piece({ k, s: 1 })}</span>`).join("")}</div>`,
    )
    .join("");
  $("eggs").replaceChildren();
  s.eggs.forEach((n, rank) => {
    const e = document.createElement("button");
    e.className = "egg";
    e.innerHTML = `<span class="egg-icon ${["", "silver", "gold", "platinum"][rank]}"></span><span>${eggNames[rank]} ×${n}</span>`;
    e.disabled = !n || !player.active;
    e.dataset.rank = rank;
    e.onclick = () => beginTool("egg", rank);
    $("eggs").append(e);
  });
  const unit = s.rules.gaugeUnit;
  $("gaugeMeter").max = unit * 3;
  $("gaugeMeter").value = s.gauge;
  $("gaugeText").textContent = `${s.gauge} / ${unit * 3}`;
  for (const [id, cost] of [
    ["transform", unit],
    ["bulk", unit * 3],
  ]) {
    $(id).querySelector("small").textContent = `${cost}で使える`;
    $(id).disabled =
      !player.active || s.gauge < cost || !s.board.flat().some(Boolean);
  }
  for (const id of ["left", "right", "ccw", "rotate", "down", "drop"])
    $(id).disabled = !player.active;
  renderTool();
  resize();
}
function beginTool(type, rank = 0) {
  if (!player?.active) return;
  stopInput();
  tool = { type, rank, to: null, target: null, from: null };
  token = null;
  render();
}
function chooseCell(x, y) {
  if (!tool || !player.active) return;
  if (tool.type === "egg") {
    if (tool.to === null) {
      setStatus("先に系統を選ぼう");
      return;
    }
    tool.target = { x, y };
  } else if (player.state.board[y][x]) {
    tool.target = { x, y, id: player.state.board[y][x].id };
    tool.from = player.state.board[y][x].k;
  }
  refreshPreview();
  render();
}
function refreshPreview() {
  token = null;
  if (!tool || !player.active || tool.to === null) return;
  let a;
  if (tool.type === "bulk") {
    if (tool.from === null) return;
    a = { type: "bulk", from: tool.from, to: tool.to };
  } else {
    if (!tool.target) return;
    if (
      tool.type === "transform" &&
      player.state.board[tool.target.y]?.[tool.target.x]?.id !== tool.target.id
    ) {
      tool.target = null;
      return;
    }
    a =
      tool.type === "egg"
        ? { type: "egg", rank: tool.rank, k: tool.to, x: tool.target.x }
        : {
            type: "transform",
            x: tool.target.x,
            y: tool.target.y,
            to: tool.to,
          };
  }
  try {
    token = player.preview(a);
  } catch (e) {
    setStatus(e.message);
  }
}
function renderTool() {
  $("normalRail").hidden = !!tool;
  $("toolPanel").hidden = !tool;
  if (!tool) return;
  $("toolTitle").textContent = {
    egg: `${eggNames[tool.rank]}の卵`,
    transform: "へんしん",
    bulk: "だいへんしん",
  }[tool.type];
  $("toolHint").textContent =
    tool.type === "egg"
      ? tool.to === null
        ? "① 系統を選ぶ"
        : !tool.target
          ? "② 盤面の列をタップ"
          : "③ 着地を見て確定"
      : tool.from === null
        ? "① 対象を選ぶ"
        : tool.to === null
          ? "② 変更先を選ぶ"
          : "③ 金色の輪郭を見て確定";
  $("sourceChoices").replaceChildren();
  $("kindChoices").replaceChildren();
  if (tool.type === "bulk") {
    for (const k of new Set(
      player.state.board
        .flat()
        .filter(Boolean)
        .map((c) => c.k),
    )) {
      const b = document.createElement("button");
      const source = runRoster()[k];
      if (!source) continue;
      b.textContent = `元：${source.label}`;
      b.setAttribute("aria-pressed", tool.from === k);
      b.onclick = () => {
        tool.from = k;
        tool.to = null;
        refreshPreview();
        render();
      };
      $("sourceChoices").append(b);
    }
  }
  if (tool.type === "egg" || tool.from !== null)
    runRoster().forEach((c, k) => {
      if (!c) return;
      const b = document.createElement("button");
      b.textContent = c.label;
      b.dataset.kind = k;
      b.setAttribute("aria-pressed", tool.to === k);
      b.disabled = tool.type !== "egg" && tool.from === k;
      b.onclick = () => {
        tool.to = k;
        refreshPreview();
        render();
      };
      $("kindChoices").append(b);
    });
  $("confirmTool").disabled = !token;
}
function afterAction(kind) {
  tool = null;
  token = null;
  practiceMoves.add(kind);
  if (player.phase === "animating") {
    frameList = animationFrames(
      player.state.last.waves,
      875,
      $("reduced").checked ||
        matchMedia("(prefers-reduced-motion: reduce)").matches,
    ).map((f) => ({
      ...f,
      duration:
        f.events.some((e) => e.death) && ["evolve", "result"].includes(f.phase)
          ? 2500
          : f.phase === "evolve"
            ? 350
            : f.duration,
    }));
    frameAt = 0;
    beginFrame();
  } else {
    currentFrame = null;
    finishAction();
  }
}
function beginFrame() {
  currentFrame = frameList[frameAt];
  frameMs = 0;
  if (!currentFrame) {
    player.settle();
    finishAction();
    return;
  }
  setStatus(
    `${currentFrame.chain}連鎖${currentFrame.events.some((e) => e.death) ? " · いのちが めぐった！" : " · ふわっと成長"}`,
  );
  render();
  const cel = $("celebration");
  cel.replaceChildren();
  const death =
    currentFrame.events.some((e) => e.death) &&
    ["evolve", "result"].includes(currentFrame.phase);
  cel.className = death
    ? "blessing"
    : currentFrame.chain >= 6
      ? "grand-chain"
      : currentFrame.chain >= 4
        ? "bright-chain"
        : "";
  if (currentFrame.phase === "evolve" && !$("reduced").checked) {
    const count = death
      ? 24
      : currentFrame.chain >= 6
        ? 26
        : currentFrame.chain >= 4
          ? 16
          : currentFrame.chain >= 2
            ? 8
            : 3;
    for (let i = 0; i < count; i++) {
      const e = document.createElement("span");
      e.className = "spark";
      e.textContent = "✦";
      e.style.left = `${(i * 37 + 17) % 96}%`;
      e.style.top = `${25 + ((i * 19) % 70)}%`;
      e.style.animationDelay = `${(i % 7) * 0.07}s`;
      cel.append(e);
    }
  }
}
function finishAction() {
  currentFrame = null;
  frameList = [];
  $("celebration").replaceChildren();
  $("celebration").className = "";
  checkPractice();
  render();
  save();
  if (practice >= 0) return;
  if (player.phase === "won")
    dialog(
      "おめでとう！",
      "いのちが めぐった！",
      [
        [
          "この庭でエンドレスへ",
          () => {
            player.continueEndless();
            $("overlay").hidden = true;
            render();
            save();
            if (player.phase === "over") finishAction();
          },
          "continueEndless",
        ],
        ["記録を見る", () => show("records")],
        ["タイトルへ", () => show("title")],
      ],
      "✦ LIFE GOES ON ✦",
    );
  else if (player.phase === "over")
    dialog(
      "ここまで そだったね",
      `${player.state.score.toLocaleString()}点 · ${player.state.drops}セット`,
      [
        ["もう一度", () => start()],
        ["記録を見る", () => show("records")],
        ["タイトルへ", () => show("title")],
      ],
      "THANK YOU FOR GROWING",
    );
}
function motion(op) {
  if (!player?.active || !$("overlay").hidden) return;
  try {
    if (player.motion(op)) {
      practiceMoves.add(op);
      refreshPreview();
      render();
      checkPractice();
    }
  } catch (e) {
    setStatus(e.message);
  }
}
function drop() {
  if (!player?.active || !$("overlay").hidden) return;
  try {
    if (player.drop()) afterAction("drop");
  } catch (e) {
    setStatus("ここには着地できません。位置を変えよう。");
  }
}
for (const op of ["left", "right", "down"])
  holds.push(bindHold($(op), () => motion(op)));
$("ccw").onclick = () => motion("ccw");
$("rotate").onclick = () => motion("rotate");
$("drop").onclick = drop;
$("pause").onclick = pause;
$("transform").onclick = () => beginTool("transform");
$("bulk").onclick = () => beginTool("bulk");
$("cancelTool").onclick = () => {
  tool = null;
  token = null;
  render();
};
$("confirmTool").onclick = () => {
  if (!token || !player.active) return;
  const t = token;
  try {
    player.use(t);
    afterAction(t.action.type);
  } catch (e) {
    token = null;
    setStatus(e.message);
    refreshPreview();
    render();
  }
};
$("playStart").onclick = () => show("modes");
document.querySelectorAll("[data-screen]").forEach(
  (b) =>
    (b.onclick = () => {
      if (b.dataset.screen === "title") {
        player?.pause();
        save();
      }
      show(b.dataset.screen);
    }),
);
document.querySelectorAll("[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.mode;
      show("characters");
    }),
);
$("startSelected").onclick = () => start();
$("restore").onclick = () => {
  try {
    player = Player.restore(data.snapshot);
    mode = player.mode;
    practice = -1;
    tool = null;
    token = null;
    currentFrame = null;
    frameList = [];
    show("game");
    renderPractice();
    render();
    if (["won", "over"].includes(player.phase)) finishAction();
    else pause();
  } catch (e) {
    fatal(e.message);
  }
};
$("reduced").onchange = () => {
  document.body.classList.toggle("reduce", $("reduced").checked);
  save();
};
const practiceTitles = [
  "移動・回転・落下",
  "同種接続と進化",
  "自動連鎖",
  "たまご",
  "へんしん",
  "08寿命消滅",
];
const practiceHints = [
  "左右に動かし、回転して「即時着地」を押そう。",
  "そのまま即時着地。同じ犬の01がつながります。",
  "左へ1回、↷へ1回、即時着地。下から3連鎖！",
  "右の卵→系統→盤面の列→確定。やめても卵は減りません。",
  "へんしん→左下の犬→ペンギン→確定。段階を保って変わります。",
  "へんしんで左下の犬08をペンギンへ。ふたつの08がめぐります。",
];
function renderPractice() {
  $("practiceBar").hidden = practice < 0;
  if (practice < 0) return;
  $("practiceTitle").textContent =
    `${practice + 1} / 6　${practiceTitles[practice]}`;
  $("practiceHint").textContent = practiceHints[practice];
  $("practiceNext").hidden = !practiceDone;
  $("practiceNext").textContent =
    practice === 5 ? "練習をおわる ✦" : "次の練習へ →";
}
function checkPractice() {
  if (practice < 0 || player.phase === "animating") return;
  practiceDone = [
    () =>
      practiceMoves.has("drop") &&
      ["left", "right"].some((x) => practiceMoves.has(x)) &&
      ["rotate", "ccw"].some((x) => practiceMoves.has(x)),
    () => player.maxChain >= 1,
    () => player.maxChain >= 3,
    () => practiceMoves.has("egg"),
    () => practiceMoves.has("transform") || practiceMoves.has("bulk"),
    () => player.deaths > 0,
  ][practice]();
  renderPractice();
  resize();
}
$("learn").onclick = () => {
  mode = "clear";
  start(0);
};
$("practiceNext").onclick = () => {
  if (!practiceDone) return;
  if (practice === 5) {
    data.preferences.tutorialDone = true;
    save();
    show("title");
  } else start(practice + 1);
};
$("practiceSkip").onclick = () => {
  player.pause();
  show("title");
};
// Pointer events suppress synthetic clicks, and treat a two-finger sequence as one gesture.
$("board").addEventListener("pointerdown", (e) => {
  if (!player?.active || !$("overlay").hidden) return;
  e.preventDefault();
  $("board").setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gesture)
    gesture = {
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      time: performance.now(),
      count: 1,
      moved: false,
    };
  else gesture.count = Math.max(gesture.count, pointers.size);
});
$("board").addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  e.preventDefault();
  const cell = $("board").clientWidth / 6,
    dx = e.clientX - gesture.lastX,
    dy = e.clientY - gesture.lastY;
  if (
    Math.abs(e.clientX - gesture.x) > 10 ||
    Math.abs(e.clientY - gesture.y) > 10
  )
    gesture.moved = true;
  if (tool || gesture.count > 1) return;
  if (Math.abs(dx) > cell) {
    motion(dx > 0 ? "right" : "left");
    gesture.lastX = e.clientX;
  }
  if (dy > cell && performance.now() - gesture.time > 350) {
    motion("down");
    gesture.lastY = e.clientY;
  }
});
$("board").addEventListener("pointerup", (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  e.preventDefault();
  pointers.delete(e.pointerId);
  if (pointers.size) return;
  const g = gesture;
  gesture = null;
  const dx = e.clientX - g.x,
    dy = e.clientY - g.y,
    dt = performance.now() - g.time;
  if (tool) {
    if (!g.moved && g.count === 1) {
      const r = $("board").getBoundingClientRect();
      chooseCell(
        Math.min(
          5,
          Math.max(0, Math.floor((e.clientX - r.left) / (r.width / 6))),
        ),
        Math.min(
          13,
          Math.max(2, Math.floor((e.clientY - r.top) / (r.height / 12)) + 2),
        ),
      );
    }
    return;
  }
  if (g.count === 2 && !g.moved && dt < 400) motion("ccw");
  else if (
    g.count === 1 &&
    dy > 40 &&
    dy > Math.abs(dx) &&
    dt < 350 &&
    dy / Math.max(1, dt) > 0.5
  )
    drop();
  else if (g.count === 1 && !g.moved && dt < 350) motion("rotate");
});
$("board").addEventListener("pointercancel", () => {
  pointers.clear();
  gesture = null;
});
window.addEventListener("keydown", (e) => {
  if (
    screen !== "game" ||
    !$("overlay").hidden ||
    /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
  )
    return;
  const op = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "rotate",
    z: "ccw",
  }[e.key];
  if (op) {
    e.preventDefault();
    motion(op);
  } else if (e.code === "Space") {
    e.preventDefault();
    drop();
  } else if (e.key === "Escape") pause();
});
window.addEventListener("blur", () => {
  if (screen === "game") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "game") pause();
});
window.addEventListener("pagehide", () => {
  player?.pause();
  save();
});
window.addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
window.addEventListener("storage", (e) => {
  if (e.key === profile.storeKey && owned)
    fatal("別の画面で保存が更新されました。再読み込みしてください。");
});
document.addEventListener(
  "error",
  (e) => {
    if (e.target.matches?.("img")) {
      e.target.style.visibility = "hidden";
      e.target.parentElement.setAttribute("data-image-missing", "true");
    }
  },
  true,
);
function tick(now) {
  const dt = Math.min(now - lastTime, 1000);
  lastTime = now;
  if (
    owned &&
    screen === "game" &&
    $("overlay").hidden &&
    !document.hidden &&
    player
  ) {
    if (player.active) {
      const revision = player.revision,
        actionsBefore = player.state.actions;
      try {
        if (practice < 0) player.advance(dt);
      } catch (e) {
        player.pause();
        pause();
        setStatus(e.message);
      }
      if (player.revision !== revision) {
        if (player.state.actions !== actionsBefore) {
          afterAction("drop");
        } else {
          refreshPreview();
          render();
        }
      }
    } else if (player.phase === "animating") {
      player.elapsed += dt;
      frameMs += dt;
      if (frameMs >= (currentFrame?.duration || 0)) {
        frameAt++;
        beginFrame();
      }
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
document.querySelector(".edition").textContent = `なおとっち 成長連鎖パズル · ${profile.label}`;
if (profile.trial) {
  document.querySelector(".mini-logo").textContent = `比較 ${profile.gaugeUnit}／${profile.gaugeUnit * 3}`;
  document.querySelector("#records h2").textContent = `比較 ${profile.gaugeUnit}／${profile.gaugeUnit * 3} のきろく`;
}
$("hero").innerHTML = ["penguin", "dog", "mushroom"]
  .map((id) => `<img src="${image(id, 5)}" alt="">`)
  .join("");
ownPlayer(navigator.locks, async () => {
  owned = true;
  data = store.load();
  const valid = (data.preferences.selected || []).filter((id) =>
    roster.some((c) => c.id === id),
  );
  if (valid.length === 5 && new Set(valid).size === 5) selected = valid;
  $("reduced").checked = !!data.preferences.reduced;
  document.body.classList.toggle("reduce", $("reduced").checked);
  $("firstTip").hidden = !!data.preferences.tutorialDone;
  $("restore").hidden = !data.snapshot;
  $("playStart").disabled = false;
  $("playStart").textContent = "あそぶ";
  await new Promise(() => {});
}).catch((e) => {
  $("bootError").textContent = e.message;
  $("playStart").textContent = "この画面では開始できません";
  $("playStart").disabled = true;
  owned = false;
});
