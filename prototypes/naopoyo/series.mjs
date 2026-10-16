import { Settings } from "./settings.mjs";
import { readRoster, imagePath } from "../growth-chain/roster.mjs";
import { SlideStore } from "../slide08/player-store.mjs";
import { PlayerStore } from "../growth-chain/player-store.mjs";
const $ = (id) => document.getElementById(id),
  roster = readRoster(localStorage),
  settings = new Settings(
    localStorage,
    roster.map((c) => c.id),
  );
let prefs, active, draft;
function show(id) {
  for (const name of ["home", "favorites", "records"])
    $(name).hidden = name !== id;
  $("notice").textContent = "";
}
function favorites() {
  show("favorites");
  $("sets").replaceChildren(
    ...prefs.sets.map((_, i) => {
      const b = document.createElement("button");
      b.textContent = `セット${i + 1}`;
      b.classList.toggle("primary", i === active);
      b.onclick = () => {
        active = i;
        draft = [...prefs.sets[i]];
        favorites();
      };
      return b;
    }),
  );
  $("gallery").replaceChildren(
    ...roster.map((c) => {
      const b = document.createElement("button"),
        img = document.createElement("img"),
        label = document.createElement("small");
      img.src = imagePath(c, 4);
      img.alt = "";
      label.textContent = c.label;
      b.append(img, label);
      b.classList.toggle("selected", draft.includes(c.id));
      b.onclick = () => {
        draft = draft.includes(c.id)
          ? draft.filter((x) => x !== c.id)
          : draft.length < 5
            ? [...draft, c.id]
            : draft;
        favorites();
      };
      return b;
    }),
  );
  $("count").textContent = `${draft.length} / 5種族`;
  $("saveFavorites").disabled = draft.length !== 5;
}
const duration = (ms) =>
  ms === null
    ? "—"
    : `${Math.floor(ms / 60000)}分${Math.floor(ms / 1000) % 60}秒`;
function records(which) {
  show("records");
  try {
    let summaries, history;
    if (which === "slide") {
      const d = new SlideStore(localStorage).read();
      summaries = [
        ["通常記録", d.normal],
        ["れんしゅう記録", d.practice],
      ].map(
        ([name, t]) =>
          `${name}：最速 ${duration(t.fastest)} / 最少 ${t.fewest ?? "—"}手 / 08寿命消滅 ${t.deaths}回`,
      );
      history = d.history.map(
        (r) =>
          `${r.practice ? "れんしゅう" : "通常"} · ${r.won ? "クリア" : "ここまで育ったね"} · ${duration(r.elapsedMs)} · ${r.moves}手 · ${r.score}点`,
      );
    } else if (which === "drop") {
      const d = new PlayerStore(localStorage, "naopoyo-growth-clear-phone-v1").read();
      summaries = [["2 / 6", 2], ["開発比較 8 / 24", 8]].map(([name, cost]) => {
        const runs = d.history.filter((r) => r.gaugeUnit === cost);
        return `${name}（直近100件）：最高 ${Math.max(0, ...runs.map((r) => r.score))}点 / 寿命達成 ${runs.filter((r) => r.outcome === "clear").length}回`;
      });
      history = d.history.map((r) =>
        `${r.gaugeUnit === 8 ? "開発比較 8 / 24" : r.gaugeUnit === 2 ? "2 / 6" : "費用不明"} · ${r.outcome === "clear" ? "寿命達成" : "終了"} · ${r.score}点 · ${r.drops}組 · ${r.maxChain}連鎖`);
    } else {
      const d = new PlayerStore(localStorage).read(),
        names = {
          clear: "08消滅",
          endless: "通常エンドレス",
          "post-clear": "クリア後エンドレス",
        };
      summaries = Object.entries(names).map(
        ([key, name]) =>
          `${name}：最高 ${d.totals[key]?.best ?? 0}点 / 08消滅 ${d.totals[key]?.deaths ?? 0}回`,
      );
      history = d.history.map(
        (r) =>
          `${names[r.category] ?? r.category} · ${r.score}点 · 08消滅 ${r.deaths}回`,
      );
    }
    $("summary").replaceChildren(
      ...summaries.map((text) => {
        const a = document.createElement("article");
        a.textContent = text;
        return a;
      }),
    );
    $("history").replaceChildren(
      ...(history.length ? history : ["まだ記録はありません"]).map((text) => {
        const a = document.createElement("p");
        a.textContent = text;
        return a;
      }),
    );
  } catch (e) {
    $("notice").textContent = e.message;
  }
}
for (const [id, rows] of [
  ["slidePreview", 6],
  ["dropPreview", 12],
])
  for (let i = 0; i < 6 * rows; i++) {
    const cell = document.createElement("span");
    if ((rows === 6 ? i % 3 !== 0 : i > 47) && i % 4 !== 0) {
      const img = document.createElement("img");
      img.src = imagePath(roster[i % 5], (i % 4) + 1);
      img.alt = "";
      cell.append(img);
    }
    $(id).append(cell);
  }
try {
  prefs = settings.load();
  active = prefs.active;
  draft = [...prefs.sets[active]];
  $("favoritesButton").onclick = favorites;
  $("saveFavorites").onclick = () => {
    try {
      prefs.sets[active] = [...draft];
      prefs.active = active;
      if (!prefs.slide.every((x) => draft.includes(x)))
        prefs.slide = draft.slice(0, 3);
      settings.save(prefs);
      $("notice").textContent = "保存しました。このセットで遊べます。";
    } catch (e) {
      $("notice").textContent = e.message;
    }
  };
  if (new URLSearchParams(location.search).get("screen") === "favorites")
    favorites();
} catch (e) {
  $("notice").textContent = e.message;
  $("favoritesButton").disabled = true;
}
$("recordsButton").onclick = () => records("slide");
$("slideRecords").onclick = () => records("slide");
$("dropRecords").onclick = () => records("drop");
$("legacyDropRecords").onclick = () => records("legacy");
document
  .querySelectorAll("[data-home]")
  .forEach((b) => (b.onclick = () => show("home")));
