# 429 — 資源価値pilotの独立レビュー修正

428 HEAD `516849ea1ef93ad246fa0fda37e8b50440cb598c`、tree `8a2d15de0f837ef8a6a93751b1c359a2c92b588b`から継続。PR259 Draft/open/未マージ。

## 修正

最終独立レビューでCritical0、Important2、Minor1。Important2件は一度の修正passで対応し、各再現テストをRED→GREENにした。再レビューは追加していない。

比較証拠の選択を、非公開山札順に依存する完全hashだけへ結び付けない。所有者/公開view、公開flags/counts、現在の反応/発動context、actor/round/phase、event seq、関連公開履歴を照合して再利用可能性を判定し、源raw署名とfresh合法集合のaction/source/variant/targetを再検査する。実行には実際のcontinuationを使い、完全hashは履歴・再生の同一性として維持する。93比較局面で両者の山札・相手手札を並べ替え、selectionとproof wrapperの一致を確認。公開履歴の改変は拒否する。

428の「candidate集合差0/93」は合法inventoryの互換性指標だった。429では選択pool（同値tie-break後の一意選択または116抽選集合）の差84/93と、両方seededの場合の抽選集合差0/4を追加。context差88/93は、新規seeded84/93と、両方seededでchoice kindが変わった4/4へ分ける。選択差56/93、対応可能93/110、unsupported17/110は変わらない。

`hand_plays`は01のアクションカードのプレイを数え、メイン/人物/セカイの配置は別の盤面形成欄にする。名称の改善はMinorとして保留。

## 証拠・残件

[429評価JSON](data/proxy-resource-value-pilot/evaluation-checkpoint-429/evaluation.json)、[署名manifest](data/proxy-resource-value-pilot/evaluation-checkpoint-429/manifest.json)、[独立レビューと修正記録](data/proxy-resource-value-pilot/verification/final-review-429.md)。428の評価と原本は変更しない。

旧908件の全proxyはレビュー修正のため中断し、verification/full-429/interrupted.jsonに未完了として残す。部分結果を新runへ合算しない。専用全pilot・fresh8 run/各独立再実行・npm/catalog/既定検査・原本505照合の最終結果をverificationへ保存してから、新しい全proxy manifestを起動する。最終専用96/96 PASS（116.625秒）、fresh8 run/独立再実行の全rawは427と一致、保護505の変更0。npm exit0、catalog/既定errors0、空白検査成功。この429は修正後の復旧checkpointで、全proxy完了を先に主張しない。

114正本・過去結果・112未実施・独立balance標本0を維持。メイン系統証明、装備解決、旧scope差は未知handler/真正停止として保持。完了0/停止8/未実施0から勝敗・最終そだち・政策採用を補完しない。
