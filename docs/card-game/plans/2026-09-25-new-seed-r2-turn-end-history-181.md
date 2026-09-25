# 181 新seed R2終了境界の履歴監査 TDD計画

180保存済みraw/state/hashと162履歴基準を固定し、164・165・168・170・172・174・176・178・180の各保存物を連結してevent seq、game/continuation SHA連鎖、snapshot再計算、成長推移、誘発の出所を検証する。先に専用テストをREDにし、4経路の実際のphaseとreturn_targetを確認する。180報告の「4経路ともターン終了入口」という局面表現は保存済みstateと異なるため、180には手を加えず181で訂正する。新eventを加えず監査証拠をcanonical JSONに保存し、専用テスト・JSON一致・設計データ検査後にGitHubへ保存する。
