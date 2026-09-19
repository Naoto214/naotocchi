# 117 通常意思決定seeded restart

2026-09-19。116のfallback contractを115と同じ入力へ適用した実結果は、**planned 4・completed 0・stopped 4・独立balance標本0**。全経路がR1たまご交換と安全配置を通過し、配置直後の`post_placement_response`で停止した。これは応答窓の候補／phase／stable ID contract不足であり、ゲームルール自体の未裁定や戦略比較不能を理由にした停止ではない。

## 入力と保存物

sourceは107のA先手fixture、protocol 107、候補表とhardening 114、初期順plan／audit 115、fallback 116を固定した。[117 plan JSON](data/proxy-normal-decision-seeded-restart-plan-117-20260919.json)が全source参照、40枚manifest、判断証跡、停止directiveを保持する。order-01はA seed 50／B seed 100050、order-02はA seed 51／B seed 100051。同一orderの先後鏡像ではmanifestを変えず、各経路を独立した初期状態から再生する。カード現物80枚と初期instance IDを保持する。

- [設計仕様](plans/2026-09-19-normal-decision-seeded-restart-design.md)、[実装計画](plans/2026-09-19-normal-decision-seeded-restart.md)
- [builder／validator／CLI](tools/proxy_normal_decision_seeded_restart.py)、[専用テスト](tools/test_proxy_normal_decision_seeded_restart.py)
- [evaluation JSON](data/proxy-normal-decision-seeded-restart-evaluation-117-20260919.json)
- [order-01-a-first stop](data/proxy-normal-decision-stops-117/stop-117-order-01-a-first.json)
- [order-01-b-first stop](data/proxy-normal-decision-stops-117/stop-117-order-01-b-first.json)
- [order-02-a-first stop](data/proxy-normal-decision-stops-117/stop-117-order-02-a-first.json)
- [order-02-b-first stop](data/proxy-normal-decision-stops-117/stop-117-order-02-b-first.json)

evaluationの`expected_files`はcompleted_records=[]、decision_traces=[]、stop_artifacts=上記4ファイル名。`proxy-matches-117`と`proxy-decision-traces-117`は空directoryも作らない。新規fixture・completed record・completed trace・winnerは0件。partial replay evidenceはbuilderで再構成し、completed record／traceに偽装しない。保存はUTF-8、indent 2、末尾newline。validatorは名前集合とJSON内容／canonical serializationを完全一致で検査し、writerは余分なJSONを削除せず、書込前に拒否する。

## R1の実判断と停止

R1時回復後は先手の時1、後手の時0。通常＋たまごの2枚を引き、mandatory choiceで1枚を山札下へ置き、安全な時0人物配置を実行する。実時1で可能な段階1誕生も合法候補に含め、passを省略しない。114の`candidate-pass`は通常行動で116の`pass`へ正規化する。この正規化は応答窓への適用許可ではない。

| 経路 | mandatory bottom（copy / card） | 安全配置（canonical candidate） | 候補合計 | seeded / strategic |
|---|---|---|---:|---:|
| order-01-a-first | A-023 / G-air-hockey | candidate-place-partner-A-017#1 | 11 | 2 / 2 |
| order-01-b-first | B-022 / W-deepsea | candidate-place-partner-B-017#1 | 12 | 2 / 2 |
| order-02-a-first | A-007 / M-antlion-07 | candidate-place-companion-A-014#1 | 9 | 1 / 1 |
| order-02-b-first | B-034 / I-poop1 | candidate-place-companion-B-014#1 | 12 | 2 / 2 |

4件のmandatory choiceはseed抽選。配置はorder-02-a-firstのみ一意な`safe_free_development`、他3件は安全候補間の`seeded_fallback`。配置は既存instanceを手札から盤面へ移し、人物配置枠を使用済みにする。P-cat_ceoはたまご中で能力発動しない。C-chameleonは両セカイがないため継続bonusなし。06の応答機会を飛ばして通常行動に進めない。

