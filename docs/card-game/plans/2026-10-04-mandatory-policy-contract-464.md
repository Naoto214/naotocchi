# 464 Mandatory policy contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Inline sequential TDD, one final independent review.

**Goal:** 463承認を別版の機械契約へ固定し、提供材料によるMRP抽選証拠の検算と、適格性へ昇格しない審査境界を実装する。
**Architecture:** 旧116/459を変更せず、pure arithmetic/record fragment validatorとsource固定contract verifierを追加。新しいruntime dispatcherや生成器は接続しない。抽選証拠と合法性/機会/lock認証を別gateとして返す。
**Tech Stack:** Python standard library / unittest。
**Spec:** ../463-precommitted-mandatory-policy-detail.md

## Global Constraints

- docs/card-gameのみ。114/116/454〜463/過去結果不変、README索引のみ更新。
- strategic_unprovenとpolicy_eligibleを分離。通常/response/指定外/不完全候補への許容拡大禁止。
- 本番seed/400行/対戦/replay生成0。固定合成bytesはunit test専用で、入力標本とは数えない。
- 提供rootでHMACを検算することはseed生成ではない。OS乱数APIを実装/呼出ししない。
- 合法集合・O・途中state・lockの認証をcaller boolean/callableで代替しない。

## Review Focus

- JSON bool/int/float/重複key/非UTF文字列を同値扱いしない（Task1）。
- 鏡像側/owner/root/候補/機会の差替え、棄却counterの飛ばしを拒否（Task2）。
- 旧116 recordを新policyへ改名して適格化させない（Task3）。
- source pin改変・別path・自己申告の認証/適格を拒否（Task1,3）。
- 正しい抽選でも未検証の合法性・機会・lockをverifiedへしない（Task3）。

## Task 1: 承認overlayとcanonical境界

Files: new data/proxy-mandatory-policy-contract-464/contract.json; tools/proxy_mandatory_policy_contract.py; tools/test_proxy_mandatory_policy_contract.py。
Interfaces: canonical(value)->bytes, load_json(path)->dict, validate_contract(value,root)->dict。
- [x] strict encoding、承認contract差替え、source改変の失敗testを作る。
- [x] unittestでRED確認。
- [x] compact Cとpinned contract/source verifierを実装。
- [x] GREEN確認。contract承認は実行許可ではない。

## Task 2: 純粋な抽選証拠

Files: tools/proxy_mandatory_policy_random.py; tools/test_proxy_mandatory_policy_random.py。
Interfaces: build_proof(root_hex,context,ids)->dict; validate_proof(proof,root_hex,context,ids)->dict; rejection_index(block,N)->int|None。
Context exact fields: protocol_id,group_id,owner,mirror_side,opportunity_address。463のO/registryとowner一致を検査。root32byteは呼出元提供のみ。
- [x] 固定合成材料の独立reference計算・byte列期待、鏡像domain/owner/C/候補固定、singleton、rejection境界のtestを先に作る。
- [x] REDを確認してHMAC/rejection/proof全field検算を実装、GREEN。
- [x] nested改変/型/順序/重複/未知choice/retry属性の拒否test→RED→GREEN。

## Task 3: 証拠fragment監査とfail-closed適格性

Files: tools/proxy_mandatory_policy_audit.py; tools/test_proxy_mandatory_policy_audit.py。
Interfaces: audit_fragment(fragment,root_hex,contract,root)->dict。CLIは--contract/--fragment/--root-materialをread-onlyで読む。生成/実行機能なし。
fragmentは実recordの代用品でなく、選択証拠抽出専用schema。raw116/newMRPを混同しない。抽選・strategyタグ・source固定の検査後もpolicy_eligible=null。未接続gateを列挙しbalance_admitted=null、readiness=false。
- [x] 有効算術+偽verified、旧fallback/通常/response/指定外、malformed、root取り違えで適格化しないtest→RED。
- [x] 型・exact keys・strategy未証明保持、証拠不足gate、旧116の判定分離を実装→GREEN。
- [x] CLI exit/statusと実行機能無しを結合検査。

## Task 4: 結合・保存と後続計画

- [x] 専用/116/119/455〜457/460関連suite、npm test、design-data、保護blob検査。
- [x] 独立レビュー1回、必要修正はRED→GREEN。完成範囲/未完gateを報告。
- [ ] 464のみ＋READMEをGitHub保存、remote HEAD/treeとPR状態再確認。

後続の順序：真正lock/生成来歴の証拠contract、rule由来O ledgerと5registryの途中state/合法集合adapter、full MRPrecord/envelope/dispatcher、全41ID機会/全対戦/鏡像/予定集合validator、非実行readiness。463で未認証としたnested証拠契約は本kernelのverifiedから補完しない。これらを完了してから本番入力生成/固定を確認し、完成bundleを示して対戦開始の最終確認。将来の全体適格は保証しない。
