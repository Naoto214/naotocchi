# 440 — 完走後の同一通常局面評価

439保存commit `49f4e528747b0e7606dadd9aeb0dd40a1061289b`の全8 R10完走を基準に、全313通常判断を固定母数として旧／新方式を同じ判断前snapshotへ適用する。反応・必須選択はこの母数に含めない。ゲームruntime・policy・カード本文・数値・登録区分を変更せず、既存414/415の評価契約を使う。

## 比較の範囲

元の通常inventoryと観測元policyの選択を完全再現し、他policyも同じ候補・context・problemで検査する。旧方式の既存契約が対応しない場合は、予定IDと理由を残す。旧選択を補完せず、比較不能を真正停止や敗北へ置き換えない。観測元policy別の母数と公開入力の重複を区別する。

相手手札順と両者の山札中間順を変更した読み取り専用の派生snapshotで、公開inventory、view、選択、proofの不変性を検査する。山札の先頭・末尾は保持する。実際のevent／snapshot／hash連鎖には派生snapshotを追加しない。

調査時に、自分の手札順まで秘密情報の不変性検査へ入れた評価側の条件誤りがあった。既存project_visibleはown_hand配列を本人既知入力に含めるため、並び替えは同一入力ではない。view SHA差で検査が失敗し、ゲーム実装を変更せず検査対象を修正した。この初期失敗を最終PASSへ読み替えない。

## 結果

313/313件のfresh inventoryと観測元policy選択を完全再現した。同じproblemで両方式の選択が有効だったのは241件、選択差124/241（51.45%）。比較不能72件はすべて新方式が実際に到達した局面に対する旧方式counterfactualで、実際の8軌跡の停止ではない。

| 観測元の方式 | 予定通常局面 | 両方式で比較可能 | 旧contract不適用 | 選択差 |
|---|---:|---:|---:|---:|
| 旧 | 108 | 108 | 0 | 81/108 |
| 新 | 205 | 133 | 72 | 43/133 |
| 合計 | 313 | 241 | 72 | 124/241 |

不適用理由は `legacy fallback contract not applicable` 51件、`legacy paid exclusion proof unavailable` 21件。予定IDを削除せず、未知の例外や証拠矛盾をこの分類へ吸収しない。

| 初期経路 | 予定 | 比較可能 | 不適用 | 選択差 |
|---|---:|---:|---:|---:|
| probe-01-a-first | 85 | 65 | 20 | 34/65 |
| probe-01-b-first | 72 | 55 | 17 | 29/55 |
| probe-02-a-first | 82 | 57 | 25 | 31/57 |
| probe-02-b-first | 74 | 64 | 10 | 30/64 |

同じ比較可能241局面における通常fallback／戦略比較不能は、旧8/241（3.32%）、新182/241（75.52%）。単一候補はfallbackへ数えない。新しくseededへ移った局面174/241、逆方向0/241。両方式ともseededだった8件は抽選集合が全件同じで、seed contextは8/8件異なる。抽選集合の差とcontextの差を混同しない。選択pool差174/241、seed context差182/241。

実際の各方式の軌跡に限る通常fallbackは旧4/108、新151/205で、到達状態と母数が異なる。上記同一局面比較とは別の観測として扱う。313件の公開入力は303種類で、重複10件を独立標本へ加算しない。

相手手札順・両者の山札中間順の変更626/626件で、公開候補・view・選択・proofが一致した。元のenvelope・履歴・policy入力と439保存artifactは読み取り前後で一致する。

## 判断に使えること・限界

439の固定4組では、新方式はメイン・セカイ等を形成して進行し、最終成長はAで旧より20〜45、Bで10〜45多かった。一方、戦略比較不能から116へ委譲する率も大きく増えた。新方式が到達した一部の状態は旧contractで比較できず、shadowの全局面比較は成立していない。盤面形成だけで採用を決めず、抽選への依存増加と比較coverageの限界を併記する。

完走・勝者・共通手番範囲の成長／盤面／残り時・カード使用・予約・再登場は[439保存観測](439-continuation-batched-replay.md)と同artifactのtrajectory_observationsを参照する。これらは同一実行版・同一135初期入力による固定観測であり、432〜439の旧実行版との差をpolicyの効果へ加算しない。

## 検証

npm test406件PASS、設計データerrors0。全313件を独立に別生成し、shadow.json.gz／manifest.json／summary.jsonが全byte一致した。canonical raw・全予定ID・秘密順変更626件を照合済み。全proxy343モジュール1,126件PASS。予定／開始／終了IDが完全一致し、重複・欠落・skip・失敗0、全worker exit0、全test source不変を確認した。終了後に350実行ソース、505原本、114／414、過去data855件、frontend／testsの不変も再照合した。最終読み取り専用レビュー1回はCritical／Important／Minor各0。レビュー時点では全回帰が継続中だったため、最終worker JSONと全体summaryはcoordinatorが完了後に独立照合した。追加診断のexit139は対象テスト到達前の未完了実行として記録し、全回帰PASSへ加算しない。

[最終検証](data/proxy-completed-evaluation-440/verification/final-checks.json) / [全proxy結果](data/proxy-completed-evaluation-440/verification/full/summary.json) / [独立レビュー](data/proxy-completed-evaluation-440/verification/independent-review.md)

[全313件の選択・証跡](data/proxy-completed-evaluation-440/shadow.json.gz) / [集計](data/proxy-completed-evaluation-440/summary.json) / [母数別詳細](data/proxy-completed-evaluation-440/comparison-details.json) / [manifest](data/proxy-completed-evaluation-440/manifest.json)

## 保護と判断

新規ゲームdecision／event／対戦0、独立balance標本0、112未実行、policy_promoted=false。432〜439の基盤補修は新方式採用の根拠に数えない。固定4組の完走観測と今回の同一局面shadowは大量の独立対戦や最適戦略の証明ではない。

505原本、114／414正本、439までの過去tracked data855件を維持する。114の変更は既存414の「人間がパイロット結果を確認するまで」保留する契約に従う。PR259 Draft/open/unmerged、mainへのマージなし。

[再現コード](data/proxy-completed-evaluation-440/reproduce.py) / [計画](plans/2026-10-02-completed-evaluation-440.md) / [保護検査](data/proxy-completed-evaluation-440/verification/protected.json)
