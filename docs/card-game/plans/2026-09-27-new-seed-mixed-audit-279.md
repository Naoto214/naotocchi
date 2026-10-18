# 279 新seed混合局面監査計画

1. GitHubの278 HEAD/treeとPR #259のDraft・open・未マージを確認する。
2. 278のcanonical JSON、4経路のevent/state/hashを再構築し、保存済み境界を固定する。
3. 通常行動、必須たまご交換、コイン連鎖response、C-box配置後responseの候補と除外を既存正本で監査する。
4. 専用テストのRED→GREEN、生成JSON一致を確認し、README・報告・計画・テスト・JSONを保存する。
5. 保存後にremote HEAD/treeとPR状態を再取得し、次の選択と再生へ進む。
