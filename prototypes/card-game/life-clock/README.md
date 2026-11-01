# 人生の時計 — 採用版の正本

採用デザインは **V18**。本人のVERSION 19指示による **中央3針の積層修正** を適用した最新版は `v19/clock-v19.mjs`。V19デザイン・積層・横向き配置は本人がiPhone Safariで確認済み。ゲームの表示版はV20（操作UI候補）、PR #501はDraftでV20の実機確認待ち。本番採用・mainマージとは別に管理する。

## 一元管理

`provenance.json` が採用状態・参照先・版履歴・原本ハッシュの唯一の台帳。`adoption.renderer` が最新採用描画、`adoption.developmentCandidate` が未採用候補（現在null）。候補を作っても採用参照を変更せず、本人の承認後に台帳とゲーム入口を同時に更新する。

- ゲーム入口：`../life-clock-render.mjs`。V19描画を呼び、画像URLを解決する。
- V19：V18のSVGから中央針グループだけを金→赤→緑に並べ替える。中央キャップは上に残る。
- V18：`v18/clock-v18.mjs`。V17 Aの外側クリップ、銀色小針と銀色裏面。原本を変更しない。
- 表面画像：`v16/plate.webp`、前面銀葉：`v16/occlusion.png`、真円リング：`v16/ring.mjs`。
- 透過SVG：`v19/front.svg`、`v19/back.svg`。前面は既存画像を相対参照するため、このフォルダー構成ごと利用する。文字は端末のGeorgia/serifを使用し、ゲームでは既存の`alignNumerals`で字形を補正する。
- 透過SVG再生成：リポジトリルートで `node prototypes/card-game/life-clock/v19/export.mjs`。画像再生成・白色キー除去は行わない。
- 針の形状・長さ・太さ・角度：`clock.mjs`。金90%/5、赤80%/16、緑70%/32（基準半径432）。V19はこれらを変更しない。
- メタリック配色：`v8/clock-v8.mjs` のC。数字と軸：`v17/clock-v17.mjs` のA（52px、元40pxの+30%）。銀小針・透過・裏面：V18。
- 180度回転：`../life-clock-turn.mjs` と `../life-clock.css`。対戦値の投影：`../life-clock-state.mjs`（変更なし）。

## 旧版の復元

V18の完全保存点は `75d9a4d5e6c146a3f311de9c829d5fe22d4b570b`。`git show <commit>:<path>` で読み出し、別の検証ブランチで復元する。旧版を破壊するreset/force pushは不要。

時計だけをV18に戻す場合は、検証ブランチで `life-clock-render.mjs` のimport/exportを `v18/clock-v18.mjs` に戻す。台帳・表示版・allowlistのレビュー済みハッシュも更新し、時計および対戦回帰を実施する。V17 A以前の原本保存点・各ファイルSHA-256は台帳の既存`commit`/`files`に残す。V8〜V18および既存の比較資料は削除・上書きしない。

## V19検証

`node --test prototypes/card-game/tests/life-clock*.test.mjs`

既存6重なり条件、0と12、中央キャップ、寸法、V18との非針部分の一致、裏面一致、324状態の値・角度、保存互換性を確認する。表示サイズと実機QAの結果は `docs/card-game/life-clock-v19-verification.md` に記録する。

## V20操作UI候補

カードと時計のダブルタップ、表示ボタン、260msの動きを共通化。デザイン描画はV19を継続し、V18/V19原本と検証記録は保持。V19全体保存点は `9a1e387dc53dfcf4583790135c78dcff3280d486`。検証は `docs/card-game/life-clock-v20-verification.md`。
