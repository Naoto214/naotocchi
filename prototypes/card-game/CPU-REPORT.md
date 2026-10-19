# CPU対戦試遊版 — 2026-10-19

試遊URL: https://naotocchi-card-cpu-20261019.kerzion214.chatgpt.site
Draft PR: https://github.com/Naoto214/naotocchi/pull/398

本人限定の新しいSiteへの配信が succeeded。main・本番Pages・既存試遊URLは変更していません。
開始画面で「ひとりであそぶ」、自分A/先攻またはB/後攻、初級/中級を選びます。CPUは相手の席を自動操作します。

## CPU方式と範囲
制限観測＋合法候補の点数評価。中級（基本戦略）を標準とし、初級も用意。中級の名称は目標水準であり、対人勝率で強さを認定したものではありません。
出生・段階成長・交際・公開能力値・時間・成長の上限/下限・残りラウンド・効果プログラムの操作タグを評価します。高度探索や機械学習は使用しません。効果の処理、合法性、勝利条件は従来エンジンそのままです。
全452カード定義を共通候補インターフェースで確認。必須選択・複数対象・複合支払い・response/chain・既存の自動パスを再利用します。未知/矛盾/反復では停止し、保存内に診断を残します。

## 非公開情報
CPU policyはengineをimportせず、完全状態を受け取りません。相手の手札、両者の未公開山札順、seed、commands、raw log、伏せ札の実IDを渡さず、許可されたpeekのみ参照できます。
非公開情報の差し替え・伏せ札instance ID置換でも観測/判断が同一であることを確認しました。ローカル保存には対戦再生に必要な情報が入るため、保存ファイル自体を秘匿する仕組みではありません。

## 検証結果
- CPU専用22/22成功。
- CARD GAME全体281件中280成功。失敗1件は既存「regeneration is deterministic and read-only in check mode」: check-design-data.pyがmainにないFUN_ITEMSを要求。CPU追加前にも再現。正本/カード定義を変更して通過させていません。
- 全452枚の出典・本文・source SHA検証は成功。
- 独立12試合（3デッキ×2seed×人間A/B）すべてR10最終比較で完走。各試合途中復帰、全操作の合法性、保存再生一致。最大保存417,866bytes。
- 人間役は別seedのテストドライバー。人間による実機完走や対人の面白さ評価の代替ではありません。
- CPUの途中保存/復帰同一、旧hotseat保存読込、stale timer/二重操作拒否、背景停止、反復停止、長押し中のタイマー停止を確認。
- 独立レビュー指摘の相手成長減少評価、対象所有者評価、ドラッグ中の更新をRED→GREENで修正。
- CPU操作では既存4秒通知のbatchをリセットせず、履歴へ残します。操作間隔650ms、詳細/履歴/メニュー/並び替え中は待機。
- 配信コード36ファイル一致、main由来画像290枚/1,550,929bytesのGit blob SHA一致。#393/#396専用アートは未接続。

## 保存
cpu-match-1の外枠に人間席・難易度・policy seed/判断番号・反復監視・停止診断、元のhotseat-2 replayデータを保持。履歴は元の操作列から再構築します。
CPUと2人対戦は別localStorageキー。旧2人対戦セーブ形式は無変更。試遊URL間の保存領域は別なので、移す場合は書出し/読込を使います。

## 残件
実ブラウザ描画、iPhone Safariの縦横回転/バー開閉/長押し/通知/背景復帰/通し対戦は未確認。managed環境にcontrol-browserがないため、迂回起動・ブラウザ導入は行っていません。
全452枚の全組み合わせや最適戦略は未証明。既存カタログ再生成不整合は未修正。実機QA後にバランス・テンポを調整してください。

## 保護
main fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7 を最終再取得して不変確認。#393/#396は当初と同じHEADでDraft/open。#397は別Workが更新しており本Workは一切変更していません。
engine/rules/catalog/legacy engine/docs-card-game/固定400戦資産はコミット差分なし。固定400戦・supervisorは実行していません。
配信のcommit/version/deployment IDとprotected PRの再確認は cpu-evidence/deployment.json、完走は completions.json、検証出力は cpu-tests.log/regression.log。
