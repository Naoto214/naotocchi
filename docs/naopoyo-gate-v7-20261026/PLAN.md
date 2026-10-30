# 石造りの魔法ゲート A — version 7 実装計画

Goal: PR #445のA案をPR #436へ必要分のみ統合し、既存本人限定Sitesのversion 7として操作可能にする。
Architecture: Canvasの新gate-art.mjsと描画専用gate-effects.mjsを第2章render.mjsへ接続。既存phaseイベントを使用。エンジン、stage、session、progress、保存形式、正式画像は変更しない。
Spec: 2026-10-26のユーザー承認済み実装依頼。A採用済み、途中再承認なし。

## Constraints
main/Pages/第1章直接変更禁止。PR445保持。既存解答62/60手を維持。Safari実機を確認済みとしない。

## Review focus
- 連続入力で240msの発光が入力ロックや保存状態を作らない。
- 重力・交換のphaseが実際の可視キャラ通過に同期し、不一致に発光しない。
- reduced-motionで発光せず、静止中の条件数字も隠れない。
- Undo/Retry/ステージ変更で古い演出を復活させない。
- 小画面、画面高さ変更、隣接物、キャラ頭上数字の重なり。

## Tasks
1. 正本固定と既存テストbaseline。Sites sourceとGitHub配信対象のhashを照合。
2. 演出の失敗テスト→240ms表示専用effects、A描画・数字拡大・前後レイヤー接続→green。
3. 11〜20の既存解答、Undo/Retry/保存復帰/順次開放、合同puzzle、本編、CARD、Pagesを回帰。既存テスト削除なし。
4. 実ゲームを375/390/430px iframeでChrome実描画QA。同じ盤面のv6/v7を保存。短画面・resize・reduced-motion・実入力確認。
5. 全差分独立レビュー、修正と再検証。PR436へcommit/push、CI確認。
6. 同じSiteへprivate version7、配信hash/403/保存復帰確認、証跡とPR更新。
