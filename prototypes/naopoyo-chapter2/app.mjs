import {ForestSession as WorldSession, pointerActor} from "./session.mjs";
import { stages as defaultStages } from "./stages.mjs";
import { complete, mass } from "../naopoyo-v2/engine.mjs";
import { loadSprites } from "../naopoyo-rescue/sprites.mjs";
import { render, loadGuests, eventCaption } from "./render.mjs";
import {ForestProgress, allStages} from "./progress.mjs";
import {loadForest} from "./render.mjs";
import {openExample} from "./example-ui.mjs";
export function mount({qa = false} = {}) {
  const stages=qa?defaultStages:allStages;
  const progress = new ForestProgress(localStorage,{qa});
  const key=progress.actualKey, fixedBoard=true;
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
    saveError = false,
    exampleActive = false;
  const dialog = $("dialog");
  const previewNote=$('split-preview-note');
  function save() {
    try {
      progress.board(q.stage.id, JSON.parse(q.serialize()));
      saveError = progress.error;
    } catch {
      saveError = true;
    }
  }
  function pauseState() {
    q.paused = userPaused || document.hidden || dialog.open || comparison || exampleActive;
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
    previewNote.hidden=true;
    $("status").hidden=false;
    $("example").hidden=!q.stage.id.startsWith("komorebi-");
    $("title").textContent = q.stage.title;
    $("chapter").textContent =
      `${qa ? "QA専用 · " : "独立セーブ · "}${q.stage.id.startsWith("komorebi-")?"第2章":"第1章"}　${q.state.rescued} / ${mass(q.state)} おかえり`;
    $("clock").textContent = q.stage.events.length ? q.stage.events.map(e => eventCaption(e, q.time)).join(" / ") : q.stage.gravity ? "重力 ↓ ・ 支えがないと落ちる" : "ひかりの牢屋";
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
    return `<span class="tag">${q.stage.id.startsWith("komorebi-")?"こもれびの森 · 第2章":"ひかりの牢屋 · 第1章"}</span><h2>${q.stage.title}</h2>${n ? `<img class="narrator" src="../../${n.asset}" alt="${n.name}">` : ""}<p>${q.stage.story}</p><p>${q.stage.lesson}</p><small>物語は「とじる」でスキップできます。</small>`;
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
    if(progress.data.boards[id]&&!q.restored)try{progress.backup(id,progress.data.boards[id]);}catch{saveError=true;}
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
      a = pointerActor(q,p);
    if (a && q.begin(a.id, p)) {
      q.motion=[];
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
    // A pointerup without another cell crossing must retain the last outcome.
    if(!r){draw();return;}
    if (r?.split) {
      hitUntil = q.time + 350;
      $("status").textContent = "分裂！ 落ちて仲間に触れると合体するよ。";
    } else
      $("status").textContent = r?.ok
        ? r.swapped ? "すれ違って場所を交換。そのまま続けよう。" : r.events?.some(e=>e.type==="merge"&&e.overflow) ? "合体して8に。余った仲間は元の場所へ、支えがなければ落ちるよ。" : "指を離さず、そのまま。"
        : r?.reason === "gate"
          ? "魔法ゲートの数字に合う仲間だけが通れるよ。余った仲間の戻る場所も確かめよう。"
          : r?.reason === "gate-top"
            ? "ゲートの上面は足場だよ。中へは横から、同じ数字で通ろう。"
          : r?.reason === "corner"
            ? "岩やゲートの上面で閉じた角は通り抜けられないよ。"
          : r
          ? q.stage.gates.some(g => g.waveOnly)
            ? "波の魔法ゲートは、表示の数字になって波で通ろう。"
            : "上へ登るには、今いる場所と行き先の下に足場が必要だよ。星とトゲは足場にならないよ。"
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
      `<h2>ほどくヒント</h2><p>${q.stage.hint}</p><p>同じ種族は足し算。8を超えた分は後ろに。各トゲは1マスの1手につき1回だけ分裂。分裂した仲間も、落ちて触れたら合体。青い水中は魚だけ。</p><p>波や光は予告のあと自動で動きます。押されても指を離さず続けられます。「もどす」は時刻も一緒に戻します。</p>`,
    );
  function showHint() {
    if (!q.stage.hints) return legacyHint();
    const count = hintsSeen.get(q.stage.id) || 1;
    progress.hint(q.stage.id,count);
    show(`<h2>ほどくヒント ${count} / 3</h2>` + q.stage.hints.slice(0, count).map((h, i) => `<p><b>ヒント${i + 1}</b><br>${h}</p>`).join("") + (count < 3 ? '<button class="primary" id="hintMore">もう一段だけ見る</button>' : '<small>ここから先は、自分の手でほどいてみよう。</small>'));
    if (count < 3) $("hintMore").onclick = () => { hintsSeen.set(q.stage.id, count + 1); showHint(); };
  }
  $("hint").onclick = showHint;
  $("example").onclick = () => {
    if(!progress.allowed(q.stage.id)||!q.stage.id.startsWith("komorebi-"))return;
    const launch=()=>{exampleActive=true;dialog.close();end();pauseState();openExample(q.stage,()=>{exampleActive=false;pauseState();last=0;draw();});};
    if(sessionStorage.getItem('naopoyo.example.confirmed'))return launch();
    show('<h2>おてほんを見る？</h2><p>正解の操作がすべて見られます。最初の盤面から始まり、今のプレイはそのまま残ります。</p><button class="primary" id="exampleConfirm">おてほんを見る</button>');
    $('exampleConfirm').onclick=()=>{sessionStorage.setItem('naopoyo.example.confirmed','1');launch();};
  };
  function selectScreen(){
    progress.merge(progress.load());
    show(`<span class="tag">CHAPTER 02 PILOT</span><h2>こもれびの森</h2><p>${qa?"11〜20面を直接試せるQAモード。":"第1章10クリアで11を開放。本番と別のセーブです。"}</p><div class="stage-grid">`+stages.map((s,i)=>{
      const cleared=progress.data.cleared.includes(s.id),open=progress.allowed(s.id);
      return `<button class="level ${cleared?'cleared':open?'available':'locked'}" data-stage="${s.id}" ${open?'':'disabled'}><b>${String(s.number||i+1).padStart(2,'0')}</b><span>${cleared?'★ クリア':open?'✧ 挑戦できる':'🔒 未開放'}</span><small>${open?s.title.slice(3):'ひらく前の道'}</small></button>`;
    }).join('')+`</div><small>開いた道には、いつでも戻れます。</small>${qa?'<p class="game-links"><a href="index.html">通常の順次開放へ</a></p>':''}<button id="storyAgain">この面のお話を読む</button>`);
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
            ? "波は届いたけれど、岩・魔法ゲート・地形で止まったよ。"
            : "波が通過。色のついた横一列が波の通り道。";
      } else if (q.lastResults.some((r) => r.split)) {
        hitUntil = q.time + 350;
        $("status").textContent = "光でほどけた。そのまま動かせるよ。";
      }
      if (Math.floor(q.time / 1000) !== Math.floor((q.time - delta) / 1000))
        save();
    }
    if(last&&!q.paused)q.animate(Math.min(100,Math.max(0,now-last)),globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    last = now;
    draw();
    if (complete(q.state) && !won && !q.motion.length) {
      won=true;
      const fresh=progress.clear(q.stage.id),next=stages.find(s=>s.id===progress.next(q.stage.id));
      const endingKey=q.stage.id+':ending',seen=progress.data.read.includes(endingKey);
      progress.read(endingKey);
      show(`<div class="victory-star">★</div><h2>${next?'みんな、おかえり。':'こもれびの森 Pilot クリア！'}</h2>${seen?'':`<p>${q.stage.ending}</p>`}${fresh?'<p class="unlock">✧ 新しい星の道が開きました</p>':''}${next?'<button class="primary" id="nextStage">次の星の道へ →</button>':'<p>森の試練をほどきました。難しさや気づいたことを聞かせてください。</p><button class="primary" id="chapterMap">星の道をふりかえる</button>'}`);
      if(next)$("nextStage").onclick=()=>choose(next.id);
      else $("chapterMap").onclick=selectScreen;
    }
    requestAnimationFrame(frame);
  }
  if(raw&&!q.restored)$("status").textContent="途中盤面を復元できなかったため、この面の最初から再開します。進行記録は保持しました。";
  if(raw&&!q.restored)try{progress.backup(q.stage.id,raw);}catch{saveError=true;}
  story();
  size();
  Promise.all([loadSprites(), loadGuests(stages),loadForest()]).then(draw);
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
