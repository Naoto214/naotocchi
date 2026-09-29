# 402 Aのたまご交換から次手番まで

401保存state raw SHA256 `78840ee72e3ab907c79cfa74869a52e8d0d633a071850efe38da2bf59e209cdb`を正本とする。共通401 adapterを再利用し、各経路でAの必須交換、開始時応答、必要な連鎖解決、通常行動の107・114・116 pipeline、終了前応答、六段階終了監査、次手番ドローを連続再生する。候補が完全な戦略比較不能はfallbackまで評価する。新裁定を必要とする局面は根拠を記録して停止する。

専用テストを先にRED。各中間候補・除外理由・stable ID・選択を保存し、event/snapshotと前後game/continuation hash連鎖を全件検証する。正準JSONと専用GREEN、README・報告・計画・script・test・生成JSONを保存してremote HEAD/tree・PR状態を再取得する。401で始めた全proxy回帰の完了状況を記録し、未完了をGREENとしない。
