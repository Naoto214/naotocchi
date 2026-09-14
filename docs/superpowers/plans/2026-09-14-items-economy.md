# Naotocchi Item & Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 承認済みのアイテム・経済監査案を、旧セーブを保護して使える本編機能として実装する。

**Architecture:** 現行のブラウザJS構成に、小さなDOM非依存のitem-systemと記録表示用item-memoriesを追加する。既存script.jsのゲーム・世話・恋愛・旅の処理へ明示的に接続し、購入・在庫・発動を分ける。タスクは共有script.jsへの競合を避け順番に実装・レビューする。

**Tech Stack:** Vanilla JavaScript / UMD, HTML/CSS, Web Audio, Canvas, localStorage, Node built-in test runner and existing VM runtime harness.

**Spec:** `docs/superpowers/specs/2026-09-14-items-economy-design.md` and `docs/superpowers/specs/2026-09-14-items-economy-catalog.json`.

## Global Constraints

- 承認済み正本: `docs/superpowers/specs/2026-09-14-items-economy-design.md` と隣の catalog.json。各品の値はproposal/new_price/guardを使う。
- mainを変更せず `feat/items-economy-20260914` で作業。外部への送信・マージ・公開なし。旧所持品・貯金・実績を没収しない。
- 通常装備は1枠。基本のお世話・世界設定・既存BGM・人生カードは無料。年齢・恋愛対象・レア・図鑑の条件を飛ばさない。
- じかん→てんき→きせつ→ばしょ。短いボタンはひらがな、説明はやさしい漢字、文中絵文字・機械的空白なし。固定ホーム配置を維持。
- 実点・記録・ランク・勧誘は報酬補正と分離。クイックは1ラン1ゲーム。
- 価格・効果・供給を一組で実装する。新候補3品を採用し万華鏡は保留。カード設計PR259は触らない。
- テストは実行する処理の結果・消費・保存・境界を確認し、ソースの文字一致や実装と同じ式を期待値に使わない。
- ワーカーは追加エージェントを作らない。controllerが各タスクの仕様・品質レビューを手配する。

---
### Task 1: 永久在庫・購入と使用の分離・経済・移行

**Files:** Create `item-system.js`, `tests/item-inventory-test.cjs`; modify `script.js`, `index.html`, `tests/helpers/runtime-harness.cjs`, `tests/smoke-test.js`, `tests/dialogue-test.js`, necessary direct runtime loaders, `tests/economy-test.cjs`, `tests/midlife-test.cjs`, `package.json`.

**Interfaces:** Produce the NaotocchiItems API and lifetime/state fields listed in the spec, `buyConsumableItem(id)`, inventory-backed `useConsumableItem(id)`, `addItemMemory(kind,record)`. Existing useItem and grant paths must use the same canonical stock. Later tasks use these names. Keep FUN_ITEMS seven narrative definitions and NAOTO_ITEMS four goal definitions intact for later effect work.

- [ ] **Step 1: Add failing behavior tests.** Expose real buy/use/reset/milestone functions from the existing harness (test-only exposure). Use literals and real handlers. Minimum representative cases:

```js
const h=harness(), s=h.api.state();
s.lifetime.money=100; s.boostTicks=101;
h.api.buyConsumableItem('c_growth');
assert.equal(s.lifetime.money,10);
assert.equal(h.api.itemStock('c_growth'),1);
h.api.useConsumableItem('c_growth');
assert.equal(h.api.itemStock('c_growth'),1); // full five minutes cannot fit
s.boostTicks=100; h.api.useConsumableItem('c_growth');
assert.equal(s.boostTicks,200);
assert.equal(h.api.itemStock('c_growth'),0);
```

Also test: reset keeps unspent candy/reward/consumables and drops active effect; legacy camera stock/history becomes one permanent tool with spare scene count; old big reservation refunds350 exactly once after serializing/reloading; spending at S100 pays800 once, never extra5000; ordinary score50 gives2; daily grants one Lucky stock even when one is armed; stock negative/NaN/unknown ID normalization never creates wealth. Fresh-state normalization must not mark all legacy saves migrated before reading old data.

