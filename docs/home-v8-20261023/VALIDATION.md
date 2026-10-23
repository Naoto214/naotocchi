# version 8 検証記録

対象runtime: GitHub `398e33c2292b8994061d33af54ed45e849dad5f1`、tree `8f925289a1b25302858dfe908d203a8b8f5e6fe1`。
最新main `76f3249446f06c7f64bcae926777563b723c7316` をfeature側へ統合。mainへのmergeなし。

## ローカル

- package.jsonの正式testコマンド（Nodeの並列数のみ8に設定）を実行。
- 前半グループ: 71/71、26/26、24/24 pass。smoke/dialogue/visual route各チェックも通過。
- 大規模グループ: 3199 tests中3196 pass、3 file-level failure。assertion本文のない異常終了であり、原因は断定しない。
- 対象3ファイル `meguru-phase4e4a-test.cjs` / `meguru-scenery-final-qa-test.cjs` / `save-compat-test.cjs` を並列数1で再実行: **44/44 pass、exit 0**。
- &&で未実行だった最終9ファイルを再実行: **137/137 pass、exit 0**。
- Python runtime packaging: **11/11 + 4/4 pass**。
- キーボード選択回帰をREDで再現、focused adapter修正後**12/12 pass**。独立レビューfocused **16/16 pass**、重要指摘なし。
- 公開source: 4049ファイル照合、不一致0（意図したtrial save keyとindex→game変換を考慮）。

単一の全コマンドが初回からgreenだったとは報告しない。異常終了3ファイルは再実行で全通過。検証ログをlogs/に保存。

## GitHub CI

runtime commitのNaopoyo official release / Pages runtime package / Naopoyo slide series / Naopoyo integration / pad-sizeは成功。
Home layoutのMotion v2 32ケース、conversation/dialog layout、meguru landscape等は通過したが、camera-framing.cjsのcanvasCountが2 !== 1で失敗。Homeも共通rendererを保持するためdocument全体の数は2になり得る。`#mgrCanvas`の親内へ検査を限定し、めぐる内の重複canvas検出は維持した。

検査修正commit `9071bcba8fc0d3bcd8526d6013a2c429fc4e6acb`。node --check成功。GitHub再実行中の時点ではCI全greenとしない。Runtime smoke / World visual qualityも完了結果を確認するまで保留。

## 画面と実機

VISUAL-QA-PENDING.md参照。Cloud Chrome観察と自動テストを本人iPhone Safariの合格に代用しない。画像の共有同期に失敗し比較画像納品は未達。
