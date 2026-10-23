# なおぽよ。 World Pilot implementation plan

Goal: #428の共通v2を使い、8×8のA/B/C/D/E独立試作と章構成を作る。
Architecture: v2 engineに後方互換の任意通行policyと外部イベントAPIを追加。このブランチだけで変更し、元#428は不変。world/sessionが整数ゲーム時刻、イベント消費記録、ドラッグ全体のsnapshotを所有。既存入力geometryと公式spriteをimportする。
Spec: 今回のユーザー指示22節。main/#422/#428のref、既存12/24面、既存保存、公開入口は変更禁止。

- [ ] Task 1: v2 API拡張とworld runtime。tests/runtime.test.mjsで波→合体/分裂、魚通行、光線重複防止、重力、同時順、Undo/保存/停止をRED→GREEN。v2既存156テストを維持。
- [ ] Task 2: 5 Pilot / 解答。stages.mjs、tests/solutions.test.mjs。実runtimeで全員脱出、条件門封鎖、ギミック必要性を検証。未証明は明示。
- [ ] Task 3: iPhone UI。app.mjs/render.mjs/style.css/index.html。375/390/430と短画面・横向き、8×6比較。数字/ドラッグoffset/足元ring、pause、hint、undo、retry、選択を維持。
- [ ] Task 4: 設計40案、10章、ゲストとボス、stage matrix、QA/証跡。テスト・回帰・独立レビュー。
- [ ] Task 5: 独立branch commit/push、#428 base Draft PR、新private Site。URL/配信/アクセス確認。

Review focus: 光線照射中の新規進入、波によるactive ID消失、波後の入力飛躍、Undo直後の時計再開、魚以外の重力/分裂水中侵入。

Ruling: ユーザーが途中承認を不要として全工程を承認済みのため、再承認で停止せず実施。