- [ ] **Step 2: Run RED.** `node --test tests/item-inventory-test.cjs`; record failing observable values before implementing.
- [ ] **Step 3: Implement inventory/economy and wire a usable bag/shop.** Keep prior effect bodies initially except removed big sale/new fixed prices, new Lucky source and full-cap drink check. New stock is separate from active effects. Use module take/grant in reward, birthday, offline, fun and reset paths. Render distinct buy and use actions; an owned tool remains owned. Set all approved catalog prices and metadata without yet claiming later effects exist.

```js
function buyConsumableItem(id) {
  const item=CONSUMABLE_ITEMS.find(x=>x.id===id);
  if (!item || item.price == null || state.lifetime.money < item.price) return false;
  state.lifetime.money -= item.price;
  ITEM_SYSTEM.grant(state,id,1);
  saveState(); render(); return true;
}
```

Apply stock validation first and increment usage only when a real consumption/activation succeeds. Preserve unresolved old flags other than refunded big. Add module before script in production/test loaders; do not duplicate a fallback catalog inside script. Add source-cache token for the new module. Persist progress/memories without canvas data URLs. Keep rewards/birthday/legend multipliers except fixed milestones. Frozen existing achievement ID lists remain15/FUN7.
- [ ] **Step 4: Run GREEN and integration.** Focused inventory/economy/midlife/offline/scoring tests then `npm test` once. Existing tests that intentionally exercise buy-and-arm must be adapted to explicit buy then use, keeping their behavioral assertion. Preserve historical baseline quick flake evidence if encountered; don't weaken it.
- [ ] **Step 5: Self-review and commit.** Commit only owned changes. Report RED/GREEN output, exact APIs/fields and any integration gap to task report.

### Task 2: お世話・ゲーム系の装備と使い切りの実効果

**Files:** Modify `script.js`, `item-system.js`; create `tests/item-care-game-test.cjs`; update harness exports and existing affected behavioral tests/package.json.

**Interfaces:** Consume Task1 stock/progress and catalog. Produce game-start equipment snapshot, item effect tick update, `new_life_patch` and `new_transform_mirror` consumption. Export only test helpers through harness, not production globals.

- [ ] **Step 1: Write RED cases using actual tick/result/care paths.** Example:

```js
// Literal outcome: three ordinary completed games open the legal transform offer.
s.lifetime.equippedItemId='hat'; s.transformMeter=0;
for(let n=0;n<3;n++){ api.startMinigame(game,{intro:false}); api.finishMinigame(50); }
assert.ok(s.transformOptions);
// An equipped item changed AFTER start does not change the current game's reward.
// At five Clover misses, the next real great game grants exactly one reward.
// A failed protected game spends no energy and adds no decline or life damage.
```

Add cases for papers at3→2 poop without care/growth counters, 60tick interval; scarf only winter/snow added hunger component; band12→9; pillow requires30sec sleep and expires60ticks/unequip; glasses+10 never alters rank/recruit; charm reward only real70, growth28 or56; star 3 distinct real30+ and100tick gate, quick ID once, no coin multipliers; clover reload/swap persists and forced drops deduplicate. Crown health-zero threshold rescue once with miracle priority, ordinary dying2min untouched. Life patch requireslife≤40/growing/non-infinite, restores30life20health once and clamps100. Mirror excludes all shown candidates and does not spend on empty/cancel.
- [ ] **Step 2: Run RED.** `node --test tests/item-care-game-test.cjs`; record intended missing effects.
- [ ] **Step 3: Implement exact JSON effects.** Include ribbon/food/bowtie unchanged reductions, flower handling reserved Task3; relevant care hooks and game outcome changes. Snapshot at start must cover all equipment-linked game changes, not just coins. Positive decline changes from failure are distinct from natural decay. Numerical model example:

```js
const earnedGrowth = isGreat ? 14 : isOrdinary ? 7 : 0;
const special = rawScore >= 70 && state.oneTimeBoosts.greatReward;
if (earnedGrowth) applyGrowth(earnedGrowth + (special ? 14 : 0));
// Single award decision, so special + clover + random cannot grant 2–3 gifts.
```

