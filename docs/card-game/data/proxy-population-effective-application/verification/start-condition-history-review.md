# 開始時の不成立条件と元境界の結合

基準659f43af995d1372e4e23027828de44c843b1336。実start_regularの通常draw後にI-bowtieの手札3枚不成立をcollectionが記録しても、直後の実window.segmentが未証明停止する1REDを修正。既存capture/collectを再利用し、元開始eventのgame/continuation hash、trace終点/順序、元capture、同一sourceに結合。現在の枚数を過去条件へ読み替えず、手札3→2は元不成立を保持、2→3は不成立証拠にしない。

start-condition-history-bound-red.logが有効RED（1FAIL0.174s、coverage incomplete A-032#1）。red/actual-red/scoped-redはfixture側の存在しないM01、end_scope不足、追加scopeなしM02のERROR/停止であり有効REDに数えない。条件付き実開始→driver試験であり初期manifestからの到達認証ではない。後続枚数変更fixtureは過去条件bindingの単体試験であり、その移動自体のルール適合を主張しない。

証拠欠落/重複/順序/終点/event hash/continuation hash/開始手札/sourceの改変と再提示を拒否。history_authenticated=falseを維持。collectorは実接続scopeで既存独立start_collection監査を通る。開始producer/ledgerを再実装しない。

独立review1回C0/I0/Minor0、別5PASS1.450s。最終30PASS13.809s/exit0、Python1080前後一致。最初の最終batchは不存在test_proxy_population_start_collection指定により26成功+import ERROR1であり、module-name-error-*へ保持。正しいstart_obligationsで再実行したverification.log/summary.json/fingerprints.json.gzが最終原本。全proxy/完全結合再実行なし。

P09全source責務対応、P10/P11とP14–18共通gateは未完。preflight-ready=false、生成/固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。
