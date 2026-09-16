# Normal Equipment Art Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** PR #274で確定・保存済みの通常装具4画像を、安全に通常装具表示へ接続する。`bowtie/ribbon/scarf` は既存IDを維持したまま新しい商品名・PNGへ切り替え、ゲームパス画像は旧 `glasses` に流用せず、新ゲームパスID用として接続可能な状態にする。

**Architecture:** 既存のUIアトラスを無理に作り直さず、`script.js` に通常装具専用のPNGパスマップと小さな描画ヘルパーを追加する。ショップと装備中表示は従来どおり `itemIconHTML()` を入口とし、専用PNGがある装具だけ `<img>` を使う。画像読込失敗時は既存の `icon-fallback` を表示する。ゲームパスは旧サングラス `glasses` とIDを共有しない。

**Tech Stack:** Vanilla JavaScript / CSS / Node.js `node:test` / existing runtime harness

**Spec:** `docs/superpowers/specs/2026-09-16-items-v2-decision-log.md`, `docs/superpowers/specs/2026-09-16-normal-equipment-migration-v2.md`, approved asset commit `a80c65ec299ac7ec5aa6091698cb6c876d0af10d`

## Global Constraints

- PR #274はDraftのまま維持し、mainへマージしない。
- 画像4枚は再生成・再加工しない。以下の確定素材をそのまま使う。
  - `assets/items/normal-equipment/bento-box.png`
  - `assets/items/normal-equipment/toy-box.png`
  - `assets/items/normal-equipment/first-aid-box.png`
  - `assets/items/normal-equipment/game-pass.png`
- `bowtie` → おべんとうばこ、`ribbon` → おもちゃばこ、`scarf` → きゅうきゅうばこは既存所有を維持する。
- `glasses` は旧サングラスの廃止・360コイン返金対象。**`game-pass.png` を `glasses` に割り当てない。**
- ゲームパスは新商品。内部IDはこの計画では `gamepass1` とする。旧所有からの自動継承は行わない。
- この計画ではゲームパスの効果実装・価格実装・購入可能化は行わない。`gamepass1` の画像マッピングだけ先に安全に用意し、商品追加は別の通常装具V2実装タスクで行う。
- 既存アイテムの保存IDを書き換えない。
- 画像表示の失敗で装具の所有・装備状態を変更しない。

---

## Task 1: PNG装具の表示契約をテストで固定する

**Files:**
- Modify: `tests/ui-illustrations-test.cjs`
- Reference: `script.js`
- Reference: `assets/items/normal-equipment/*.png`

- [x] **Step 1: 既存テストを新3装具の期待値へ変更し、失敗することを確認する**

`tests/ui-illustrations-test.cjs` のショップ表示テストで、旧 `ribbon/bowtie/scarf` のアトラスキーではなく専用PNGを期待する。商品名もV2名を期待する。

期待する対応:

```js
const approvedPictures = {
  bowtie: 'assets/items/normal-equipment/bento-box.png',
  ribbon: 'assets/items/normal-equipment/toy-box.png',
  scarf: 'assets/items/normal-equipment/first-aid-box.png',
};
```

各対象ボタンについて、本文に以下があることを確認する。

