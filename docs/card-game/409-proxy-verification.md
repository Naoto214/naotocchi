# 409 — 歴史的テスト件数の修正と総合検証

408のremote HEAD `4078c734784eaadaa6a052f59fb44a9c7e30d8c4`、tree `32666044f65522f2f34cb55947c4d9837c153a3a`、PR259 Draft/open/unmergedをfresh確認した。408で4経路completed、A25/B20を記録済み。今回はゲームを再進行せず、残っていた検証を続ける。

117/119/120の固定件数エラーは、当時の221/263件を検査するglobへ後続チェックポイントのテストが入り込むのが原因。巨大な除外リストの更新ではなく、歴史的な対象18ファイル（119）、その18ファイル＋120応答再開1ファイル（120）を正のmanifestとして固定した。各ファイルの当時の件数も保持し、欠落・構文エラー・増減を検出する。期待値221/263と当時の報告は変更しない。

現在の全proxy宣言数は`current_proxy_test_count`で別に数える。現時点807宣言。この数はAST上のtest関数数であり、実行・通過件数とは区別する。後続ファイルの追加は現在値だけに反映し、歴史的件数を変えない。check-design-dataの119専用、120専用、全体の3箇所で同じmanifestを使う。117は119以前の17ファイル190件を同じmanifestで検証する。全体JSONの`historical_proxy_test_counts`へ117=190/119=221/120=263を明示し、117の既存テストは自分の歴史的欄を参照する。古い190件という期待値や未実施fixtureの検査は保持する。

専用テスト3件のRED→GREENを確認（future追加・元ファイル欠落/改変/構文エラー・現在/歴史的範囲の分離）。既存の共有応答テスト42/42 PASS、119専用31/31 PASS、npm test exit0。歴史的263件の初回実行は262 PASS、117の旧共通欄参照だけFAILを確認。190件を保持した専用欄へ修正し、最終実行263/263 PASS（79.751秒）。catalog検査はexit0、errors0へ回復した。119/120の既存の固定件数失敗も解消した。

全proxyの遅延は詳細ログと25秒ごとのstack traceで調査した。167の正準再生成は166→164→163、132の正準検証は131→130→129→128→127→126→125→124→117をたどり、JSON読込・再生・hash計算を繰り返していた。停止したprocessではなく実際に再生成中だった。今回この証明・改変検出を省略する最適化は加えず、900秒の詳細ログ付き全proxy実行を行う。全proxy実行は900秒でtimeout（exit124）。25件PASS、途中FAIL0、129の`test_canonical_four_stop_outputs`を実行中に終了した。全体807件の完了・成功ではない。この長時間試行は117の欄参照修正前に開始しており、通過25件の対象ファイルは変更していない。最終コードの歴史的263件は別のfresh実行で全件PASSを確認した。

[全proxy部分ログ](data/proxy-verification-409-20260930/full-proxy-partial.log)、[最終263件実行ログ](data/proxy-verification-409-20260930/historical-263.log)、[再生成stack証拠](data/proxy-verification-409-20260930/canonical-regeneration-stack.log)を保存する。fresh reviewerの件数修正レビューはCritical/Important/Minor各0。レビュー後の117修正は実際の失敗を再現し、修正後263件GREENを確認した。

408の監査raw SHA256 `006624f87ecb4b10b08f87d782a3c521dba02059637f69e10ce93ece2619724a`、state raw SHA256 `6623cc9b68a5a9375b0d02df081b56f42046c40e801b3ed937c3f38863018d4b`を保持する。112の未実施fixture6件、独立balance標本0、既存カード本文・数値・登録区分・イラストを保持する。新裁定なし。408 HEADのActions実行・check-runsはいずれも0、CI成功は未確認。
