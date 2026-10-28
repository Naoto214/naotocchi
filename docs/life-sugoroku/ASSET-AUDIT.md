# 人生すごろく：既存資産調査

基点：2026-10-28 最新 main `85a59bb3de1cfb473485757bfa7a8b6cb9088034`。
本調査では本編ソース、セーブ、画像を変更していない。

## 正式キャラクター・進化系列

正本は `character-world-master.v1.js` の `NAOTOCCHI_CHARACTER_WORLD_MASTER_V1`。

| 分類 | 件数 | 画像・メタデータ |
|---|---:|---|
| playerSpecies.normal | 22 | id / label / stages[8] |
| playerSpecies.rare | 8 | id / label / stages[8] |
| playerSpecies.secret | 1 | れんくん。専用8段階 |
| companions.normal | 18 | id / label / asset / 任意behavior |
| companions.rare | 8 | id / label / asset / 任意behavior |
| partners | 18 | id / label / asset / firstRegion / hook |

8段階系列31種の `assets/characters/<id>/01.png`〜`08.png`、計248ファイルの存在を確認した。
`script.js` は同じ規則で画像と正式段階名を結びつけている。
仲間・恋人の44種は、各レコードの明示的な `asset` が正本であり、架空の段階画像は生成しない。
作者ナオトはマスターで `playable:false`。5つの `legends` は、とりい・かいだんなどの遭遇舞台を含み、通常の選択キャラとは区別する。
旧IDの `compatibility.*Aliases` は同一キャラと認められた組だけである。`legacyOnlySpecies` を似た新キャラへ勝手に変換しない。

## 本編保存と読み取り接続

本編の主キーは `naotocchi-save-v1`。ルートの `speciesLine`、0始まり `stageIndex`、`sodachi`、`individuality`、`gender`、`orientationId`、`attractedTo` と `lifetime.money` を使う。仲間は `companions`、恋人は `partner`。
本編はそだちと年齢を別軸とし、年齢は `ageTicks`、成長姿は `stageIndex`。すごろくの段階を本編の値へ書き戻してはいけない。
カスタムの主人公名フィールドは確認できなかった。基本表示名は正式マスターを使う。

独立したSites URLは本編のGitHub Pagesや別Sitesとオリジンが異なるため、そちらのlocalStorageを直接読めない。既存の「あいてコード」または「セーブコード」の貼り付けが接続手段となる。

- あいてコード：`NAOTOCCHI2:`。旧v1も本編では受理。`JSON.parse(decodeURIComponent(atob(suffix)))` で復号。`s`=種族、`i`=0始まり段階、`g`=ジェンダー、`o`=恋愛タイプ、`a`=恋愛対象、`individuality`=性格・好みの要約。`script.js` の `encodeGuestCode` / `decodeGuestCode` を参照。
- セーブコード：`NTS1.` + UTF-8 JSONのbase64url。`encodeSaveCode` / `decodeSaveCode` を参照。生JSONを扱う場合も未知IDと型を検証する。
- いっしょうカード：`NTL1.`。`line`、`visualStage`、`individuality`、`log`等の記録用途。完全な個体設定ではないため、恋愛タイプなどを推測して補完しない。

すごろくでは身元・正式系列・性格のコピーだけを採用し、進化段階1、そだち20、お金20に初期化する。既存保存への書込みは一切行わない。

## 性格・好み・恋愛・会話

`individuality-data.js` と `individuality.js` は独立したUMDモジュール。`NaotocchiIndividuality.summary(raw)` は `{temperament,hearts,place,game}` を返す。気質軸は curiosity / boldness / sociability / persistence。`exchanges` に仲間別の状況・選択・反応がある。
正式仲間の `behavior`、恋人の `hook` を台詞の根拠として使う。性格の数値を勝率補正に転用しない。

本編の恋愛タイプは straight / gay / bi / pan / aro / questioning。`gender` と独立した属性であり、既存 `attractedTo` は保存された個体の設定。特にbiの対象を再抽選しない。aroや設定不明のキャラに恋愛を強制せず、同じ報酬の友情文章を選べる構造にする。現実の本編の仲間・交際関係は書き換えない。

`relationship-life.js` は保存に触れないsession-only APIだが、遭遇時間を秒単位で管理する。本作のターン処理へ直接組み込む必然性はない。

## 画像・表情

- `pet-expression.js`: `NaotocchiPetExpression.assetFor(baseAsset, expression)`。既存31系列×8段階の表情PNGを参照し、未対応ならbaseを返す。
- `relationship-expression.js`: `resolve({kind,id,value,positive,normal})`。仲間・恋人のnormal/positive/lonely表示。
- `resident-expression.js`: `NaotocchiResidentExpression.resolve({kind,id,asset}, emotion)` は上記を統一し、`{asset,expression,fallback,...}` を返す。kindは form / companion / partner。

画像のないキャラへ新しい正式表情を捏造せず、共通の光・リング等の演出で成長を示せる。

## World・地域素材

`world-scene.js` は本編の保存・時計・天候を書き換えない見た目専用モジュール。
`NaotocchiWorldScene.resolveScene({region,season,time,weather})` は `.image` と `.accent`、`.base` 等を返す。

- 森：`assets/world/forest-v1.webp`（秋冬差分も既存）
- 海：`assets/world/sea-v1.webp`
- 都会：`assets/world/city-day-v2.webp`、`city-night-v2.webp`
- 小物：`fern-v1.webp`、`leaf-v1.webp`、`fish-v1.webp`、`kelp-v1.webp`、`reeds-v1.webp`、`willow-v1.webp`等
- UIの木・花・波：`assets/ui/season-region-atlas-v1.png`。`prop-illustrations.js` にcrop metadata。

既存World3Dの実行環境一式を増設するより、正式画像を2.5D盤面へ使う方が、独立試遊版の操作性・性能・保存分離を保ちやすい。

## ミニゲーム・CPU・ローカル対戦

`games.js` の `installNaotocchiMinigames(S)` は `{MINIGAMES,MINIGAME_CATEGORY_GROUPS,REGION_MINIGAMES,SEASONAL_MINIGAMES,mg,minigameCategoryOf}` を返す。本編stateは直接参照せず、S経由で難易度・描画・入力ヘルパーを受ける。

候補は `memory-cards`、`lights-out`、`slide-puzzle`。ただし各ゲームの状態はclosure内、乱数はMath.random、タイミングはperformance.now/RAF/setTimeoutであり、途中保存・復帰可能な状態APIは公開されていない。LightsOutの純粋な最少手数関数も非exportである。これらを無変更でラップしても、今回の乱数再現・ミニゲーム中復帰要件は満たせない。

本版では既存の操作ルール・アートを参考に、保存可能なすごろく専用実行器を作る判断が合理的。コードを直接再利用していない箇所を「既存ミニゲームの再利用完了」と報告しない。
既存 `sugoroku-race` はCPUサイコロに有利補正があるため、今回の公平なCPU基盤には流用しない。

## iPhone向け既存設計と本作への適用

本編には動的viewport、safe-area、44px以上の操作部、短い画面のスクロールなどの設計がある。人生すごろくでは巨大な本編DOMや全ゲームの初期化を持ち込まず、独立CSSで同じ設計原則を採用する。320/375/390/430pxの各画面と、短い縦高・長い正式名称を検証対象とする。

本調査のファイル存在確認は画像の見た目や実機Safari動作の保証ではない。実装後の視覚QA・実機確認は別途必要。
