# PR #435 公開阻害監査の修復（2026-10-24）

対象base: `bc77909f3465906099206f37be5e7bbedad86b16`。
最新main: `e7fef44b92233ebcbdcee5b7e9bebb97d3b790e7`（このbaseに統合済み）。
ゲームのルール・452枚・画像・固定400戦の証跡は変更しない。

## 原因と修正

1. CSS監査は採用デザインの開始コメント以降の全ファイルを読んでいた。
   後続の共通slotレイアウトの `.card-back` を誤検出した。
   採用ブロックに終端コメントを置き、両境界の一意性・順序と5つのfront
   selectorを検査する。後続のbackレイアウトを許可し、採用範囲内へのback追加、
   study限定化、rule欠損、band変更、終端欠損は故障注入テストで検出する。
   CSS実行内容の変更はない。Pages allowlistのCSS hashはコメント追加に追従。
2. 旧38登録アイテムを現行script.jsから探していたが、FUN_ITEMS等は
   PR #274で廃止済み。文書76のdesign_base_commitから抽出した旧5配列を使う。
   現行26の固定snapshot監査は維持する。
3. キャラクター段階名も現行本編から読んでいたため、固定設計との19件の差分の
   うち8件が表照合で失敗し、96/97の全文hashも変わった。
   設計基準・97作成時点・452枚export作成時点のmaster blobが同一と確認し、
   原本を固定入力として同梱。既存96/97 hashと452枚exportは変更せず一致する。

入力のcommit/blob・抽出式は
`docs/card-game/data/design-source-20260917/README.md`。
固定入力は読込時に内容検証し、改変を受け入れない。

## RED → GREEN

- 修正前の対象2ファイル: 8件中6成功・2失敗（CSS範囲、FUN_ITEMS）。
- 修正後のCARD GAME全回帰: **412/412成功、skip/cancel 0**。
  元410件はすべて維持し、監査故障注入を2件追加。
  再生成監査は452枚の全出力とsource hashを照合し、check modeの非書込も検査。
- パズル回帰: **526/526成功、skip/cancel 0**。
- Pages契約: **16/16成功**。
- 実Chromium134、390×844: 全10面を実pointerで全員脱出。
  初期9面lock、順次開放、未開放拒否、再挑戦、途中再読込、Undo/Retry、
  3段階ヒント・物語、旧12面への導線、旧盤面/Undo/clearと章記録の独立保持を確認。
- 本編menu → 章 → 旧12面の実browser確認: 320×568 / 390×844で成功。
  既存本編saveを維持。旧落下ゲームの拡張図鑑後復帰と4画面サイズの保存隔離も成功。
- 独立レビュー: 重大指摘なし。Pages CSS hash追従の重要指摘を修正済み。

上記はローカル結果。最終remote HEADのCI・merge・Pages配信照合は別途確認する。
本人のiPhone Safari実機の全10面個別QAは未確認。

## 追加CI失敗の原因

旧HEADの`naopoyo`と`slide-series`は、入口が旧12面へ移動するという期待で
失敗した。実際には正しく第1章へ到達していた。テストを新正式入口に更新し、
そこから旧12面へのリンクを実際にクリックして旧画面の起動も確認する。
旧HEADの本編regression、Home、Worldの4browser、character-integration、
Runtime smoke、Pages build、パズル関連CIは成功を確認した。
今回は修正HEADで再検証し、旧HEADの成功を最終CIの代用にしない。

## 保護と公開範囲

旧12面runtime/stages/store、正式カードdata/image、過去固定証跡は変更なし。
飛行比較室とPilot画面は通常導線/Pages対象外を維持。PR #422は採用しない。
正式版は第1章10面。飛行仕様は既存`FLIGHT-SPIKE-GRAVITY.md`を維持する。
