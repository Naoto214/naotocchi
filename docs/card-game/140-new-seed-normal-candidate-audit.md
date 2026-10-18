# 140 新seed通常行動候補の独立監査

139で見つかった138の旧121監査器参照を、過去の停止JSONを書き換えずに現在stateの監査へ接続した。入力は138保存JSONのraw SHA `4066a8307eeaeb7b11a473cbbdeba576cfcd2a0335b697ea1b24a7c02d52622c` に固定した。各経路について135との初回state/hash・138の全event連鎖・snapshot末端と最終game/continuation hash・138の独立再生一致を検査する。

125の空family除外、127の盤上枚数条件、128の対象なしID、132の盤上能力分類を、新seed本人の手札と公開stateへ適用した。121のowner/public射影を用い、相手の手札・山札順を候補と記録の公開部分に含めない。121の12条件を132の現在state検査器で再計算し、3経路とも全条件trueとした。138の以前の監査結果 `missing_exclusion_reason` は歴史的停止として保持する。

| 138経路 | 最後の有効event | 140の結果 | 合法候補数／列挙unit数 |
| --- | ---: | --- | ---: |
| `probe-01-a-first` | 4 | 候補完全、判断前で停止 | 3／18 |
| `probe-01-b-first` | 4 | 候補完全、判断前で停止 | 3／17 |
| `probe-02-a-first` | 2 | G-hit-blow宣言後・発動前の138停止を保持 | 監査対象外 |
| `probe-02-b-first` | 4 | 候補完全、判断前で停止 | 3／13 |

候補IDの完全な一覧と各採用・除外根拠は[140正準JSON](data/proxy-new-seed-normal-audit-140-20260924.json)へ保存する。138の意思決定を上書きせず、新decision・event・snapshot・完走・独立balance標本はすべて0。R1のseeded fallback使用を保持する。カード本文・数値・登録区分変更0。

## 続く検証対象

01-Aには無料なかま配置が2件あり、C-chickenの配置後の開始時誘発とC-cat_friendの盤上起動はそれぞれ正本のタイミングを保つ必要がある。01-Bは無料配置とbirthの比較、02-Bはbirth・I-c_coin2・passの比較が必要。旧131の比較器は旧4経路IDを前提にseed contextを復元するため、新seedの判断へそのまま渡さない。比較、選択、支払い、発動、効果とresponseを次の段階で現在stateから再証明する。02-AのG-hit-blowは宣言variantを発動linkに保持し、非公開山札上の情報を解決時だけ参照する接続が未実装。候補完全だけから完走可能とは判定しない。

## 検証

専用テストはモジュール不存在でREDを確認し、実装後3件PASS。保存JSONと138保存JSONの `--check` が一致し、138原本SHAと138からの独立再生連鎖も検査した。設計データ検査 `errors: []`、`git diff --check` 異常なし。全36 proxyファイルを個別プロセスで最後まで実行した実測は **420件中419 PASS／1 FAIL／0 ERROR**。唯一のFAILは既知の117旧テスト `test_population_and_checkpoint_112_boundaries_remain_unchanged`（期待190／実測263）。140由来の新規failureは0、全件GREENとは扱わない。CI run/statusは保存後の新HEADに対して実測し、0件を成功とみなさない。