Maintain free care and no premature immortality. Use saved progress counters; no Date.now-only cooldowns. New rescue/mirror items must be buyable and usable through actual bag/transform controls.
- [ ] **Step 4: Run GREEN.** Focused new tests, growth/scoring/economy/quick/life-display/overlay tests, then full npm test once. Correct source comments and UI effect text in modified areas.
- [ ] **Step 5: Self-review, commit and report.** Explain game snapshot, RNG/gift ordering, life-path priority and full-cap rules with evidence.

### Task 3: 恋愛・仲間・旅と達成品を体験へ接続

**Files:** Modify `script.js`, `item-system.js`, `index.html`; create `tests/item-relations-travel-test.cjs`; update related dialogue/album/clownfish tests only where approved behavior changes.

**Interfaces:** Consume stock/progress/memory API fromTask1 and saved game-snapshot code. Produce `renderItemMemories()`-ready records in letters/lights/specials, a travel choice UI, use paths for flower/bond/partner equipment and romance/travel consumables, goal lantern/ring behavior. Task4 adds the shared memory viewer and export.

- [ ] **Step 1: Write RED behavior tests.** Use real candidate/partner structures from runtime:

```js
// A mismatched initial candidate must neither spend the charm nor bypass matching.
const before=api.itemStock('c_courtsmall');
dispatch(courtButton,'click');
assert.equal(api.itemStock('c_courtsmall'),before);
// A valid initial court adds20pp with the final85% cap; flowers add10pp when worn.
// With mismatch repair count0, one protected conversation reaches2; next reaches3.
```

Test relation0→10/20tick grace once perpartner perlife; existing marriage progression not sped by a new initial-court charm; repeated same-partner breakup cannot refresh shield. Leaving known companion may be retried via badge200tick, but no repeat joining sticker. Backpack halves travel costs without removing fatigue. Travel charm: show2 environment-specific options, only one selected; invalid/cancel leaves stock. Special trip/date: only consume after successful start and commit exactly one memory; abort does not lose gift. Lamp requiresgoal andvisitedregion200tick, produces no cash/natural-event achievement; ring normaldate haspartner-specific secretphrase. Letters atcourt/repair/marriage preserve pet/partner snapshot and de-duplicate same milestone in same relationship.
- [ ] **Step 2: Run RED.** `node --test tests/item-relations-travel-test.cjs`.
- [ ] **Step 3: Implement effects with existing state transitions.** The full current life/partner object remains authoritative. Do not regenerate partner identity/gender/attraction as a workaround. Reuse existing in-game date confirmation styling for special travel and reward choices. Memory records carry kind/key/age/speciesLine/stage/partner/environment/text; explicit scene choices are not natural event observations.

```js
addItemMemory('specials', {
  key: stableEventKey, age: currentAge(), speciesLine: state.speciesLine,
  stage: currentFormStageIndex(), partnerId: state.partner?.id || null,
  environment: currentEnvironmentSnapshot, text: eventText
});
```

Includeshort contextual visual reactions for unchanged flower/ribbon/bowtie and changed backpack/scarf/letter where actualevents happen; no added global narrator box. Goal charm copy iselder70+28% only, and owned old goals display unlocked even if oldtier array differs. Goal crown reactions areTask4.
- [ ] **Step 4: Run GREEN.** New relations/travel tests plusclownfish/dialogue/album/midlife/overlay tests, thennpm testonce.
- [ ] **Step 5: Self-review, commit and report.** Include stock commit boundary and flags crossinglife/relationship IDs.

### Task 4: お楽しみの分化・永久道具・写真と音と思い出の画面

**Files:** Create `item-memories.js`, `item-experience.css`, `tests/item-experiences-test.cjs`; modify `script.js`, `audio.js`, `index.html`, runtime loaders/harness and package.json.

**Interfaces:** ConsumeTask1 module andTask3 memoryrecords. Produce real bag tool actions, `renderItemMemories()`, snapshot-based photo render/export, melody playback API `audio.playItemTune(tuneId)`. item-memories.js should own memory rendering/export helpers, not the entire game. New module isloaded beforemain inbothproduction/test boot paths.

- [ ] **Step 1: Write RED cases for real effects and records.** Example:

```js
api.useItem('fun_camera');
assert.equal(s.lifetime.itemMemories.photos.length,1);
assert.equal(api.itemStock('fun_camera'),0); // permanent ownership, not stock consumption
assert.equal(s.lifetime.money,beforeMoney);
// Reload snapshot, render gallery and verify saved age/actors/environment survive.
// The output image depicts the saved species/stage, not the pet's later form.
```

