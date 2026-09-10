# Faceless Egg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 顔なしの専用卵と、既存の成長・保存に連動するあたため／孵化演出を実装する。

**Architecture:** `currentVisualStage()` が既存growthから卵PNGを選択する。`warmEgg()` は既存の成長処理後に一時的な表示要求だけを作り、`renderPetVisual()` が現在の人生に一致する要求を一度消費する。有限CSSアニメーションで殻を開き、ゲーム状態を遅延変更するタイマーを追加しない。

**Tech Stack:** 既存の静的HTML、CSS、JavaScript、Node test runner、imagegen、ImageMagick。

**Spec:** [承認仕様](../specs/2026-09-10-faceless-egg.md)

## Global Constraints

- `HATCH_GROWTH=20`、1回4、通常5回のあたためで孵化。
- 新規卵のみ128×128 RGBA、二値alpha、最大63不透明色、最低8px余白・接地点y=119。
- 承認済み301画像、31種族／248形態、安定ID、保存形式と旧キャラを保持。
- 他タブのUIとキャストの親要素の動きを変更しない。
- 実機描画・FPSとがたつきは未確認として記録。

---

### Task 1: 卵の表示と孵化の接続

**Files:**
- Create: `assets/characters/egg/{intact,cracking,ready}.png`, `egg-hatching.css`, `tests/egg-hatching-test.cjs`
- Modify: `script.js`, `index.html`, `cast-bounds.js`, `tests/visual-qa.cjs`, `package.json`, `.github/workflows/runtime-smoke-test.yml`
- Record: `docs/qa/faceless-egg-2026-09-10.md`, `docs/qa/faceless-egg-assets-2026-09-10.json`, `POST_RELEASE_CHECKPOINT_2026-09-10.md`

**Interfaces:**
- Consumes: `state.stage`, `state.growth`, `HATCH_GROWTH`, `stageVisualHTML(stage,size)`, `setStageVisual(target,stage,size)`.
- Produces: `renderPetVisual()`; transient `eggVisualReaction={life:state,kind:'warm'|'hatch'}`. No fields added to a save.

- [x] Verify baseline with `npm test`: existing runtime, dialogue, QA fixture and44 tests pass on a26a7db.
- [x] Write and run failing lifecycle tests. Real click handlers must select art and preserve the existing hatch boundary:

```js
const h = harness({resume:true});
h.dispatch(h.get('playWithBtn'), 'click');
assert.equal(h.api.state().growth, 4);
assert.match(h.get('petSprite').innerHTML, /egg\/intact.png/);
for (let i=0;i<4;i++) h.dispatch(h.get('playWithBtn'), 'click');
assert.equal(h.api.state().stage, 'growing');
assert.equal(h.api.state().lifeLog.filter(x=>x.text==='たまごからうまれた').length,1);
```

- [x] Normalize selected standalone generated assets; inspect them individually and generate only alpha geometry with `python tools/generate-cast-bounds.py`. Keep discarded generations out of the repository.
- [x] Add `eggVisualStage()` selection and render reaction after real growth. Consume reaction before rendering; accept it only when `reaction.life===state`. On a reaction, clear the cached hero visual key to restart its child; append two decorative shell pieces only for hatch. Do not add state-changing callbacks.
- [x] Add scoped finite CSS (warm560ms, hatch900ms) with complementary clipping for the shell. Reduced motion hides the shell and disables both animations. Newborn fallback remains the existing renderer.
- [x] Wire stylesheet/cache references, add egg0/8/16 development fixtures, and add the lifecycle suite to local and CI commands.
- [x] Run `node --test tests/egg-hatching-test.cjs`, `npm test`, asset pixel/alpha/color checks and `git diff --check`. Verify old image hashes and master data are unchanged.
- [x] Attempt browser review only if the available connection works; otherwise leave exact scenes in `/__qa` for the agreed later check. Do not infer rendering quality from Node.
- [x] Request independent code review under requesting-code-review, resolve material findings, then record evidence and latest-main/PR comparison.
- [x] Prepare verified files on `feature/faceless-egg-20260910` for GitHub PR creation. The PR body records the exact uploaded HEAD/tree and actual CI result; no implicit merge.

## Review correction

The independent review found that retained animation classes could replay after a minigame hid and revealed the cached hero. Added captured-node cleanup on egg animationend/animationcancel plus a finite560/900ms fallback; reduced-motion users receive no pending effect. The three regression cases failed before the fix and pass afterward. The full suite before main integration includes54 tests.

## Latest-main integration

Before upload, main advanced to0d0aae2 (#209 lively cast). Read its PR and verification record, retained its scripts/styles/parent motion and tests, and resolved four shared-file conflicts by keeping both features. The integrated npm test passes64 tests (main54 + egg10), plus runtime/dialogue/QA fixtures. The final PR targets this main; the original reviewed tree remains a parent in GitHub for audit.
