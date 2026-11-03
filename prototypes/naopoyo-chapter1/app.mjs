import { WorldSession, KEY as defaultKey, phase } from "../naopoyo-world/session.mjs";
import { stages as defaultStages } from "./stages.mjs";
import { complete, mass } from "../naopoyo-v2/engine.mjs";
import { loadSprites } from "../naopoyo-rescue/sprites.mjs";
import { render, loadGuests, eventCaption } from "./render.mjs";
import { Progress } from "./progress.mjs";
export function mount({stages = defaultStages, qa = false} = {}) {
  const progress = new Progress(stages.map(s=>s.id),localStorage,{qa});
  const key=progress.key, fixedBoard=true, label="第1章", intro=true;
  const KEY = key, hintsSeen = new Map(Object.entries(progress.data.hints));
  const $ = (id) => document.getElementById(id),
    canvas = $("board");
  let raw = progress.data.boards[progress.data.current];
  let q = new WorldSession(
      stages.find((s) => s.id === progress.data.current) || stages[0],
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
      progress.board(q.stage.id, JSON.parse(q.serialize()));
      saveError = progress.error;
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
      `${qa ? "QA専用 · " : "第1章 · "}${stages.indexOf(stages.find(s=>s.id===q.stage.id))+1} / ${stages.length}　${q.state.rescued} / ${mass(q.state)} おかえり`;
    $("clock").textContent = q.stage.events.length ? q.stage.events.map(e => eventCaption(e, q.time)).join(" / ") : q.stage.gravity ? "重力 ↓" : "ひかりの牢屋";
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
    return `<span class="tag">ひかりの牢屋 · ${label}</span><h2>${q.stage.title}</h2>${n ? `<img class="narrator" src="../../${n.asset}" alt="${n.name}">` : ""}<p>${q.stage.story}</p><p>${q.stage.lesson}</p><small>物語は「とじる」でスキップできます。</small>`;
  }
  function story() {
    const id=q.stage.id+':intro';
    if(progress.data.read.includes(id))return;
    progress.read(id);show(storyHTML());
  }
  function choose(id) {
    if(!progress.allowed(id))return false;
    end();progress.select(id);
    q=new WorldSession(stages.find(s=>s.id===id),progress.data.boards[id]);
    // A completed board is replayed from its start; permanent progression survives.
    if(complete(q.state))q.retry();
    won=false;rows=8;comparison=false;userPaused=false;
    dialog.close();save();pauseState();size();
    $("status").textContent=q.stage.lesson;story();return true;
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
          ? q.stage.gates.some(g => g.waveOnly)
            ? "波の門は、表示の数字になって波で通ろう。"
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
  const legacyHint = () =>
    show(
      `<h2>ほどくヒント</h2><p>${q.stage.hint}</p><p>同じ種族は足し算。8を超えた分は後ろに。トゲや光で1ずつ分裂。青い水中は魚だけ。</p><p>波や光は予告のあと自動で動きます。押されても指を離さず続けられます。「もどす」は時刻も一緒に戻します。</p>`,
    );
  function showHint() {
    if (!q.stage.hints) return legacyHint();
    const count = hintsSeen.get(q.stage.id) || 1;
    progress.hint(q.stage.id,count);
    show(`<h2>ほどくヒント ${count} / 3</h2>` + q.stage.hints.slice(0, count).map((h, i) => `<p><b>ヒント${i + 1}</b><br>${h}</p>`).join("") + (count < 3 ? '<button class="primary" id="hintMore">もう一段だけ見る</button>' : '<small>ここから先は、自分の手でほどいてみよう。</small>'));
    if (count < 3) $("hintMore").onclick = () => { hintsSeen.set(q.stage.id, count + 1); showHint(); };
  }
  $("hint").onclick = showHint;
  function selectScreen(){
    progress.merge(progress.load());
    show(`<span class="tag">CHAPTER 01</span><h2>ひかりの牢屋</h2><p>星の道のはじまり</p><div class="stage-grid">`+stages.map((s,i)=>{
      const cleared=progress.data.cleared.includes(s.id),open=progress.allowed(s.id);
      return `<button class="level ${cleared?'cleared':open?'available':'locked'}" data-stage="${s.id}" ${open?'':'disabled'}><b>${String(i+1).padStart(2,'0')}</b><span>${cleared?'★ クリア':open?'✧ 挑戦できる':'🔒 未開放'}</span><small>${open?s.title.slice(3):'まだ見ぬ星の道'}</small></button>`;
    }).join('')+`</div><small>開いた道には、いつでも戻れます。</small><button id="storyAgain">この面のお話を読む</button>`);
    for(const b of dialog.querySelectorAll('[data-stage]'))b.onclick=()=>choose(b.dataset.stage);
    $("storyAgain").onclick=()=>show(storyHTML());
  }
  $("select").onclick=selectScreen;
  $("close").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    pauseState();
    last = 0;
    draw();
  });
  $("compare").hidden = fixedBoard;
  $("compare").onclick = () => {
    if (fixedBoard) return;
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
  window.addEventListener("storage", e=>{if(e.key===KEY){progress.merge(progress.load());draw();}});
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
      won=true;
      const fresh=progress.clear(q.stage.id),next=stages.find(s=>s.id===progress.next(q.stage.id));
      const endingKey=q.stage.id+':ending',seen=progress.data.read.includes(endingKey);
      progress.read(endingKey);
      show(`<div class="victory-star">★</div><h2>${next?'みんな、おかえり。':'第1章 クリア！'}</h2>${seen?'':`<p>${q.stage.ending}</p>`}${fresh?'<p class="unlock">✧ 新しい星の道が開きました</p>':''}${next?'<button class="primary" id="nextStage">次の星の道へ →</button>':'<p><a class="primary" href="../naopoyo-chapter2/index.html">第2章「こもれびの森」へ →</a></p><button class="primary" id="chapterMap">星の道をふりかえる</button>'}`);
      if(next)$("nextStage").onclick=()=>choose(next.id);
      else $("chapterMap").onclick=selectScreen;
    }
    requestAnimationFrame(frame);
  }
  if(raw&&!q.restored)$("status").textContent="途中盤面を復元できなかったため、この面の最初から再開します。進行記録は保持しました。";
  story();
  size();
  Promise.all([loadSprites(), loadGuests(stages)]).then(draw);
  pauseState();
  requestAnimationFrame(frame);
  return {
    choose,
    get progress(){return progress;},
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
