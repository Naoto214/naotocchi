# 128 盤面分類・対象なしID・異種候補比較の独立接続

127の4停止raw SHAと両state hashを入力境界として、過去のstate、履歴、112その他の保護対象は変更せず、各経路を独立再開した。既存121/123の盤面能力分類に、本文で「能力なし」と明記されたなかまの非独立通常行動分類と配置履歴の期間・そだち差の証拠を接続した。未分類カードは分類を推測せず停止する。分類登録は本文参照付きで、カードcopyによる分岐を持たない。

対象を取らない手札の合法行動は `candidate-{action_type}-{source_instance_id}` とし、同じsource/actionに複数の合法variantがある時だけ承認済みの `candidate-{action_type}-{source_instance_id}-{candidate_variant}` を使用する。variantは114の安定識別子をそのまま使う。127の単一対象 `candidate-{action_type}-{source_instance_id}-target-{target_instance_id}`、birth固有IDを保持し、variant＋targetや複数対象には拡張しない。

02-Bでは、127で完全化された4候補（時0こいびと配置、時1メイン誕生、時2装備、pass）を107/114の確定そだち・時収支で比較した。装備のドローは将来ターン開始時の条件付き効果で、現在の確定そだち・時へ加算しない。116の6安全条件を満たす時0こいびと配置1件がpassを上回り、有償候補は時の比較で劣後する。4件は合法候補記録から落とさない。

| 経路 | 127→128 seq | 新たな真正停止 |
| --- | --- | --- |
| order-01-a-first | 28→33 | R3の複数variantを区別した後、条件付きそだち増加を持つあそびと他候補の選択証明が未確定 |
| order-01-b-first | 23→38 | 同じR3の比較証明不足 |
| order-02-a-first | 18→26 | 後続の条件付きそだち増加を持つできごとの比較証明不足 |
| order-02-b-first | 18→21 | 同じ後続の比較証明不足 |

計画・評価と4停止記録は `data/proxy-r2-candidate-*128*` に保存する。planned 4、completed 0、rules-stop 4、128新decision 21／event 31／snapshot 35、winner 0／独立balance標本0。各停止では条件効果が確定したという新裁定を仮定せず、107/114/116の適用に必要な証拠を明示して止める。117旧テストの期待190・実際263は既知の独立問題として扱う。GitHub HEADのworkflow run／statusは実測の件数のみを報告し、0件をCI成功とみなさない。
