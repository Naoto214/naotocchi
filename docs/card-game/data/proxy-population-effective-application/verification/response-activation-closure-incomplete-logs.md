# 最終結果不明のログ

response-activation-closure-green.log（dots5個）とgreen-expanded.log（dots7個）は最終Ran/OK/FAILED行を欠く。tool process終了だけをPASS根拠にせず保存する。原因は未確定。詳細再実行green-rerun.logは18PASS6.838s、green-expanded-rerun.logは20PASS7.107sで、各最終行を確認済み。前者の途中結果を後者の最終結果へ読み替えていない。
