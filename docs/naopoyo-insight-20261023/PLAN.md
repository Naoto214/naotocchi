# なおぽよ。発想型Pilot 実装計画

Goal: 8×8・共通v2を再利用し、操作の難しさではなく数と順序の発見を楽しむ7面を実装・検証・独立公開する。
Architecture: #430 WorldSession / renderer / mountを共通利用。mountは既定動作を保った設定注入へ。新面・段階ヒント・独立保存キー・証跡はnaopoyo-insightに置く。v2 engine/inputには変更を加えない。
Spec: 今回のユーザー指示全19節（欠番7〜13は推測で追加しない）。既存WORLD.mdの10章を維持。
Tech: native ES modules, Canvas2D, node:test, buildless private Sites.

## 制約と判断
- main/#422/#428/#430のref、本編、正式版、画像、既存保存は変更禁止。#430 HEAD 599fcb48をbaseに別ブランチ。
- 追加承認不要の明示指示に従い設計承認待ちを省略。直接統合/独立エンジン複製は不採用。既存UIの設定注入による再利用を採用。
- 7面: 結び直し、余剰、重力/足場回収、波、光と再構成、水中の役割、協力ボス。難易度は人間QA前の仮評価。
- 全面最初から選択可、3段階任意ヒント。100面の章解放は設計のみ。
- ゲストは固定の案内/仕掛け担当。操作ゲスト・新HP戦闘・スイッチ新機構は今回の必須実装にせず将来計画へ。

## Review Focus
- 保存したactive dragがUndo一単位として復帰すること。
- 波・照射後に指保持を継続できること、待機分割で結果が変わらないこと。
- 8近傍の角抜けと分裂spawnが必須門を迂回しないこと。
- 短画面でも主要操作を失わず、セル寸法の限界を記録すること。
- 新catalog/保存キー注入で旧A〜Eが変わらないこと。

## Tasks
- [ ] 1: tests/solutions.test.mjsで7面数・8×8・3ヒント・実engine全員脱出を先に要求（RED）。stages.mjsとwitness.mjsを追加し、全操作でmass/validState/restore/Undoを検証（GREEN）。ギミック無効化探索は完了/上限を区別。
- [ ] 2: 共通mount設定とヒント/独立保存を実DOM harnessでRED→GREEN。index.htmlは8×8固定。既存world/v2/rescue回帰。
- [ ] 3: 正式24面を最新main/#422から読取り、旧witnessのv2再生を測定し面別の移行判定を作る。10章・100面・進行・互換性の計画をDESIGN.mdにまとめる。
- [ ] 4: build-preview.mjsで依存と画像を梱包。375/390/430px・短画面でブラウザQA、全体回帰、独立レビュー、必要修正。専用CI追加、新branch push/Draft PR（base #430）、owner-private Sites公開。GitHub CIの最終状態、HEAD/tree、保護ref、実機未確認をREPORT.mdに記録。

## Ledger
- 2026-10-23: 最新main acd4ece1、#422 88ab41e1、#428 f8094cd7、#430 599fcb48。全て未マージDraft。
- 容量不足で初回worktree checkout失敗。自分の不完全なコピーのみ削除、--no-checkout後に既存trackedファイルをhardlinkして読み取り共有。既存ファイルを編集する場合は必ずunlinkして独立コピー化。元ファイルの変更はしない。
- Task 1 complete: 7実engine witnesses、保存/Undo、必要性6検査。catalog RED→GREEN。
- Task 2 complete: mount設定/固定8×8/3段階ヒント、種族条件表示 RED→GREEN。新規34テスト成功。旧world/v2/rescue含む先行405テスト成功。
- Task 3 complete: migration-audit旧24/24、同経路v2 17/24、7経路不一致。03算術不成立。DESIGN.mdに全体/面別計画。
- Task 4 in progress: 専用CI・梱包追加、Chromium寸法検証、全体回帰実行中。独立レビューを依頼する。
- Final review complete: Critical/Importantなし、I04波の表示行を5行目へ修正。追加検証でI05の合法別解を確認し保持。テーマ分類requiredをmechanicsへ改名し、必須性の証明と分離（メタデータのみ）。
- 初回GitHub CI: Insight39909517921 / World39909517972ともsuccess。private Site version1公開成功、owner1/追加編集者0/group0/external0。
- 作業中に別レーンでmainが76f32494へ更新（#431記録と#425クイック）。旧正式なおぽよファイルはacd4ece1との差分なしを確認。今回ブランチへmainを混ぜず、依存PR統合時の再base/回帰を計画する。