```js
assert.match(body, /class="item-picture"/);
assert.match(body, new RegExp(`src="${approvedPictures[id].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`));
```

同時に表示ラベルを次で固定する。

```js
const expectedLabels = {
  bowtie: 'おべんとうばこ',
  ribbon: 'おもちゃばこ',
  scarf: 'きゅうきゅうばこ',
};
```

- [x] **Step 2: 装備中表示のテストを新画像へ変更する**

現在の `ribbon` 装備テストを、保存IDは `ribbon` のまま、表示が `toy-box.png`・ラベルが `おもちゃばこ` になる期待へ変更する。

```js
h.api.state().lifetime.equippedItemId='ribbon';
h.api.state().lifetime.ownedShopItems=['ribbon'];
h.api.render();
const node=h.get('petAccessory');
assert.match(node.innerHTML,/class="item-picture"/);
assert.match(node.innerHTML,/assets\/items\/normal-equipment\/toy-box\.png/);
assert.match(node.innerHTML,/aria-label="おもちゃばこ"/);
assert.equal(h.api.state().lifetime.equippedItemId,'ribbon');
```

- [x] **Step 3: 画像失敗時のフォールバック契約を追加する**

`item-asset` のエラーを擬似発火し、対応する `.item-picture` に `asset-failed` が付くこと、セーブ状態が変わらないことを確認する。

- [x] **Step 4: ゲームパスがサングラスへ誤接続されない回帰テストを追加する**

コード上で `glasses` が `game-pass.png` に結びついていないことを固定する。`gamepass1` のみがゲームパス画像パスを持つ設計にする。

- [x] **Step 5: focused testを実行してREDを確認する**

Run:

```bash
node --test tests/ui-illustrations-test.cjs
```

Expected: 新PNG・新ラベル・画像失敗処理が未実装なので対象テストがFAILする。

- [x] **Step 6: テストだけをコミットする**

```bash
git add tests/ui-illustrations-test.cjs
git commit -m "test: define normal equipment png display contract"
```

---

## Task 2: 新3商品の名前を既存IDのままV2へ切り替える

**Files:**
- Modify: `item-system.js`
- Modify: `script.js`
- Test: `tests/ui-illustrations-test.cjs`

- [x] **Step 1: `item-system.js` の3商品をV2名・V2価格・V2ショップ文へ変更する**

既存IDは変えない。

```js
"bowtie": {
  "label": "おべんとうばこ",
  "price": 3000,
  "kind": "equipment",
  "desc": "おなかがへると、自動で満タンにする。",
  "guard": "おなか25以下で100。手動の食事回数・実績等を増やさない。"
},
"ribbon": {
  "label": "おもちゃばこ",
  "price": 3000,
  "kind": "equipment",
  "desc": "ごきげんが下がると、自動で満タンにする。",
  "guard": "ごきげん25以下で100。専用リアクションは維持し、手動のじゃれる回数・実績等を増やさない。"
},
"scarf": {
  "label": "きゅうきゅうばこ",
  "price": 3000,
  "kind": "equipment",
  "desc": "病気になると、自動で治してくれる。",
  "guard": "病気の予防ではなく発病後の自動治療。手動治療回数・実績等を増やさない。"
},
```

- [x] **Step 2: `script.js::SHOP_ITEMS` の3ラベルだけ同じV2名へ合わせる**

```js
{ id: 'ribbon', label: 'おもちゃばこ', emoji: '🎀' },
{ id: 'bowtie', label: 'おべんとうばこ', emoji: '🎗️' },
{ id: 'scarf', label: 'きゅうきゅうばこ', emoji: '🧣' },
```

この段階ではemojiはフォールバック用途だけなので、保存互換のため不用意に別IDへしない。

- [x] **Step 3: focused testを実行する**

```bash
node --test tests/ui-illustrations-test.cjs tests/items-v2-care-automation-test.cjs
```

Expected: 名前・価格・既存オートケア挙動が矛盾しない。PNG表示テストはTask 3実装前なのでまだ該当部分がFAILしてよい。

- [x] **Step 4: コミットする**

```bash
git add item-system.js script.js
git commit -m "feat: align care equipment names with items v2"
```

---

## Task 3: 確定PNGをショップと装備中表示へ接続する

**Files:**
- Modify: `script.js`
- Modify: `ui-illustrations.css`
- Test: `tests/ui-illustrations-test.cjs`

- [x] **Step 1: `script.js` に専用PNGパスマップを追加する**

`ITEM_ILLUSTRATIONS` の近くに、アトラスとは別の明示的なマップを置く。

```js
const NORMAL_EQUIPMENT_PICTURES = Object.freeze({
  bowtie: 'assets/items/normal-equipment/bento-box.png',
  ribbon: 'assets/items/normal-equipment/toy-box.png',
  scarf: 'assets/items/normal-equipment/first-aid-box.png',
  gamepass1: 'assets/items/normal-equipment/game-pass.png',
});
```

`ITEM_ILLUSTRATIONS` から `bowtie/ribbon/scarf` の旧アトラス割当は削除する。`glasses:'glasses'` は、この画像統合作業だけでは触らない。ゲームパスへ変更してはいけない。

- [x] **Step 2: 専用PNG用HTMLヘルパーを追加する**

既存 `sceneryIconHTML()` と同じ失敗時フォールバック思想を使う。

```js
function equipmentPictureHTML(item, label = '') {
  const src = NORMAL_EQUIPMENT_PICTURES[item.id];
  if (!src) return '';
  const accessible = label
    ? `role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"`
    : 'aria-hidden="true"';
  return `<span class="item-picture" ${accessible}><img class="item-asset" src="${src}" alt="" width="128" height="128" decoding="async" draggable="false">${iconFallbackHTML(item.emoji)}</span>`;
}
```

- [x] **Step 3: `itemIconHTML()` でPNGを最優先する**

```js
function itemIconHTML(item, labelled = false) {
  const label = labelled ? item.label : '';
  const picture = equipmentPictureHTML(item, label);
  if (picture) return picture;
  if (item.id === 'sleepboost1') return careIconHTML('sleep', label, item.emoji);
  const key = Object.hasOwn(ITEM_ILLUSTRATIONS, item.id) ? ITEM_ILLUSTRATIONS[item.id] : '';
  return uiIconHTML(key, label, item.emoji) || escapeHtml(item.emoji || '');
}
```

- [x] **Step 4: 画像エラー処理を既存のdocument-level error handlerへ追加する**

`comment-asset` / `scenery-asset` と同じ位置で処理する。

```js
if (img.classList.contains('item-asset')) {
  img.closest('.item-picture')?.classList.add('asset-failed');
  return;
}
```

- [x] **Step 5: `ui-illustrations.css` にサイズ・フォールバック規則を追加する**

```css
.item-picture {
  display:inline-block;
  width:1em;
  height:1em;
  vertical-align:-.12em;
  line-height:1;
  text-align:center;
  pointer-events:none;
}
.item-asset {
  display:block;
  width:100%;
  height:100%;
  object-fit:contain;
  pointer-events:none;
}
.item-picture.asset-failed > .item-asset {display:none}
.item-picture.asset-failed > .icon-fallback {display:inline}
.menu-grid .item-picture {width:32px;height:32px;flex-basis:32px}
#petAccessory .item-picture {width:1em;height:1em;flex:0 0 1em}
.item-emoji .item-picture {width:1em;height:1em;flex-basis:1em}
```

確定PNGは滑らかな2Dイラストなので、ここでは `image-rendering: pixelated` を付けない。

- [x] **Step 6: focused testを実行してGREENを確認する**

```bash
node --test tests/ui-illustrations-test.cjs tests/items-v2-care-automation-test.cjs
```

Expected: PASS。

- [x] **Step 7: コミットする**

```bash
git add script.js ui-illustrations.css tests/ui-illustrations-test.cjs
git commit -m "feat: wire approved normal equipment png art"
```

---

## Task 4: ゲームパス画像を将来の新商品IDへ安全に予約する

**Files:**
- Verify: `script.js`
- Verify: `item-system.js`
- Modify: `tests/ui-illustrations-test.cjs`

- [x] **Step 1: `gamepass1` の画像マッピングだけ存在することをテストする**

`gamepass1` は `game-pass.png` を指す。一方、`glasses` はそのパスを指してはいけない。

- [x] **Step 2: `gamepass1` をショップ商品として追加しないことを確認する**

この計画の完了時点では、ゲームパスの効果・5秒待ち・実プレイ扱い除外がまだ未実装なので、未完成の商品を購入可能にしない。

- [x] **Step 3: 後続の通常装具V2実装計画に引き継ぐ条件を明記する**

後続タスクで `gamepass1` を商品化する時は必ず以下を同時実装する。

1. 価格8,000
2. 「ミニゲームを遊ばず、通常成功にできる。」
3. 5秒だけ「あそぶ」再使用待ち
4. 通常成功結果のみ
5. 今日のチャレンジ・実プレイ実績・自己ベスト・高得点・点数条件加入・大成功・レア報酬には数えない
6. `glasses` 所有を継承しない

- [x] **Step 4: focused testを再実行する**

```bash
node --test tests/ui-illustrations-test.cjs
```

Expected: PASS。

- [x] **Step 5: コミットする**

```bash
git add tests/ui-illustrations-test.cjs
git commit -m "test: reserve game pass art for its new item id"
```

---

## Task 5: 回帰確認と手動見た目確認

**Files:**
- Verify only

- [ ] **Step 1: アイテム周辺の回帰テストを実行する**

```bash
node --test \
  tests/ui-illustrations-test.cjs \
  tests/items-v2-care-automation-test.cjs \
  tests/items-v2-ease-automation-test.cjs \
  tests/item-care-game-test.cjs \
  tests/item-inventory-test.cjs \
  tests/scoring-shop-test.cjs
