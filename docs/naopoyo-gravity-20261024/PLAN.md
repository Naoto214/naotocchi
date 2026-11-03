# 重力・トゲ共通ルール改訂 Implementation Plan

Goal: 第2章11〜20に一貫した非支持トゲ・段階非依存の上昇条件を適用する。
Architecture: 共通v2エンジンの明示的 `gravityRules: 'supported-v1'` を第2章のみで選ぶ。移動要求の上昇合法性、通行、接触、安定化を分離。旧ルール省略時の第1章/比較室は保持。
Tech Stack: JavaScript ES modules, node:test, 実エンジンBFS/greedy探索。
Spec: 本タスクのユーザー指示17節。以下の判断は実装者の具体化であり再承認を要求しない。

## 判断と境界
- 上昇: 出発直下の支持があり、到着直下に自分以外の支持物があること。到着マスの既存キャラへ接触する場合も、そのキャラの直下が支持されている必要がある。真上の移動では移動前の自分を足場に数えない。
- 支持物: 岩/底境界/キャラ/対象に閉じた門。トゲは含めない。角抜けは変更しない。
- 8が小さい仲間の上へ行く時の上下交換は既存の落下合体と余剰であり、移動拒否と区別する。
- 旧保存は上書きしない。第2章のルール別独立キーへクリア/開放記録を引継ぎ、旧途中盤面は元キーに保持。
- 新仕様は将来飛行の設計を上書きするが、既存比較室の旧試作動作や第1章は変更しない。

## Global Constraints
mainマージ・本番GitHub Pages更新・第1章変更禁止。画像原本、CARD、本編、セーブを保護。飛行を導入しない。

## Review Focus
保存復帰による旧ルール注入、分裂直後の子の見え方、再進入時再発動、合体で残る余剰の門判定、探索上限を解答不能/最短と誤認しないこと。

## Tasks
- [x] 1: 新ルール再現テストを追加、RED保存→engine.mjsの移動/支持/非支持トゲ修正→GREEN。
- [x] 2: stages/session/progress/appを接続。旧保存保護・Undo・速度差・分裂体描画を検証。
- [x] 3: 全10面を新エンジンで再探索。必要最小限の地形再設計とヒント更新。20の候補/短絡/別解を記録し証人をsession再生。
- [ ] 4: 全パズル・CARD・npm test・Pages回帰、独立レビュー、GitHub commit/push/PR更新、既存private Sites更新・配信照合。

## Ledger
- Baseline: chapter2 38/38 PASS。
- 初回調査: PR436 HEAD345a8cb0、remote main f16e0f37。PR435 merged。
- 上昇旧条件は出発直下(またはトゲ滞在)＋出発横。到着支持は検査しない。settleはトゲ滞在者を無条件skip。

- Ruling: 条件不一致の出口も物理的には落下を止めるため、支持判定に統合。13の合法別解を許容する。誤る場合の影響は難易度変化で、公開済み第1章は影響しない。
- Ruling: 18に岩1、20に岩2を追加し、出口・門・トゲ・初期数字を維持。旧ルール依存の空中上昇を地形で置き換える。難易度は本人試遊で判定。
- Task1/2 core: 68/68 PASS。legacy puzzle539/539、CARD412/412、Pages16/16。全10面の新エンジン証人を保存・sessionで検証。

- Final review: independent gpt-6-astra review。自然に落下して吸収される分裂体の描画欠落をImportantとして修正。外部分裂APIも共通状態原子性のため今回修正。ともにRED→GREEN。
- Ruling: reviewが対象外とした人間の難易度・実機は未確認として残す。配信/最短性は担当が実証拠で確認。全入力に循環がないとの数学的保証はしない。循環検出時は原子rollbackする。
- Browser: Cloud Chrome 1363×936でQA11〜20選択、20の配置、落下合体・余剰、Undo可能状態、reload、Retryを確認。pointerup後も余剰の説明が残ることを画面で確認。iPhone実機未確認。
- 本編 npm test: 3,432 TAP tests、全成功（4プロセス集計）＋smoke/dialogue/visual checks成功。
- Pages hash guardは新engineを未承認として最初に拒否。レビュー済みengineのhash1件のみ更新して再実行し、4,053 HTTPファイル/452カード904画像/欠落0/hash不一致0。
