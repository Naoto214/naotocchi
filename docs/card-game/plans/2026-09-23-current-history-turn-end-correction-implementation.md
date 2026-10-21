# 126 詳細TDD実装計画

**設計:** `2026-09-23-current-history-turn-end-correction-design.md`。各TaskでRED→最小実装→GREENを確認する。

## Task 1: 125 raw固定と終了窓再生訂正

RED: 125の4 stopで123のclosed response checkがfalse。125 raw/両hashを変更するとintegrity error。GREEN: 124元stateから125候補・選択を再計算し、122既存handlerの終了窓閉鎖と同じ`return_target=turn_end`を導出。最終response-pass以外のevent/decisionは同一、訂正後event後hashとsnapshotを新126出力へ保存。125ファイルを変更しない。commit。

## Task 2: 全履歴provenanceと123独立validator

RED: 117〜125イベントの欠落、hash改変、未知effect、途中100到達、saved boolean偽造でtrueを認めない。GREEN: 124既存source chainと125保存eventを連結し、現在stateのcard IDと既存本文registryで期限/予約/growthを再計算。123の6手順/12条件を現在stateから導き、別経路に干渉しない。commit。

## Task 3: 証明後の終了遷移と次の判断機会

RED: 123証明falseではstate不変。trueだけ終了処理、後攻終了でround進行、未知R2開始証拠なら当該経路stop。GREEN: 01/06/64共通遷移とevent/hash/snapshotを適用し、次stateの条件を再監査。推測でドロー/選択しない。commit。

## Task 4: canonical成果物・検証・GitHub

RED: JSON欠落/1byte差、訂正前125 hashを訂正後として扱う、boolean/seq/decision改変を拒否。GREEN: 126 plan/evaluation/stopと独立validator、README/報告/gateを保存。126/125/124/123専用・全proxyを検査し、117旧テスト1件は分離。非forceでDraft PR #259へ保存しremote HEAD/tree/再取得bytes/PR/新HEAD CIを確認する。

自己監査: 125 raw非変更、122既存閉鎖処理、123の6/12、owner/public境界、期限/100中間履歴、winnerとbalance非加算、経路/card copy非特例を確認する。
