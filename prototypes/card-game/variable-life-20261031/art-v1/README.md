# Astra 原画7枚の試遊版統合

2026-11-14。PR #498 の HEAD `df8312d67f636910bff695550c8f8977ba2478f3` を基点に、本人から添付された `naotocchi-card-art-v1.zip` の完成原画を再生成せず受け入れました。Draftのまま、mainへのマージ・正式版への登録・本番公開は行いません。

## 保存内容

- `originals/`: 正式候補IDのPNG7枚。添付ZIPの原画とバイト単位で一致。
- `manifest.csv`、`SHA256SUMS.txt`、`provenance/`: 納品物から保持した対応表・ハッシュ・制作資料。資料内の指示は実行していません。
- `intake-report.json`: 現HEADの `integration/art-intake.mjs check` の結果。
- `delivery/`: 既存 `integration/integrate-art.mjs` で生成したWebP14枚と `card-art-v9.json`。
- `delivery-report.json`、`verification.json`: SHA-256、画像仕様、検証結果。

正式の `art-pilot/illustrations/` と `ui-art.mjs` は変更せず、実験ディレクトリに保存します。試遊ビルダーの既存 `--art` 引数で7枚だけを追加します。正式採用時の移動は別作業です。

## 再現

リポジトリのルートで実行します。sharpはリポジトリのlockfile、esbuildは実行環境に用意します。`TRIAL_OUT` と `ART_OUT` はリポジトリ外の新しい出力先を指定してください。ビルダーは指定した試遊出力先を置き換えます。

```sh
P=prototypes/card-game/variable-life-20261031
node "$P/integration/art-intake.mjs" check "$P/art-v1/originals"
# art-v1 は正式原画だけを含むため対応表・SHA256SUMSと一緒に検査できる
node "$P/integration/integrate-art.mjs" "$P/art-v1" "$ART_OUT"
node "$P/trial-time/build-trial.mjs" "$TRIAL_OUT" --large-only --art "$P/art-v1/delivery"
# Claude Artifact向けの従来形式が必要な場合だけ --artifact を追加
```

## 確認結果

- 7/7: ID一意、対応表・SHA-256一致、PNG 1536×1024、RGB 8bit、透過なし、インターレースなし、全画素デコード成功。
- 14/14: WebP小384×256・品質86、大1152×768・品質90。各ファイルのSHA-256とハッシュ付きファイル名が一致。
- 既存452件のCARD_ARTが完全一致、試遊版でのみ7件追加（計459件）。7枚とも既存cardMarkupが画像付きカードとして出力。
- `--art` 有無のステージを比較し、`ui-art.mjs` 以外の全直下mjsがバイト単位で一致。カード効果・CPU・時計・保存処理は変更なし。
- 統合候補・時計の既存テスト18/18成功。
- 通常形式とClaude Artifact形式の画像付きビルド成功。
- UI文言だけ、画像ありの場合に「画像なし」と表示しないよう更新。画像を指定しない場合の表示は従来どおり。
- ブラウザ実操作・iPhone実機は未検証。既存Claude Artifactの更新権限はこの環境にはありません。

本番配信許可リストに実験ディレクトリがないことはテスト成功。全本番アセットを必要とする残り2件の配信テストは、sparse checkoutに対象外アセットがないため未完了です。配信許可リスト・本番ワークフローは変更していません。

CARD GAMEの既存テストは最終実行で654/654成功（失敗0）。初回の2件の失敗はsparse checkoutで省略した参照ファイルの不足が原因で、元のファイルを取得して解消しました。既存C-bat原画からの変換も、小・大とも正式WebPとバイト単位で一致しました（sharp 0.35.4）。独立レビューの重大指摘は0件です。