```

Expected: PASS。

- [ ] **Step 2: 全テストを実行する**

```bash
npm test
```

既知のベースラインとして `tests/quick-mode-test.cjs` の `mole (Lv4)` はランダムなおとり配置により不安定な失敗歴がある。もし同一失敗だけが再現した場合、今回の画像変更と混同せず、ログを保存して別修正とする。それ以外の新規FAILはこの変更内で解消する。

- [ ] **Step 3: ブラウザでショップ表示を確認する**

確認項目:

- おべんとうばこが `bento-box.png`
- おもちゃばこが `toy-box.png`
- きゅうきゅうばこが `first-aid-box.png`
- 3つとも小さい表示で潰れず、ラベル・価格を押しのけない
- 装備した時もキャラ本体や恋人・なかま表示を押し広げない
- 画像が読めない場合はフォールバックが出る
- サングラスにゲームパス画像が表示されていない

- [ ] **Step 4: PR #274がDraft・未マージであることを再確認する**

- [ ] **Step 5: 最終コミット前に差分を確認する**

```bash
git diff --check
git status --short
git log -5 --oneline
```

画像4枚そのものに意図しない再書き込みがないことも確認する。

---

## Completion Criteria

- `bowtie/ribbon/scarf` の保存IDを維持したまま、V2の商品名と確定PNGがショップ・装備中表示へ出る。
- PNG失敗時にフォールバックし、保存状態を壊さない。
- `game-pass.png` は `gamepass1` 用に予約され、旧 `glasses` へ割り当てられていない。
- ゲームパスを未完成のまま販売可能にしていない。
- 既存の3種オートケア効果は変わらない。
- focused testsが全てPASSする。
- PR #274はDraft、main未マージのまま。
