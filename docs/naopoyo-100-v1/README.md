# なおぽよ。全100ステージ一括再設計 VERSION 1

本人限定の試作。全100面と番号を持たない8ページの体験型絵本を制作する。mainマージ・GitHub Pages本番公開は禁止。

## 試遊の入口

[本人限定100面試遊版](https://naopoyo-100-v1-20261109.kerzion214.chatgpt.site) ／ [設計・検証の閲覧ページ](https://naopoyo-100-v1-20261109.kerzion214.chatgpt.site/prototypes/naopoyo-100/reports.html)


- 全100面は最初から選択可能。番号は目標難易度で、確定した実測難易度ではない。
- 「はじめの絵本」で、移動・時の針・合体・重力・足場・斜め・落下再合体を体験できる。いつでも閉じ、読み返せる。
- 各面のクリア、あとで再確認、面白さ、難易度感、メモを端末に保存。「記録の保存・読込」でJSONへ書き出せる。
- Undoは1入力単位。Retryで初期配置へ。解法の見本は自分の盤面を一時保存し、戻って続けられる。見本のクリアは通常クリアに算入しない。
- 初遭遇した素材がひとマス図鑑に登録される。盤面と図鑑は同じ描画関数と実装ルールを使う。

## 設計・検証資料

|資料|内容|
|---|---|
|[100面一覧](STAGES.md) / [CSV](STAGES.csv)|番号・目標難度・素材・発想・差異・ヒント・手数・検証区分|
|[解法](solutions.json)|各入力で選ぶ個体の座標と方向。短い合法解か確認手順かを区別|
|[検証結果](validation.json)|探索上限、展開数、手数、素材初出、主素材を外した比較|
|[追加点検](MECHANIC-AUDIT.md) / [検証記録](VERIFICATION.md)|抜け道の修正とテスト・ブラウザ確認の範囲|
|[改善候補](IMPROVEMENTS.md)|仕掛けの必要性、難易度の再評価、探索上限による未確定事項|
|[素材対応](MATERIALS.md)|図鑑V2 ID、使用面、今回の実装ルール|
|[実機確認](IPHONE.md)|iPhone Safariで確認する項目とブラウザ検証の範囲|
|[保護ハッシュ](protected-hashes.json)|正式第1章・第2章V2参照原文・図鑑V2の無変更基準|
|[共通盤面JSON](../../prototypes/naopoyo-100/stage-data.json)|素材ID、配置、接続、初期個体の交換データ|

## ルール・データの境界

正式第1章のDエンジンをそのままimport。真後ろから生成し、障害で時計回り90度、最大7マス、生成済みの1を通過しない設定を固定している。新しい水・風・箱・連動・周期・地中・協力はこの試作だけのadapterである。

水に入れるのは魚・ペンギン。水流・風・氷・ワープは操作中の個体へ作用し、時間経過で勝手に進まない。落下途中の板への接触も連動へ反映し、保持板を離れた扉を閉じてから次の落下を処理する。波と周期は一手前に表示されていた相で判定し、成功した入力の終了時に相が進む。地下入口は明示された方向・段階条件を満たした個体が対の出口へ進む経路であり、既存種族に無断で掘削能力を付けていない。

共通JSONは図鑑V2の素材IDとレイヤー・接続構造を再利用した**試作拡張形式**。V2の資料用schemaへ未承認パラメーターを追加したという扱いにはしない。`rulesetVersion` の末尾 `naopoyo-100-v1` により区別し、`serializeBoard` / `deserializeBoard` で双方向変換する。交換ファイルの読込は検証用APIで、プレイヤー用エディターやオンライン共有は実装していない。

## 保護したもの

- 基礎: PR #532 `fce9067b41ed4c6b6640791ec13bd610c5b6bde3`。
- 正式第1章: 既存ファイル・保存キー・本番入口を無変更。旧盤面は元のパスで残す。
- 第2章V2: PR #523 `9ebcda6d40d57634fe94dc7e80b5e7b66be65a18`。PR・試遊Siteとも更新していない。
- 図鑑V2: 原本を更新せず、参照描画とIDを利用。比較原本も試遊Siteに同梱。
- 新保存キー: `naopoyo.hundred.owner-prototype.v1`。他ゲームのデータは読まない。

## 再現

```sh
node --test tests/puzzle-*.test.mjs prototypes/naopoyo-100/tests/*.test.mjs prototypes/naopoyo-time-hand-chapter1/tests/*.test.mjs
node prototypes/naopoyo-100/build-stages.mjs --check
python prototypes/naopoyo-100/build-preview.py /absolute/site/dist
```

探索結果はクリア可能性・最短性の範囲に限る。面白さ、気づきの自然さ、1〜100の主観難易度の連続性は本人の試遊評価が必要。
