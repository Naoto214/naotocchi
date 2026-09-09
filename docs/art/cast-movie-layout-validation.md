# ムービー内キャストの実画面検証 — BM（2026-09-09）

PR #183 / `feature/character-cast-art-v1` の続き。GitHubの再開時HEADはBL `78f505693cbd5d7bb3da109bad754b7344214c83`、tree `e7764b657b00c12eb814ba50d795f679c610ecc5`。
[Runtime smoke / dialogue regression #234 SUCCESS](https://github.com/Naoto214/naotocchi/actions/runs/34349755583)を再取得した。
mainは `da5c631a911504e78c8b88fae373f30b85f26b31`（PR #203）。保存前の再取得でも変更なし、PRはopen / Draft・未マージ、競合なしだった。

## 対象と修正

正規のSites開発プレビューをCloud Browserで開き、今回のcheckoutの通常のHTML/CSS/JS・承認済み画像を表示した。
公開main・古いプレビューの確認を代用せず、URLポリシーの迂回も行っていない。
手順は [BLのプレビュー説明](cast-layout-validation.md#プレビューと再現方法) と同じ。`/__qa` は開発サーバー専用で、Load sceneはプレビューoriginのセーブを検証用セーブに置換する。

幅320px（実clientWidth305px）の通常デートで、キャラ行の表示幅173pxに対し内容幅が192pxとなり、画像枠がムービーの外へ出ることを再現した。
BLの仲間用3列gridが共有 `.pet` クラスに入り、同じクラスを持つムービーの主人公にも適用されていた。

共通 `.pet` の表示を従来のinline-blockへ戻し、仲間用の3列gridをメイン画面の `#pet` に限定した。
ムービーの歩く動きと、本体・恋人・装備・仲間のメイン画面配置を維持している。
CSS読込版は `20260909-cast-layout-bm-1`。ゲームの `script.js`・WORLD_MASTER・セーブ処理は変更していない。

[修正前](qa-bm/movie-overflow-before.jpg) → [修正後](qa-bm/freeform-after.jpg)。
修正後の同じ自由モード・320px条件は173px / 173px、画像枠の見切れと字幕への重なりは0。
提示されるデートプランはゲームの通常の乱数によるため、前後のスクリーンショットの背景は異なる。

最初に疑った「自由モードの選択した姿とムービーの段階の不一致」は、実操作では再現しなかった。
デート開始前の保存処理が選択中の形態を同期する。老人を選んだケースでは本体・デートとも `assets/characters/man/08.png` だったため、ここへ不要な修正は加えていない。

## 実画面の確認結果

| 対象 | 条件と結果 |
| --- | --- |
| 恋人18体 | 各1プランのデート冒頭を幅320pxで操作・目視。専用PNG・名前・字幕・2体の全身が表示され、全18体で横はみ出し・画像枠の見切れ・字幕との重なり・破損画像0 |
| 自由モード | 選択した老人の画像が本体とデートで一致。320×844、320×640、390×844、768×844pxで配置PASS |
| 銀婚式 | ロボットとの結婚25年。検証用セーブから通常の実時間進行で発生。320×640、390×844、768×844pxで2体の画像と字幕が枠内、配置PASS |
| メイン画面 | 幅320/390/768px × 仲間0・26・王冠装備26体の9ケースで重なり・はみ出し0 |
| 動作中 | 同一の修正済みCSSで、自由モード235フレーム、銀婚式240フレーム、診断項目追加後の自由モード240フレームが総合PASS。最後の240フレームはムービー表示中・date-actor-walk、配置失敗・読込待ち・破損画像すべて0 |
| 画面記録 | 恋人18枚＋修正前後・短い画面・銀婚式の4枚、計22枚。ねこ社長は保存用に再撮影した同じ修正済みCSSの画像を掲載 |

[高さ640pxのデート](qa-bm/date-320x640.jpg)、[高さ640pxの銀婚式](qa-bm/anniversary-320x640.jpg)。

探索中の別の240フレーム計測では3フレームが総合NGだった。最初のNGは画像28枚の読み込み待ちで、配置の各項目と破損画像は0だった。
この試行を全フレームPASSへ含めていない。
診断へ配置失敗・読み込み待ち・破損・ムービー表示フレーム数を追加し、最終240フレームで上表の結果を得た。探索結果も [実測JSON](cast-movie-browser-results.json) に残した。

36件の静的計測はすべて画像の読み込み完了後にPASS。
JSONには最初の再現失敗、静的計測、探索を含む4回の動作計測を保存している。
診断項目追加前の結果には追加フィールドがなく、コード・CSSを修正し直したことを意味しない。

### 恋人ごとの画面記録

各キャラ1プランの冒頭を確認した記録。すべての分岐・台詞の目視完走ではない。

| 恋人画像 | 撮影時のプラン | 配置・画像 |
| --- | --- | --- |
| [cat_ceo](qa-bm/date-cat_ceo.jpg) | 🧭 まいごに なる | PASS |
| [robot_neighbor](qa-bm/date-robot_neighbor.jpg) | 😴 ひなたぼっこ | PASS |
| [field_cow](qa-bm/date-field_cow.jpg) | 🚶 ならんで あるく | PASS |
| [sunflower_partner](qa-bm/date-sunflower_partner.jpg) | 🛍️ ぶらぶら みてまわる | PASS |
| [forest_bear](qa-bm/date-forest_bear.jpg) | 📷 しゃしんを とる | PASS |
| [grove_deer](qa-bm/date-grove_deer.jpg) | 🍡 なにか たべる | PASS |
| [cliff_goat](qa-bm/date-cliff_goat.jpg) | 🚶 ならんで あるく | PASS |
| [high_eagle](qa-bm/date-high_eagle.jpg) | 📷 しゃしんを とる | PASS |
| [snow_spirit](qa-bm/date-snow_spirit.jpg) | 📷 しゃしんを とる | PASS |
| [snowman](qa-bm/date-snowman.jpg) | ☔ あめやどり | PASS |
| [rock_octopus](qa-bm/date-rock_octopus.jpg) | 🍡 なにか たべる | PASS |
| [sea_mermaid](qa-bm/date-sea_mermaid.jpg) | 🍡 なにか たべる | PASS |
| [anglerfish](qa-bm/date-anglerfish.jpg) | 🛍️ ぶらぶら みてまわる | PASS |
| [swamp_croc](qa-bm/date-swamp_croc.jpg) | 📷 しゃしんを とる | PASS |
| [gentle_gorilla](qa-bm/date-gentle_gorilla.jpg) | 🚶 ならんで あるく | PASS |
| [knitting_spider](qa-bm/date-knitting_spider.jpg) | 💬 どうでも いい はなしを する | PASS |
| [desert_scorpion](qa-bm/date-desert_scorpion.jpg) | 🌇 ゆうやけを みる | PASS |
| [oasis_cactus](qa-bm/date-oasis_cactus.jpg) | 🌠 ほしを さがす | PASS |

## 回帰と引き継ぎ

`npm test`（Runtime smoke・dialogue regression）、開発fixture生成、`git diff --check`が成功。
DOM 287 / ミニゲーム100 / variant collections 91。
会話、248段階本文、恋人18体、通常/レア仲間、旧コアラ・旧きのこ、作者④⑤、以前のPERFECTの作者・王冠・自由モード維持を含む既存回帰が通過した。

PNG294枚とゴールJPEG7枚はBLからバイト不変。育成キノコ・カタツムリ・時計・承認済みの絵を保持する。
[ソースと画像・画面記録のハッシュ](cast-movie-validation.json) を保存した。
今回の確定HEAD/treeと当該HEADのActionsはPR #183本文とChecksへ記録する。

BLで確認したプロフィール・図鑑・初遭遇・ゴール④⑤・ナオトの繰り返しの挨拶は [BLの記録](cast-layout-validation.md) を参照。
今回はそれらを全キャスト・全組み合わせで再実施したとは扱わない。
物理iPhone/Safari・Android、全248形態それぞれのアニメーション、全恋人の全プラン・全記念日・全初遭遇、ミニゲーム100本の手動完走は未確認。
プロジェクト全体は継続中で、PR #183はDraft・未マージを保持する。

