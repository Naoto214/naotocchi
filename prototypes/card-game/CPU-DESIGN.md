# CPU対戦設計・実装計画 (2026-10-19)

目的: 人間がA/先攻またはB/後攻を選び、452枚対応の正式エンジンで10ラウンドを遊べる本人専用試遊版。
基点: main fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7 / tree 00f8ce47b39c76e25440c54d349a0e83d483dd76。
#259/#381/#384/#395 merged、#393/#396/#397 draft/open。後者・main・Pages・固定400戦は編集/実行しない。

## 設計
- cpu-observation.mjs: 信頼境界。engine.viewとlegalActionsを入力に、公開盤面、自分の手札、許可されたpeek、opaqueなui行動IDと安全な評価メタデータのみを生成。seed/decks/commands/log/山札順/相手手札を渡さない。伏せ札の実IDを渡さない。
- cpu-policy.mjs: 状態を変更しない評価関数。たんじょう、成長、交際、公開能力値、時、残りラウンド、既存ruleの操作タグを評価。個別カードの効果実行や隠れた完全状態による先読みはしない。初級/中級を交換可能にし、中級を標準とする。同点はCPU専用seedと判断番号で再現。
- cpu-session.mjs: HotseatSessionを内包し、通常/必須選択/応答を同じcommitへ送る。人間の閲覧席を固定。CPU操作中だけ内部の操作席を同期的に変更し、DOM描画前に必ず人間席へ戻す。既存自動パス/結果履歴を再利用。
- cpu-scheduler.mjs: 1回1操作、revision ticketで重複防止、背景/ダイアログ/終了で取消。650ms間隔。復帰は新しいticketを発行。
- 保存: cpu-match-1の外枠に元のengine save、humanSeat、difficulty、policySeed、判断番号、反復監視、停止診断を保持。古いhotseat保存はHotseatSessionへ分岐。旧形式を変更しない。
- UI: 既存盤面を利用。welcomeにひとり/ふたり・先後・初級/中級。CPU手番は受け渡しなし。背景化は一時停止、復帰は本人の準備OK。

## 比較した方式
合法候補の点数評価を採用。全状態シミュレーションは非公開情報混入の危険と費用が大きく不採用。ランダムpolicyは戦略性を満たさず不採用。
戦略強度は中級を目標とするheuristic v1で、対人勝率による中級認定はしない。

## 実装計画 (inline)
1. 観測/方針のテストを先に追加してRED。隠れた手札・山札・伏せ札差し替えで同一入力/判断、出生優先、負ける挑戦回避、選択/複合支払いを検証。その後adapter/policyを実装してGREEN。
2. session/schedulerテストを先に追加してRED。両席、保存再開同一、旧save、stale ticket、背景取消、反復停止を検証。実装後GREEN。
3. UIに接続。既存全CARD GAME回帰、独立seed複数デッキの完走記録、452枚共通経路、保護ファイルdiff検査。重要レビューを修正。
4. GitHub独立Draft PRへ保存。Sitesの新しいowner-private Siteへ静的配信。既存URL不変。実機SafariはHuman QA残件として明示。

## Review focus
- CPU側の必須選択から人間側応答へ移る境界
- 背景化/再開/保存読込と待機中callbackの競合
- 相手伏せ札の意味入りinstance IDとchoice metadataの漏れ
- 選択cancel後の同じ発動ループ、費用だけ消費する行動
- legacy保存/人間後攻/終了時の閲覧席と履歴

## 実行記録
- 新規cloneを専用ブランチへ切替済み。他Workと非共有の隔離checkout。
- 初回回帰257/259成功。2件はsparse checkoutで正本資料未取得。必要な正本資料のみ取得して再検証する。
- 承認方針: ユーザーの設計〜配信一括承認を適用。追加の段階承認待ちは挟まない。
- 観測/方針/CPU session/タイマー/UI/複合選択をRED→GREENで実装。ルール実行・カタログは無変更。
- 完走: 独立12試合、3デッキ×2seed×先後。途中restore、全コマンド合法性、R10結果、再生一致を確認。
- fresh reviewer: 情報漏洩/復帰/二重timerの追加重大指摘なし。相手そだち減少の符号を修正。負のgrowthの上限も修正。選択対象の所有者と長押し中のCPU更新も回帰テストで修正。
- CPU操作は通知batchを変更しない。既存4秒キューと履歴を維持。
- mainの既存カタログ再生成はcheck-design-data.pyがFUN_ITEMSを前提とするため失敗。全452出典hash検証は成功。正本を変更して通過させない。
- UI検証限界: Sites managed環境にcontrol-browserがないため、ブラウザの設置/迂回起動は行わず、描画・実機SafariはHuman QAへ残す。
