# 8方向交換・出口分離 Implementation Plan

> For agentic workers: Use superpowers:executing-plans. 本人の詳細仕様・実装・検証・push・private Sites更新の一括承認に基づき実行する。

Goal: 合体不能時の双方向に合法な交換と出口の通行／救出／支持分離を共通エンジンへ導入する。

Architecture: 共通 `naopoyo-v2/engine.mjs` に `movementRules: contact-v1` を追加し、指定された面だけに適用する。既存 `supported-v1` 重力と組み合わせ、旧版の省略時動作を維持する。表示・保存・探索は同じ実エンジンを使う。

Tech Stack: JavaScript ESM, node:test, 既存探索器、Canvas、GitHub、private Sites。

Spec: 今回の本人依頼（8方向交換、岩2辺の角抜け禁止候補、出口通行自由・条件付き救出・非支持、トゲ非支持）。詳細判断は SPEC.md に保存する。

## Global Constraints
- mainマージ・本番GitHub Pages更新・第1章の直接変更は禁止。
- PR #436 の最新HEAD 40b7f49b04ffdd8b9426d0d19c80f078d0802ca7から開始。push前にremoteを再確認し、上書きしない。
- 旧保存キーを上書きしない。新キーへ進捗のみ移行し、旧盤面とUndoを再解釈しない。
- 旧36手を新ルールの最短解として流用しない。探索上限は解なしと区別。

## Review Focus
- 交換相手の門・上昇・種族地形条件も拒否前に判定する。
- 地形効果で片方が消えたり分裂してもactive IDとドラッグ座標を保持する。
- 落下は交換を発生させず、巡回は盤面全体をrollbackする。
- 余剰が出口へ戻る場合も救出条件を判定する。
- 新ruleの保存偽装を拒否し、条件不一致の出口占有を正しく保存復帰する。

## Task 1: 共通エンジン
- [x] tests/contact-rules.test.mjs: 8方向、異種族、8+8、合体優先、双方門・地形・上昇、角、出口、トゲ、保存、rollbackの実状態テストを追加。
- [x] 修正前にnode --testでREDを記録。
- [x] engine.mjsに共通接触ルール、双方向事前検証、交換イベント、出口分離を実装。
- [x] 新テストGREENと既存パズル回帰を確認。

## Task 2: セッション・保存・表示
- [x] session.mjs / progress.mjs のテストをRED→GREEN。
- [x] 交換イベントの2体を180msの弧で描画。落下はその後へ接続。reduced-motion即時化。
- [x] 新保存キー、旧2キーから進捗のみ読取移行、各面movementRulesとrevision更新。
- [x] 高速・低速ドラッグ一致、Undo/Retry/reload、順次開放を確認。

## Task 3: ステージ再検証
- [x] 旧解答を新ルールへ再生し、最初の差異を記録。第1章は旧ルール回帰と仮適用比較のみ。
- [x] 全10面を探索し実エンジンで再生。必要最小限の再設計、各面難易度表、20のアブレーションを保存。
- [x] 解答証跡とヒントを新ルールに合わせる。過去証跡を改変しない。

## Task 4: 回帰・保存・配信
- [ ] パズル、本編、CARD、Pages、必要CIを実行し失敗原因を調査。
- [ ] 全体の独立レビューと指摘修正。
- [ ] commit/push、Draft PR更新、最終HEAD/tree/CIを記録。
- [ ] Sites既存owner-private URLを更新し配信hash・アクセス・未確認事項を報告。
