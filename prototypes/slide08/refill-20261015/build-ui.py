"""Reuses the reviewed #386 renderer as an isolated comparison snapshot.
Run: python3 build-ui.py PATH_TO_UI_BRANCH/prototypes/slide08
The shared production renderer is never patched by this lab.
"""
from pathlib import Path
import sys
src=Path(sys.argv[1]);out=Path(__file__).parent/'ui';out.mkdir(exist_ok=True)
for name in ['player.css','animation.mjs']:
 s=(src/name).read_text().replace('"./engine.mjs"','"../../engine.mjs"')
 (out/name).write_text(s)
s=(src/'player.html').read_text().replace('<head>','<head>\n    <base href="../../">').replace('href="player.css"','href="refill-20261015/ui/player.css"').replace('src="player.mjs"','src="refill-20261015/ui/player.mjs"')
s=s.replace('<h2>いっしょに育つ、3種族</h2>','''<h2>補充ルール比較・未採用</h2>
<label>方式 <select id="profile"></select></label>
<label>ゲージ <select id="gaugePolicy"></select></label>
<label>共通seed <input id="seedInput" type="number" min="0" max="4294967295" value="1"></label>
<p id="ruleDescription" class="subtle"></p>
<p>すべて試遊記録。AI探索と人間の達成率は別です。</p>''')
s=s.replace('<small id="practice"></small>','''<small id="practice"></small><p id="nextSupply" class="subtle"></p>
<button id="exportQA">記録JSONを出力</button><button id="markMistake">操作ミスを記録</button>
<details><summary>今回の評価（任意）</summary><div id="ratingFields"></div>
<label>難しさ <select id="difficulty"><option value="">未評価</option><option>簡単すぎる</option><option>ちょうどよい</option><option>難しすぎる</option></select></label>
</details>''')
(out/'index.html').write_text(s)
s=(src/'player.mjs').read_text()
s=s.replace('from "./engine.mjs"','from "../engine.mjs"').replace('from "./player-model.mjs"','from "../session.mjs"').replace('from "./player-store.mjs"','from "../session.mjs"').replace('from "../naopoyo/settings.mjs"','from "../../../naopoyo/settings.mjs"').replace('from "../growth-chain/roster.mjs"','from "../../../growth-chain/roster.mjs"')
s=s.replace('import { proofs } from "./player-catalog.mjs";','import { create, PROFILES, GAUGES, nextSupply } from "../engine.mjs";').replace('import { verifyProof } from "./proof-browser.mjs";','')
s=s.replace('new Settings(localStorage, allowed)','new Settings({getItem:k=>localStorage.getItem("refill-"+k),setItem:(k,v)=>localStorage.setItem("refill-"+k,v)}, allowed)')
a=s.index('async function certificate(');b=s.index('\nasync function start(',a)
s=s[:a]+'''async function certificate(file) {
  const [profile,gauge,seedText] = file.split("|");
  const initial = create(Number(seedText), profile, gauge);
  return {initial};
}
'''+s[b:]
a=s.index('    const next =');b=s.index('    const cert =',a)
s=s[:a]+'''    const next = file || [$("profile").value,$("gaugePolicy").value,$("seedInput").value].join("|");
'''+s[b:]
s=s.replace('p.practice ? "れんしゅう記録" : "通常記録"','`比較 ${s.lab.profile} / ${s.lab.gauge} / seed ${s.seed}${p.practice ? "・Undoあり" : ""}`')
s=s.replace('s.gauge < 2','s.gauge < s.config.single').replace('s.gauge < 6','s.gauge < s.config.bulk || s.lab.cooldown > 0')
s=s.replace('  $("tools").hidden = !!tool;','''  $("single").textContent = `へんしん：消費${s.config.single}`;
  $("bulk").textContent = `だいへんしん：消費${s.config.bulk}${s.lab.cooldown ? `（あと${s.lab.cooldown}スライド）` : ""}`;
  const next = nextSupply(s), mode = PROFILES[s.lab.profile].mode;
  $("nextSupply").textContent = mode === "none" ? "自然追加なし" : mode === "egg" ? `自動孵化待ち ${s.lab.queue.join(" / ")}個` : `次の補充：${roster.find(c=>c.id===p.species[next.kind]).label} ${String(next.stage).padStart(2,"0")}`;
  $("tools").hidden = !!tool;''')
