# なおぽよ。ギミック図鑑 VERSION 2

設計・表示比較のみ。本編、正式第1章、第2章V2、保存処理を変更しない。

- [本人限定比較ページ](https://naopoyo-gimmick-atlas-v1-20261109.kerzion214.chatgpt.site/)
- [共通仕様・図鑑・将来のエディター・第2章V3引継ぎ](SPEC.md)
- [全100面配置表](100-STAGES.md) / [CSV](100-STAGES.csv)
- [64候補一覧](CANDIDATES.md) / [機械可読データ](candidates.json)
- [45素材・2能力の共通データ](catalog.json)
- [ステージ交換形式案](stage.schema.json) / [構造例](stage-example.json) / [保存拡張例](save-example.json)
- [検証記録](VALIDATION.md)

## 集計

|分類|件数|
|---|---:|
|全候補|64|
|採用推奨|41|
|保留|16|
|不採用|7|
|A 現行維持|8|
|B デザイン改善|11|
|C 仕組みから再検討|45|

Cには新規・未実装候補を含む。45件の画像を作り直すという意味ではない。45素材IDは保留素材も含む設計レジストリであり、正式なプレイヤー図鑑の確定収録数ではない。

## 保存した基準

- V1: PR #532 `afd94151222a4c30d2bebdfdb8240c95eec70d94`。旧ディレクトリを無変更で保持。比較Siteでは `v1/index.html` から閲覧可能。
- main: `e0120c58f36394c9acff6507d72ceb3a1f48e1e2`。
- 第2章V2: PR #523 `9ebcda6d40d57634fe94dc7e80b5e7b66be65a18`。変更していない。
- source/ は第2章V2の5モジュールの原文保存。正式第1章・旧World・キャラクター原画はビルド時に固定checkoutからコピーする。参照63ファイルのSHA-256はSiteの `reference-manifest.json` に出力する。

## 比較方法

現行は実際の描画関数を実行して1マスを切り出す。現行維持素材はその同じ切り出しをV2にも使用。V1は原SVGを表示。現行未実装は未実装と表示し、現行画像を創作しない。V2案は比較専用Canvas描画で、正式キャラクターは原PNGを使用する。

作動前後の表示は状態見本で、解法再生ではない。8×8右盤面は選択素材の差替え見本。黄色枠は比較箇所を示す資料用表示。本番導入案ではない。

## 再現

```sh
python docs/naopoyo-gimmick-atlas-v2/validate.py
node --check docs/naopoyo-gimmick-atlas-v2/app.mjs
node --check docs/naopoyo-gimmick-atlas-v2/tile-art.mjs
python docs/naopoyo-gimmick-atlas-v2/build-preview.py /absolute/site/dist
```

build-preview は PR #505 の軽量checkoutに必要な参照ファイルだけを追加した環境で実行する。第2章用sourceはこのディレクトリに固定保存済み。生成物をゲーム本体へ組み込まない。
