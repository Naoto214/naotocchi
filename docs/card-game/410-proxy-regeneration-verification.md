# 410 — 正準再生成の最小復元と回帰前checkpoint

GitHub409 HEAD `246f63a4f7520ef80439b4aeb4b68cc663be10e4`、tree `9449eaae685e20dde1d3308d3c35856274aa6185`、PR259 Draft/open/unmergedをfresh確認して新規cloneから復元した。未保存410コード・前タブのPASS数は正本／成功証拠として使用していない。

124のexpected_outputsは生成outcomesをbuild_planへ渡し、validate_outcomesの独立再生を保持した。run_allは3回から2回。126/127/128は直前段入力を一度読み、check_outputsへ明示的に渡す。独立run_all、保存raw/hash照合を保持。125は明示入力でもSOURCE_SHAとの経路集合・各canonical bytes SHA256一致を必須検査する。キャッシュなし。変更したproductionコードは5ファイルのみ。

新規9テストを409実装で実行：210.118秒、5FAIL（124再生重複、125過去event偽造、126/127/128読込重複）、2ERROR（未実装build_plan引数）、2PASS。復元後fresh9/9 PASS、90.137秒。新入力／outcomesの独立検証、raw117改変検出、TEXT_REGISTRY一時変更と復元、fresh disk read、返却オブジェクト汚染を検査。RED/最終GREENログを保持。

復元後npm test exit0（Node test runner406/406、他smoke/dialogue/visual QAもexit0）。catalog／既定設計検査exit0、errors=[]。current_proxy_test_count816は静的宣言数、全回帰のPASS数ではない。unittestによる全モジュール列挙は310モジュール・816一意ID。独立read-only reviewはCritical/Important/Minor各0。既存data JSON505個のraw SHA256を全件照合し不変。カード本文・数値・登録区分・イラスト変更0。

408 state raw SHA256: `6623cc9b68a5a9375b0d02df081b56f42046c40e801b3ed937c3f38863018d4b`。
408 audit raw SHA256: `006624f87ecb4b10b08f87d782a3c521dba02059637f69e10ce93ece2619724a`。
4経路R10完了・A25/B20・R11未生成・独立balance0・112fixture6件未実施を保持する。

全proxy回帰はこのcheckpoint保存時点で未実行・未完了。回帰前に復旧可能なコード・計画・実測ログを保存する。次にrun_proxy_regression_410.pyで既存モジュール／CLIを変更せず6独立processへ分割する。予定／開始／終了IDの完全一致、重複／欠落／skipなし、全worker exit0・全件PASS、テストsource不変が揃った場合だけ全体成功とする。前タブ逐次204／並列196の部分数は加算も再利用もしない。

記録: `data/proxy-verification-410-20261001/`。CI成功は未確認。Ready化・main mergeなし。保存直前remote HEAD409・PR状態不変を再確認した。

全回帰の最終結果は[411](411-full-proxy-regression.md)へ保存。816/816 PASS、完全coverage確認済み。上記の未完了記述は410保存時点の状態。
