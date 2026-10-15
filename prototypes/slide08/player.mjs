import { frames, slideMoves } from "./animation.mjs";
import { stage, kind, step, landing } from "./engine.mjs";
import {
  newRun,
  advance,
  undo,
  restore,
  hasMoves,
  record,
} from "./player-model.mjs";
import { SlideStore } from "./player-store.mjs";
import { Settings } from "../naopoyo/settings.mjs";
import { readRoster, imagePath } from "../growth-chain/roster.mjs";
import { proofs } from "./player-catalog.mjs";
import { verifyProof } from "./proof-browser.mjs";
const $ = (id) => document.getElementById(id),
  roster = readRoster(localStorage),
  allowed = roster.map((c) => c.id),
  settings = new Settings(localStorage, allowed),
  store = new SlideStore(localStorage);
let prefs,
  data,
  p = null,
  selection = [],
  owned = false,
  busy = false,
  paused = true,
  tool = null,
  clock = performance.now(),
  loadToken = 0,
  lastSave = 0;
const eggIcon = (rank) => `<i class="egg-icon rank-${rank}" aria-hidden="true">${["•","≋","★","✧"][rank]}</i>`;
const eggNames = ["普通", "銀", "金", "プラチナ"];
const time = (ms) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
function image(id, s = 4) {
  const img = document.createElement("img");
  img.src = imagePath(
    roster.find((c) => c.id === id),
    s,
  );
  img.alt = "";
  img.draggable = false;
  return img;
}
function choice(id, callback, selected = false) {
  const b = document.createElement("button");
  b.type = "button";
  b.append(image(id));
  const small = document.createElement("small");
  small.textContent = roster.find((c) => c.id === id).label;
  b.append(small);
  b.setAttribute("aria-label", small.textContent);
  b.classList.toggle("selected", selected);
  b.onclick = () => {
    if (!busy) callback();
  };
  b.disabled = busy;
  return b;
}
function modal(title, text, buttons) {
  $("dialogTitle").textContent = title;
  $("dialogText").textContent = text;
  $("dialogChoices").replaceChildren(
    ...buttons.map(([label, fn]) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = () => {
        $("dialog").close();
        fn();
      };
      return b;
    }),
  );
  if (!$("dialog").open) $("dialog").showModal();
}
$("dialog").addEventListener("cancel", (e) => e.preventDefault());
function error(e) {
  paused = true;
  owned = false;
  busy = false;
  $("boot").textContent = e.message;
  $("start").disabled = true;
  modal("保存を確認してください", e.message, [
    ["再読み込み", () => location.reload()],
    ["モード選択へ", () => (location.href = "../naopoyo/")],
  ]);
}
function save(r = null) {
  if (!owned) return;
  try {
    data = store.save(p, r);
  } catch (e) {
    error(e);
  }
}
function setup() {
  $("sets").replaceChildren(
    ...prefs.sets.map((_, i) => {
      const b = document.createElement("button");
      b.textContent = `セット${i + 1}`;
      b.classList.toggle("primary", i === prefs.active);
      b.disabled = busy;
      b.onclick = () => {
        if (busy) return;
        prefs.active = i;
        selection = prefs.sets[i].slice(0, 3);
        prefs.slide = selection;
        settings.save(prefs);
        setup();
      };
      return b;
    }),
  );
  $("choices").replaceChildren(
    ...prefs.sets[prefs.active].map((id) =>
      choice(
        id,
        () => {
          selection = selection.includes(id)
            ? selection.filter((x) => x !== id)
            : selection.length < 3
              ? [...selection, id]
              : selection;
          if (selection.length === 3) {
            prefs.slide = [...selection];
            settings.save(prefs);
          }
          setup();
        },
        selection.includes(id),
      ),
    ),
  );
  $("count").textContent = `${selection.length} / 3種族`;
  $("start").disabled = !owned || busy || selection.length !== 3;
  $("restore").hidden = !data.snapshot || data.snapshot.ended;
  $("restore").disabled = busy;
}
async function certificate(file) {
  if (!proofs.includes(file)) throw Error("通常プレイ対象外の盤面です");
  const response = await fetch(`balance-20261015/results/${file}`);
  if (!response.ok) throw Error("盤面を読み込めません");
  const cert = await verifyProof(await response.json());
  const c = cert.initial.config;
  if (
    c.size !== 6 ||
    c.count !== 30 ||
    c.kinds !== 3 ||
    c.single !== 2 ||
    c.bulk !== 6 ||
    c.maxStage !== 4 ||
    c.initialGauge !== 4 ||
    c.cap !== 24 ||
    JSON.stringify(c.initialEggs) !== "[2,1,0,0]"
  )
    throw Error("標準設定と不一致");
  return cert;
}
async function start(file = null) {
  if (!owned || busy) return;
  busy = true;
  setup();
  const ticket = ++loadToken,
    chosen = [...selection];
  $("boot").textContent = "盤面を準備しています…";
  try {
    const next =
      file ||
      proofs[
        (p
          ? proofs.indexOf(p.proof) + 1
          : Math.floor(Math.random() * proofs.length)) % proofs.length
      ];
    const cert = await certificate(next);
    if (ticket !== loadToken) return;
    p = newRun(cert.initial, chosen, next);
    busy = false;
    paused = false;
    clock = performance.now();
    tool = null;
    save();
    showGame();
    if (document.hidden) pause();
  } catch (e) {
    busy = false;
    $("boot").textContent = e.message;
    paused = true;
    $("setup").hidden = false;
    $("game").hidden = true;
    setup();
  }
}
function showGame() {
  $("setup").hidden = true;
  $("game").hidden = false;
  render();
}
function preview(a) {
  if (!p || busy) return;
  const r = step(p.state, a);
  for (const el of $("board").children) el.classList.remove("candidate");
  if (r.valid)
    for (const w of r.waves)
      for (const ev of w.events)
        for (const i of ev.cells)
          $("board").children[i]?.classList.add("candidate");
}
function render(visualBoard = null) {
  if (!p) return;
  const s = p.state;
  $("board").replaceChildren(
    ...(visualBoard || s.board).map((v, i) => {
      const b = document.createElement("button");
      b.dataset.index = i;
      b.setAttribute(
        "aria-label",
        `${Math.floor(i / 6) + 1}行 ${(i % 6) + 1}列 ${v ? roster.find((c) => c.id === p.species[kind(v)]).label + " " + stage(v) : "空き"}`,
      );
      if (v) {
        b.append(image(p.species[kind(v)], stage(v)));
        const n = document.createElement("span");
        n.className = "stage";
        n.textContent = String(stage(v)).padStart(2, "0");
        b.append(n);
      }
      b.onclick = () => {
        if (busy || paused || !tool) return;
        if (tool.type === "single" && v) {
          tool.index = i;
          render();
        }
      };
      if (tool?.index === i) b.classList.add("target");
      return b;
    }),
  );
  $("time").textContent = time(p.elapsedMs);
  $("moves").textContent = s.moves;
  $("eight").textContent = s.board.filter((v) => stage(v) === 8).length;
  $("gaugeMeter").value = s.gauge;
  $("gauge").textContent = `${s.gauge} / ${s.config.cap}`;
  $("practice").textContent = p.practice ? "れんしゅう記録" : "通常記録";
  $("undo").disabled = busy || paused || !p.previous || p.ended;
  $("eggs").replaceChildren(
    ...s.eggs.map((n, rank) => {
      const b = document.createElement("button");
      b.innerHTML = `${eggIcon(rank)} ${eggNames[rank]}<small>×${n}</small>`;
      b.disabled = !n || busy || paused;
      b.onclick = () => {
        tool = { type: "egg", rank };
        render();
      };
      return b;
    }),
  );
  $("single").disabled = busy || paused || s.gauge < 2;
  $("bulk").disabled = busy || paused || s.gauge < 6;
  $("tools").hidden = !!tool;
  $("picker").hidden = !tool;
  $("arena").classList.toggle(
    "egg-mode",
    tool?.type === "egg" && Number.isInteger(tool.kind),
  );
  for (const [id, dir, arrow] of [
    ["top", "down", "↓"],
    ["bottom", "up", "↑"],
    ["leftEdge", "right", "→"],
    ["rightEdge", "left", "←"],
  ]) {
    $(id).replaceChildren(
      ...Array.from({ length: 6 }, (_, lane) => {
        const b = document.createElement("button");
        b.textContent = arrow;
        b.setAttribute("aria-label", `${id} ${lane + 1}から卵を入れる`);
        const a = {
          type: "egg",
          rank: tool?.rank,
          kind: tool?.kind,
          dir,
          lane,
        };
        b.disabled = busy || paused || landing(s, dir, lane) < 0;
        b.onpointerenter = () => preview(a);
        b.onfocus = () => preview(a);
        b.onclick = () => act(a);
        return b;
      }),
    );
  }
  if (tool) renderTool();
}
function renderTool() {
  const t = tool;
  $("toolTitle").textContent =
    t.type === "egg"
      ? `${eggNames[t.rank]}の卵`
      : t.type === "single"
        ? "へんしん"
        : "だいへんしん";
  $("sources").replaceChildren();
  $("targets").replaceChildren();
  $("sourceLabel").textContent = "";
  $("targetLabel").textContent = "";
  if (t.type === "single" && !Number.isInteger(t.index)) {
    $("status").textContent = "変更したいキャラをタップ";
    return;
  }
  if (t.type === "bulk") {
    $("sourceLabel").textContent = "変更前";
    $("targetLabel").textContent = "変更後";
    $("sources").replaceChildren(
      ...p.species.map((id, k) => {
        const b = choice(
          id,
          () => {
            tool.from = k;
            render();
          },
          t.from === k,
        );
        b.disabled = !p.state.board.some((v) => v && kind(v) === k);
        return b;
      }),
    );
  }
  $("targets").replaceChildren(
    ...p.species.map((id, k) => {
      const a =
        t.type === "single"
          ? { type: "single", index: t.index, kind: k }
          : { ...t, kind: k };
      const b = choice(
        id,
        () => {
          if (t.type === "egg") {
            tool.kind = k;
            render();
            $("status").textContent = "外周の矢印をタップして投入";
          } else act(a);
        },
        t.kind === k,
      );
      b.disabled =
        t.type === "single"
          ? kind(p.state.board[t.index]) === k
          : t.type === "bulk"
            ? t.from === undefined || t.from === k
            : false;
      b.onpointerenter = () => {
        if (t.type !== "egg") preview(a);
      };
      b.onfocus = b.onpointerenter;
      return b;
    }),
  );
  $("status").textContent =
    t.type === "egg"
      ? t.kind === undefined
        ? "孵化する種族を選ぼう"
        : "外周から卵を入れよう"
      : t.type === "single"
        ? "変更後の種族を選ぼう"
        : "変更前 → 変更後を選ぼう";
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function act(a) {
  if (!owned || busy || paused || !p || p.ended) return;
  tick();
  const before = structuredClone(p.state);
  const r = advance(p, a);
  if (!r.valid) {
    $("status").textContent = "ここでは使えません（消費なし）";
    return;
  }
  busy = true;
  tool = null;
  save();
  const visualFrames = frames(before, a, r);
  render(before.board);
  document.body.classList.add("busy");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    if (!reduced) {
      if (a.type === "slide") {
        render(visualFrames[0].board);
        const duration = Number($("slideSpeed")?.value) || 240;
        const cells = [...$("board").children];
        const motions = slideMoves(before.board, before.config.size, a.dir).map(({from,to}) => {
          const img = cells[to].querySelector("img");
          if (!img || !img.animate || from === to) return Promise.resolve();
          const origin = cells[from].getBoundingClientRect(), target = cells[to].getBoundingClientRect();
          return img.animate([{transform:`translate(${origin.x-target.x}px,${origin.y-target.y}px)`},{transform:"translate(0,0)"}],{duration,easing:"cubic-bezier(.2,.65,.3,1)"}).finished;
        });
        await Promise.all([...motions, wait(duration)]);
      }
      if (a.type === "egg") {
        const at = landing(before, a.dir, a.lane),
          cell = $("board").children[at];
        const egg = document.createElement("span");
        egg.className = "flying-egg";
        egg.innerHTML = eggIcon(a.rank);
        egg.setAttribute("aria-hidden", "true");
        cell.append(egg);
        const b = $("board").getBoundingClientRect(),
          c = cell.getBoundingClientRect();
        const dx =
          a.dir === "right"
            ? b.left - c.left - c.width
            : a.dir === "left"
              ? b.right - c.left
              : 0;
        const dy =
          a.dir === "down"
            ? b.top - c.top - c.height
            : a.dir === "up"
              ? b.bottom - c.top
              : 0;
        if (egg.animate)
          await egg.animate(
            [
              { transform: `translate(${dx}px,${dy}px)` },
              { transform: "translate(0,0)" },
            ],
            { duration: 350, easing: "ease-out" },
          ).finished;
        else await wait(350);
        egg.textContent = "◌";
        egg.classList.add("cracking");
        await wait(150);
        egg.textContent = "✧";
        await wait(150);
        egg.remove();
      }
      render(visualFrames[0].board);
      for (const f of visualFrames.slice(1)) {
        $("effect").textContent =
          `${"✦".repeat(Math.min(f.chain, 5))} ${f.chain}連鎖`;
        for (const e of f.events)
          for (const i of e.cells)
            $("board").children[i]?.classList.add(e.death ? "vanish" : "pulse");
        await wait(300);
        render(f.board);
      }
      if (r.state.won) {
        $("effect").textContent = "✧ いのちが めぐった ✧";
        $("effect").classList.add("lit");
        await wait(1000);
      }
    }
  } finally {
    $("effect").textContent = "";
    $("effect").classList.remove("lit");
    document.body.classList.remove("busy");
    busy = false;
  }
  if (!owned) return;
  render();
  $("status").textContent = r.waves.length
    ? `${r.waves.length}連鎖！`
    : "上下左右にスワイプ";
  if (p.state.won || !hasMoves(p.state)) finish();
}
function finish() {
  tick();
  paused = true;
  p.ended = true;
  save(record(p));
  render();
  const won = p.state.won;
  modal(
    won ? "おめでとう！" : "ここまで そだったね",
    `${won ? "いのちが めぐった！" : "つぎは どんなふうに つなげよう？"}\n${p.practice ? (won ? "れんしゅうクリア" : "れんしゅう記録") : ""}\n時間 ${time(p.elapsedMs)} · ${p.state.moves}手 · ${p.state.score}点${won ? "\n" + p.deaths.map((k) => roster.find((c) => c.id === p.species[k]).label).join("・") : ""}`,
    [
      ["同じ盤面でもう一度", () => start(p.proof)],
      ["別の盤面で遊ぶ", () => start()],
      ["モード選択へ戻る", () => (location.href = "../naopoyo/")],
    ],
  );
}
function tick() {
  const now = performance.now();
  if (p && !paused && !p.ended && !document.hidden)
    p.elapsedMs += Math.max(0, now - clock);
  clock = now;
}
function pause() {
  if (!p || p.ended || paused) return;
  tick();
  paused = true;
  save();
  render();
  modal("ひとやすみ", "準備ができたら、つづきを育てよう。", [
    [
      "再開",
      () => {
        paused = false;
        clock = performance.now();
        render();
      },
    ],
    ["モード選択へ戻る", () => (location.href = "../naopoyo/")],
  ]);
}
$("pause").onclick = pause;
$("back").onclick = pause;
$("start").onclick = () => {
  if (data.snapshot && !data.snapshot.ended)
    modal("新しくはじめる？", "途中のプレイを新しい盤面に置き換えます。", [
      ["新しくはじめる", () => start()],
      ["つづきを残す", () => {}],
    ]);
  else start();
};
$("restore").onclick = async () => {
  if (busy || !owned) return;
  busy = true;
  setup();
  try {
    const restored = restore(data.snapshot, allowed);
    const cert = await certificate(restored.proof);
    if (JSON.stringify(cert.initial) !== JSON.stringify(restored.initial))
      throw Error("保存と盤面の不一致");
    p = restored;
    selection = [...p.species];
    paused = true;
    busy = false;
    showGame();
    if (p.state.won || !hasMoves(p.state)) {
      finish();
      return;
    }
    modal(
      "つづきから",
      p.practice ? "れんしゅう記録を再開します" : "保存した盤面を再開します",
      [
        [
          "再開",
          () => {
            paused = false;
            clock = performance.now();
            render();
          },
        ],
      ],
    );
  } catch (e) {
    busy = false;
    error(e);
  }
};
$("single").onclick = () => {
  tool = { type: "single" };
  render();
};
$("bulk").onclick = () => {
  tool = { type: "bulk" };
  render();
};
$("cancel").onclick = () => {
  tool = null;
  render();
  $("status").textContent = "上下左右にスワイプ";
};
$("undo").onclick = () => {
  if (busy || paused) return;
  const go = () => {
    if (undo(p, true)) {
      tool = null;
      save();
      render();
      $("status").textContent = "1手戻しました";
    }
  };
  if (p.practice) go();
  else
    modal(
      "1手戻しますか？",
      "このプレイはれんしゅう記録になり、通常ランキングには残りません",
      [
        ["戻す", go],
        ["キャンセル", () => {}],
      ],
    );
};
let pointer = null;
$("board").addEventListener("pointerdown", (e) => {
  if (pointer) {
    pointer = null;
    return;
  }
  if (busy || paused || tool) return;
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  $("board").setPointerCapture(e.pointerId);
});
$("board").addEventListener("pointerup", (e) => {
  if (!pointer || pointer.id !== e.pointerId) return;
  const dx = e.clientX - pointer.x,
    dy = e.clientY - pointer.y;
  pointer = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  act({
    type: "slide",
    dir:
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
  });
});
$("board").addEventListener("pointercancel", () => (pointer = null));
window.addEventListener("keydown", (e) => {
  if ($("dialog").open || tool || $("game").hidden) return;
  const dir = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
  }[e.key];
  if (dir) {
    e.preventDefault();
    act({ type: "slide", dir });
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pointer = null;
    pause();
  }
});
window.addEventListener("pagehide", () => {
  tick();
  paused = true;
  save();
});
setInterval(() => {
  tick();
  if (p) {
    $("time").textContent = time(p.elapsedMs);
    if (!paused && performance.now() - lastSave > 5000) {
      save();
      lastSave = performance.now();
    }
  }
}, 250);
try {
  prefs = settings.load();
  selection = [...prefs.slide];
  if (!navigator.locks)
    throw Error("安全な保存のため、対応するSafariで開いてください");
  navigator.locks
    .request("naopoyo-slide-owner-v1", { ifAvailable: true }, async (lock) => {
      if (!lock)
        throw Error(
          "別のタブでスライドを開いています。そちらを閉じて再読み込みしてください",
        );
      owned = true;
      data = store.load();
      $("boot").textContent = "";
      setup();
      await new Promise(() => {});
    })
    .catch(error);
} catch (e) {
  error(e);
}

function fitViewport() {
  document.documentElement.style.setProperty("--view-height", `${window.visualViewport?.height || window.innerHeight}px`);
}
window.visualViewport?.addEventListener("resize", fitViewport);
window.addEventListener("resize", fitViewport);
window.addEventListener("orientationchange", fitViewport);
fitViewport();
