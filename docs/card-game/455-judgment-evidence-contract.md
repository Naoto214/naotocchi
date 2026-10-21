# 455 — 全判断の記録監査契約とvalidator

2026-10-04。454承認と、一意な範囲の実装・検証・保存の指示に基づく。開始remote454 HEAD `85adc2f67703fa5c412712041a2fad6f75bf2ca1` / tree `0691b2eaa33789d04a3ddda40470cb6700ba5777` をfresh確認。PR259 Draft/open/unmerged。

## 実装した契約

[計画](plans/2026-10-04-evidence-audit-455.md)に沿って、`proxy_judgment_evidence_audit.py` の `contract()`、`build_sidecar(run)`、`validate_sidecar(value, run)` と、保存447専用の再生成器を追加した。選択器・engine・過去テストは変更しない。

- 114/116/119/454の正本SHAを固定し、改訂時は黙って受理しない。
- 元run全体と各判断全体をcanonical SHAへ結合し、配列indexも保持。監査出力は元記録の決定的な投影と完全一致する場合だけ形式検証成功。
- 通常の旧方式・414/A wrapper、mandatory、responseを分類。元のmode/basis/explicit strategic flag/reasonを保存する。flag欠落はnullでありfalseではない。
- 候補集合の空/重複/不正ID、選択の集合外、入れ子の候補集合/判断種別/選択不一致、未知のmode/kindを拒否する。候補集合が完全だとゲーム正本から証明したことにはしない。
- seeded mode、またはexplicit strategic flag/reasonによる未解決証拠があれば116除外を表示。1候補seededも除外する。mode上のseeded件数であり、候補数>1を条件とする414の観測fallback率と混同しない。
- それらの陽性証拠がない場合も `not_assessed`。`admitted=null`を常に保持し、未確定を算入成功・不成功の実験結果へ置き換えない。`excluded_by_116`は元記録から確認できる除外根拠であり、その他の審査を完了したという意味ではない。

## 三層の確認範囲

|層|今回機械確認する内容|未確認として残す内容|
|---|---|---|
|合法候補/情報制約|記録形、候補IDと選択の整合、元記録hash一致|候補のゲーム上の完全性、許可viewの完全な意味検証。`legality_evidence=not_reverified`|
|既存契約の選択根拠|記録されたmode/basis/flag/reasonの保持、wrapper整合、改変検出|優越・同値証明の再計算、seed proofアルゴリズムの再検証。`selection_evidence=not_reverified`|
|対戦・標本|供給された全判断の投影、seeded/未解決陽性の除外|eventからの全判断機会再構築、対戦の独立replay、標本設計。`opportunity_coverage=not_reverified` / `experiment_design=not_assessed`|

**これは454の全審査を実装した汎用balance適格性判定器ではない。** 記録監査の契約を機械化した第一段階。生の `build_sidecar` は供給されたrunを投影するもので、そのrunの真正性を認証しない。保存物への適用は別のreproducerが固定manifest SHA→4gzip SHA→予定12run集合を照合して結合する。第三者が元runとsidecarを両方差し替えた場合を、元runとの一致だけで正本適合と称さない。

候補一覧だけから未記録の判断機会がないとは証明できないため、全判断機会確認済みのflagを発行しない。新しい合法性/比較意味論や、真偽値の自己申告による審査合格を追加しない。

## 保存済み12runへの適用

447の保存4ファイル・12run・2,378判断を投影し、全sidecarを元runから再計算して照合した。12runはすべて116除外。独立balance0。保存対戦の再実行、選択変更、flagの遡及変更は0。

元runを変更していないことをcanonical byteで各回確認。保存ファイルSHAと予定run集合も照合。証拠が不明な項目をfalse/0で埋めていない。非fallbackや唯一候補から適格標本を作る処理は実装していない。

## TDDと検証

専用10件を未実装のRED→GREEN。次に入れ子の種別/候補不一致と保存adapter不足の3失敗を確認し、source改訂拒否を含む専用14件をGREENとした。改変・欠落、source変更、1候補seeded、非seeded未審査、explicit flag陽性、未知enum、空/重複候補、wrapper、固定保存inventoryを検査する。

関連116/119、npm、設計データ、独立2process再生成、保護確認、独立レビュー1回の最終結果を[verification](data/proxy-judgment-evidence-455/verification/)へ保存した。全proxy回帰を今回再実施したとは記録しない。

[契約](data/proxy-judgment-evidence-455/contract.json) / [集計](data/proxy-judgment-evidence-455/summary.json) / [再生成器](data/proxy-judgment-evidence-455/reproduce.py)。114/A初版/116/505/過去結果不変、451までの判断境界と72件別扱いを維持。新対戦は開始していない。

次に必要な合法性・選択証拠adapter、eventと判断機会の突合、独立実験planを、このvalidatorの形式成功で代替しない。実際のbalance算入条件は未確定のまま。今回の実装から新方式採用・適格性契約確定を宣言しない。

保存前検証：専用14、関連116の36、119の31、npm406件PASS。2process生成byte一致、設計errors0。既存2691ファイルはREADME索引以外不変。

独立レビュー1回の初回結果：Critical0 / Important1 / Minor0。外側wrapperのseeded/strategic/reasonがactive nested recordで隠れる入力を指摘。元recordとwrapperの矛盾は拒否し、counterfactual baseline_selectionと区別した。追加回帰テストで2階層×3fieldの6例のREDを確認して修正。再レビューは実施していない。

修正後最終検証：専用15件PASS、独立2process再生成byte一致。12run/2378判断・全12除外・算入0は不変。関連67件・npm406件の先行検証も保持する。
