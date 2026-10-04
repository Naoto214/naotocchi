# 464 — 承認済みMRP機械契約・抽選証拠validatorと適格性境界

2026-10-04 JST。開始remote/local HEAD `58c896fa56df8ba0b7cbb765724087fb5e5d04da` / tree `0f03b38c4e0c2ac4ed7b25c48812aafba90dbd9a`一致、PR259 Draft/open/unmerged。対象docs/card-gameのみ。

## 承認の固定と実装範囲

ユーザーは463を承認。指定5種のmandatoryだけ、完全合法集合と事前固定1/N policyへの適合が証明された場合に、新しいpolicy条件付きbalance契約で戦略未証明を保持して限定許容する。鏡像は初期順共有・選択乱数は側別domain分離。同じ選択結果は要求しない。旧116 fallbackは除外、通常/response/指定外へ拡張しない。

この承認を[別版機械契約](data/proxy-mandatory-policy-contract-464/contract.json)に固定した。463の未承認表現は保存時点の履歴として変更せず、本書で承認を追記する。`design_approved=true`は実行policyへのpromotionや本番入力生成許可ではない。現行実行器は未置換、policy_promoted=false、独立balance標本0、balance_admitted=null。

[inline逐次TDD計画](plans/2026-10-04-mandatory-policy-contract-464.md)を作り、以下の基盤範囲を実装した。

|実装|保証する範囲|保証しない範囲|
|---|---|---|
|proxy_mandatory_policy_contract.py|464保存artifactの固定SHAと参照source、strict JSON/Cの値・型を照合|実行承認・manifest lock・ゲーム意味論|
|proxy_mandatory_policy_random.py|提供root/context/整列候補に対する463 HMAC/側別domain/rejection/選択証拠の全field検算|root採取来歴・候補完全性・Oの真正性・戦略正解|
|proxy_mandatory_policy_audit.py|専用fragment schema、指定mandatory、契約/抽選の検査と不足gateの保持|full MRP record認証・policy_eligible認定・対戦全体算入|

`build_proof`はOS乱数を使わず、呼出元が与えた材料のみ計算するpure関数。テストで固定合成bytesを使ったが、200群のseed/root/初期順/400行manifestは生成していない。ゲームstateを進める実行や保存対戦の再実行もない。

## strategic_unprovenとpolicy_eligibleの分離

検算対象は `mandatory_random_arithmetic_464.v1` と `mandatory_policy_fragment_464.v1`。463の将来full record `mandatory_policy_choice.v1`を名乗らない。`randomness_verified=true`は**供給された候補集合と材料での算術一致だけ**。

- 複数候補の検算が通ればstrategic_unproven=trueを保持する。優越/同値/最適性を主張しない。
- 供給候補が1件だけでも完全合法singletonとは証明していない。`supplied_singleton` / `singleton_completeness_unverified`、strategic_unproven=null。将来のrule_forced_singleton記録へ勝手に昇格しない。
- policy_eligibleとbalance_admittedは常にnull。`verified=true`等のcaller flagや未知fieldは受理しない。
- 合法候補を1件削除して抽選証拠を作り直せば算術は一致し得るが、完全性gateは未証明のまま。これを明示する結合testを持つ。
- 旧116 raw recordは本fragment schemaでは受理しない。出所未認証のflagだけから真正な除外とも断定しない。承認PCP契約では真正な旧116 fallbackを引き続き除外する。
- 通常行動・response・未登録kind・hidden hash/retry属性の抽選contextへの混入を拒否する。

乱数材料のhex、候補digest、mirror/draw message、counter列、threshold、index、selected、非選択候補、型を再計算して照合。Unicodeを暗黙同値化しない。rejection上限で別rootや116へ切り替えない。HMACは固定材料の決定的計算であり、検算PASSは確率的独立性の証明ではない。

## 非実行CLI

```
python docs/card-game/tools/proxy_mandatory_policy_audit.py --fragment PATH --root-material PATH
```

`--contract`で入力contractを指定しても固定anchorとの一致が必要。root-materialはexact `{root_hex: ...}`形式の提供材料を読むだけ。出力にはrootを含めない。有効な算術でも未準備exit1、不正/矛盾exit2。生成/対戦実行オプションなし。これは保存game recordを真正審査する入口ではなく、fragment検算専用。

## 未完gateと次工程

464は463/459全実装の完了ではない。次の8gateは実装済みの抽選検算から埋めず、明示的な未証明を返す。

1. 結果前input lockの認証。
2. policy rootと初期順の分離採取来歴。
3. 正本由来origin obligation ledgerからOを確定する認証。
4. 各choice時点の完全合法集合。
5. 許可情報だけを使用した証拠。
6. 先行draw等を含む解決途中state。
7. 選択の実適用、継続/終了、event/snapshot/hash。
8. 全判断/全機会/対戦/鏡像/予定集合の完全対応。

463自体がnested証拠契約/adapterを未認証としていたため、任意callableや真偽値を権威にする実装を作らない。計画の後続順序は真正lock/来歴の証拠contract、O ledger/5registryの途中stateと候補adapter、full record/envelope/dispatcher、全41ID/全対戦/集合validator、readiness。これらが未完であることは抽選kernelの不足を隠す口実ではなく、保証を混ぜないための明示範囲。

旧116 resolverの結果をMRPへ改名する接続は作らない。将来dispatcherは判断発生時にMRPを選び、実遷移と原recordまで別版で結合する。許容されたMRP判断があっても、通常/responseの116陽性、指定外mandatory、未知機会、片側/行欠落なら全体gateを閉じる。予定集合からの事後削除・置換・追加は不可。

現時点のready_for_input_generation/ready_for_executionはfalse。実行準備完了とは報告せず、seed生成/400戦開始の確認を先取りしない。完全な準備証拠と入力bundleが揃う段階で最終確認が必要。結果の意味は「この事前固定mandatory-choice policyに条件付けた結果」で、完全合理的プレイヤー一般や他policyに外挿しない。

## 検証・保護

専用18件のTDD。contract5、random6、audit7。初回各module欠落RED、実装後GREEN。追加のsingleton境界2失敗を再現し、供給1候補から戦略解決を主張しない修正でGREEN。独立HMAC構成によるreference検算、合成blockでのrejection境界/上限停止、CLI exitの検証を含む。

関連suite/npm/設計データ/保護blob/独立レビューの結果は[verification](data/proxy-mandatory-policy-contract-464/verification/summary.json)と[review](data/proxy-mandatory-policy-contract-464/verification/review.json)。全proxy回帰の実施とは表現しない。114/116/119/454〜463/A初版/505/過去結果・新方式未採用を維持。README索引以外の既存ファイルは変更しない。

独立レビュー1回：reviewer Critical0/Important0/Minor2。deep JSONのRecursionErrorが不正入力をexit1にする点を、機械呼出しの分類不備としてImportantへ再判定し、2件RED→GREENで修正。再レビューは行わず回帰で検証。残るMinorはsingletonの算術証拠がroot/contextに結合しない仕様上の注意で、動作変更はしない。材料差替え拒否はN>=2の抽選の範囲。供給1候補の算術一致は乱数来歴・O・完全合法性の証明ではない。

最終検証：専用18、専用を含む関連136、npm406 PASS。設計データerrors=[]、固定source26件一致、README索引以外の既存3,629 blob一致。全proxy回帰は未実施。修正後関連suiteを再実施して確認した。
