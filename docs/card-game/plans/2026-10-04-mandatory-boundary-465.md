# 465 inline計画 — 正本由来mandatory局所処理と抽選接続

Spec: 463、承認overlay464、今回の継続指示。保護正本と既存toolsは変更しない。新seed/input/対戦/replayなし。合成局所fixtureのみ。

1. source固定の局所adapterをTDD。5種について供給された処理入口から、先行draw/対象移動/無効・空集合、選択直前state、完全候補、本人許可viewを再構成する。発動・入口の真正性は別gate。現物同値化なし。
2. 選択適用と残る局所drawをTDD。全game fieldを保持。領域変更後のinstance更新、連鎖解消、event/hash発行は既存canonical pipelineとの後続結合責務として局所終了と区別。
3. 464抽選を先にdispatchする別版local record builder/validatorをTDD。旧116 recordの変換なし。供給root/contextとsource固定入力から全record再構成し改変拒否。singletonも供給入口限定、policy_eligible=null。
4. Oの再使用/retryを記録単位で検証する共通journalをTDD。同O/異なる状態・候補を拒否、同O再試行は新判断に数えない。origin ledger認証を主張しない。
5. 関連検証、npm、design-data、保護blob照合、独立レビュー1回、GitHub保存。未完gateと次工程を具体化。準備未完なら生成承認を先取りしない。

Review focus: 対象不適正/たまご抑止/空手札/空山札/同名現物/途中state、非公開情報の抽選混入、record改変と再抽選、局所一致から発動・全機会・全対戦へ昇格しないこと。

Ruling: 464の後続順にあったlock認証より先に局所adapterを進める。lock/来歴は実生成前には実証できず、sourceから一意に導ける処理を先に検証する。lock gateは閉じたまま。誤れば接続順の再調整が必要。

## 追加接続工程（同じ承認内）

完成したlocal記録で止めず、結果前bundleの別版構造validatorまで進める。459の初期順・200/400構成を保持し、464 MRP版・400 owner root・鏡像側の行digestを結合。459 validatorへは明示した検証用projectionだけを渡し、旧保存artifact/政策を変更しない。root来歴/履歴除外/外部lock/実行版は構造一致から認証しない。unit testは既存歴史seed/orderを反復した不適格なin-memory材料と固定合成rootのみで、新seed/入力固定を行わない。
