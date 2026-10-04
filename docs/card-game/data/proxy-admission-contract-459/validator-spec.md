# 459 validator仕様（実装前）

契約: `contract.json`。仕様は予定200群/400戦用だが、証拠検査を特定軌跡・カードに分岐させない。すべてread-only、入力dict不変。JSONを読む時点で重複key、NaN/Infinityを拒否。型は厳密（boolはintではない）。未知schema/余剰fieldは当該schemaエラー。バージョン拡張は別schema。

## APIと責務

全公開関数の戻り値はJSON可能dict。`ValueError` はJSON構文エラー、duplicate key、NaN/Infinity、dict以外を渡す等の無効な呼出しに限定。ロード済みdictの契約schema不一致（field欠落/追加・値や型の違い）はprotocol/manifest検査のvalid=false/errorsとして返す。証拠APIの未対応schemaは未証明として返す。正しく表現された「証拠不足/矛盾」は監査結果に残す。CLIは構造エラー2、全体gate保留1、要求した段階の形式検査成功0。形式成功をbalance許可と表示しない。

|関数（将来 tools/proxy_population_contract.py）|入力と出力|
|---|---|
|`load_json(path: Path) -> dict`|厳密JSON loader、外部実行なし|
|`validate_protocol(contract: dict, root: Path) -> dict`|459の全key/値/型とpinned source bytes照合。`{stage: 'protocol', valid: bool, errors: list[str], balance_admitted: None, executable: False}`。原契約への自己申告変更は拒否。承認根拠は459保存版を信頼anchorとし、呼出し側のplan_approved=trueだけでは承認にならない|
|`validate_manifest(manifest: dict, receipt: dict, contract: dict, root: Path) -> dict`|別途承認後に利用する純検査。生成しない。`{stage: 'manifest', valid, errors, balance_admitted: None}`。実値未提供はvalid=false。200群/400行、重複ID/欠落/追加、mirror、現物在庫、seed範囲、全順再計算、歴史台帳/棄却来歴、実行順、版/外部lock receipt検査。タイムスタンプ自己申告だけで結果前lock認証はしない|

`root` はrepo内docs/card-game。参照pathはこのroot内の正規化済み相対pathだけ、escape/symlink脱出拒否。契約hashはUTF8 sorted/indent2+LFのartifact規約。既存state hashは各既存関数の規約を保持。現物IDの多重集合照合にsetだけを使わない。

|関数（将来 tools/proxy_population_admission.py）|入力と出力|
|---|---|
|`audit_judgment(record: dict, context: dict, sources: dict) -> dict`|真正なrecord/sourceとadapterで5gateを再検査。生の`verified=true`は証拠でない|
|`audit_match(run: dict, manifest_row: dict, context: dict, sources: dict) -> dict`|機会義務と実現記録の対応、全判断・自動・終了、source結合replayを再検査。455〜457証拠はその範囲のみ利用|
|`audit_group(group: dict, match_audits: list[dict], context: dict) -> dict`|同一入力/版の両側を要求。欠落側は未証明。予定外/重複参照はmanifest整合エラーも保持|
|`audit_population(contract: dict, manifest: dict, receipt: dict, runs: list[dict], context: dict, sources: dict) -> dict`|各層auditを自身で呼ぶ。呼出し側の適格ラベル一覧を信用して集計しない。予定全行を保持し欠落runを未実施/未証明へ。結果observedから予定集合を推定しない|

`context` は段階に必要なprotocol/manifest認証receipt、固定義務台帳、actor view、前後state、全attempt、版付きreplay証拠への参照。`sources` は読み取った原記録byteと正本/実装hashの対応。schema/必須項目の詳細はadapterごとの正本由来設計時に固定する。未実装adapterは必ず未証明を返す。未知schemaを汎用的に「全gate verified」と受け入れる経路は禁止。これらは実装時の設計境界であり、現在完全な合法性証明APIが存在するとの主張ではない。

各層結果は `{layer, id, disposition, gates, exclusions, gaps, children}` を必須とする。dispositionは`eligible / excluded / unproved`。各gateは `{name, state, evidence_refs, reason_codes}`。stateは契約の3値。未証明gateには不足理由、verified/contradictedには再検証可能なsource・record・validator版・rule参照が必要。exclusions/gapsは同時に非空でもよい。上位は子のIDと理由を落とさない。execution_statusはmatchだけに別field。

source未認証・adapter未対応はunproved。認証済みのseeded OR strategic unresolvedはexcluded、唯一候補でも同じ。gate contradictedが確認済み失格に当たるならexcluded。残りは必要gate全部verifiedの時だけeligible。既存優先順位等の適用外を新評価値で補わない。

機会台帳は正本から各義務ID・trigger・対象・期限・必要判断種別・自動処理を導き、実行記録と対応付ける。実行器eventだけから台帳を作らない。「trigger不成立」も検証証拠を要する。適用性不明は未証明。未発生と未記録を区別する。途中state不足（457の56件等）は捏造しない。過去runへの新契約適用による再分類は拒否する。

## 全体出力

`audit_population` は `planned_counts={groups:200,matches:400}`、各層の適格/除外/未証明数、実行状態数、全予定IDのaudit、`whole_set={allowed:bool, counts:null|dict, rates:null|dict, conclusion:null|string}` と `diagnostic_subset` を追加する。

必要gate、承認、事前lock、集合一致の一つでも欠ければallowed=false、whole_setの残り3fieldはnull。適格subsetの件数/勝敗は診断欄だけに置く。diagnostic_subsetにはlabel、planned_denominator、eligible_denominator、excluded_count、unproved_count、complete_pair_count、single_side_count、numerators、rates、generalizable=falseを必須とする。0分母のrates=null。全400戦適格でも一般母集団への推定・均衡合否は出さない。

正しい再試行はattemptを増やすだけ。未完走インフラ中断を消去せず、同一manifest入力/版を検証した完走attemptでその行の完了証拠を得る。確定した不合法/116等の除外を別attemptで消さない。完走attempt間に矛盾があれば除外とし都合のよい結果を選ばない。retry起因の追加独立標本は常に0。

## 承認段階の区別

459 protocolは入力生成・実行を許可しない。そのfalseをtrueに書き換えず、将来別保存の承認receiptを結合する。現在の静的契約成功だけで実行gateは開かない。入力生成→完全manifest保存→readiness提示→最終実行承認の順序を証拠化する。runを作る副作用はvalidatorには持たせない。
