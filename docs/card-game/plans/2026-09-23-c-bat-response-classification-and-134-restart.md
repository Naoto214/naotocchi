# C-bat反応専用分類と134独立再開 — 設計／TDD計画

保存基準はcheckpoint 133のHEAD `873dc0d217cade7471953087767625fb233cc511`、tree `d7c999b2b4023ca7756ee3eb0f8a005df8039777`。133の`order-01-a-first`／`order-01-b-first`停止raw SHA、state hash、continuation hash、最終event seqを読取専用入力とし、02の完了2経路と126〜133以前の証拠を変更しない。

## 横断監査と設計

両経路はR9 Aのnormal_actionで、A盤上`C-bat`の分類が未登録なため`unresolved_canonical_predicate`で停止した。72本文は「相手のターンに、自分が『すぐつかう』でカードをプレイした時」と発動時点を限定する。06は条件を満たす能力を反応機会へ置き、通常配置等を反応へ混ぜない。119は反応候補familyに`triggered_ability`を持つ。114候補表の`C-bat`は手札からの`place_companion`だけで、盤上から自分のnormal_actionに起動するtemplateを持たない。

したがって一般区分`response_triggered`を「正本本文が反応機会の条件成立時だけ発動を許す盤上能力」として盤上能力分類へ接続する。この区分はnormal_actionでは`timing_not_normal_action`により除外し、stable candidate IDを発行しない。実際に条件が成立したresponse windowの列挙・ID・解決は未到達なので実装しない。`C-bat`のcard copyや2経路を条件にする分岐、カード価値、本文・数値変更は加えない。

現在stateからの近接監査では、分類を一時適用した`order-01-a-first`がR10後攻終了まで進みA勝利で完了した。分類直後に確実な別共通不足はない。残る両経路を同じ133保存state/hashから独立に再開し、完了または真正停止まで進める。

## TDD手順

1. 133の2停止raw SHA、state/continuation hash、event seq境界を固定するテストを書く。
2. 72・06・114・119の照合から`response_triggered`、`triggered_ability`、normal_action非対象を返す分類テストを書く。
3. 両停止stateの候補監査で`C-bat`が`timing_not_normal_action`、candidate IDなし、候補集合完全になるテストを書く。
4. 以上が未実装moduleでREDになることを確認後、134 moduleへ最小実装する。旧module・旧JSONは編集しない。
5. 両経路を独立再開し、source hash、最初のbefore hash、連番event、game/continuation hash連鎖、完了または真正停止を検査する。
6. plan/evaluation/route JSONをcanonical bytesで保存し、専用テスト、保存JSON検査、全proxy検査を実行する。117旧テストの期待190・実際263だけを既知問題として分離する。
7. 134報告とREADMEを更新し、作業ブランチへ保存する。PR #259はDraft・open・未マージを維持し、workflow run/statusが0件ならCI成功と数えない。