Test candy+8/taste20ticks no hunger; bubbleshappy10/allactivebond10; fireworkshappy15/partneraff15; balloon10tick prep, waits validhome, doesnot expire beforependinggame closes, no candidate no loss, no duplicateinvite. Box literalRNG0.1/0.6/0.9 => happy5/happy10/energy10,100tick intervalsave/reload; no cash/growth. Music addsvisitedseason/place tune, canactuallyselect/play, only100tick decline-10. Photo unlimitedvisualusesdo not farmconsumption30. Seven distinct unique-usehistory stillcompleteFUN7. Goal crown enablesdistinctreaction for each of7, persists collection, no extraPERFECT requirement. Sparelegacyscenetickets have no financial effect.
- [ ] **Step 2: Run RED.** `node --test tests/item-experiences-test.cjs`.
- [ ] **Step 3: Implement experience and UI.** Use existing sprites/atlas andstyle for shortcamera flash/bubbles/balloon/fireworks/box/music reactions; respectreducedmotion/soundoff. Store photo metadata, drawPNG onexport through existingcanvas conventions withoutdataURL in save. Galleryreopenspersisted photos/letters/lights/specials/reactions/tunes. Item inventory remainsusable withoutanotherexternal app. Names and saved text must beescaped; showemptyandunavailablestates. ExistingfreeBGMandlifecard exportremain.

```js
// Newplayback is separatefromfreeBGM selection and uses currentaudio unlock/mute.
audio.playItemTune(selectedTuneId);
if (ITEM_SYSTEM.ready(state,'musicbox')) {
  applyDecline(-10); ITEM_SYSTEM.cooldown(state,'musicbox',100);
}
```

Useexistingage/relationshipspecificvoices, notgenericduplicatedstrings. Thegoal crown'sspecialrecord usesstableitemIDpluscontextkey. KeepcostanddropseparationfromTask1.
- [ ] **Step 4: Run GREEN.** Experience, audio, full-display, overlay, save tests andthenfullnpmtestonce. Include focused renderlogicverification for photoexport and escapedmemorytext.
- [ ] **Step 5: Self-review, commit and report.** ReportactualreachableUI routes for all7 experiences, actualmelodiesandexport, notonlynew functions.

### Task 5: 夢・シールの選択と対戦の収支整合

**Files:** Modify `script.js`, `item-system.js`, `index.html`; create `tests/item-collections-economy-test.cjs`; update sticker/migration/dialogue tests as needed.

**Interfaces:** Consume inventory/progress, existingpicker/dialogsystem andexistingduelprotocol. Expose dreamreservationandtheme/kakera choice actionstoactualmenus; no externalmessages sent.

- [ ] **Step 1: Write RED behavior tests.**

```js
// Reservea legalnormaldream whileegg: stockstill1. Cancel:still1.
// Hatch:chosenlegalspecies andstock0; save/reloadbefore/afterdoesnotdoubleconsume.
// RenandinvalidIDsareunselectable; rarehas8normalhas22, neverALL_LINES31.
// Kakera12:show3new-priorityoptions;cancelkeeps12;chooseone=>0andonecopy.
```

Testtheme60draws3onlyselectedcategorywithhiddengate;ordinarypack30unchanged;legacyitem:flower2countsandplacementsmergeintoitem:flowerwithoutremovinginstancesorrewritinghistoricalcharacters. Duelbothsidesreservebetandcannotspendit;winnernet+bet/losernet−bet/draw0;cancelbeforepublishedrefundsonce;abandonpublishedisaforfeitwithoutminting;resumeresettlementisidempotent;oldinprogresswithinsufficientcashcannotmintfullnewpayout. Nextlifeeitherpreservesreservedmatchorsettlesitonceaccordingtostatedprotocol, neverbothrefundandpay.
- [ ] **Step 2: Run RED.** `node --test tests/item-collections-economy-test.cjs`.
- [ ] **Step 3: Connecttransactionsandchoices.** Allchoicesuseavailablelegalpoolsandvalidateagainoncommit. KeepoldIDsinhistorywhenmappingactiveinventory/placement. Normal/raredreamspendathatchcommitonly. Preservefullwipeintent. Duelstakeownershipisexplicitinlifetime andmatchrecord, notdeducedfromcurrentwallet.

