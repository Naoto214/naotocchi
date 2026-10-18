# 434 範囲・根拠記録

- 432承認共通設計と433残課題を継続。個別軌跡パッチを追加せず、source-bound分類と既存123/124/405終了処理をscope内で再利用する。
- 旧185/204開始処理はたまご前提。main存在時にそれを許可するだけでは2ドロー/交換が残るため、01/02/64に従う通常1ドロー・交換なしを共有開始処理として実装。山札0は敗北ではなくドローなし。新裁定は追加しない。
- state schemaはcontinuation_contract_v1を維持し、実行coverageだけcontinuation_end_bridge_v1へ分離。433 runnerはoptional forced_adapterだけ追加し、default8保存結果の完全一致を検証。
- 新birth/attach履歴は候補・source・費用・対象・全envelopeを再生証明。実行済み通常開始も再生証明。未知runtime変化/対象離脱を黙認しない。
- I-bowtie装着先と終了/開始時状態は維持するが、任意能力の発動/解決は未対応時に停止。未知能力や本文不足を自由なpassに変えない。
- 431/433との差はexecution edition differenceとして保存。同434 coverageの旧/new判断比較だけ別集計。434補修は採用・強さの根拠にしない。
- 505/114/414・過去保存結果を維持。112 fixtures0、独立balance0、policy_promoted false、PR259 Draft/open/unmerged。
- 最終独立レビュー1回のテスト2指摘は修正し実装者が再検証。中間失敗ログを残し、最終PASSと区別する。
