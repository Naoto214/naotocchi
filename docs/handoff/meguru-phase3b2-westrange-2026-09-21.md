# めぐる Phase 3B-2 — にしの大山塊 2 本(2026-09-21)

ブランチ `claude/meguru-phase3b2-westrange`（最新 main `9fb5935` から独立）。**main へはマージしていません。**

- 監査: [`../qa/meguru-phase3a-connection-audit-2026-09-21.md`](../qa/meguru-phase3a-connection-audit-2026-09-21.md)
- 基盤: [`meguru-phase3b0-multigate-2026-09-21.md`](./meguru-phase3b0-multigate-2026-09-21.md)
- 前段: [`meguru-phase3b1-valley-2026-09-21.md`](./meguru-phase3b1-valley-2026-09-21.md)

## 1. 実装した 2 本

| connection | anchor（A側 / B側） | 距離 | 移動 |
|---|---|---|---|
| `forest\|mountain`「やまみち」 | `forest.stonelook`「いわばのみはらし」(edge・z5250/66%・x+2600) / `mountain.lookout1`「いちのてんぼう」(edge・z1550/17%・x+1050) | 4.50 | 徒歩 |
| `snow\|mountain`「おねのとうげ」 | `mountain.summit`「ちょうじょう」(edge・z8500/94%) / `snow.peak`「ゆきやま」(edge・z7100/93%) | 1.70 | 徒歩 |

これで **もり → やま → ゆきぐに** が歩いてつながり、`forest|snow` の直通路を復活させずに
ゆきぐにへ到達できるようになりました（Phase 3B-0 で削除した直通路の代替経路が成立）。

- **新しい spot は 1 つも作っていません。** 4 つの anchor はすべて既存の非秘密 spot
- connection は増減なし（15 本のまま）。**gate を付けただけ**
- 探索率の分母も不変（region 11 / link **13** / tier1 17 / zone 103）

## 2. mountain 側 anchor を `trailhead` → `lookout1` に変えた理由

Phase 3A の第 1 候補は `mountain.trailhead`「とざんぐち」でした。**まずそれで実装して計測**したところ、
**`mountain|river_lake`（Phase 3B-1 で通した道）を塞いでしまう**ことが分かりました。

```
trailhead  z= 800  x=0  r=240   ← forest 用の候補
foot       z= 250  x=0  r=200   ← river_lake 用（3B-1 で実装ずみ）
```

`trailhead` は `foot` の **真上・同じ中心線**にあり、どちらも `dir: 'near'`（口へ向かって出る）です。
やまの中から口へ下りると、**必ず先に `trailhead` が開いて もり へ出てしまいます**。

計測（やまの中 z 600–3000 の中心線から口へ向かった 75 通り）:

| mountain 側 anchor | forest へ | river_lake へ | どこへも出ない |
|---|---|---|---|
| `trailhead`（第 1 候補） | **34** | **2** | 39 |
| **`lookout1`（採用）** | **0** | **35** | 40 |

`lookout1`「いちのてんぼう」は `x=+1050`（`trailhead` の x 範囲 ±240 から 640 以上離れている）ので、
**中心線の上り下りを邪魔しません**。もりへ行きたいときだけ東の展望へ寄ります。

これは Phase 3A の**第 2 候補**であり、指示 #6 の「他 gate と重なりすぎない」/ #9 の
「foot / trailhead / summit の出口判定が干渉しないこと」に従った選択です。
`mouths.mountain` も `lookout1` に揃えました（gate と発見条件を同じ spot に）。

### #5 の役割分散（維持）

| mountain の spot | 役割 | 状態 |
|---|---|---|
| `foot`「ふもと」(z250・x0) | `river_lake` | 実装ずみ（3B-1） |
| `lookout1`「いちのてんぼう」(z1550・**x+1050**) | `forest` | **本 PR** |
| `summit`「ちょうじょう」(z8500・x0) | `snow` | **本 PR** |
| `windnotch`「かぜのきれめ」(z5550) | `desert` | 未実装（空けてある） |
| `trailhead`「とざんぐち」(z800) | — | 出口にしない（上記の理由） |

**1 つの spot に 2 本ついている出口はありません。**

## 3. non-region transition（いきなりワープしない）

どちらも `gate.ends[region].land` に**6 段階**。同じ道を逆向きにたどりますが、
**進む向きで言葉が変わります**（のぼりは「きが まばらに なる」、くだりは「きが ふえる」）。
これは既存 `home|forest` と同じ書きかたです。

**`forest|mountain` — 深い森 → 木がまばら → 山道 → 岩場 → 傾斜**
```
もり側  いしづみの あたり → きが まばらに なる → しゃめんの ほそいき → いわまじりの みち → かんぼくの おび → やまの みはらし
やま側  やまの みはらし → かんぼくの おび → いわまじりの みち → しゃめんの ほそいき → きが ふえる → いしづみの あたり
```

