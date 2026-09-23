# 123 ターン終了処理の完全性契約：横断監査と設計

状態: 122の保存済み4停止点を横断監査した設計。対戦再開は別段階。

## 目的と境界

122の`turn_end`真正停止を、01・06・64の既存終了手順に照らし、現在stateから検証可能な一般契約として定義する。ルール、カード本文、数値、登録区分、既存schema、既存保存成果物は変更しない。特定path/order/card copyに応じて結論を変更しない。123はprotocol-onlyであり、122の4経路を再開せず、decision/event/snapshot/winner/新stopを作成しない。終了時の発動選択、予約実行、ターン交代、開始時ドロー、勝敗処理は行わない。

## 読み取り証拠と分類

基準は122 remote HEAD `ba5507f78f4c3df96c19212a7069eb401b480d60`、tree `8da0d0dccdaabb327c0e33211d2a281c898c96a2`。入力は122の4 stop artifact、122 builder/121 validator、01・06・64、72のC-chameleon本文、74のP-cat_ceo本文である。保存済みraw bytesと両state hash、最終seq、instance mappingを改変しない。

| path | seq | ターン側 | 公開盤面の差 | 共通停止位置 |
|---|---:|---|---|---|
| order-01-a-first | 9 | A | partner P-cat_ceo、そだち25 | `turn_end_reservations_triggers_victory` |
| order-01-b-first | 7 | B | partner P-cat_ceo、そだち20 | 同上 |
| order-02-a-first | 7 | A | companion C-chameleon、そだち20 | 同上 |
| order-02-b-first | 7 | B | companion C-chameleon、そだち20 | 同上 |

4件すべてR1、`game_state.phase=turn_end`、双方の`reservations=[]`、`pending_triggers=[]`、`activation_zone=[]`、119の空chainで双方pass済み、`return_target=turn_end`、winner null。P-cat_ceoは交際開始時の強制発動であり終了時に再発動しない。C-chameleonは両者のセカイに依存する継続補正であり独立発動ではない。この局面にセカイはない。actorの残り時0/1、盤面種類、カードコピーは異なるが、保存理由と未実装境界は同一。**共通の列挙・完全性証明が不足**している。ただし、現行stateだけで全カード由来の終了時誘発/期限が空であることを証明済みとはみなさない。監査結果は勝敗や次ターンへ進める許可ではない。

## 既存の手順を機械化する範囲

06「ターン終了」および64第3節の順をそのまま採用する。

1. 終了申出への相手の反応が閉じたことを検証する。反応が成立したなら通常行動へ戻るため、終了処理には入れない。
2. 終了時という出来事を1回だけ迎え、**既に適用済み**でこの時刻に来た予約を列挙する。順はターン側、非ターン側、同じ側に複数なら本人の選択が必要。実行は別段階。
3. 終了時の誘発・反応と後続chainを列挙する。公開盤面・公開履歴、各ownerの既知情報を規則どおり扱う。対戦相手の非公開手札を覗いて可能性を0と断定しない。
4. このターン/終了時/該当する次の自分ターン期限、後攻ならこのラウンド期限の効果を列挙する。一括終了と再計算は別段階。
5. 期限切れから発生する誘発だけを列挙する。新しい終了時イベントや自由反応機会を作らない。
6. R1〜R9の到達後相手ターン維持、R10後攻の最終比較を既存の到達履歴で判定できるか検証する。単なる現在そだち100では維持履歴の代用にならない。続行時だけ次ターンへ送る。

## 123の契約データと導出

監査対象の単位は`turn_end_opportunity`で、raw artifact SHA-256、last event seq、game/continuation両hash、round/turn_player/先後、119 response closure、公開された適用済み予約、pending/activation、盤面instanceとcard mapping、現在のそだちと到達/中断履歴を入力とする。state内の未知key、型、欠落、参照破損はintegrity errorでありrules-stopへ変換しない。actorが保有する情報とpublic情報以外を探索に使わない。

各手順について、`source_inventory`（実在source全件）、`disposition`（due/conditional/not_due/absent/unknown）、根拠のstate fieldと正本参照、対応する処理能力の有無を記録する。空集合も省略せず、根拠を伴う0件とする。盤面card IDから本文/発動時刻を解決するregistryはcard ID単位であり、copy ID・path ID・order IDへ分岐しない。現在のP-cat_ceo/C-chameleonの分類は既存本文そのものを参照する。新たなカードが増え、registryに該当する分類根拠がなければunknownで停止する。手札など非公開領域から生じ得る反応は119のowner/priority境界に委ね、相手の非公開内容を列挙しない。

`turn_end_set_complete`は保存booleanを信用せずvalidatorが独立再計算する。成立条件は (1) 入力hash/seq/schema/mapping一致、(2) 正しい終了入口と閉じた119 response、(3) 6手順のinventoryと空理由、(4) 予約の実行時点とowner/順の解決、(5) 終了時triggerと後続反応の情報境界、(6) 期限の適用開始/終了と後攻ラウンド境界、(7) 期限切れ由来trigger、(8) 到達・中断履歴を使う勝利条件、(9) 全source disposition/根拠、(10) 既存正本で解決可能な処理の証拠、(11) canonical IDの重複・衝突なし、(12) 出力projectionとsource全件の一致、の12項目がすべて真かつcontract stop codeが空であること。保存値との不一致はvalidation error。完全性は処理の実行可能性とは別であり、実行時に未知の効果が現れたらその経路だけ真正停止する。

Contract stop codeは`turn_end_window_not_closed`、`missing_turn_end_source_classification`、`unresolved_reservation_due_time`、`unresolved_end_trigger`、`unresolved_expiration`、`missing_growth_reach_history`、`unresolved_victory_predicate`、`forbidden_information_required`、`missing_transition_handler`とする。既存正本の肯定/否定を示せないものを推測で`absent`にしない。異なる根拠で複数codeが成立すれば全件記録する。破損したraw/hash/seq/schema/mappingは契約stopでなく全体エラー。

Stable enumeration IDは手順番号、source zone、source instance IDまたはsynthetic ID、effect timing、trigger event seq/turn period、対象instance IDのcanonical順から構成する。配列位置、path/order、現在時刻を材料にしない。カード本文に別の同時刻選択があれば、既存の選択契約で扱えることを証明するまで実行しない。

## 4件のacceptance auditと実装境界

4件すべて入口/閉じた空chain/空予約/空pending/空activationを肯定的に再証明し、P-cat_ceoまたはC-chameleonについて本文根拠を添えて終了時独立発動から除外する。残りの盤面・公開履歴・期限・到達履歴について、現在stateから不存在を独立再計算できなければ該当contract stopを記録する。`turn_end_set_complete=true`を4件という期待値として固定しない。一般pipelineで示せない場合は停止のままにする。

予定成果物はprotocol-only JSON contract/audit、独立builder/validatorとテスト、123報告、詳細TDD計画、README、PR本文。UTF-8、indent 2、LF、末尾改行1件、schema固定key/array順で保存し、別プロセス再生成bytesと保存bytesを直接比較する。122/121の保存成果物、120/119/117/116、112 fixture、452現行/477登録履歴は読み取り専用。117旧テストの190対263は別件として記録する。
