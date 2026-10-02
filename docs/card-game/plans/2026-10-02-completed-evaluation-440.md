# 440 完走局面の読み取り専用評価計画

> 実行方式: 承認済みinline逐次実行。最後に独立レビュー1回。中間の追加確認は不要。既存414/415の評価仕様を適用する。

Goal: 439全313通常判断を固定母数として同一局面の旧／新選択・fallback・比較不能を検査し、採用判断前の証拠を拡充する。
Architecture: 439保存snapshotと署名付き135入力から、既存439 scope・audit・selectを読み取り専用で再利用する。新ゲームevent/decisionを生成しない。元の選択を完全再現し、counterfactualが対応不能でも予定IDと理由を残す。
Tech Stack: Python、既存canonical JSON/SHA256/gzip、既存proxy regression worker。
Spec: 414-normal-decision-resource-pilot-design.md、plans/2026-10-01-normal-decision-resource-pilot-design.md、439-continuation-batched-replay.md。

## 制約

- ゲームruntime・policy・カード本文・数値・登録区分・114/414・505原本・過去保存結果を編集しない。
- 112未実行、balance0、policy_promoted=false、PR259 Draft/open/unmerged。
- 新旧同じ局面の比較を将来の対戦・勝率・独立balance標本と混同しない。観測元policy別の母数と重複した公開入力も記録する。
- 439 source350のSHAを前後照合する。full proxyは439 engine/test sourceに対する新実行manifestを固定し、開始・終了ID・skip・worker exitを検証する。

## Tasks

- [x] 1. data/proxy-completed-evaluation-440/reproduce.pyで、313予定ID、同じsnapshot/hash/context、fresh全inventory/problem、observed policy選択再現、他policyのcounterfactualを保存する。既存selectのValueErrorであるlegacy fallback不適用2種だけをunsupportedとして残す。それ以外の不整合は評価を失敗させる。
- [x] 2. 同じ公開入力での非公開順序変更（相手手札順、両者の山札中間順）の不変性、input/read-only不変性を全件検査する。秘匿データだけを変えた局面は実event履歴へ追記しない。独立再生成のcanonical rawを照合する。
- [x] 3. 6 worker全proxyのplanned/start/finish ID完全一致・重複欠落skip0・全worker成功、350 source/505/114/414/過去data不変を確認する。比較の節目でnpm testを再実行し、frontend未変更を確認する。独立レビュー1回と必要修正後、440報告と全証拠を同じDraft branchへ保存する。

## Review Focus

1. 新方式到達状態を旧方式が比較できないとき、捏造した旧選択や母数からの削除を行わない。
2. 反応／必須判断を313通常shadowへ混ぜない。
3. 元選択のevent_seqを判断前snapshotへ正しく結合し、観測元policy別の重複局面を独立標本にしない。
4. engine hashを戦略view hashと混同せず、秘匿順変更で比較出力を変えない。
5. full proxyの過去913/339のPASSを現在の全suiteの完了へ読み替えない。

## 記録・判断

開始正本49f4e528747b0e7606dadd9aeb0dd40a1061289b / tree ab19f460a7fbe092a355d06d3d0b9ef945990a30。remoteとPRをfresh照合済み。

Ruling: ゲーム実装の変更ではなく固定観測の再評価であり、評価用reproduce.pyはdata配下の再現artifactとする。意味の薄い実装写しのunit testは追加せず、全313件の既存validator・元選択再現・秘密順不変・入力不変・別再生成で検証する。誤った場合の費用は比較集計の誤りで、全IDと各証跡を残して独立レビュー対象にする。

Ruling: 439 engine/testを変更しないため、全proxyを評価と並行開始する。変更が必要になった場合は旧worker実行版を混ぜず、源SHAから再検証の要否を判断する。

調査: owner_hand_orderは既存project_visibleのown_hand配列を変更するため同一の本人既知入力ではない。最初の不変性検査はview SHA差で失敗。ゲーム実装を変更せず、非公開順序検査から除外する。相手手札と山札中間のみを検査し、失敗をPASSへ読み替えない。

最初の313件評価完了: 元選択313/313再現、同一入力241/313比較、選択差124/241、旧方式counterfactual不適用72件を理由付き保持。最終独立再生成は実行中。npm406 PASS、design/data errors0。全proxyは未完了。

独立再生成完了: shadow.json.gz／manifest.json／summary.jsonが全byte一致。raw canonicalは既存保存契約のindent2＋末尾改行で照合した。入力不変・公開候補／選択／proofの秘密順不変626/626 PASS。補助集計のsource hashも実raw SHAへ照合済み。全proxyのworldテストは単独0.45s・全worker3 import後0.22s・直前3モジュール＋当該25件1.02sでPASSし、先行134の履歴検証との組合せを調査中。

Ruling: 評価実装・313結果・別再生成が完了した時点で、唯一の最終読み取り専用レビューを全proxyの残り検証と並行する。レビュー対象のゲーム実装変更は0。全proxyをPASSと称さず、保存前に全終了証跡をcoordinatorが確認する。追加の中間レビューは依頼しない。

最終gate完了: 全343module・1,126件PASS、planned/start/finish完全一致、重複欠落skip失敗0、全worker exit0。最終レビューは各severity0。source350、原本505、114/414、過去data855、frontend/tests不変をcoordinatorが終了後に再照合済み。単一の最終440保存を同Draft branchへ行い、GitHub HEAD/tree/PRを照合する。
