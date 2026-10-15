import { Player, directPreview, toolTransaction } from "./player-model.mjs";
import {
  createSession,
  poseCells,
  landing,
  applyAction,
  replay,
} from "./session.mjs";
import { groups } from "./engine.mjs";
import { catalog } from "../growth-chain/catalog.mjs";
import { INITIAL_SPECIES, imagePath } from "../growth-chain/roster.mjs";
import { PlayerStore } from "../growth-chain/player-store.mjs";
import { bindHold } from "../growth-chain/touch-input.mjs";
import { effects, eggEffects } from "./effects.mjs";
const $ = (id) => document.getElementById(id),
  KEY = "naopoyo-growth-clear-phone-v1";
let storageAvailable = true,
  storage;
try {
  storage = window.localStorage;
} catch {
  storageAvailable = false;
  storage = {
    getItem: () => null,
    setItem: () => {
      throw Error("保存が許可されていません");
    },
  };
}
const store = new PlayerStore(storage, KEY);
let data,
  writable = false,
  player,
  tool = null,
  frames = [],
  frame = null,
  frameMs = 0,
  lastTime = performance.now(),
  audio = null;
let selected = [...INITIAL_SPECIES],
  revision = -1,
  lastAction = -1,
  gesture = null;
const eggNames = ["普通", "銀", "金", "プラチナ"];
function say(t) {
  $("instruction").textContent = t;
}
function image(k, s = 1) {
  const id = player?.state.species?.[k] || selected[k];
  const path = imagePath(
    catalog.find((c) => c.id === id),
    s,
  );
  return window.GROWTH_CLEAR_IMAGES?.[path] || path;
}
function piece(c) {
  return `<img src="${image(c.k, c.s)}" alt="" draggable="false"><span class="stage">${String(c.s).padStart(2, "0")}</span>`;
}
function save() {
  if (!writable || !player || player.practice) return;
  const snap = player.snapshot();
  if (!snap) return;
  try {
    data = store.save(snap, player.records, {
      selected,
      sound: $("sound").checked,
      reduced: $("reduced").checked,
    });
    $("storage-status").textContent = "この試遊専用の保存データです。";
  } catch (e) {
    writable = false;
    $("storage-status").textContent = e.message;
  }
}
function start() {
  const seed = Number($("seed").value);
  if (!Number.isSafeInteger(seed)) {
    say("seedは整数を入力してください");
    return;
  }
  const state = createSession(seed, {
    gaugeUnit: Number($("cost").value),
    anchor: "A",
  });
  state.species = [...selected];
  player = new Player(state);
  frames = [];
  frame = null;
  tool = null;
  player.resume();
  $("menu").close();
  lastTime = performance.now();
  say("どの種族でもいい。ひとつの命を08へ。");
  render();
  save();
}
function finish() {
  frame = null;
  player.settle();
  if (player.phase === "won") {
    say("おめでとう！ いのちが めぐった！");
    $("celebrate").textContent = "おめでとう！\nいのちが めぐった！";
  } else if (player.phase === "over") {
    say("おつかれさま！ 設定からもう一度あそぼう");
  }
  save();
  render();
}
function tone(chain) {
  if (!$("sound").checked || !audio) return;
  try {
    const t = audio.currentTime;
    for (let i = 0; i < (chain >= 5 ? 3 : chain >= 3 ? 2 : 1); i++) {
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = "sine";
      o.frequency.value = 330 * Math.pow(2, (Math.min(chain, 10) + i * 4) / 12);
      g.gain.setValueAtTime(0.035, t + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18 + i * 0.04);
      o.connect(g).connect(audio.destination);
      o.start(t + i * 0.04);
      o.stop(t + 0.2 + i * 0.04);
    }
  } catch {}
}
function nextFrame() {
  frame = frames.shift() || null;
  frameMs = 0;
  if (!frame) {
    finish();
    return;
  }
  if (frame.phase === "connect" || frame.phase === "result") tone(frame.chain);
  render();
}
function animate(prefix = []) {
  tool = null;
  frames = [
    ...prefix,
    ...effects(player.state.last?.waves || [], $("reduced").checked),
  ];
  if (frames.length) {
    player.phase = "animating";
    nextFrame();
  } else finish();
}
function dropped() {
  animate();
}
function motion(op) {
  if (player?.active) {
    try {
      player.motion(op);
      render();
    } catch (e) {
      say(e.message);
    }
  }
}
function hard() {
  if (!player?.active) return;
  try {
    if (player.drop()) dropped();
  } catch (e) {
    say("この位置には置けません。横へ移動してください。");
  }
}
function execute(action, expectedId) {
  try {
    if (!player.active) throw Error("連鎖が終わってから選んでください");
    toolTransaction(player.state, player.pose, action, expectedId);
    const direct = directPreview(player.state, action);
    const token = player.preview(action);
    player.use(token);
    animate(
      action.type === "egg" ? eggEffects(direct, $("reduced").checked) : [],
    );
    say(action.type === "egg" ? "新しい命が生まれた！" : "へんしん！");
  } catch (e) {
    say(e.message);
    render();
  }
}
function chooseTool(type, rank) {
  if (!player?.active) return;
  tool = { type, rank, step: type === "transform" ? "cell" : "species" };
  say(
    type === "egg"
      ? "孵化する種族を選んでください"
      : type === "bulk"
        ? "変更前の種族を選んでください"
        : "変える盤面キャラを選んでください",
  );
  render();
}
function chooseKind(k) {
  if (!tool || !player.active) return;
  if (tool.type === "egg") {
    tool.k = k;
    tool.step = "column";
    say("置く列をタップしてください");
  } else if (tool.type === "bulk" && tool.from === undefined) {
    tool.from = k;
    tool.step = "destination";
    say("変更後の種族を選ぶと実行します");
  } else if (tool.type === "bulk") {
    execute({ type: "bulk", from: tool.from, to: k });
    return;
  } else if (tool.type === "transform" && tool.target) {
    const t = tool.target;
    execute({ type: "transform", x: t.x, y: t.y, to: k }, t.id);
    return;
  }
  render();
}
function cellTap(x, y) {
  if (!player?.active) return;
  if (tool?.type === "egg" && tool.step === "column") {
    execute({ type: "egg", rank: tool.rank, k: tool.k, x });
    return;
  }
  if (tool?.type === "transform") {
    const c = player.state.board[y][x];
    if (!c) {
      say("盤面にいるキャラを選んでください");
      return;
    }
    tool.target = { ...c, x, y };
    tool.step = "destination";
    say("変更後の種族を選ぶと実行します");
    render();
    return;
  }
  if (!tool) motion("rotate");
}
function render() {
  if (!player) return;
  revision = player.revision;
  lastAction = player.state.actions;
  document.body.classList.toggle("reduced", $("reduced").checked);
  const s = player.state,
    b = frame?.board || s.board;
  const active = player.active ? poseCells(player.pose) : [],
    ghost = player.active ? poseCells(landing(s.board, player.pose)) : [];
  let candidateBoard = b;
  if (player.active && !tool) {
    try {
      candidateBoard =
        applyAction(s, { type: "drop", path: [...player.path, "hard"] }).last
          .waves[0]?.before || b;
    } catch {}
  }
  const candidates = new Set(
    groups(candidateBoard)
      .flat()
      .map((c) => `${c.x}:${c.y}`),
  );
  $("board").replaceChildren();
  for (let y = 2; y < 14; y++)
    for (let x = 0; x < 6; x++) {
      let c = b[y][x],
        a = active.findIndex((p) => p.x === x && p.y === y),
        g = ghost.findIndex((p) => p.x === x && p.y === y);
      const button = document.createElement("button");
      button.className = "cell";
      button.dataset.x = x;
      button.dataset.y = y;
      if (a >= 0) {
        c = s.queue[0][a];
        button.classList.add("active");
      } else if (!c && g >= 0) {
        c = s.queue[0][g];
        button.classList.add("ghost");
      }
      if (c) {
        button.innerHTML = piece(c);
        button.setAttribute(
          "aria-label",
          `${x + 1}列${y - 1}段 ${catalog.find((v) => v.id === (s.species || selected)[c.k])?.label} ${c.s}`,
        );
      } else button.setAttribute("aria-label", `${x + 1}列${y - 1}段 空`);
      if (
        (tool?.target?.id && b[y][x]?.id === tool.target.id) ||
        (tool?.from !== undefined && b[y][x]?.k === tool.from) ||
        (tool?.type === "egg" && tool.step === "column" && y === 13)
      )
        button.classList.add("target");
      if (candidates.has(`${x}:${y}`)) button.classList.add("candidate");
      if (frame) {
        button.classList.add(frame.phase);
        for (const e of frame.events) {
          if (
            e.members?.some((m) => m.x === x && m.y === y) ||
            (e.anchor?.x === x && e.anchor?.y === y)
          )
            button.classList.add(
              e.death ? "death" : e.mixed ? "mixed" : "evolution",
            );
        }
        if (frame.placed?.x === x && frame.placed?.y === y)
          button.classList.add(frame.phase);
        else if (["eggfall", "crack", "hatch"].includes(frame.phase))
          button.classList.remove(frame.phase);
        const m = frame.moves?.find((m) => m.to?.x === x && m.to?.y === y);
        if (m?.from)
          button.style.setProperty("--fall", `${(m.from.y - y) * 100}%`);
      }
      button.addEventListener("click", (e) => {
        if (e.detail === 0) cellTap(x, y);
      });
      $("board").append(button);
    }
  $("next").innerHTML = s.queue
    .slice(1)
    .map(
      (pair, i) =>
        `<div>NEXT${i + 1}${pair.map((c) => `<span class="mini">${piece(c)}</span>`).join("")}</div>`,
    )
    .join("");
  $("score").textContent = `${s.score}点 · ${s.drops}組`;
  $("gauge").textContent = s.gauge;
  $("cost-label").textContent =
    `費用 ${s.rules.gaugeUnit} / ${s.rules.gaugeUnit * 3}`;
  const n08 = s.board.flat().filter((c) => c?.s === 8).length;
  $("progress").textContent = `08：${n08}体 · 最大${player.maxChain}連鎖`;
  $("eggs").replaceChildren();
  s.eggs.forEach((n, rank) => {
    const b = document.createElement("button");
    b.textContent = `🥚${eggNames[rank]} ${n}`;
    b.dataset.rank = rank;
    b.disabled = !player.active || !n;
    b.onclick = () => chooseTool("egg", rank);
    $("eggs").append(b);
  });
  for (const [id, m] of [
    ["transform", 1],
    ["bulk", 3],
  ]) {
    $(id).disabled = !player.active || s.gauge < s.rules.gaugeUnit * m;
    $(id).querySelector("small").textContent = s.rules.gaugeUnit * m;
  }
  $("choices").replaceChildren();
  if (tool) {
    if (tool.target || tool.from !== undefined) {
      const img = document.createElement("img");
      img.src = image(tool.target?.k ?? tool.from, tool.target?.s || 1);
      img.alt = "変更前";
      img.className = "before";
      $("choices").append(img, document.createTextNode("→"));
    }
    if (tool.step !== "cell" && tool.step !== "column")
      for (let k = 0; k < 5; k++) {
        const b = document.createElement("button");
        b.innerHTML = `<img src="${image(k, tool.target?.s || (tool.type === "egg" ? tool.rank + 1 : 1))}" alt="${catalog.find((c) => c.id === (s.species || selected)[k])?.label}">`;
        b.disabled = k === (tool.target?.k ?? tool.from);
        b.onclick = () => chooseKind(k);
        $("choices").append(b);
      }
    if (tool.step === "column") {
      const img = document.createElement("img");
      img.src = image(tool.k, tool.rank + 1);
      img.alt = "孵化する種族";
      $("choices").append(img, document.createTextNode("↓ 盤面の列をタップ"));
    }
  }
  for (const b of document.querySelectorAll("[data-move],#drop"))
    b.disabled = !player.active;
  $("cancel").disabled = !tool;
  const count = frame?.chain || 0;
  $("celebrate").className =
    (count >= 3 ? "stars " : "") + (count >= 5 ? "legend" : "");
  if (player.phase !== "won")
    $("celebrate").textContent =
      count >= 2
        ? `${count}連鎖！`
        : frame?.events.some((e) => e.death)
          ? "いのちが めぐった！"
          : "";
}
for (const b of document.querySelectorAll("[data-move]"))
  bindHold(b, () => motion(b.dataset.move));
