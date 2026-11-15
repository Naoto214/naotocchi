# Pages依存関係契約の修正（PR #535）

2026-11-10 JST。対象の失敗HEAD: `20487bf620510c3a53f4b303690d7ea3cf95ac98`。

`Naopoyo Contact Experiment` の接触監査・比較ビルドは成功し、Pagesの実パッケージ検証だけが `runtime source changed; review dependency contract: prototypes/naopoyo-chapter2/gate-art.mjs` で停止していた。

A案の承認済み開閉描画を追加した際に、100面の参照保護ハッシュは更新したが、別のPages契約ハッシュを更新していなかった。元の正式版もこの描画関数を読み込むため、既に公開対象のファイルだった。変更前後を確認し、追加のimport・fetch・画像・動的URLがないことを確認。

修正は `reviewed_runtime_sources` の同ファイルのSHA-256 1件のみ。`files`（4,282パス）、動的依存、除外規則、例外、パッケージャー、公開ワークフローは無変更。新ハッシュは `b9262c9f781a8072bdbf14f47a6b04343d241effe27b3b5de9648564714624ca`。

既存20テストを残し、100面・共通試作制御・図鑑・接触比較が実パッケージへ入らず、公開ファイルから参照もされない検証を1件追加。修正前の同じ失敗を再現後、21件すべて成功。

ローカルの実パッケージは `.nojekyll` を含む4,283ファイル、251,289,352 bytes。全ファイルをローカルHTTPで配信してSHA-256一致を確認（欠落0、不一致0）。本番への送信・公開はしていない。ゲーム関連204テストと接触比較監査・ビルドも成功。

修正コミット: `3cb32e827f0a89e708cdaf96e24c6746f9cf9d77`。
[Contact Experiment再実行成功](https://github.com/Naoto214/naotocchi/actions/runs/42803930089)。

同HEADで別の旧Chapter 1ブラウザジョブはPlaywrightのブラウザ導入段階で失敗し、ゲームテストの実行前に停止。今回の契約修正とは分けて報告する。mainマージ・GitHub Pages本番公開なし。
