# 新400戦：承認消費後、対戦開始前のAPIエラー停止

新本人コメント6159857990（request 2b301702027467f99d2740501d28e48dd4bca527f4e73203dabd3eadfbf6a50d）を既存契約でfresh検証し、排他的に消費した。claim commit f3da57a8f7fcf4866dfa22b7d5113497456f7bb7 / tree 0797d1d9dcec75e38a7467ff20349079f0d30688。承認公開50fcf5ecの直接の子でclaim1ファイルだけを追加し、remote/local一致・clean・PR Draft/open/unmergedを確認した。

既存supervisorを一度だけ呼び出したが、audit_launch → audit_committed_consumption → _verify_live_at_headのGitHub API再確認でHTTP Error 502: Bad Gatewayとなった。既存ガードはfail-closedでValueErrorを返し、operator processはexit 1。supervisor開始記録や出力ディレクトリを作る前に終了した。対戦workerは起動しておらず、attemptもない。supervisor結果を捏造せず、operatorの停止としてこの別ディレクトリへ保存した。

旧問題のHEAD不一致はpreclaim live検証を通過しており再発していない。postclaim検証の失敗は記録された502であり、失敗した個別API endpoint、502の内部原因、サービス全体の障害まではこのtraceから特定できない。新しい本人コメントの不正やhash不一致と推定しない。

予定400 / completed 0 / rules-stop 0 / 対戦integrity-stop 0 / 未実施400。これとは別に開始前integrity停止1件（対戦への割当なし）。実行step 0、判断/event/snapshot 0、適格0 / 除外0 / 未証明400。ゲーム内の検証は未実施。独立balance標本の追加0。旧停止結果は保持。

承認6159857990は消費済み。自動retry/resume、同じ承認の再利用、消費記録の削除、仮attempt作成は行わない。観測可能な環境の/procで終了後の該当operator/worker不在を確認した。環境外の不存在の証明とは扱わない。

preclaimでは実preflight true/errors=[]、旧生成来歴・再結合・edition・manifest・公開HEAD・本人コメント・未編集状態・未消費・出力先不存在を確認した。最終確認でedition、claimの不変Git証拠、既存5185ファイルとPython1097ファイルの前後hash一致を確認。今回全回帰を再実行しておらず、旧回帰・専用・結合結果は既存preflightに結び付いた保存証拠としてのみ扱う。

再開には現行契約に沿う新たな準備と別の本人承認が必要。この停止を理由にガードや公開契約を変更していない。終了後の証拠保存は実行再開を意味しない。PR259 Draft/open/unmergedを維持し、main・本編・3Dは変更しない。
