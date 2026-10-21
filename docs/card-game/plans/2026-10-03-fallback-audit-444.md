# 444 fallback横断監査 Implementation Plan

> Inline execution: executing-plans / TDD。ユーザーの既存仕様内自律続行指示に基づく。途中確認・細分checkpointなし、最後に独立レビュー1回。

**Goal:** 443の182/241 fallbackの原因を責務・候補種別・公開stateごとに監査し、既存契約で一意に減らせるか判断する。
**Architecture:** 保存439/440/441をID/hashで結合する読み取り専用分析器。414比較器を再計算し、政策変更と分析用感度検査を分離する。
**Tech Stack:** Python標準ライブラリ、既存比較器。
**Spec:** 414詳細仕様§5–8、114/116、443、および今回ユーザー指示。

## Constraints / design

対象docs/card-gameのみ。114・505・414・過去結果・engine/policy不変。72件は別境界。固定4組、独立balance0、policy_promoted=false。決定規則を勝手に追加しない。

追加: tools/proxy_fallback_audit.py / test_proxy_fallback_audit.py、data/proxy-fallback-audit-444/reproduce.py、444報告、READMEリンク。
分析器は313件のpolicy wrapperを再計算。241件の中の182件だけを主分析とし、72件を増加原因へ混ぜない。各decisionのsource問題・snapshot・inventoryをID/hashで確認する。
排他的分類は旧modeによる128/46/8の遷移。候補責務・state条件は重複可能なタグと明記し、件数を足し合わせない。
全frontier pairの成分と理由を分類。手札/予約を仮にequalへ緩める感度検査は未承認仮定であり証明・policy・対戦に利用しない。盤面の未知が残るかのみを検査する。
完全同一のaction descriptor検査は十分条件の狭い入口であり、意味的同値の必要条件でも普遍的な不可能証明でもない。

## Review focus

- 72件が182件へ混入しない。
- 件数一致だけでID/hash不整合を通さない。
- pair数とdecision数を混同しない。
- 感度検査を合法な比較証拠やfallback削減と報告しない。
- 候補詳細・公開stateを使い、未公開内容を評価へ利用しない。

## Task 1: read-only audit

- [x] RED: 正本の182件分類、重複/欠落ID、source問題/snapshot改変拒否、policy証跡再現、感度検査と非改変を検査。
- [x] GREEN: audit(paired, shadow, limits) -> dictを実装。既存closeoutのcoverage検証を再利用。
- [x] 関連比較器/選択器/closeout/limitsテスト、npm test、設計検査。
- [x] 生成2回byte一致、全既存tracked保存一致、独立レビュー1回。
- [x] 共通比較改善が既存契約から証明できれば別版TDDと8軌跡再実行。証明できなければ限界と具体的な次の仕様選択を記録し、分析を保存して確認。
- [ ] GitHub保存、HEAD/tree/PR Draft/open/unmerged確認（この文書を含む保存後に最終応答で確認）。

## Ledger

開始443 HEAD f0c6f0da932a28f4ac610b008a1822a23d532631、tree 3fc9eb7f11b1a13715a25429741d6d6f0489cdcc fresh一致。作業checkoutは当該CARD GAME専用、clean。既存正本内の分析に限定し、追加worktree/依存導入不要。

Task 1: complete — 読み取り専用監査をTDD実装。313新版wrapperと241旧選択を再計算、182件/1457pair。旧72境界維持。

判断: 手札・予約の証拠粒度改善だけではseed削減を立証できず、比較器・ゲーム実行を変更しない。診断用equalは採用証拠にしない。一般の同値証明不可能とも断定しない。誤ってこの限界を普遍的不可能と扱えば有効な将来改善を見逃すため、報告で明示的に限定した。

最終独立レビュー: Important2（outer選択/descriptor結合、source decision重複）を2tests/4subcases RED→GREENで修正。Critical/Minor0。戦略優位・全意味的同値・balance根拠は未立証として維持。全旧proxyと8軌跡再実行は今回は実施せず、分析の影響範囲を関連42件、npm/design、再生成、既存source保存一致で検証。GitHub保存確認は最終応答のHEAD/treeを参照。

最終設計検査で報告本文に118以前の呼称が1箇所混入していたため、正本の「ときおくり」へ修正。ゲーム処理・IDは不変。失敗と修正の経緯はverification/design-validation-history.mdへ記録。旧称を含む診断原文も全テキスト検査に該当したためscratchへ移した。検査器・除外条件は変更していない。