```js
// Conceptualtransaction: reserveonce atchallenge/join, settleoncebyknownmatchID.
if (stake && !stake.settled) {
  state.lifetime.money += result === 'win' ? stake.amount * 2 : result === 'draw' ? stake.amount : 0;
  stake.settled = true;
}
```

Beforeimplementingduel, tracecurrenthost/guestpublish/import/abandonflowanddocumentexactpointofreservation/refundinthe report. Do notguessatnetworkauthorityorclaimalladversarialofflinecodeforgeryissolved.
- [ ] **Step 4: Run GREEN.** Collection/sticker/migration/dueldialogue/egg/overlayteststhenfullnpmtestonce.
- [ ] **Step 5: Self-review, commitandreport.** Explainoldsaveandpublishedchallengebehavior, exactreservationpointsandcurrencyaccounting.

### Task 6: 商品説明・最終操作整合・全体検証・文書更新

**Files:** Modify `script.js`, `index.html`, `item-experience.css`, `item-system.js`, `README.md`, `NAOTOCCHI_MASTER_SPEC.md`, `tools/bump-versions.js` onlyifneeded; create `docs/qa/items-economy-2026-09-14.md`; update affected behavioral tests onlyforfoundrisk.

**Interfaces:** ConsumeallpreviousnewAPIsandUI. Producecomplete38-itemcoveragematrixplusnew3, finalversionedassetreferences, documentedremaininglimitationandtestevidence. Do notmodifycarddesignPR259.

- [ ] **Step 1: Reconcileeverycatalogrowwithobservableaction.** Recordmatrix:oldID,newstatus,price,entrypoint,effecthook,restriction,persistencetest. Foranymissingfunctionalrequirementwritefailingharnesstestfirst. Afunctiondefinedbutnotreachableisnotcomplete.

```js
// UIhandler-levelcontract: clickingbuychangesonlymoney/stock; clickinguse
// changesstockandeffect;targetless/cancelledusedoesnotspend.
const before=s.lifetime.money;
clickBuy('c_safety'); assert.equal(s.lifetime.money,before-20);
assert.equal(s.oneTimeBoosts.safetyNet,false);
clickUse('c_safety'); assert.equal(s.oneTimeBoosts.safetyNet,true);
```

- [ ] **Step 2: RunREDforeachconcretemissinginteraction,thenimplementitsminimalconnection.** Keep38captureddecisionsandguardsastheauthority. Finisheffect/rankmessages,unavailableconditions,remainingcounts/cooldowns,ownedgoalrender,sourcecomments. Don'tweakentheexistinglayoutorskipcurrenttests.
- [ ] **Step 3: Verificationanddocs.** Run`npm test` once,`git diff --check`,andtheunchangedpolicy9-lifeeconomicrunneradaptedonlytoactualnewAPIs. Recordobservedearningsnotoldcounterfactualandexplainpurchases/behaviorlimits. ControllerswillperformrealbrowserUItestafterthisreport; provideastableservecommandandsavedfixturesinanalysisforcamera,inventory,targetlessuse,oldsave,rich/fewcoinstates.
- [ ] **Step 4: Updateuser-facingdocsandcachetokens.** READMEdescribespurchase/use,persistence,prices,tools,dream,collection. Supersedeorremovecontradictoryold50/9/high-price/unlimitedclaimsinthemasterspecwithfocuseditem/economysections. Maintainoldhistorydocsunchanged. Bumpcachetokensonlyforchangedassets.
- [ ] **Step 5: Self-review, commitandreport.** Coverageincludesall38oldIDs,3newcandidates,411collectionobjectsunchanged,PERFECTcosteffect,freecareandworldfunctions. Reporttestandcurrencyledgernumbersfromactualruns. Anunrelatedbaselineflakeisnotapassingtest; eitherfixitsprovenrootcausewithafocusedreproductionorreportitexplicitlyforthecontroller'sintegrationgate.

---

### Task 7: 作業中に追加された main のクイック更新を取り込む

