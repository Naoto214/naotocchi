# P10 現行許可read責務の実入口結合

基準2ae5cd5fd12a525fe85f467f523e68d84ddd2a43。既存public-read-boundary-review.mdを変更せずSHA固定し、通常/responseのfresh source・履歴・比較根拠をP09共通入口へ接続。逐次選択の実offer/category/rank/候補と、before ledgerのconsume ordinal・effective groupから116 addressを照合する。full envelope hashをseed材料へ追加しない。forced/不成立処理と旧116除外を分離。

解決時のlegacy/no-choiceはerrors=[]でも検証flag=falseなら実stepで拒否する（1RED）。designatedだけを既存policy journal・origin・全指定機会へ委譲。解決直前envelope、選択に使うpath_id/order_id/first_player、decision列、route proofをfreshにhash結合し、共通gateで初期識別子をrecord.binding/openingから別導出する。解決bindingの欠落/余分/別境界/falseを拒否。静的読取表だけで全情報証明へ昇格しない。

RED3FAIL（module未実装2＋false route受入れ1）。初回GREEN/2はscope解除後のv2をhistorical v1でvalidateした形式不一致、opening初期とruntime初期の形式不一致をそれぞれERRORとして保存。修正後green3 **25PASS23.091s、exit0、Python1088前後指紋一致**。秘密置換の有限回帰は補助証拠であり普遍的非干渉証明ではない。

独立read-onlyレビュー1回、C0/I0/Minor0、試験/編集なし。既存116の_payload hashが5項目のみなのでscope解除後のlegacy payload照合が一致すること、3初期識別子のruntime_entry対応、designated委譲境界を確認。新しい比較値/情報許可/policyなし。保存proof認証・戦略的解決・適格性の昇格なし。preflight-ready=false、生成/固定/400戦0。

次: 固定版で既存115/零rootの全turnを結合して未解消回帰を確認し、P14–18の現行edition用準備/運用gateへ続行する。過去の143step完全結合や全proxyを現在版PASSとして扱わない。
