# 437 — 発動参照IDの共通一意性検査

436保存HEAD28286a4d41702dc90394b731fee332dcb0d91478をremoteでfresh確認して継続。436独立レビューのMinor1を、既存の発動参照契約内で修正した。新ゲーム裁定・選択方針・schemaは追加していない。

## 修正

盤上能力参照だけでなく、activation_zoneの全参照について、空でない文字列link_idと一意性を検査する。以前は手札発動を検査前に除外しており、盤上参照との同IDを受理していた。検査をsource_zoneの分岐より前へ移動した。

盤上カードは盤上に残し、連鎖中の参照は完全envelope/hash/replayへ残す。物理所在検査用の投影とscope外の歴史的validatorは従来どおり。混在する不正IDをhashで承認しない。

実際のC-chicken盤上参照とI-c_coin2手札発動形式で、両順序の重複拒否を回帰検査した。異なるIDでは2参照を保持して受理する。修正前に両順序で失敗を確認し、修正後の専用6件を実行。独立レビュー1回の軽微なfixture指摘も実producerへ照合して修正した。

## 検証

結合218/218 PASS（failure/error/skip0）、npm test406/406 PASS（fail/skip0）。回帰中に軽微なfixture形式を修正したため、最終fixtureの専用6/6 PASSを別ログで追加確認した。全proxy1005件の実行結果とは主張しない。最終検証結果はverificationのログとprotected-and-replay.jsonへ記録した。8実行＋8独立再生をfreshで実施し、paired.json.gzは436保存版とbyte一致。新規結果の複製や436原本の書き換えはせず、今回の実行source SHAをexecution-manifest.jsonへ別保存する。

505原本のSHA一致、既存tracked data810件は436 HEADとbyte一致。114/414を維持。8件すべて停止、完了0、winner欠測、balance0、採用false、112未実行。旧境界を解決済みと扱わない。

## 次の接続監査

最終stateの完全候補を再構築し、01-A/01-B/02-Aの旧policyではW-deepsea（89の継続効果、時2）が確定結果証拠で停止していることを確認。各stateはactor B、時3、mainなし、双方worldなし。130の既存継続world証拠は同じ本文を参照するが、現共有scorerはplace_worldを処理しないため、そのまま一般化した実行証拠ではない。

01-A pilotはW-cityの配置実行adapterで停止。W-cityは自身を含めた通常プレイ履歴の2枚目で誘発するため、全event履歴へ結合した配置後条件と応答機会が必要。W-deepseaの継続分類と同じ処理に押し込まない。partner、relationship、M-antlion-05も引き続き未対応境界。

次は完全合法集合・本文SHA・支払・旧world離脱・配置後の誘発/応答・将来の継続効果を別々に証明して接続する。新裁定が必要な場合だけ確認する。PR259 Draft/open/unmerged、Ready化/main mergeなし。

[最終検証証跡](data/proxy-continuation-link-437/verification/) / [436](436-continuation-main-capabilities.md)