**Execution order:** Task2 review completion → this task → Task3. This adapts already-approved invariants to main PR262, without repricing or introducing a new item decision.

**Upstream target:** `bf0ee0c56fad251464241f2e87e801ecdd7286d9`. Includes Quick30 games, quick-solo, voice settings and a corrected Quick miss test. Preserve upstream additions and the reviewed Tasks1–2 item behavior. Base recorded immediately before dispatch.

**Files:** Merge upstream changes in script.js, index.html, audio.js, quick.js, style.css, README.md, DEVELOPMENT_CHECKPOINT_2026-09-07.md, tests/helpers/runtime-harness.cjs, tests/quick-mode-test.cjs, tests/smoke-test.js. Add targeted behavior cases to tests/item-care-game-test.cjs and/or tests/quick-mode-test.cjs for the actual overlap. Source-cache tokens must refer to merged assets. No unrelated game redesign.

- [ ] Merge the pinned upstream commit into the existing feature branch. Resolve actual conflicts by retaining both upstream functionality and required item loaders/interfaces/snapshots. Do not replace whole files with either side or reset the branch. Keep merge evidence in the report.
- [ ] Write RED cases for the new integration risks: a completed quick-solo run gives one game result, one reward/energy effect application and raw-score record; varying its selected subgame never creates separate star types. Both quick-run and quick-solo count as the existing single `quick-run` star type. Their own run/solo statistics and upstream achievement distinction remain.
- [ ] Verify the actual delegated game-list handler can expand the upstream `quick-list-toggle` and start a selected quick-solo. The upstream toggle also has class `game-list-sort`; the earlier sort handler currently returns before the toggle handler. Write a behavior failure for that route, then fix the minimal handler ordering/guard. Do not replace the UI or alter game rules.
- [ ] Implement the integration correction. Complete the existing finite-session/game-start equipment-snapshot path for both Quick entry points. Preserve new voice controls and free BGM; no extra item stamp for each of30 subgames, and no per-round reward settlement.
- [ ] Run focused Quick/item/lifecycle/audio tests while iterating, then full `npm test` once. Preserve full actual output. Upstream already changed the known Quick failure tests; do not transplant the old tests or simply weaken their assertions. Report any still-failing baseline case separately.
- [ ] Self-review and commit the merge plus minimal integration fixes. Run `git diff --check`. Report upstream SHA, conflicts/resolutions, RED/GREEN evidence, exact count semantics and any limitation. No push/merge-to-main/publish/external messages. No subagents; controller provides a fresh review.

**Interfaces for later tasks:** `quick-solo` is a distinct raw record/statistics entry supplied by upstream but shares `quick-run` for the Star item's diversity stamps. `quickVoice` and expanded audio runtime must survive Task4. Task1 inventory loaders and Task2 effects stay authoritative.

---

### Task 8: 最終検証前に main のクイック50本更新を取り込む

**Execution order:** Task5 review completion → this task → Task6. Pinned upstream PR263: `16a053397bf4ceb516e2e8bab20ee7ed43ca0698`, after the already-merged PR262. The approved item effects, prices and collection scope do not change.

**Files:** Merge `quick.js`, `audio.js`, `script.js`, `index.html`, `style.css`, `README.md`, `DEVELOPMENT_CHECKPOINT_2026-09-07.md`, `tests/quick-mode-test.cjs`; amend focused Quick/audio/item tests only for concrete integration failures. No unrelated redesign and no card PR259 changes.

**Interfaces:** Keep all reviewed item APIs, equipment-at-start behavior, tools/gallery/audio, inventory and duel/dream/collection paths. Upstream now has exactly50 Quick subgames, a dedicated toggle class/style, a default TTS mode with `quickVoiceChosen` migration, and speech ducking. Quick-run remains one game; quick-solo remains a separate raw record with the same `quick-run` Star category. All saved user choices supported by upstream remain supported. Keep the reviewed hiragana/no mechanical spacing UI text when resolving changed template lines.

