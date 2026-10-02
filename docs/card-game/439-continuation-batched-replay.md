# 439 — 438からの横断バッチ継続

438保存HEAD `d49dd20b3ade9ba941aaa14bbb98324442e9c3fe`を基準に、全8停止点と近接不足を横断監査し、共通責務ごとの契約で接続した。特定軌跡・特定カードのための経路パッチは作らず、既存正本で一意に扱えるdecision・turnを連続実行した。

## 共通接続

- 通常行動の支払・盤面移動・交際進行・配置結果を原子的に接続し、将来誘発を即時成長の比較に混ぜない。
- source節全体のSHAに結合した誘発・反応・準備・対象選択と116完全候補を再利用する。公開履歴へ非公開ドロー・手札選択IDを漏らさない。
- 一回限りの支払軽減、turn/battle限定能力補正、次勝利条件を型付きruntimeへ保存し、対象離脱・消費・期間終了まで独立再検証する。
- 挑戦宣言・比較・勝敗・終了、開始終了の6段階監査をevent/snapshot/hash連鎖へ接続する。旧既定接続は維持し、439 scopeの終了監査だけfreshな正本判定を使う。

## 8軌跡の結果

同じ135初期入力4経路 × 旧／新2方式。全8件R10完走、停止0件。seqは現在実行版のevent番号で、旧版の番号との単純差を方式効果として扱わない。

| 初期経路 | 方式 | 最終seq | A成長 | B成長 | 勝者 |
|---|---|---:|---:|---:|---|
| probe-01-a-first | 旧 | 181 | 25 | 20 | A |
| probe-01-a-first | 新 | 340 | 70 | 40 | A |
| probe-01-b-first | 旧 | 182 | 25 | 20 | A |
| probe-01-b-first | 新 | 284 | 50 | 30 | A |
| probe-02-a-first | 旧 | 169 | 25 | 20 | A |
| probe-02-a-first | 新 | 313 | 50 | 65 | B |
| probe-02-b-first | 旧 | 181 | 25 | 20 | A |
| probe-02-b-first | 新 | 283 | 45 | 35 | A |

## 旧／新の観測比較

同じ現在実行版で比較した4組について、同一公開通常viewが再び一致する局面だけを選択差として照合した。

| 経路 | 同一公開view | 選択差 | 新−旧 A成長 | 新−旧 B成長 |
|---|---:|---:|---:|---:|
| probe-01-a-first | 4 | 1 | 45 | 20 |
| probe-01-b-first | 2 | 1 | 25 | 10 |
| probe-02-a-first | 1 | 1 | 25 | 45 |
| probe-02-b-first | 3 | 2 | 20 | 15 |

432〜439のcoverage補修は比較成立のための基盤整備であり、新方式採用の根拠には数えない。上記は固定された4組の観測で、独立balance sampleではない。112未実行、independent_balance_sample_count=0、policy_promoted=false、採用保留を維持する。

## 検証

継続・関連回帰37モジュール339件PASS、npm test406件PASS。旧434既定再生とopt-in復元の専用2件PASS。全8実行＋各独立再実行を別々に2回生成し、paired.json.gzとmanifest.jsonがbyte一致した。実行ソース350件のSHAは現在コード・正本と一致する。event1917件、snapshot1925件、終了証拠160件、共通通常結果証拠609件を保存。

検証ログは[verification](data/proxy-continuation-batch-439/verification/)に保存。317件の中間PASSは最終339件と区別し、途中試行を最終結果として扱わない。読み取り専用の独立レビュー1回でImportant2件を確認し、共通の使用履歴接続・解決後停止ガードへTDD修正した。修正後339件PASS・2回全生成一致を確認済み。[独立レビュー原文](data/proxy-continuation-batch-439/verification/independent-review.md)と[修正対応](data/proxy-continuation-batch-439/verification/review-response.md)を保存した。修正前後のpaired結果もbyte一致し、source manifestは修正版へ更新した。design/data検査errors0、git diff --check PASS。design/data検査はゲーム意味論の検証ではなく、実軌跡の意味論は別のsource-bound独立再検証で確認する。

[保存結果](data/proxy-continuation-batch-439/paired.json.gz) / [manifest](data/proxy-continuation-batch-439/manifest.json) / [横断設計](plans/2026-10-02-continuation-batch-439.md)

## 保護と適用範囲

505原本、114/414正本、438までの過去tracked data833件を維持する。カード本文・数値・登録区分の変更は行わない。PR #259はDraft/open/unmergedを維持し、mainへマージしない。

今回の8件が通る既存契約を接続した成果であり、全カード・全盤面の汎用ゲームエンジン完成を意味しない。盤面個体の再入場、今回到達しない正の未接続能力条件などは既存fail-closedを維持し、根拠なく不発・完了へ変換しない。
