# Fresh source collectionの実境界結合

基準: 21ad370eed320d436705dfe78388cb733af23d2a。P09既存監査の合成、producer/条件の再実装なし。

- ExistingAdapter.proofのcurrent_collection_auditが未証明、またはfresh coverage後の記録start proofが空でも初期manifestから10step入口を通る2REDを保存。
- coverageが初期native、全eventのnative、実開始startのfresh監査を保存。traceは順序/件数/厳密bool/schema/各境界hash/seq/catalog/owner/母数を結合し、start記録との完全一致を要求。
- 20種の改変負例を追加。変更後3件PASS42.888s。最終関連34PASS50.923s/exit0、docs再帰Python1077の指紋前後一致。collection-trace-final.log/summary.json/fingerprints.json.gz参照。
- 独立review: Critical0/Important0/Minor0。独立1テストPASS8.541s（正例と20改変）。read-only、全回帰/完全結合なし。
- 初期の単独REDと2件subTest RED、初回GREENを保存。

既存fresh責務の結合であり、保存proofの認証や全ルール/情報/operandの証明ではない。preflight-ready=false、生成/固定/本番400戦0。次は正本のsource閉包と全判断責務、P10/P11/P14–18の現行共通gate合成。
