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

# 2026-10-17: focused E/B/C trial, latest shared foreground renderer, no board shrink.
s=(out/'index.html').read_text()
s=s.replace('<label>方式 <select id="profile"></select></label>', '<div id="quickProfiles" aria-label="比較方式"></div><details id="advancedProfiles"><summary>全方式・開発設定</summary><label>方式 <select id="profile"></select></label>')
s=s.replace('<label>共通seed', '</details><label>共通seed')
s=s.replace('<p id="nextSupply"', '<details id="qaDetails"><summary>比較データ・評価</summary><div class="qa-panel"><button id="closeQA" type="button">閉じる</button><pre id="trialStats"></pre><p id="nextSupply"')
s=s.replace('</details>\n        </div>', '</details></div></details>\n        </div>')
s=s.replace('<title>なおぽよ・スライド</title>','<title>なおぽよ・スライド E/B/C比較</title>')
(out/'index.html').write_text(s)
s=(out/'player.mjs').read_text()
s='import { summary } from "../trial-metrics.mjs";\n'+s
s=s.replace('  $("restore").hidden = !data.snapshot || data.snapshot.ended;', '  const selected = selectedSnapshot();\n  $("restore").hidden = !selected || selected.ended;')
s=s.replace('if (data.snapshot && !data.snapshot.ended)', 'if (selectedSnapshot() && !selectedSnapshot().ended)')
s=s.replace('restore(data.snapshot, allowed)', 'restore(selectedSnapshot(), allowed)')
s=s.replace('$("controls").querySelector("details").open=true;', '$("qaDetails").open=true;$("ratingFields").closest("details").open=true;')
s=s.replace('  const s = p.state;', '  const s = p.state;\n  renderStats();',1)
s=s.replace('    $("time").textContent = time(p.elapsedMs);', '    $("time").textContent = time(p.elapsedMs);\n    renderStats();')
s+='''
function selectedSnapshot(){const key=($("profile").value||"E")+"|"+($("gaugePolicy").value||"current");return data?.snapshots?.[key] || (data?.snapshot?.state?.lab?.profile+"|"+data?.snapshot?.state?.lab?.gauge===key?data.snapshot:null);}
function renderStats(){if(!p||!$("qaDetails").open)return;const m=summary(p);$("trialStats").textContent=`${p.state.lab.profile} / seed ${p.state.seed} / 移動 ${$("slideSpeed").value}ms\\n時間 ${time(p.elapsedMs)}・現在 ${p.state.moves}手\\n操作 ${m.inputs}回（タップ${m.taps}・スワイプ${m.swipes}・キー${p.qa.keys}）\\n有効行動 ${m.actions}回・Undo ${m.undos}回\\n卵 ${m.eggs}・へんしん ${m.single}・全体 ${m.bulk}回\\nスライド進化 ${m.slideEvolutions}件・2連鎖以上 ${m.slideChains}回\\n08寿命消滅 ${m.won?"達成":"未達成"}\\n占有数（初期→各操作/Undo）\\n${m.population.join(" → ")}\\n操作・進化数はUndo前の試行も含みます。`;
}
$("qaDetails").addEventListener("toggle",renderStats);$("closeQA").onclick=()=>{$("qaDetails").open=false;};
for(const [value,label] of [["E","E 現行"],["B","B 反対側"],["C16-20","C 密度16→20"]]){const b=document.createElement("button");b.type="button";b.textContent=label;b.dataset.profile=value;b.onclick=()=>{$("profile").value=value;$("gaugePolicy").value="current";refreshProfiles();};$("quickProfiles").append(b);}
function refreshProfiles(){for(const b of $("quickProfiles").children)b.setAttribute("aria-pressed",String(b.dataset.profile===$("profile").value));if(prefs&&data)setup();}
$("profile").onchange=refreshProfiles;$("gaugePolicy").onchange=refreshProfiles;refreshProfiles();
'''
(out/'player.mjs').write_text(s)
s=(out/'player.css').read_text()
s=s[:s.index('@media (orientation:portrait) { #game { --board:min')]
s+='''
#quickProfiles {display:flex;gap:6px;flex-wrap:wrap} #quickProfiles button {min-height:44px}
#quickProfiles [aria-pressed=true] {background:#b9dce7;outline:2px solid #477e90}
#qaDetails {position:fixed;bottom:max(4px,env(safe-area-inset-bottom));right:8px;z-index:30}
#qaDetails summary {background:#effbff;border:1px solid #7fa8b3;border-radius:10px;padding:8px;cursor:pointer}
#qaDetails[open] {inset:8px;overflow:auto;background:#effbff;padding:12px;border:2px solid #7fa8b3;border-radius:14px}
#qaDetails pre {white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.6}
#qaDetails .qa-panel {max-width:640px;margin:auto} #closeQA {float:right;min-height:44px}
'''
(out/'player.css').write_text(s)

