# めぐる — たび導線・context操作・世界地図 Fog of War・ジャングルの島化(2026-09-20)

対象ブランチ `claude/meguru-explore-ux`。`origin/main` = `4b48369`(PR #308 マージ後)から分岐。
**main へはマージしていない。**

## 1. 監査でわかった原因(推測ではなく、実ブラウザと実コードで確かめたもの)

### A-1「たび」を押しても何も起きない
`script.js` の `meguruBridge.openTravel` が `openExclusiveMenu('travel')` を呼んでいたが、
`openExclusiveMenu` の先頭が

```js
if (gameActive || meguruActive || state.transformOptions) return;
```

で、**めぐる中はそのまま return していた**。Playwright で確認したところ `#travelOverlay` は
`display:none` のまま、`activeOverlay` も `null` のままだった。強制的に開くと z-index 40 で
めぐるの上に正しく描画されたので、描画の問題ではなく入口の問題だと確定した。

### A-2「のる」がどの地域でも出たままになる
`#mgrRide` は `classList.add('hidden')` で消しているつもりだったが、
**`.mg-tap-btn.hidden` を消す CSS がどこにも無かった**。`.hidden` は共通ルールではなく
場所ごとに書かれている(`ui.css` の `[hidden]` は属性のほう)。class はついていたが
ボタンは出たままで、初期マークアップの「のる」がずっと見えていた。

### B 世界地図の未発見情報
`worldMapData()` の地形は `on: seen(p.region)` だった。点の属する地域を見つけただけで出るので、
かわ・みずうみへ行っただけで東の巨大山地 14 点がまるごと出ていた。
さらに `axis`(ほしぞら/しんかい)は `on:false` でも `x / y / label / short / region / from` を
返していて、**未発見の特殊層の名前と座標がデータに乗っていた**。

### C ジャングルの位置
`mapX:-4.9, mapY:-5.4` は本土のかいがんせんの延長上で、`coast` の 1 点目もジャングル所属だった。
地図の上では大陸の南西の角に見え、「外洋の島」ではなかった。

## 2. 直したこと

| 場所 | 変更 |
| --- | --- |
| `script.js` | `openTravelOverlay()` を追加。めぐる中はめぐるを止めずにたびを**かぶせる**。`meguruBridge.menuOpen()` を追加 |
| `meguru.js` UI | 右がわを「その場の 1 枠 + たび + もどる」に整理。`setAct()` が talk/ride を入れかえ、無いときは消す |
| `meguru.js` UI | `frameFn` の先頭で `S.menuOpen()` なら世界を進めない(`last = null` にするので閉じた瞬間に大ジャンプしない) |
| `meguru.js` UI | のりばに立っているあいだ、ヒントに gate の `verb` を出す |
| `style.css` | `.meguru-overlay .mg-tap-btn.hidden { display:none }` と、ロック中の `:disabled` 表示 |
| `meguru.js` 地図 | `WMAP_REVEAL = 1.15`。見つけた地域から `max(rx,ry) + WMAP_REVEAL × (1 + 0.8 × 見つけた数/10)` の円内だけ地形が出る。地上 10 地域すべてで完成 |
| `meguru.js` 地図 | 未発見の点は `{ on:false }` だけ。座標も所属地域も渡さない |
| `meguru.js` 地図 | 未発見の `axis` は `{ on:false, base }` だけ。名前・座標・乗り物を渡さない |
| `meguru.js` 地図 | `bounds` を返し、紙の広さを見つけたぶんに合わせる(0% の空の紙はおうちの周り半径 1.2) |
| `meguru.js` 地理 | ジャングルを `mapX:-6.3, mapY:-7.8 / belt:'isle' / isle:true` へ。`coast` の西端は `city` 所属に |
| `meguru.js` 地理 | `jungle-isle`(8点)・`jungle-islets`(4点)を `kind:'island'`, `needs:'jungle'` で追加。描画は 海のにじみ → 島の地面 → 海岸線 → 森 |
| `meguru.js` 地理 | `WORLD_GEOGRAPHY.scenery` を追加(D)。地形ごとの walk / role / near / far / cross |

## 3. 変えていないもの

- `travelToRegion()` — 1 行も変えていない。たびの画面から地域を選ぶ流れは以前と同じ
- 探索率の式と分母 — 地域 11 / みち 15 / 大めじるし 17 / 地区 103。471 spot・654 path・118 zone・107 ひみつ
- 地域の中の世界(spot / path / zone / 当たり判定 / 住民 AI)— ジャングルも 40 spot・57 path・10 zone のまま
- Phase 2 / Phase 2.1 の地域を越える演出 — `TRANSITION` 正本も `transitionPlan()` も無変更
- connection 16 本 — 1 本も増減していない
- 地域地図の Fog — さわっていない
- 表情まわりのファイル — さわっていない
- セーブの形 — 世界地図の保存は地域と道の id の集合のまま。移行不要

## 4. 報告：地理的に不自然になった connection(**今回は変更していない**)

1. `desert|jungle`「ほねのたにま」— さばく(-3.2, 1.4)からジャングル(-6.3, -7.8)まで、
   外洋を 9.7 メモリ横断する徒歩の道になっている。**歩いて渡れる地理ではない**。
   候補: 削除するか、`city|jungle` の海路へ置きかえる。
2. `jungle|sea`「にしぎしのマングローブ」— うみ(-1.2, -6.1)からジャングルまで 5.4 メモリ。
   こちらは**そのまま海路(船・フェリー)にするのが自然**。`special: 'sea'` として
   `countryside|star_stop` のゴンドラと同じ「特殊接続」の作りに載せられる。

どちらも今回は data も描画も変えていないので、100% の世界地図では海の上に線が 2 本残る。
船を実装する段階でまとめて決めること。

## 5. 確認したこと

- `npm test` 1011 件成功(main の 996 + 今回の 19 − 既存 4 件の書きかえぶん)
- `tests/meguru-explore-ux-test.cjs` 19 件を追加。右がわのボタン 1 枠・たびの開閉と世界の停止・
  越えている間のロック・CSS の hidden・のりばのヒント・Fog の 5 段階・未発見地域と特殊層の非漏洩・
  探索率の分母・島の地理不変条件・地形の意味づけ
- `tests/meguru-world-map-test.cjs` の 2 件を新しい規則に合わせて書きかえ(近さで出す規則・
  未発見たてじくは `on` と `base` だけ)
- 実画面: iPhone 390×844 / 375×667 / 360×640 の 3 サイズ。世界地図 11 / 25 / 50 / 75 / 100%、
  右がわのボタン 5 状態(ふつう・住民のそば・たび・のりば・越えている間)。
  はみ出し 0px、`pageerror` 0 件

| 段階 | 地域 | みち | めじるし | 地区 | 出ている地形の点 | 紙の広さ |
| --- | --- | --- | --- | --- | --- | --- |
| 11% | 2/11 | 1/15 | 1/17 | 5/103 | 31/81 | 5.0×6.6 |
| 25% | 4/11 | 4/15 | 1/17 | 15/103 | 47/81 | 8.4×9.2 |
| 50% | 7/11 | 9/15 | 4/17 | 32/103 | 57/81 | 9.9×13.0 |
| 75% | 10/11 | 14/15 | 6/17 | 60/103 | 81/81 | 12.6×16.2 |
| 100% | 11/11 | 15/15 | 17/17 | 103/103 | 81/81 | 12.6×16.2 |

50% の時点で、うみ・さばく・ジャングルのかたちも名前も出ておらず、東の山地は 11/14、
かいがんせんは 2/7 しか出ていない。

## 6. 確認していないこと

- 実機(iPhone 本体)での指の操作感・FPS。上の 3 サイズは Playwright の Chromium
- low tier を強制した実機走行
- 船・海路・海上の transition(今回は実装していない)
- `desert|jungle` / `jungle|sea` を変えた場合の見た目
