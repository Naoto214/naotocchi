# なおぽよ・レスキュー
指で動かして合体・分裂し、全員を救出する独立10面パズル。

本人限定試遊URL: https://naopoyo-rescue-20261021.kerzion214.chatgpt.site

同種同段階の2体で1段階進化。トゲで1段階下の2体に分裂。青い犬・桃色の魚の2種族。移動は上下左右、合体後も同じ指で継続。Undoはドラッグ単位。重力面は上→横で足場に登り、指を離すと落下する。

- SPEC.md: 統合ルール、代替比較、拡張設計
- PLAN.md / LEDGER.md: 計画と裁定
- REPORT.md: 10面、検証結果、実機QA、次の優先順位
- solutions.json: 合法操作で検証済みの全解答

ビルド不要。ディレクトリを静的配信してindex.htmlを開く。テスト:
`node --test prototypes/naopoyo-rescue/tests/*.test.mjs`

既存ゲームと非接続、保存キーnaopoyo-rescue-v1のみ。mainマージ・本番Pages公開禁止。GitHub成果と本人限定Sites公開物の実行ソースは同一。

扉・出口の改善: UI-REPORT.md。正式公開と旧作品の非表示手順: RELEASE-PLAN.md。今回のmainマージ/本番切替は未実施。
