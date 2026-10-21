# 120 response-window契約適用後のseed付き再開

更新日：2026-09-22

## 結論

117で保存した4 stop artifactを、各ファイルの同一`pre_decision_state`、同一state hash、event seq 3から独立に再開し、119のresponse-window契約を適用した。結果は **planned 4・completed 0・rules-stop 4・integrity-stop 0**、**decision 9・event 10・snapshot 14・winner 0**、独立balance標本 0である。

4経路ともresponse windowは正本どおり処理できた。その後の`normal_action`で、114の候補表自身が完全合法性を保証しておらず、手札・盤面・予約・ちょうせん・交際状態からの通常行動を完全列挙する既存正本がないため、既知候補だけを選ばず`incomplete_legal_candidates`で真正停止した。120では裁定を補完していない。

## 経路別の保存結果

| 経路 | status | reason | 最終event seq | game state SHA-256 | continuation state SHA-256 |
|---|---|---|---:|---|---|
| `order-01-a-first` | `stopped_rules_adjudication` | `incomplete_legal_candidates` | 7 | `641e77bb932b2a3b4d4214b0cd12306076ec86a990e13110c9e4bc4cf8f94d80` | `a698227f6c2c851c3012b64ba27cf9db77d8a0eeb13d583902efda03ac600a00` |
| `order-01-b-first` | `stopped_rules_adjudication` | `incomplete_legal_candidates` | 5 | `6462c0cb11bc0cb26aeb055a4b969578a3f9bd05ff8963584fe629ac00ff3616` | `cbda8acffc3a36ceb14b98a2cb36cd9649796444599ed02da4abfdcfc8403467` |
| `order-02-a-first` | `stopped_rules_adjudication` | `incomplete_legal_candidates` | 5 | `edbc2844074b27462439c1efe85f0c021b826cf75a51bdd115858029dfc2ff89` | `b325d7802cf9e9e621765f420727f33c16a52e0ea10a989bb1dd38376aa717ea` |
| `order-02-b-first` | `stopped_rules_adjudication` | `incomplete_legal_candidates` | 5 | `c934f656ed14f0a73b2c70f714470e7bbdad98626ce4a4078fe96888aa426473` | `f4eaf9452682fd1c5ff2ecf7ed4dfb9a3ccd34fb3dba707cff7bff870b3accf5` |

残る3経路では、先手の`response-pass`、相手の`response-pass`をevent seq 4・5として記録し、空chainのresponse windowを閉じた。通常行動機会へ戻った最初の合法性監査で停止した。ある経路の停止は他経路を中止させていない。

## `E-first-date`の処理記録

`order-01-a-first`では、最初のresponse opportunityで`response-use-event-A-040#1-target-A-017#1`を`priority_unique`により選択した。処理順は次のとおりである。

1. event 4：Aが時1を支払い、残り時を1から0にし、`A-040#1`を手札からactivation zoneへ置いた。chain追加後も発動者Aがpriorityを保持した。
2. event 5：Aが`response-pass`し、Bへpriorityを渡した。
3. event 6：Bが`response-pass`し、双方連続passによりchainを閉じた。
4. event 7：最後に発動した`E-first-date`を解決した。対象`A-017#1`がこいびと枠・交際段階0にいることを再確認し、`A-028#1`を1枚ドロー、Aのそだちを20から25へ増加、`A-040#1`をactivation zoneから捨て札へ移した。

支払い、発動者priority、pass順、逆順解決、ドロー、そだち+5、捨て札移動は、decision／event／snapshotのgame state・continuation state二重hash鎖に保存した。自動解決event 7の`decision_id`はnullであり、直前のBのpass判断を誤って参照しない。

## 保存物と記録境界

- 固定plan：`data/proxy-response-window-seeded-restart-plan-120-20260922.json`
- evaluation：`data/proxy-response-window-seeded-restart-evaluation-120-20260922.json`
- rules-stop 4件：`data/proxy-response-window-stops-120/`
- builder／CLI：`tools/proxy_response_window_seeded_restart.py`
- 専用テスト：`tools/test_proxy_response_window_seeded_restart.py`

completed recordとdecision traceの保存directoryは、該当経路が0件なので作成していない。停止経路の部分decision／event／snapshotは固定planに保存し、stop artifactは最後に検証済みのstateだけを保存する。各decisionはstable ID・連続seq・対応event参照を、各eventはstable ID・連続seq・前後二重hashを持つ。snapshotはresume地点を含めてevent数+1件である。

独立balance標本 0を維持する。4経路を勝率、先後差、発動率、カード強度、採用判断、catalog母集団変更へ使用しない。カードを使わなかった部分経路を発動率0とも数えない。

## 保護対象

120実装は、117・119・116・112を変更していない。検査器は承認済み120設計1件、117 stop 4件を含むprotected raw 20件、117 state hash 4件を固定値で照合する。特に次を維持した。

- 117の4 stop artifact、生bytes、`pre_decision_state`、event seq 3、state hash、manifest、card copy／instance ID
- 119のcontract、candidate audit、validator、設計・実装計画、専用テスト
- 116 fallback contract、117 plan、117 evaluation
- 112の6 fixtureの生bytes、`status: fixture`、空events、winner null、未実施・completed 0・独立標本0

現行452件、登録履歴477候補、カード本文・数値・登録区分は変更していない。118の暫定名称「ときおくり」、既存ID・schema・英語機械識別子も維持した。

## TDDと検証

Task 1〜7をRED確認後の最小実装で進め、専用テストを8→15→22→29→35→39→42件へ増やした。Task 7のREDは、120正本文書なし、READMEが119を現在地としていたこと、`--checkpoint-120`未実装の3件で確認した。記録検査追加時にはstable decision ID／event ID不足もREDで検出し、汎用のstep serializerで補った。

保存時の専用42件はGREEN、`check-design-data.py --checkpoint-120`は専用42件・全proxy 263件を数え、120範囲のerror 0、builder再生成と保存JSONのcanonical bytes完全一致、protected hash一致、terminal manifest一致、二重hash鎖一致を確認した。全proxyとrepository全体の検査では、既知のsparse-excluded catalog／link入力不足と`tests/smoke-test.js`由来の結果を120の成否へ混ぜず、別記録とする。

## 次の再開境界

次checkpointは、この4件の120 stop artifactに保存した同一state・両hash・最終event seqから独立に再開する。その前提として、既存正本に基づく通常行動候補の完全合法性、stable candidate ID、採用・除外理由を確定する必要がある。新しい裁定を推測で補わず、未確定が残る経路は真正停止を維持する。112の6 fixtureを先に実行しない。
