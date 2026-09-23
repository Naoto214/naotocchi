# 129 条件付きそだち比較と4経路独立再開

128の4停止raw SHA・両state hashを固定入力として再開した。107の「確定するそだち差」と114の解決後の時収支を使う。あそび `G-hit-blow` は宣言種と非公開山札上が一致する場合にだけ+5、できごと `E-first-date` は解決時に対象がこいびと枠の段階0に残る場合にだけ+5となる。前者の山札順と後者の応答後の成立は行動選択時には確定しない。どちらも確定成長差0、支払う時は正、passは時を残すため、既存107・114でpassが一意。全variant・対象付き候補を合法集合に残し、116のseedで優先順位を覆さない。山札上・相手手札を先読みしない。

128の候補完全性と既存の誕生・装備・セカイ効果分類を再利用し、個体copy専用分岐はない。未分類効果は比較を停止する。計画と評価は `data/proxy-conditional-growth-*129*`、各独立再開の全decision/event/snapshotと真正停止stateは `data/proxy-conditional-growth-stops-129/` に保存した。126〜128その他の保護対象は変更しない。

| 経路 | 128→129 seq | 129新decision／event／snapshot | 次の真正停止 |
| --- | ---: | ---: | --- |
| order-01-a-first | 33→56 | 15／23／24 | R5 Aの候補列挙で `missing_exclusion_reason` |
| order-01-b-first | 38→61 | 15／23／24 | R5 Aの候補列挙で `missing_exclusion_reason` |
| order-02-a-first | 26→59 | 21／33／34 | R5 Bの `W-deepsea` セカイ配置の確定効果分類が未接続 |
| order-02-b-first | 21→54 | 21／33／34 | 同じ未分類効果 |

合計 planned 4、completed 0、rules-stop 4、decision 72、event 112、snapshot 116、winner 0、独立balance標本0。停止点で未知のセカイ価値を推測しない。次は01の除外理由と02の `W-deepsea` の本文に基づく即時・遅延効果分類を、一般責務として監査する。117旧テストの期待190・実際263は既知の独立問題。HEADのworkflow run/statusは実測の件数のみを記録し、0件をCI成功としない。
