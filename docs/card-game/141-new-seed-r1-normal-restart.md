# 141 新seed R1通常行動の比較と独立再開

140保存JSON raw SHA `8b3f70735771f6279948cd1cfea98a097532f2d31965b38635ca8e4ca0128618` と、138・135に遡るstate/hash・event連鎖を固定入力にした。140の現在候補監査を独立再計算し、107・114の確定成長差・時残量、116の安全な時0人物配置とseedを現在stateへ適用した。旧4経路向けseed contextは使用せず、135のorder_idを用いる。

01-AのC-chicken本文は自分のターン開始時のみ任意発動を許し、配置後に過去の開始へ遡らない。01-BのC-batは相手のターンの自分のquick-useに誘発するため、今回の自分の配置で効果を発動しない。人物配置自体は時0・追加消費0であり、すべての有償候補に対して現在の時残量で優位。02-BのI-c_coin2は非公開山札上がメインなら条件付き成長があるが、選択時の確定成長へ算入しない。birthも時1であり、passの時残量が優位。相手手札・山札上は判断に用いない。

| 経路 | 元event→最終有効event | 141の選択・処理 | 次の停止 |
| --- | ---: | --- | --- |
| `probe-01-a-first` | 4→5 | 116 seeded fallbackでC-chickenを空きなかま枠へ時0配置 | 配置後responseの完全候補未証明 |
| `probe-01-b-first` | 4→5 | 116 safe free developmentでC-batを空きなかま枠へ時0配置 | 配置後responseの完全候補未証明 |
| `probe-02-a-first` | 2→2 | 138のG-hit-blow宣言後・発動前停止を維持 | 宣言variant付きresponse発動・解決未接続 |
| `probe-02-b-first` | 4→5 | 107・114の時収支で通常pass | turn-end responseの完全候補未証明 |

4経路ともcompleted 0。新decision 3／event 3／snapshot 3、独立balance標本0。元のR1交換のseeded fallback使用を保持する。141の最初のevent before hash、連番、game/continuation hash連鎖、最終snapshotおよびcanonical bytesを再生成で確認する。過去の停止証拠・state/hash、カード本文・数値・登録区分は変更しない。

次の横断対象は3種類の後続response窓と02-Aの選択済みG-hit-blowの発動・逆順解決。既存138列挙器は開始時・空盤面専用であり、01-A/Bの盤上源や02-Bの終了窓へそのまま接続しない。設置済み能力の正本タイミングと120・119の応答候補を区別して証明する。

近接状態の予備監査では、01-AのC-chickenは開始時限定、01-BのC-batは相手ターンの本人quick-use時限定で、いずれも今回の配置だけでは発動しない。01の現在の手札では、先手が持つ他のquick-useは必要なちょうせんや時・対象を欠く。02-Bは通常pass後の応答でBのI-c_coin2が時1の対象なし候補となり得るため、終了窓をpass-onlyと仮定できない。02-Aの宣言済みG-hit-blowは反応連鎖のlinkへ宣言を保持してから解決時に山札上を公開する必要がある。これらは次の候補完全性・発動・解決検査の対象であり、141では選択やeventを先取りしない。

## 検証

専用テストはモジュール不存在でRED、実装後3件PASS。141・140保存JSONの `--check` 一致、140原本raw SHA一致、独立再生・event/continuation hash連鎖検査、設計データ検査 `errors: []`、`git diff --check` 異常なし。全37 proxyファイルを個別プロセスで完走した実測は **423件中422 PASS／1 FAIL／0 ERROR**。唯一のFAILは117旧テスト `test_population_and_checkpoint_112_boundaries_remain_unchanged`（期待190／実測263）の既知の件数差。141由来の新規failure0、全件GREENとは扱わない。新HEADのworkflow/status件数は保存後に実測し、0件ならCI成功とは数えない。
