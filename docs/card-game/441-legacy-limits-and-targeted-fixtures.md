# 441 — 旧方式比較境界の横断監査と112対象fixture実施

開始正本440 `c1bc71ab5783f8f2b703cbc6d2ff6f6cb792b532` / tree `b1a9b541c4d5282e1f88088e6282e3935da7782b`。fresh remoteと一致し、PR259 Draft/open/unmergedを確認。114/414、505原本、過去成果物を変更しない。

## 比較未対応72件

440のshadowと439の同じ判断inventoryをhash照合して全72 IDを分類した。114の上位4項目を適用後に残る候補と、116安全配置証明を分離する。

| 責務境界 | 件数 | 内容 |
|---|---:|---|
| ちょうせん対pass | 47 | 時0・確定成長差0の同順位。114資源関係が未証明で、安全配置resolverの対象でもない |
| 安全無料配置対ちょうせん | 21 | 配置対passの証明はあるが、時0ちょうせんを配置より劣位とする証明がない |
| こいびと登場の安全配置証明 | 4 | 非たまご時P-cat_ceo。強制の手札返却・ドローがあり、追加選択未解決。116安全条件6を満たさない |

後者21件の元エラー名は`legacy paid exclusion proof unavailable`だが、比較を阻む候補は時0ちょうせんである。51件のfallback不適用は47＋4へ分解する。エラー名を直して選択可能になったと扱わない。

116には一般のseed手順があるが、現在の旧比較adapterは上記入力に対する資源証拠と適用scope/contextを確定していない。414のfrontierや新policyのcontextを旧方式へ移植して比較数を増やさない。既存記録だけから一意に「実装バグ」と証明できたものは0。全72件を旧方式の証拠・適用境界として保持し、実ゲームの停止や敗北へ加算しない。新policy採用・114変更はしない。

[全72件の分類・上位候補・比較証跡](data/proxy-gap-validation-441/legacy-limits.json)

## 112の実施範囲

元112の6fixtureは初期順・80現物・空event・winner nullのまま保持する。別成果物で**明示選択・協調反応passによる対象効果の実行**を行う。通常policyの候補比較・最適戦略・全合法候補列挙ではなく、R10対戦も作らない。任意能力の不使用を明示し、未公開順序を戦略選択へ参照しない。たまご交換は既知の自分手札から行い、デッキの位置を差し替えない。

| 対象 | 前提を作る経路 | 対象検証 |
|---|---|---|
| G-jump-quest | ①たんじょう後、R3に①→②・②→③を別支払い | 捨て札①を回収し+5。一度の多段階移動は2回と数えない |
| M-mushroom-06 | 別現物のC-otterを人物共有回数・満員交代で盤面と捨て札へ。①→⑥は時5 | 終了時の同名回収。解決時の同名条件も再確認 |
| M-sakura-05 | ①対アリジゴク①のちえ3同値勝負でカーリングを実際に発動。①→⑤は時4 | 終了時に時1を先払いし罠を回収 |
| M-dragon-08 | バスケ・クレーンを合法使用して捨て札へ、なかま満員交代でC-batを捨て札へ。①→⑧は時7 | アクション2枚を宣言順で山札下へ先払い、別現物の人物を回収 |
| M-penguin-07 | 遅い①たんじょう→⑦時6。田舎初配置後に都会へ変更 | 解決時にC-batを選び防止予約。相手りゅう⑥の時3・手札・準備先払い除去を1回防ぐ |
| M-god-08 | ①→⑧時7。次ターン時1・手札1枚を山札下へ先払い | C-batへ予約し、相手りゅう⑥の除去先を手札へ置換 |

防御2件の相手も①→⑥時5、C-bat配置、I-bond1装備を実際に行い、準備コストへ使う。防御成功から攻撃側の支払いを返さない。防御予約は相手ターンに存続し、次の自分開始でドローより前に失効する。世界の初配置だけではペンギンの変更条件を満たさない。

処理は[共通runner](tools/proxy_targeted_execution.py)へ段階移動・人物共有枠・領域移動・先払い・対象固定/解決時選択・回収・防止/置換・期限をまとめ、[明示テスト手順](tools/proxy_targeted_scenarios.py)から独立させた。カード登録は既存本文へ結合した能力記述で、軌跡ID/現物ID分岐を処理系へ入れていない。全領域一意性、event前後hash、全snapshot、固定本文hash、独立command再生を検査する。

新たなR10完走・勝者・独立balance標本は0、policy_promoted=false。112対象実施と通常policy評価を分ける。432〜439の基盤補修を新方式採用の根拠へ数えない。

## 検証・保存

専用21テスト（対象17＋比較監査4）、既存112/114/116を含む結合79テストPASS。npm testはexit0（smoke/dialogue/visual検査とNode38 test files成功）、設計データerrors0。440はshadow/summary/manifestの3成果物が独立再生成で保存byte一致。441もtargeted/legacy-limits/summary/manifestの4成果物が2回生成でbyte一致し、実際の保存gzipから全6件を読み戻したcommand再生も一致。全proxy345 module・1,147件PASS。作業環境復旧時に修正版全回帰の完了ログが欠けていたため、ソース一致と予定IDの先頭連続性を検査した457件の明示PASS記録を保持し、未確認690件を8ワーカーで再実行した。合算した全予定IDの開始・完了・PASSが一致し、欠落・重複・skip・失敗0。中断された元ワーカーの終了成功は主張しない。

初期REDは新module未実装。最初の実行でりゅうfixtureのC-cat_friendがたまご返却で手札に残らないと判明し、デッキを変えず後から実際に引くC-chickenを満員交代に使う手順へ修正。追加検査でペンギンの「選ぶ」が解決時であることを検出し、発動時対象固定と区別する共通契約へ修正した。初期失敗ログを保持する。

[計画](plans/2026-10-03-gap-validation-441.md) / [集計](data/proxy-gap-validation-441/summary.json) / [実行・snapshot](data/proxy-gap-validation-441/targeted.json.gz) / [再現](data/proxy-gap-validation-441/reproduce.py)

独立レビュー1回はCritical0、Important2、Minor1。Importantは保存JSONのtuple/配列差による再生失敗と、ペンギン/カーリングの誘発機会を早く閉じる記録不整合。両方をRED→GREENで共通修正し、Minorの直接テスト起動順も修正した。修正前全回帰は未完了として中断・別保存し、修正版で再実行。レビュー時点では全回帰完了前だったため、その最終確認はcoordinatorが行う。レビュー指摘0と記録し直さない。

[独立レビューと修正](data/proxy-gap-validation-441/verification/independent-review.md) / [保存再生・再生成照合](data/proxy-gap-validation-441/verification/saved-replay-and-regeneration.json)

[全回帰の確定結果](data/proxy-gap-validation-441/verification/full-resumed/summary.json) / [最終照合](data/proxy-gap-validation-441/verification/final-checks.json) / [検証記録の復旧経緯](data/proxy-gap-validation-441/verification/recovery-status.md)

既存2,364 trackedファイルはREADME索引追加前に全byte一致、索引追加後も残り2,363ファイルは一致。変更はdocs/card-game/内の追加実装・対象検証・記録とREADME索引のみ。505原本、114/414、既存実行エンジン・policy・既存test source・112原fixture・過去結果を維持。新方式採用は保留し、独立balance0。全実行終了後に保存する。
