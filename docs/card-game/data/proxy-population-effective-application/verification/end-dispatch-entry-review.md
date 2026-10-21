# 初期manifest入口での終了dispatch機会結合

基準c9bbaf2453e4222db0cc2e554fb497f518d43f6d。end_dispatch.auditは、過去openingが供給trace外の場合にerrors=[]、verified=false、unprovedを返す。部分履歴の診断として正しいが、初期manifestから再構成する実入口がerrorsだけで通過させていた。

旧115/零rootの実connected入口10stepを使い、fresh end auditのapplicable行だけ未証明に変えると受理するRED（ValueError not raised）を確認。end_dispatch.require_actual_traceをconnected入口へ結合し、全step event/envelopeとfresh監査を順序付き1:1で照合する。schema、厳密boolのapplicable/verified、errors/unproved空、before/event hashを必須とする。

部分履歴audit自体の未証明保持は変更しない。saved proofの自己申告を認証するAPIではなく、connectedのfresh再構成結果の結合である。起点/全ルール機会/算入/本番readyへ昇格しない。

関連18件PASS41.515s（runner41.723s）、exit0、docs再帰Python前後一致。欠落/重複/別event/別before/applicability/bool型/unproved改変も拒否。独立review1回C0/I0/Minor0、別実行7件PASS。原本end-dispatch-entry-related.log、指紋verification.json.gz参照。

直前c9bbaf2版の完全結合は143step/181event、completed=true、stop=null、7監査errors=[]、116.378s/exit0、Python前後一致。原本start-challenge-connected-c9bbaf2-record.json.gzとverification.json.gzを保存。本bundleの新gate追加前の固定版なので、現在版の全回帰へ読み替えない。本bundleは実初期入口10stepと上記関連検証で確認した。

P10のfull-envelope adapter実read対応もpublic-read-boundary-review.mdに追補。候補生成側のfield追跡とcomparison/helper全域・実履歴認証の未完を区別する。preflight-ready=false、生成/本番固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。
