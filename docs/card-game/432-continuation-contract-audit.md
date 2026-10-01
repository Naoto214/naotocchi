# 432 — 431後の継続処理調査と共通契約設計案

2026-10-02 JST。**調査・設計案を保存。エンジンの変更なし、新しい継続runは未実行。**

## 正本と復元

- GitHub作業branch: `design/card-pool-master-20260914`。
- fresh remote HEAD: `741c2518b39a6f859e2ba7dacb365bd140897524`。
- cloneしたtree: `be395b755579c7a93543ff4cea10ed03fa9c1710`。
- fresh取得main: `591b9def6a88733721249f80d3138087d00764f0`、tree `58f91270e6eca091646dee02238661eee09d5ea7`。作業branchからmainに対してahead418 / behind555。比較のみ、統合していない。
- PR259はfresh確認でDraft/open/unmerged。変更しない。
- 旧作業場所をresetせず、新規cloneから作業した。ローカル424を正本にしていない。

431報告、task-7 ledger、rulings、414設計、415計画と現行tool/ルールを確認。完了した7タスクは再開しない。

## 実測

保存済み圧縮artifactを既存integrity validatorで復元し、同じ135初期入力から8runをfresh実行。各結果は431で参照する427保存結果と完全一致した。legacyのprefix検証欄も既存関数で再計算して一致を確認。

|policy|01-A|01-B|02-A|02-B|
|---|---:|---:|---:|---:|
|legacy|seq131停止|seq140停止|seq77停止|seq103停止|
|resource pilot|seq20停止|seq10停止|seq25停止|seq30停止|

- 実行8、保存結果との一致8、完走0、停止8、新継続run0。
- 旧4: `historical scoped inventory differs from fresh adapter; comparison held`。
- 新01-A/01-B/02-B: `unresolved_canonical_predicate: board ability classification`。自分のmainは`M-antlion-01`。
- 新02-A: `unsupported_resolution_adapter`、`attach_item`/`I-bowtie`。
- 全winner null、独立balance0。停止stateのgrowthは途中値であり最終そだち差ではない。
- 505保護原本のraw照合errors0。既存artifactの評価再計算・整合検査errors0。
- 調査開始時点のcard-game内2,434ファイルのrawは調査中不変。調査scriptと新成果物はこの母数から除外。
- 全913回帰と専用97件は431の検証済み実績。432では再実行していない。今回はエンジンを変更していないため、fresh8再現・保存整合・原本不変を確認した。

[evidence.json](data/proxy-continuation-audit-432/evidence.json) / [replay.log](data/proxy-continuation-audit-432/replay.log) / [再現script](data/proxy-continuation-audit-432/audit.py)。

最初の調査scriptではrun_routeの戻り値とrun_paired保存行の全dictを比較し、後者だけにある`legacy_prefix_validation`を作らず不一致になった。これは調査scriptの比較単位の誤り。全共通field一致を調べ、既存`compare_legacy_prefix`で同欄を生成して再実行し、8件の全dict一致を確認した。[最初の失敗ログ](data/proxy-continuation-audit-432/initial-audit-shape-error.log)を保持する。エンジンや保存結果をこのために変更していない。

## 根本原因と後続の遮断箇所

|層|現状と根拠|必要な共通処理|
|---|---|---|
|盤面分類|122の誕生証拠と426の応答分類はantlionを認識するが、121/128/132通常盤面分類には接続されていない|本文に結合した能力種別・timingを共有|
|メイン系譜|121はmain存在時のtime_skip/transformを常に証拠不足とする。01-A/Bの実手札M-beetle-02・M-antlion-06の個別述語呼出し8件でも同じ停止|02の種族・段階・移動先・時計算による遷移証明|
|比較証拠|shadow._inputsはown main非nullを一律拒否する|上位3項目と各actionの確定解決の根拠。ゼロ埋め解除禁止|
|装着の状態/実行|apply_selectedにattach解決なし。prepared ID列だけでは装着先を示せず、payload/hash/viewが固定構造|装着関係を含む明示版のstate/hash/view/replay|
|装着後|prepared非空を候補/応答adapterが拒否。I-bowtieは将来の開始時能力を持つ|配置後応答と開始時分類を接続。対象離脱時の破棄も共通化|
|旧候補scope|427の追加対象は人物を隠した旧projectionとの差。407に実盤面対象の再列挙例がある|旧再現を保持した上で、新実行版の完全候補を別記録|

系譜の個別述語呼出しは全候補完全性の証明でも、仮想対戦でもない。prepared等の後続遮断はコード/本文から確認した未接続箇所であり、装着後の新runを実行したと主張しない。

## 次の範囲

[継続実行の共通契約設計案](plans/2026-10-02-continuation-contract-design.md)を用意した。推奨は、新しい実行契約の版を設けてstate/hash/公開viewを一緒に扱い、既存の選択関数と本文根拠を再利用する方法。

431の歴史replayはそのまま残す。新runは同じ135初期入力から両policyを同じ新実行契約で動かす。旧候補との不一致を隠さず、policy効果と実行版の差を分ける。全カード対応、完走保証、採用判断は含めない。

## 裁定・未実行・承認

- 今回は診断と設計案の保存で区切る。理由は、解決handlerだけの追加では足りず、装着先と能力使用履歴を状態・公開情報・hash・再生全体へ接続する変更になるため。誤って小修正扱いすると、関係が保存されない、非公開情報が判断へ入る、過去比較が汚れる危険がある。
- `superpowers:brainstorming`のArchitectural手順に従い、書面設計のレビューが次の段階。今回の作業範囲整理と診断は実施済み。新契約実装は未承認・未着手。
- 実装inline、独立レビュー最後1回というユーザー指定は確定済み。今回その独立レビューを前倒ししていない。設計案は主担当がsource/範囲/記載事実を自己照合。
- 414、114、505原本、112 fixtures、過去結果は変更しない。112未実行、balance0、PR Draft/open/unmerged、114採用/Ready/main merge未実施。
