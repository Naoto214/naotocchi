# めぐる 3D Art Direction v1 — iPhone Human QA 結果(正本・2026-10-02)

対象: branch `feat/meguru-3d-art-direction-v1` @ `69a8857b`、Draft PR #371(base `feat/meguru-3d-foundation-v2`)。
判定者: 人間(iPhone 実機)。**この文書が 次の改善判断の 正本。**

## 判定

- **Art Direction 完成は 未承認。** 「十分な 箱庭感」「Art Direction 完成」「production ready」の どれも 判定して いない
- 次の pass は Art Direction v1.1(花 / 木 / 小物の 追加)では なく **Geometry / Terrain / Regional Identity / Runtime Quality Pass**
- main へ merge しない・Ready に しない・production Pages を かえない・save / schema 不変・2D 正本を こわさない・他 lane を merge しない

## 改善した 点(Human QA で 確認)

1. 森は 以前より かなり 森らしく なった
2. キノコの 森は 明確な 地域個性が 出て きた
3. ジャングルも 葉・下草が ふえ、森との 差が 出はじめた
4. 海は 以前の「水たまりが 連なる だけ」から 改善した
5. 花・植生・色彩は 以前より 豊かに なった
6. city も 以前より 建物らしく なって いる

## 未承認課題(固定)

| ID | 優先 | 課題 | Human QA の 観察 |
|---|---|---|---|
| HQ-1 | P0 | 残像 | iPhone 実機で 残像が 見える ことが ある。`&perf=1` が `player ok miss 0` でも 人の 目では 見える |
| HQ-2 | P0 | player が 見えなく なる | 同上。stats の ok と 実際の 見え方が 一致して いない |
| HQ-3 | P0 | カクつき | iPhone で カクつく ことが ある |
| HQ-4 | P1 | 予算 | forest 約 145k / city 約 183k / jungle 約 215k tris。とくに jungle / city が 重い |
| HQ-5 | P1 | 平面的 | 全体が まだ 平面的・四角い・模型を 平らな 盤に ならべた 感じ。地形 そのものが 弱い |
| HQ-6 | P1 | 小川が 川に 見えない | 青い 帯 / 細長い 水たまりに 見える。池の 円盤が 連なる 表現も のこさない |
| HQ-7 | P1 | 水面の 質 | 海 / 川 / 池が 同じ 青を つかいまわした 印象を さける |
| HQ-8 | P1 | 橋は 不合格 | ベンチに 見える・板を 置いた だけ・水を またぐ 構造が 弱い・接地感 なし・ハリボテ |
| HQ-9 | P1 | 建物 | 家が 細い・四角い・塔のような 家・個性が 弱い・立体感が 弱い |
| HQ-10 | P1 | home ≒ countryside | 「いえ」と「いなか」が 似て いる |
| HQ-11 | P2 | forest / jungle | 差は 出はじめたが まだ 弱い |
| HQ-12 | P2 | 木 | 幹が 直線的で 模型感 |
| HQ-13 | P2 | 小物の 質 | 自転車が 横倒しの 輪と 棒に 見える。ラベルを 見ないと 何か わからない 3D prop は 質を 下げる |
| HQ-14 | P2 | 地域 grammar | 背景画像 なしの 3D だけで 地域差が わかる ように |
| HQ-15 | P2 | 季節 / 天気 | 季節 system を fresh に 監査。mountain の 夏 / 冬 対応 |

## 指示の 範囲 メモ

- 指示文は【25. 季節システムを fresh …】の 途中で 切れて とどいた(25 以降の 本文は 未受領)。25 以降は 実行順の 一覧(season / weather 監査 → mountain 夏冬 対応 → tests → browser smoke → corridor QA → full regression → comparison images → iPhone preview → Draft PR → Human QA 待ち)と 最終報告の 6 項目(3D + perf / 3D / 2D 比較 / BEFORE-AFTER sheet / 代表画像 / mountain 夏 / 冬 比較)を 正本と して すすめる
- 方向性: 親しみやすい・丸み・色彩・植生・地域個性・ミニチュア箱庭の 立体感・少し 誇張した 読みやすい 形・明るく 楽しく 発見したく なる。特定の 作品の asset / 建物 / 地形 / model / texture / 配置 / animation は 模倣しない

## 実行順(この pass)

fresh remote 確認 → Human QA 保存 → runtime P0 → performance 予算 → Terrain v1 → Creek / River v3 → Water 改善 → Bridge v4 → Building v4 → home / countryside 分離 → forest / jungle 分離 → Tree v4 → props quality gate → 13 地域 grammar → season / weather 監査 → mountain 夏冬 → tests → browser smoke → corridor QA → full regression → comparison images → iPhone preview → Draft PR → Human QA 待ち
