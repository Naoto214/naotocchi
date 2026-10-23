import { WorldSession, KEY, phase } from "./session.mjs";
import { stages } from "./stages.mjs";
import { complete, mass } from "../naopoyo-v2/engine.mjs";
import { loadSprites } from "../naopoyo-rescue/sprites.mjs";
import { render, loadGuests, eventCaption } from "./render.mjs";
export function mount() {
  const $ = (id) => document.getElementById(id),
    canvas = $("board");
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(KEY));
  } catch {}
  let q = new WorldSession(
      stages.find((s) => s.id === raw?.stageId) || stages[0],
      raw,
    ),
    pointer = null,
    last = 0,
    fraction = 0,
    rows = 8,
    comparison = false,
    hitUntil = 0,
    won = false,
    userPaused = false,
    saveError = false;
  const dialog = $("dialog");
  function save() {
    try {
      localStorage.setItem(KEY, q.serialize());
      saveError = false;
    } catch {
      saveError = true;
    }
  }
  function pauseState() {
    q.paused = userPaused || document.hidden || dialog.open || comparison;
    $("paused").hidden = !userPaused;
    $("pause").textContent = userPaused ? "▶" : "Ⅱ";
  }
  function size() {
    const r = canvas.parentElement.getBoundingClientRect(),
      cell = Math.min((r.width - 8) / 8, (r.height - 8) / rows);
    canvas.style.width = cell * 8 + "px";
    canvas.style.height = cell * rows + "px";
    draw();
  }
  function draw() {
    render(canvas, q, {
      rows,
      dpr: Math.min(devicePixelRatio || 1, 2),
      hitUntil,
    });
    $("title").textContent = q.stage.title;
    $("chapter").textContent =
      `PILOT ${q.stage.id} · ${comparison ? "表示比較のみ" : q.state.rescued + " / " + mass(q.state) + " おかえり"}`;
    const e = q.stage.events[0];
    $("clock").textContent = e ? eventCaption(e, q.time) : "TIMELESS";
    $("undo").disabled = !q.history.length && !q.active;
    $("compare").textContent = "8×" + rows;
    if (saveError)
      $("status").textContent = "保存できません。この画面では遊べます。";
  }
  function end() {
    q.end();
    if (pointer !== null) {
      const p = pointer;
      pointer = null;
      try {
        canvas.releasePointerCapture(p);
      } catch {}
    }
    save();
  }
  function show(html) {
    end();
    $("content").innerHTML = html;
    dialog.showModal();
    pauseState();
    last = 0;
  }
  function storyHTML() {
    const n = q.stage.narrator;
    return `<span class="tag">PILOT ${q.stage.id} · 操作改善版 r2</span><h2>${q.stage.title}</h2>${n ? `<img class="narrator" src="../../${n.asset}" alt="${n.name}">` : ""}<p>${q.stage.story}</p><p>${q.stage.lesson}</p><small>物語は「とじる」でスキップ。正式版と別の記録です。</small>`;
  }
  function choose(id) {
    q = new WorldSession(stages.find((s) => s.id === id));
    won = false;
    rows = 8;
    comparison = false;
    userPaused = false;
    dialog.close();
    save();
    size();
    show(storyHTML());
  }
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(8 - 1e-6, ((e.clientX - r.left) / r.width) * 8)),
      y: Math.max(
        0,
        Math.min(8 - 1e-6, ((e.clientY - r.top) / r.height) * rows),
      ),
    };
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (pointer !== null || q.paused || complete(q.state)) return;
    const p = point(e),
      a = q.state.actors.find(
        (a) => a.x === Math.floor(p.x) && a.y === Math.floor(p.y),
      );
    if (a && q.begin(a.id, p)) {
      e.preventDefault();
      pointer = e.pointerId;
      canvas.setPointerCapture(pointer);
      draw();
    }
  });
  function travel(e) {
    for (const sample of e.getCoalescedEvents?.().length
      ? e.getCoalescedEvents()
      : [e])
      q.travel(point(sample));
    const r = q.lastResults.at(-1);
    if (r?.split) {
      hitUntil = q.time + 350;
      $("status").textContent = `${r.split}つにほどけた。そのまま続けよう。`;
    } else
      $("status").textContent = r?.ok
        ? "指を離さず、そのまま。"
        : r
          ? q.stage.id === "B"
            ? "波3の門は、3になって波で通ろう。"
            : "門・星の数字や、通れる地形を見てみよう。"
          : "キャラから、なぞってみよう";
    draw();
  }
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointer) return;
    e.preventDefault();
    travel(e);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (e.pointerId !== pointer) return;
    travel(e);
    end();
  });
  for (const name of ["pointercancel", "lostpointercapture"])
    canvas.addEventListener(name, (e) => {
      if (e.pointerId === pointer) end();
    });
  $("undo").onclick = () => {
    end();
    if (q.undo()) {
      userPaused = true;
      pauseState();
      last = 0;
      $("status").textContent = "戻しました。▶で時を再開できます。";
    }
    won = false;
    save();
    draw();
  };
  $("retry").onclick = () => {
    end();
    q.retry();
    won = false;
    save();
    draw();
  };
  $("pause").onclick = () => {
    end();
    userPaused = !userPaused;
    pauseState();
    last = 0;
    draw();
  };
  $("hint").onclick = () =>
    show(
      `<h2>ほどくヒント</h2><p>${q.stage.hint}</p><p>同じ種族は足し算。8を超えた分は後ろに。トゲや光で1ずつ分裂。青い水中は魚だけ。</p><p>波や光は予告のあと自動で動きます。押されても指を離さず続けられます。「もどす」は時刻も一緒に戻します。</p>`,
    );
  $("select").onclick = () => {
    show(
      "<h2>5つの星の道</h2>" +
        stages
          .map(
            (s) =>
              `<button class="level" data-stage="${s.id}">${s.id}　${s.title}</button>`,
          )
          .join("") +
        "<small>Dは順序パズル、Eは協力するタコの比較試作。操作改善版 r2。</small>",
    );
    for (const b of dialog.querySelectorAll("[data-stage]"))
      b.onclick = () => choose(b.dataset.stage);
  };
  $("close").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    pauseState();
    last = 0;
    draw();
  });
  $("compare").onclick = () => {
    end();
    comparison = !comparison;
    rows = comparison ? 6 : 8;
    pauseState();
    $("status").textContent = comparison
      ? "8×6表示比較：下2行を省いた静止表示（プレイ不可）"
      : "8×8に戻りました";
    size();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) end();
    pauseState();
    last = 0;
    fraction = 0;
  });
  window.addEventListener("pagehide", () => {
    end();
    q.paused = true;
    last = 0;
  });
  window.addEventListener("pageshow", () => {
    pauseState();
    last = 0;
  });
  window.addEventListener("resize", size);
  window.visualViewport?.addEventListener("resize", size);
  function frame(now) {
    if (last && !q.paused) {
      fraction += Math.min(100, Math.max(0, now - last));
      const delta = Math.floor(fraction);
      fraction -= delta;
      q.lastResults = [];
      q.advance(delta);
      const wave = q.lastWave;
      if (wave && wave.at > q.time - delta) {
        const moved = wave.outcomes.filter((o) => o.moved),
          blocked = wave.outcomes.filter((o) => !o.moved);
        hitUntil = q.time + 350;
        $("status").textContent = moved.length
          ? `波${wave.dx < 0 ? "←" : "→"} ${moved.length}体を押した${moved.some((o) => o.merged) ? "・合体！" : moved.some((o) => o.split) ? "・分裂！" : "。指はそのまま。"}`
          : blocked.length
            ? "波は届いたけれど、岩・門・地形で止まったよ。"
            : "波が通過。色のついた横一列が波の通り道。";
      } else if (q.lastResults.some((r) => r.split)) {
        hitUntil = q.time + 350;
        $("status").textContent = "光でほどけた。そのまま動かせるよ。";
      }
      if (Math.floor(q.time / 1000) !== Math.floor((q.time - delta) / 1000))
        save();
    }
    last = now;
    draw();
    if (complete(q.state) && !won) {
      won = true;
      show(
        `<h2>みんな、おかえり。</h2><p>${q.stage.ending}</p><button class="primary" id="nextStage">次の星の道へ →</button>`,
      );
      $("nextStage").onclick = () =>
        choose(
          stages[
            (stages.indexOf(stages.find((s) => s.id === q.stage.id)) + 1) %
              stages.length
          ].id,
        );
    }
    requestAnimationFrame(frame);
  }
  if (raw && !q.restored) {
    // Keep the old Pilot save before revising B/E; formal/v2 keys are untouched.
    try {
      if (!localStorage.getItem(KEY + ".before-qa-r2"))
        localStorage.setItem(KEY + ".before-qa-r2", JSON.stringify(raw));
    } catch {}
    show(
      storyHTML() +
        "<p>この面の仕掛けを更新したため、最初から始めます。以前の試遊記録は別に保管しました。</p>",
    );
  }
  size();
  Promise.all([loadSprites(), loadGuests(stages)]).then(draw);
  pauseState();
  requestAnimationFrame(frame);
  return {
    get session() {
      return q;
    },
    measure: () => ({
      width: innerWidth,
      height: innerHeight,
      cell: canvas.getBoundingClientRect().width / 8,
      board: canvas.getBoundingClientRect().toJSON(),
      scroll: document.documentElement.scrollHeight > innerHeight,
    }),
  };
}