s=(out/'player.mjs').read_text()
s=s.replace('      data = store.load();','      data = store.load();\n      if(!new URLSearchParams(location.search).has("profile") && data.snapshot?.state?.lab){$("profile").value=data.snapshot.state.lab.profile;$("gaugePolicy").value=data.snapshot.state.lab.gauge;refreshProfiles();}')
s=s.replace('if ($("dialog").open || tool || $("game").hidden ||', 'if ($("dialog").open || $("qaDetails").open || tool || $("game").hidden ||')
s=s.replace('"再プレイ意欲"]','"再プレイ意欲","280ms移動の気持ちよさ","補充の自然さ・分かりやすさ","1種族統一の強さ（5=とても強い）"]')
(out/'player.mjs').write_text(s)

s=(out/'player.mjs').read_text()
s=s.replace('      if(!new URLSearchParams(location.search).has("profile") && data.snapshot?.state?.lab){$("profile").value=data.snapshot.state.lab.profile;$("gaugePolicy").value=data.snapshot.state.lab.gauge;refreshProfiles();}', '')
s=s.replace('    p = restored;', '    p = restored;\n    save();')
s+='\nif(!params.has("profile") && data?.snapshot?.state?.lab){$("profile").value=data.snapshot.state.lab.profile;$("gaugePolicy").value=data.snapshot.state.lab.gauge;refreshProfiles();}\n'
(out/'player.mjs').write_text(s)
s=(out/'player.mjs').read_text()
s=s.replace('      data = store.load();','      data = store.load();\n      if($("profile").options.length)selectSavedProfile();')
s=s.replace('    p = restored;','    p = restored;\n    $("seedInput").value=p.initial.seed;')
s=s.replace('if(!params.has("profile") && data?.snapshot?.state?.lab){$("profile").value=data.snapshot.state.lab.profile;$("gaugePolicy").value=data.snapshot.state.lab.gauge;refreshProfiles();}', 'selectSavedProfile();\nfunction selectSavedProfile(){if(!new URLSearchParams(location.search).has("profile") && data?.snapshot?.state?.lab){$("profile").value=data.snapshot.state.lab.profile;$("gaugePolicy").value=data.snapshot.state.lab.gauge;if(!new URLSearchParams(location.search).has("seed"))$("seedInput").value=data.snapshot.initial.seed;refreshProfiles();}}')
s=s.replace('contact={x:e.clientX,y:e.clientY};','contact=gameplayInput(e)?{x:e.clientX,y:e.clientY,board:!!e.target.closest?.("#board")}:null;')
s=s.replace('if(!p||!contact)return;', 'if(!contact||!gameplayInput(e)){contact=null;return;}')
s=s.replace('if(swipe)p.qa.swipes++;else p.qa.taps++;', 'if(swipe&&contact.board)p.qa.swipes++;else if(!swipe)p.qa.taps++;')
s=s.replace('document.addEventListener("keydown",()=>{if(p)p.qa.keys++;},true);', 'document.addEventListener("keydown",e=>{if(gameplayInput(e)&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))p.qa.keys++;},true);\nfunction gameplayInput(e){return p&&!paused&&!p.ended&&!$("game").hidden&&!e.target?.closest?.("#setup,#qaDetails,#dialog,input,select,textarea");}')
(out/'player.mjs').write_text(s)