- [ ] Merge only pinned upstream into the existing feature branch; preserve both sides of actual conflicts, never whole-file take-ours/theirs or branch reset. Report exact conflicts and resolutions.
- [ ] Run focused Quick/item/audio tests after merging to expose concrete integration regressions. For missing behavior coverage use RED first. Preserve the selected-single-game handler and real completed-run, reward, raw record, reload and Star-category tests from Task7. Adapt stale initial-voice expectations to upstream TTS semantics; do not remove actual control/audio-call assertions.
- [ ] Validate fresh voice defaults, unchosen legacy pico migration, explicitly selected pico/off across reload, and the actual audio controller path with speech ducking. Preserve the existing item tune API and sound-off guard. Only add behavior tests where existing cases do not answer the integration risk. Do not claim real listening or visual browser validation.
- [ ] Finish merge resolution, minimal fixes, cache references and self-review before the one required full `npm test`. Run `git diff --check`; use task-local `env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test` if needed. Preserve exact commands and complete output in the report; distinguish intentional fault-injection diagnostics.
- [ ] Commit the merge and focused integration fixes. Keep the report in the ignored SDD workspace, do not force-add it. No push, merge-to-main, deployment, external messages or subagents.

**Later Task6:** Reconcile docs and counts against50 Quick games and TTS default. Final economic simulation uses the same nine audit policies. Runtime checks do not replace the confirmed blocked real-browser gate.

### 最終レビュー修正とPR264の固定取り込み

`a7fbb744056607ef675fff4b0af33baac40ad212`を修正基点に、PR264の`300d2aeeb93e61b6b2ff586e7a4ee83ab897c89b`だけをfeatureへ取り込む。`audio.js`は曲再生APIと指示整形の両方、`index.html`はアイテムの読込順、音声テストは両方の実行確認を残して競合を解決する。装備説明を既存の通知へ接続し、会話・緊急のお世話・次の人生の境界と動きを減らす設定を実行テストで確認する。変更アセットのURL、QAの持越し表現、音声初期値コメント、現行対戦コードの説明を修正する。先頭9件のお楽しみテストは整形だけ行い、音量復帰テストでは取消と両バスの復帰を実行する。

修正担当は関係するテストと差分検査のみを行い、controllerが一度の限定再レビュー後に最終HEADで全npm gateを行う。価格・効果・供給と9方針実測の条件は変えない。以前の失敗出力、意図した例外診断、実画面・PNG・実音の未確認は保持する。

### Task 9: PR267をムービー・指輪の更新と統合する

**Pinned upstream:** PR265/266を含む`3ec3a9ba030999a15a34b93d35bc6405ff676ed1`。PR267の実際の競合を解消するための追加統合であり、過去の最終レビューを繰り返すものではない。この固定点以降のmainは追わない。

**Files and boundaries:** 実際の競合は`index.html`、`package.json`、`tests/dialogue-test.js`。自動統合されるscript・runtime harness・README・master、追加movie.cssとmovie tests、指輪のcast-layout/ui変更も両側の機能を保持する。上流のQA画像はそのまま取り込み、今回の目視証拠と扱わない。カードPR259を変更しない。

- [ ] 固定mainをfeatureへローカル統合し、アイテム読込とmovie読込、全テスト一覧、会話と記録の両側を保持する。ファイル全体をours/theirsで置換しない。
- [ ] 装備の通知が新しいムービーを遮らず適切な場面では読めること、思い出・写真・日付イベントが継続することを既存の実行テストで確認する。具体的な統合不具合だけを最小限直し、既存assertionを削除・緩和しない。
- [ ] 統合したscriptなどの内容に合うキャッシュ参照を設定する。上流と同一内容のファイルは上流の有効な参照を保持する。日時を明示したQuickの2件の準備と全期待値は保持する。
- [ ] 全コード・テスト・参照の確定後に`env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test`を実行し、完全な出力と初回失敗があれば原因を記録する。最終QA追記は別の文書のみのコミットでよい。controllerが同じ全体テストを重複実行しない。
- [ ] 元の9方針の収支確認はcontrollerが統合後の固定コードで一度行う。ムービーの時間や描画で結果が変わり得るため、以前の値を未確認で転記しない。方針・seed・価格を変更しない。
- [ ] タスク範囲のレビュー後、controllerがGitHub連携でPR267のブランチを更新し、ツリー一致と競合状態を確認する。ワーカーはpush・外部送信・mainマージ・公開・追加エージェントを行わない。
