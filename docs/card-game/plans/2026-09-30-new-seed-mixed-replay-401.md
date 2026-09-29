# 401 連続遷移の横断監査・再生計画

正本は400のremote HEAD `5c78c004f1ae3b7795065fab7105af1696d53ede`、tree `56afe18b6e41682881c43ce3d646751c6ddc72a3`。保存state raw SHA256は`dd83009fca60289dac8c54a3f7e4316bd886eb326f4baf38375e6ccb790d173a`。

1. 専用テストを先にREDとする。応答主体と通常行動主体、手札と盤上、時点、window_kind、完全候補、stable ID、選択pipelineを検査する。
2. 到達済みカードと局面に限った共通監査adapterを作り、既存138・142・144・188・196・204・229・325・381の契約を再利用する。新ルールやカード価値点は追加しない。
3. 01-Aの終了前応答、01-Bの開始時応答・連鎖・通常行動、02-A/Bの通常行動を順番に監査・選択・再生し、既存終了証拠をevent/snapshot/hash連鎖で延長する。六段階終了監査を通れば次手番2枚ドローまで進める。
4. 4経路の遷移を一保存単位にまとめ、各中間監査と決定を記録する。正準JSON・全event/snapshot・前後hashを専用テストでGREENにする。
5. README、報告、計画、専用テスト、adapter、生成JSONをGitHubへ保存し、remote HEAD/tree、PR #259 Draft/open/未マージを再取得する。

全proxy回帰はまとまった安全区切りで実施する。既知117の期待190/実際263、119/120設計データ件数、112 catalog参照問題は新規failureと区別する。独立balance標本0を保持する。