| 経路 | round / actor / phase | 終端理由 | 不足範囲と再開条件 |
|---|---|---|---|
| order-01-a-first | 1 / A / post_placement_response | incomplete_legal_candidates | E-first-date A-040#1はたまご中のA-017#1を対象にできる（91・93 B12）。応答passと同eventのstable ID、完全候補列挙、reaction／chain解決証明を含む監査済み応答adapterが必要 |
| order-01-b-first | 1 / B / post_placement_response | missing_stable_candidate_identifier | passは利用可能だが114の候補はnormal_action_opportunity専用。owner-known／public完全性証拠とstable response-pass IDを持つ監査済みphase adapterが必要 |
| order-02-a-first | 1 / A / post_placement_response | missing_stable_candidate_identifier | 同じ応答passのphase／stable ID不足。C-chameleon配置後の保存状態から、監査済み応答adapterで再開する |
| order-02-b-first | 1 / B / post_placement_response | missing_stable_candidate_identifier | 同じ応答passのphase／stable ID不足。C-chameleon配置後の保存状態から、監査済み応答adapterで再開する |

全stopのlast valid event seqは3、winner=null、completed／independent flags=false。`known_candidate_ids=[]`は確認済みcanonical応答IDがない意味であり、passが違法という意味ではない。各stopが根拠参照、正確な不足範囲、再開条件、全状態とSHA-256を保存する。115 manifestを変えず、各経路の保存状態に束縛した応答contractを用意するまで先へ進めない。候補／hash／instance破損や`plan exhausted`は開発エラーであり、stopに変換しない。

## 評価と境界

各経路はevent 3・snapshot 4（seq 0〜3）・decision 2。partial合計はevent 12・snapshot 16・decision 8であり、completed対戦のevent数ではない。完了経路がないので各completedのwinner／event／snapshot／decision／seeded／strategic一覧は空である。

候補延べ44、選択行動8、seeded 7、strategic unresolved 7、rules-contract stopとしてのunresolved 4。`unresolved_count`は停止境界数で、戦略比較不能数と分離する。7種類の使用数はmain 0、companion 2、partner 2、world 0、play 0、item 0、event 0（停止までの観測値）。各経路の未使用時は先手1／後手0。全snapshotでgrowth A=20／B=20。予約created／consumed／expired／maximum simultaneous、再登場、instance transitionはすべて0。初回配置を再登場に数えない。

これらは停止までの局所観測であり、未完了経路を「発動0の完走対戦」や勝敗数に数えない。seededまたはstrategically unresolved経路は独立balance標本でなく、停止前でも独立balance標本0。勝率・先後差・発動率・カード強度・採否を推論しない。

予約created／consumedはeventのID列、expiredは各snapshotの予約statusをIDで重複除外して集計し、maximum simultaneousは両playerのactive予約合計のsnapshot最大値とする。再登場／instance transitionはeventの旧instance→新instance記録数から集計する。現在の0を定数で決めない。canonical保存／検査はUTF-8の生bytesで行い、indent 2＋LF末尾newlineを要求してCRLFも拒否する。

112の6件は`fixture`・events=[]・winner=nullの未実施を維持。現行カタログ452、登録477、カード本文・数値・登録区分の変更は0件。115の過去停止監査も書き換えない。次checkpointは117の実結果と応答contract不足を評価してから決め、先に112へ進まない。

## 検証

Task 4の第一段階は保存／評価／境界4テストを先に追加し、24件中4件FAILを観測してから実装した。GREENは24件PASS。既存20件を削らず、計画の古い「20件」見込みを実数24件へ更新した。第二段階はcheckerへ117要件を先に追加し、117本文欠落とREADMEの現在地／進捗／一覧欠落でREDを観測してから本文を書いた。116の既存checker件数は実際の36へ修正した。

review round 1では予約lifecycle・再登場の証拠mutation、CRLF保存、checkerの全proxy件数報告を先にREDにして修正した。checkerは`test_proxy_*.py`のASTを静的集計して総数190を要求し、`proxy_test_count`へ報告する。checker内で全proxy suiteは実行しない。専用24／116の36に加えて総数190を検査し、temporaryな追加1テストで191を拒否することも確認した。

最終実測は専用24件PASS、全proxy 190件PASS（baseline 164＋116追加2＋117追加24）、CLI `valid: true`、総合checker `errors: []`、`git diff --check` clean。repositoryの`npm test`も406件PASS。自己点検で余分な非JSONファイルもmanifest違反にする回帰subtestを先にREDにし、修正後も専用24件・全proxy 190件を再実行してPASSした。再実行コマンド:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/card-game/tools -p test_proxy_normal_decision_seeded_restart.py -v
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/card-game/tools -p 'test_proxy_*.py' -v
PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/proxy_normal_decision_seeded_restart.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/card-game/tools/check-design-data.py
git diff --check
```
