# 426 — 応答契約接続と歴史的遷移の再現

425 HEAD `aeb7f9cbedfc96e362713d5695c3b1f346b082c2`、tree `26124a53e24f28ec8abd7ee64c77c051c1119788`から再開。PR259 Draft/open/unmergedを確認。

318の候補差は保存passを正解としてコピーせず、元のaudit_responseを再実行するsource契約互換profileとして接続した。path・両状態hash・署名付きsource・実行済みpublic event suffixを照合し、両policyで同じprofileを使う。fresh一般候補との差はテストに残す。

応答候補は既存138/144/166/206/401と公開本文を使って再生成する。M-antlionのコスト補正、P-desert_scorpionの終了時条件、対象不在の条件付き手札を証明付きで除外し、quick item候補を残す。E-first-dateは公開partner stage0/time条件から対象付き候補を作り、既存119の発動・解決へ接続した。準備済み源や未分類効果は停止する。

02-A seq37の遷移差は、227が138の空passを使う一方、adapterが290の終了passを呼んだことが原因だった。227のexact source境界だけ元のhandlerを呼び、元のpayloadと生成hashの一致を確認した。C-chickenの歴史的配置分類名は同じ参照と生成後hash条件でのみserializer互換投影する。カード効果を変更しない。

## 実測

|経路|旧425停止seq|旧426停止seq|新425停止seq|新426停止seq|
|---|---:|---:|---:|---:|
|01-A|91|131|18|20|
|01-B|84|140|8|10|
|02-A|14|77|7|9|
|02-B|65|103|4|4|

8経路を135からfresh生成し各々を独立再実行。完了0、停止8、未実施0、旧4の到達したcanonical event/state/normal decisionの履歴差0。旧停止は全て通常候補の歴史的scopeとfresh adapterとの差。新停止は01-A/01-B/02-Aが盤面能力分類不足、02-Bが通常coin解決未接続。欠測winnerを補完しない。

専用27/27 PASS（56.396秒）。npm test exit0、最終Node部分406/406 PASS。既定設計検査errors0、空白検査成功、保護505 raw変更0。414仕様、114正本、過去結果、112未実施は保持。全proxy回帰の代用ではない。

## 保存形式

`trajectory-checkpoint-426/manifest.json`と`paired-delta.json.gz`に全fresh結果を保存する。gzipはmtime0で固定。424の署名付きpaired.json.gzを展開し、base raw SHAを確認。deltaのoperationsを順に適用する。各操作はresult_index/run_id/fieldを持ち、replaceはfield置換、appendはbase_length一致を確認してvalueを末尾追加する。sort_keys=true、indent2、ensure_ascii=false、末尾newlineでserializeし、reconstructed_raw_sha256を確認する。

復元bytesとfresh生成22,137,694 bytesの完全一致を実測。保存の重複削減であり、実行cacheや独立再生の省略ではない。base/delta/reconstructed hashesはmanifestへ保存。

Task 5、Task 6評価、Task 7統合・全proxy回帰、最終独立レビューは未完了。新方式の採用、Ready化、main mergeは行わない。独立balance標本0。