$("drop").onclick = hard;
$("transform").onclick = () => chooseTool("transform");
$("bulk").onclick = () => chooseTool("bulk");
$("cancel").onclick = () => {
  tool = null;
  say("選択を取り消しました");
  render();
};
$("board").addEventListener("pointerdown", (e) => {
  if (gesture || !player?.active) return;
  e.preventDefault();
  const c = e.target.closest(".cell");
  if (!c) return;
  gesture = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    col: Number(c.dataset.x),
    row: Number(c.dataset.y),
  };
  $("board").setPointerCapture?.(e.pointerId);
});
$("board").addEventListener("pointerup", (e) => {
  if (!gesture || gesture.id !== e.pointerId) return;
  const g = gesture;
  gesture = null;
  const dx = e.clientX - g.x,
    dy = e.clientY - g.y;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) cellTap(g.col, g.row);
  else if (!tool) {
    if (Math.abs(dx) > Math.abs(dy)) {
      for (
        let i = 0;
        i < Math.min(5, Math.max(1, Math.round(Math.abs(dx) / 35)));
        i++
      )
        motion(dx > 0 ? "right" : "left");
    } else if (dy > 35) hard();
    else if (dy < -25) motion("rotate");
  }
});
$("board").addEventListener("pointercancel", () => (gesture = null));
window.addEventListener("blur", () => (gesture = null));
function openMenu() {
  player?.pause();
  save();
  tool = null;
  $("records").textContent =
    (data?.history || [])
      .map(
        (r) =>
          `${r.outcome === "clear" ? "寿命達成" : "終了"} · ${r.score}点 · ${r.drops}組 · ${r.maxChain}連鎖`,
      )
      .join("\n") || "まだ記録はありません";
  $("menu").showModal();
  render();
}
$("pause").onclick = openMenu;
$("resume").onclick = () => {
  $("menu").close();
  player?.resume();
  lastTime = performance.now();
  save();
  render();
};
$("menu").addEventListener("cancel", (e) => {
  e.preventDefault();
  $("resume").click();
});
$("new").onclick = start;
$("sound").onchange = () => {
  if ($("sound").checked) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) {
      audio ??= new Audio();
      audio.resume();
    }
  }
};
$("reduced").checked =
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
for (let i = 0; i < 5; i++) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", `使用種族${i + 1}`);
  for (const c of catalog) select.add(new Option(c.label, c.id));
  select.value = selected[i];
  select.onchange = () => {
    if (selected.some((id, j) => j !== i && id === select.value)) {
      select.value = selected[i];
      return;
    }
    selected[i] = select.value;
  };
  $("roster").append(select);
}
$("replay").onclick = async () => {
  try {
    save();
    const key = $("example").value;
    let witness = window.GROWTH_CLEAR_WITNESSES?.[key];
    if (!witness) {
      const response = await fetch(`./witnesses/${key}.json`);
      if (!response.ok) throw Error("再生記録を取得できません");
      witness = await response.json();
    }
    const { record } = witness;
    replay(record);
    let state = structuredClone(record.initial);
    for (const a of record.actions) state = applyAction(state, a, true);
    player = new Player(state, { practice: true });
    player.state.species = [...INITIAL_SPECIES];
    player.maxChain = state.last.waves.length;
    player.deaths = state.last.deaths;
    player.resume();
    $("menu").close();
    animate();
    say("代表記録の再生（練習・保存対象外）");
  } catch (e) {
    say(e.message);
  }
};
$("back").onclick = () => {
  try {
    if (!data?.snapshot) throw Error("保存したゲームはまだありません");
    player = Player.restore(data.snapshot);
    frames = [];
    frame = null;
    tool = null;
    player.resume();
    $("menu").close();
    lastTime = performance.now();
    render();
  } catch (e) {
    say(e.message);
  }
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden && player) {
    player.pause();
    save();
    if (!$("menu").open) $("menu").showModal();
  }
  lastTime = performance.now();
});
window.addEventListener("pagehide", save);
function tick(now) {
  const dt = Math.max(0, Math.min(100, now - lastTime));
  lastTime = now;
  if (player && !document.hidden) {
    if (player.phase === "animating") {
      frameMs += dt;
      if (frame && frameMs >= frame.duration) nextFrame();
    } else if (player.active) {
      const before = player.state.actions;
      try {
        player.advance(dt);
      } catch (e) {
        say("天井に近いので横へ移動してください。");
      }
      if (player.state.actions !== before) dropped();
      else if (player.revision !== revision) render();
    }
  }
  requestAnimationFrame(tick);
}
try {
  data = store.load();
  if (data.preferences.selected?.length === 5) {
    selected = [...data.preferences.selected];
    [...$("roster").children].forEach((s, i) => (s.value = selected[i]));
  }
  if (data.snapshot) player = Player.restore(data.snapshot);
  else {
    const state = createSession(214, { gaugeUnit: 2 });
    state.species = [...selected];
    player = new Player(state);
  }
  render();
  $("menu").showModal();
  if (navigator.locks) {
    navigator.locks.request(
      KEY + "-owner",
      { ifAvailable: true },
      async (lock) => {
        writable = !!lock;
        $("storage-status").textContent = lock
          ? "専用保存を利用できます。"
          : "別タブが保存中です。この画面は保存しません。";
        if (lock) await new Promise(() => {});
      },
    );
  } else {
    writable = storageAvailable;
    $("storage-status").textContent = storageAvailable
      ? "この試遊は1つのタブで開いてください。保存の更新競合は検知します。"
      : "保存が許可されていません。保存なしで試遊できます。";
  }
} catch (e) {
  $("storage-status").textContent = `保存を上書きせず停止：${e.message}`;
  $("new").disabled = true;
  $("resume").disabled = true;
  $("menu").showModal();
}
requestAnimationFrame(tick);