**`snow|mountain` — 高地 → 森林限界 → 風の強い稜線 → 雪線 → 積雪**
```
やま側    さいごの おね → しんりん げんかい → かぜの つよい いわお → のこりゆき → せっせん → まんねんゆき
ゆきぐに側 まんねんゆき → せっせん → のこりゆき → かぜの つよい いわお → しんりん げんかい → がんかいの みち
```

`bearing` も含め、すべて **semantic data**（region ローカル world 空間の向きと地形名）です。
Canvas 専用の描画データは 1 つも入れていません。

## 4. Phase 2.1 / 3B-0 をそのまま使っている

- `way: 'walk'`、`approach → cross → arrive → settle`。新 engine なし
- `TRANSITION.ways` は `walk / up / down / sail` のまま
- 出口の選択は 3B-0 の `resolveGate()` をそのまま使用。新しい gate はどれも
  **1 spot 1 本**なので `bearing` / `priority` の出番はありませんが、3D 用に `bearing` は入れてあります
- UI は 1 つも増えていません。常時ボタンは `🧭 たび` / `🏠 もどる` の 2 つだけ

## 5. 変えていないもの

`travelToRegion()` ／ 既存 spot・path・zone・secret（**471 / 654 / 118 / 107**）／
世界地図 Fog の仕様 ／ 探索率の分母 ／ context UI ／ city・desert・`countryside|river_lake`。
**`regionOrigin` / global world / Three.js は未着手**です。

## 6. 検証

### 自動テスト — `tests/meguru-phase3b2-test.cjs`（18 テスト、`npm test` に追加済み）

| | |
|---|---|
| 1 | gate 7 → 9、未実装 7 → 5。connection は増減なし |
| 2 | **`forest\|snow` は復活していない**。もり → やま → ゆきぐに が唯一の経路 |
| 3 | anchor は全部既存の非秘密 spot。**新 spot 0**。471/654/118/107 不変 |
| 4 | やまの出口は 3 つ、`foot` / `lookout1` / `summit` に分散。1 spot 1 本。`windnotch` は空き |
| 5 | **やまの中から かわ・みずうみへ戻れる**（forest の出口が塞いでいない。forest 0 / river_lake 35） |
| 6 | 東の展望からだけ もり へ出る（x=+1050 と中心線から十分離れている） |
| 7 / 8 | もり ⇄ やま、やま ⇄ ゆきぐに の往復と `enterFacing` |
| 9 | **もり → やま → ゆきぐに → やま → かわ** が歩いてつながる |
| 10 | 1 回の横切りで gate は 1 度だけ（transition 二重開始なし） |
| 11 | Phase 2.1 をそのまま使う |
| 12 | 間の地形を両側 6 つ持つ（いきなりワープしない） |
| 13 | UI 増えず。徒歩の出口で「のる」を出さない。ride は 1 spot 1 本 |
| 14 | 探索率の分母・発見条件が不変 |
| 15 | 出口以外から外へ出られない（3 地域 全 spot × 4 方向） |
| 16 | **Fog: もりを知っただけで ゆきぐに の場所も存在も分からない** |
| 17 | たび不変・なかま追従・住民重複なし |
| 18 | **4 つの anchor は entry から path グラフでつながっている**（＝実際に歩いて行ける） |

```
npm test → 1096 / 1096 pass
```

### 実画面（Chromium・実 DOM のみ）

390×844 / 375×667 / 360×640 の 3 サイズで、**JS エラー 0 / はみ出し 0px /
常時ボタンは `🧭 たび` `🏠 もどる` の 2 つだけ**を確認。`おうち → もり` も従来どおり。

**正直に書いておく制約**: 今回の 4 経路（もり⇄やま、やま⇄ゆきぐに）は
**自動スクリプトでは再現できませんでした**。anchor が
`forest.stonelook`（7900 の森の奥 66%・横端 x+2600）、`mountain.summit`（9000 の山の 94%）と深く、
途中に衝突判定のある地形（やまのみずうみ・おね等）があるため、
**経路探索を持たないブラインドのパッド操作では anchor まで到達できません**。

そのかわり、テスト 18 で **ゲーム自身の path グラフを使って「入口から anchor まで道がつながっている」**
ことを機械的に確認しました（3 地域とも非秘密 spot に孤立ゼロ）。
gate の発火そのものはテスト 5〜10 が同じコード経路（`sim.step()` にパッドのベクトルを渡す）で
両方向とも押さえています。

## 7. つぎ（Phase 3B-3）

`city|countryside` ＋ `city|sea`。ここで徒歩の連結成分が 1 つになります。
