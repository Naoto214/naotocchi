# 保存・配信記録

## 本人専用比較ページ

- URL: https://naopoyo-split-compare-20261028.kerzion214.chatgpt.site
- 新規の独立Site。既存のVERSION 9 Siteは更新していない。
- project: `appgprj_6ae14da5bf8c81918f140e2aeea6791c`
- source commit: `48ca5658cdc3ba4b26aa1bdf5415ad8129fcf40e`
- saved version: `appgprj_6ae14da5bf8c81918f140e2aeea6791c~appgver_b4fc8bde7dbc8191ac2db4723812a34a`
- deployment: `appgdep_6ae152df4e0c8191af21712bc1f1a26d` / succeeded
- private専用save/deploy成功。本人専用のまま、共有範囲を広げていない。
- 配信物は比較用アプリと固定エンジンのみ。保存解答と探索コードを配信用ファイルから除外。

## GitHub

- Repository: Naoto214/naotocchi
- 新規branch: `research/naopoyo-split-rules-20261028`
- 保存時に再確認したmain: `0e0354b15ee8c29ad7e52dd0ba8c6993df80e643`
- 追加パス: `experiments/naopoyo-split-rules-20261028/` のみ
- PR #436はopen/Draft/未マージ、HEAD `1e1e04661e2f59b7ad6bd3e56dc3cef7c2d623c5` を再確認。
- mainマージ、本番Pages更新、既存試遊版更新は行わない。

## 最終検証

34/34専用テスト、40/40解答再実行、A/B/C 79,691入力＋B-once 26,504入力監査。詳細はREADME、REVIEW、evidence。
固定baselineの2ファイルに元から末尾空行があるため、SHA一致を優先してそのまま保持。新規コードのwhitespace検査とは区別。