s=s.replace('"naopoyo-slide-owner-v1"','"naopoyo-slide-refill-owner-v1"')
s=s.replace('  paused = true;\n  save();\n  render();','  paused = true;\n  p.qa.pauses++;\n  save();\n  render();')
s=s.replace('paused = false;\n        clock','paused = false;\n        p.qa.resumes++;\n        clock').replace('paused = false;\n            clock','paused = false;\n            p.qa.resumes++;\n            clock')
s+='''
const descriptions = {E:"自然追加なし",A:"有効スライド後、空きマスに1体",B:"有効スライド後、反対辺に1体",D0:"進化報酬卵を自動供給。初期卵は手動で保持",D1:"各ランク手動1個まで留保して自動供給"};
for (const name of Object.keys(PROFILES)) {const o=document.createElement("option");o.value=name;o.textContent=name+"："+(descriptions[name]||`${PROFILES[name].threshold}体以下で${PROFILES[name].target}体へ`);$("profile").append(o);}
for (const name of GAUGES) {const o=document.createElement("option");o.value=name;o.textContent={current:"現行2／6",cost4:"4／12",half:"報酬半分",'slide-only':"スライド進化のみ報酬",'slide-bonus':"スライド進化のみ＋1",cooldown:"だいへんしん後3スライド待ち"}[name];$("gaugePolicy").append(o);}
const params=new URLSearchParams(location.search);if(PROFILES[params.get("profile")])$("profile").value=params.get("profile");if(GAUGES.includes(params.get("gauge")))$("gaugePolicy").value=params.get("gauge");if(params.has("seed"))$("seedInput").value=params.get("seed");
$("ruleDescription").textContent="6×6・30体・3種族・ゲージ4/24・普通卵2＋銀卵1。設定変更は新規開始時のみ反映。補充時の即時合体なし。";
const ratings=["操作の分かりやすさ","スライドの楽しさ","進化・連鎖の爽快感","アイテム操作の負担（5=負担なし）","戦略性","難易度（5=挑戦しがい）","終盤の楽しさ","再プレイ意欲"];
ratings.forEach((name,i)=>{const label=document.createElement("label");label.textContent=name;const select=document.createElement("select");select.id=`rating${i}`;["",1,2,3,4,5].forEach(n=>{const o=document.createElement("option");o.value=n;o.textContent=n||"未評価";select.append(o)});select.onchange=()=>{if(p){p.qa.ratings??={};p.qa.ratings[name]=select.value;save();}};label.append(select);$("ratingFields").append(label)});
$("difficulty").onchange=()=>{if(p){p.qa.difficulty=$("difficulty").value;save();}};
$("markMistake").onclick=()=>{if(p){p.qa.mistakes++;save();$("status").textContent="操作ミスを1件記録しました";}};
$("exportQA").onclick=()=>{tick();save();const blob=new Blob([JSON.stringify({edition:"slide-refill-v1",humanQA:true,data:store.read()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="naopoyo-human-qa.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
let contact=null;
document.addEventListener("pointerdown",e=>{contact={x:e.clientX,y:e.clientY};},true);
document.addEventListener("pointerup",e=>{if(!p||!contact)return;const swipe=Math.max(Math.abs(e.clientX-contact.x),Math.abs(e.clientY-contact.y))>=28;if(swipe)p.qa.swipes++;else p.qa.taps++;contact=null;},true);
document.addEventListener("pointercancel",()=>{contact=null;},true);
document.addEventListener("keydown",()=>{if(p)p.qa.keys++;},true);
'''
(out/'player.mjs').write_text(s)

# Comparison-specific navigation and ratings restoration.
s=(out/"player.mjs").read_text()
s=s.replace('["モード選択へ戻る", () => (location.href = "../naopoyo/")],', '["比較設定へ戻る", () => { paused=true; save(); $("setup").hidden=false; $("game").hidden=true; setup(); }],')
s=s.replace('["別の盤面で遊ぶ", () => start()],', '["seedを変えて遊ぶ", () => { $("seedInput").value=(Number($("seedInput").value)+1)>>>0; start(); }],')
s=s.replace('このプレイはれんしゅう記録になり、通常ランキングには残りません','Undoを記録します。比較記録は通常ランキングと分離しています')
s=s.replace('  const s = p.state;', '  const s = p.state;\n  if(typeof ratings!=="undefined") ratings.forEach((name,i)=>{if($("rating"+i))$("rating"+i).value=p.qa.ratings?.[name]||"";});\n  $("difficulty").value=p.qa.difficulty||"";',1)
s=s.replace('if ($("dialog").open || tool || $("game").hidden) return;', 'if ($("dialog").open || tool || $("game").hidden || e.target?.closest?.("input, select, textarea, [contenteditable=true]")) return;')
s=s.replace('  $("game").hidden = false;\n  render();', '  $("game").hidden = false;\n  window.scrollTo(0, 0);\n  render();')
s=s.replace('["同じ盤面でもう一度", () => start(p.proof)],', '["今回の評価を記入", () => { $("controls").querySelector("details").open=true; $("rating0").focus(); }],\n      ["同じ盤面でもう一度", () => start(p.proof)],')
s=s.replace('function pause() {', 'function pause() {\n  if (p?.ended) { finish(); return; }')
(out/"player.mjs").write_text(s)

with (out/"player.css").open("a") as f:f.write('\n#setup label,#ratingFields label { display:block; margin:8px 0; }\n#setup select,#setup input,#controls select { max-width:100%; min-height:36px; font:inherit; }\n#controls details,#exportQA,#markMistake,#nextSupply { font-size:11px; }\n#exportQA,#markMistake { min-height:36px; padding:4px; }\n#nextSupply { margin:2px 0; }\n@media (orientation:portrait) { #game { --board:min(calc(100vw - 48px),calc(var(--view-height,100svh) - 370px),440px); } #arena.egg-mode { --board:min(calc(100vw - 112px),calc(var(--view-height,100svh) - 434px),352px); } }\n')
