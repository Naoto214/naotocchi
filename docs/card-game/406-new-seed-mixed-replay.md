# 406 「さいごのじかん」の既存契約監査とB先手2経路の再開

[406計画](plans/2026-09-30-new-seed-mixed-replay-406.md)。保存済み405のremote HEAD `ddfe8e513772e3ed38541aac29ee31cad0396c29`、tree `246f510f574009614ce5de241297e31c56dd842a`、PR #259 Draft/open/未マージを取得した。405 stateのraw SHA256 `b451e46e352cffacd92c16ac749c528d37d0acc846c71a436714f9b3bcff191d`を照合し、同じstate/hashから再開した。

結論: 新しい裁定は不要。91のR10条件はたまごでも成立し、114の時2・自分の捨て札の非メイン対象・同名使用制限を適用できる。121で対象別に列挙し、応答IDは138、通常行動IDは127で構成する。応答は119、通常行動は107/114、効果の必須手札選択は116の一般mandatory-choice契約で選択する。166のR1〜R9除外はR10へ適用しない。

| 経路 | 新event/snapshot | 最新境界 |
| --- | ---: | --- |
| 01-A | 0 | seq159、R10、Aのたまご交換を保持 |
| 01-B | 8 | seq172、R10、Aのたまご交換 |
| 02-B | 9 | seq169、R10、Aのたまご交換 |
| 02-A | 0 | seq155、R10、Aのたまご交換を保持 |

開始時の01-Bはpass＋A-039#1からA-033#1/A-040#1への対象付き候補の計3件。02-Bはpass＋B-039#1からB-033#1への候補の計2件。完全候補集合で119のseeded fallbackを適用し、どちらもpassを選択した。02-Bの次優先者Aも、対象付き候補を含めてpassを選択した。通常行動のE-final-time候補もすべて評価し、確定そだち差0・時2のため107/114でpassが一意となった。

終了前の反応では両経路ともAのE-final-timeが119で選ばれた。01-BはA-033#1、02-BはA-001#1を対象に発動し、時2を支払って発動領域へ移動した。双方のpass後に91の本文順で対象を再確認し、捨て札から山札下へ移動、可能な2枚ドロー、手札1枚の山札下移動、発動元の捨て札移動を処理した。01-BはA-037/A-031を引いてA-037を下へ、02-BはA-035/A-036を引いてA-020を下へ置いた。

必須選択のseedは116のexact contextを使用する。`phase=turn_end_response`、`decision_kind=mandatory_choice`、`choice_kind=final_time_hand_bottom`とし、対象移動とドロー後の本人手札をcard-copy IDで完全列挙する。これは一般契約の処理識別子であり新しい裁定ではない。応答候補の比較では未公開の山札上を先読みせず、効果のドロー後には実際に本人へ公開された手札だけで選択する。

同名使用履歴は現在のターン開始eventから確認する。基準監査と394〜405の保存JSONをraw SHA256で固定し、全event/snapshotの連続seq・前後hash・保存stateを照合する。406で追加した発動は前snapshotから119の支払い・発動遷移を再適用し、actor/source/target/payment/link IDと後snapshotまで一致させる。候補IDだけでなく候補詳細と合法性証拠も再生成してから選択する。

最後のlinkを解決した後は、連続2passによって閉じた終了前反応を保持して元の終了処理へ戻る。予約・盤上誘発・未処理効果・成長履歴を401/405の六段階終了監査で確認し、B先手R10の終了からAのR10へ進む。最終比較は未到達。新decision・event・snapshot・候補監査を保存し、completed0・独立balance標本0を維持する。

[監査JSON](data/proxy-new-seed-mixed-audit-406-20260930.json) raw SHA256 `a8443586262301550270ebde626300a9e6fff0fe2d1f914e75ce047e7cf03d75`。[保存state](data/proxy-new-seed-mixed-replay-406-20260930.json) raw SHA256 `80b76e18a433a16b8acb99a49a75dfc054d2dcb5581c06282ae17db78c0834e9`。正準JSONと4経路の全中間hash連鎖を検証する。

専用テストの初回REDは406接続不足。候補漏れ・詳細改変・保存履歴改変、非公開山札順への非依存、対象再確認失敗、山札不足時の部分ドロー、効果順と終了復帰を検査した。レビューのImportant指摘だった406内の発動履歴header未照合は、actor/source/target/payment/link/typeの6改変をRED再現し、前後snapshotからの再適用照合でGREENへ修正した。未修正Critical/Important/Minorは0。

保存前検証の結果は末尾へ記録する。全proxy discoveryは180秒でexit124、完了4件にfailure/error表示はないが全回帰未完了。共有119/120テストは41/42 PASSで、残る1件は既存固定件数263に対して現在466となる件数検査。`check-design-data.py --catalog`のexit1も既知の119件数1件・120件数2件。405 HEADのPR-triggered workflow/status取得は各0件でCI成功とは扱わない。

次は407で、4経路のAのR10交換を既存116で選択し、開始時応答・通常行動・終了まで実際の候補を監査して継続する。01-A/02-Aではその後Bの最後のR10ターン、01-B/02-BではA終了後の最終比較が必要。112の未実施6fixture、カード本文・数値・登録区分・イラスト・勝率評価はこの接続で変更しない。

保存前最終検証: 406専用10/10 PASS、400〜406合計24/24 PASS、138対象付きID/開始応答6/6 PASS、116一般選択36/36 PASS。共有119/120は上記の41/42 PASSと既知件数失敗1件。`proxy_new_seed_mixed_replay_406.py --check`、`npm test`、`git diff --check`はいずれもexit0。レビュー指摘の修正後も保存JSONの正準バイト・hashは同一である。全proxy未完了・catalog既知3件・CI未確認は維持する。
