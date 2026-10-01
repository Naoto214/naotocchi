# 434 — 共通継続契約の終了接続

433に続き、432承認設計の終了処理・履歴証明をinline実装。新coverage経路 `continuation_end_bridge_v1` を明示指定する。433 runnerのdefaultと保存結果、431歴史経路、505原本、114/414を維持する。

## 接続した処理

`proxy_continuation_end`は共通能力記述から終了時分類を得て、123/124/405の6段階終了監査と既存handlerを使用する。birth/attachの履歴は完全候補から再生して、費用・本文参照・対象・runtime・前後stateの一致を要求する。registry/classifierの追加はscope内だけで、例外時にも復元する。

装着先・公開準備情報・使用回数は、終了→次ターン開始→ドロー→たまご交換を通して全envelope/hash/snapshotへ保存する。対象離脱や未知runtime変更を無視しない。

開始時のmain有無は01/02/64に従う。mainがあれば通常1ドロー、たまご交換なし。mainがなければ既存の通常＋追加ドロー・交換処理を再利用する。mainあり山札0でも敗北せず、ドローをせず開始時応答へ進む。未知の開始予約・期限・装備能力の発動/解決は対応済みとしない。

## 同一入力の8軌跡

135の同じ入力から旧判断・pilot判断を各4経路実行し、初期入力から別に再実行して8/8完全一致を確認した。予定8、実行8、再生検証8、完了0、停止8、未実行0。433 defaultの8保存結果も完全一致を確認した。

| 経路 | 433旧判断 seq | 434旧判断 seq | 433 pilot seq | 434 pilot seq |
|---|---:|---:|---:|---:|
| 01-A先手 | 31 | 31 | 22 | 27 |
| 01-B先手 | 24 | 24 | 12 | 24 |
| 02-A先手 | 51 | 51 | 30 | 41 |
| 02-B先手 | 79 | 79 | 33 | 33 |

旧判断01-A/01-B/02-BはM-beetle-02の能力分類根拠不足、02-Aはplace_worldの確定結果証明不足で停止。pilot01-Aはplace_worldの実行adapter不足、01-BはE-final-timeのmain時処理証明不足、02-A/02-Bはrelationshipの確定結果証明不足で停止した。

431/433との到達差は処理coverage差として保存し、policy効果に数えない。同じ434 coverage内で公開判断viewが比較可能な10件中、選択差は5件。旧候補との差分監査は固定21件（shadow17＋停止局面4）を21/21監査、未実行0。いずれも強さ・採用の証拠ではない。

## 検証済み

- 新専用17件、既存共通契約34件、resource pilot97件、関連終了処理29件を同一processで結合し177/177 PASS、skipなし。scope復元、mainあり1ドロー、山札0、装着runtime維持、履歴改ざん拒否、未知分類停止、433 default互換性を検査。
- npm test406/406 PASS、skipなし。既定design/catalog検査errors 0。現在の登録数964は全回帰実行数ではない。431の913/913は過去の保存結果であり、434で全964件を実行したとは主張しない。
- 保護対象505 JSONはbase433とbyte一致。114/414および過去保存結果は変更なし。
- 最終独立レビューは1回、Critical 0 / Important 1 / Minor 1。Importantは非公開準備札テストの不存在カードfixture、Minorは未知mainテストが分類前の履歴不一致で停止していた点。両方修正し実装者が最終177件で再検証。独立再承認とは扱わない。

失敗した中間検査と最終検査を分けて保存する。詳細は[レビュー記録](data/proxy-continuation-end-434/verification/independent-review.md)、[裁定・範囲記録](data/proxy-continuation-end-434/verification/rulings-434.md)、manifestと検証logsを参照。

## 停止中・未実行

8軌跡すべて停止中で、完走・最終勝敗・強さは未確認。次は上記の能力分類・通常行動の結果証明/実行接続を正本から共通化して調査する。I-bowtieの任意開始能力発動/解決、未知の対象離脱、R10最終判定の新経路実測は未対応または未確認であり、今回の装着/終了接続で対応済みとはしない。新しい裁定が必要ならそこで停止する。

112 fixtures未実行、独立balance0、新方式採用false、PR259 Draft/open/unmerged。434の補修と到達差は強さ・採用の根拠にしない。旧433の8run default再生一致を検査し、433保存artifactは変更しない。

[接続計画](plans/2026-10-02-continuation-end-bridge-434.md) / [実行・検証保存先](data/proxy-continuation-end-434/)
