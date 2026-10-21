# P11変更後の起点・typed手札形式接続

基準6152e4a84c909efd072525a4fec7df13b690dde4。既存115/zero-rootの単体再構成に限り、新規材料・本番標本なし。

- W-city: 実逐次起点146と元response起点145の差で旧終了provenanceが不一致。条件付き単体で起点5/4をRED再現。現在のreconstruction recordsの唯一の該当activationを既存board_group全差分監査へ結合し、既存Adapterでfresh候補/起点bridge/再適用、after+全event完全一致を要求。保存recordを返すだけでは通らない。重複・起点・ledger・receipt・delta・action・mandatory改変を拒否。
- group-origin-provenance-red:3件中1FAIL。green初回はtuple canonical化ERROR。green2は26PASS10.549s、exit0、Python1084前後一致。
- group-origin-multiturnはtyped監査source_zone KeyError、2件中1ERROR、214.103s、Python1084前後一致。
- native quick.activateは手札linkでsource_zoneを省略する。typed_resolutionだけ必須参照していた。省略はhand、明示hand/board以外は拒否。6QUICK/不正zone4種のRED→GREEN。typed-implicit-zone-greenは22PASS5.194s、exit0、Python1084前後一致。
- group-origin-multiturn2は199step/214event、R7/B・event216挑戦宣言後で停止。response_source_predicate_coverageのB-032#1=I-bowtieが未証明。2件中1FAIL、215.952s、Python1084前後一致。record.json.xzを保存。旧R5起点不一致とtyped形式エラーは通過したが、全turn検証は未完。
- test_challenge_windowへcoverage例外時の診断raw保存を追加。成功判定や本番挙動は変更しない。

独立read-only review:起点bundle C0/I0/Minor0、typed追加2行も新規指摘なし。レビュー側試験/編集なし。既存全差分/再列挙、scope例外時復元、記録だけで認証しない境界を確認。今回のログにない全proxy回帰を主張しない。

次はI-bowtieの挑戦開始/結果境界を既存source-pinned非開始判定へ結合。開始条件や新しい比較意味は追加しない。その後current-preflight-composition計画のP09/P10/P14–18を継続。preflight-ready=false、生成/固定/400戦0、116除外・policy promotion=false・全体結論nullを維持。
