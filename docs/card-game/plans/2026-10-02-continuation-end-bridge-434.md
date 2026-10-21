# 434 — 承認済み共通契約の終了接続

利用者の「続き」、432承認設計、433残課題に基づくinline継続。中間確認は不要、独立レビューは最後1回。新裁定を作らない。

目的: 6段階終了監査を維持して、共通分類と実行済みbirth/attachの履歴証明を接続する。装着runtimeを次ターン・通常ドロー・既存mandatory処理へ引き継ぐ。任意開始能力の発動/解決は別境界のまま止める。

根本原因: 123終了分類にmain/equipmentの共有記述がなく、124履歴分類にplay_main_birth/attach_itemがない。既存強制runnerは非空runtimeを一括拒否。次ターン分類はmain/preparedを一括拒否する。

設計: source-bound共通記述からscope限定で終了/履歴/開始分類を追加し、元registryを必ず復元。birth/attachの履歴は実行handlerの再生と完全前後state比較で証明する。未知・裏向き準備・期限切れ/100到達/予約を空と推定しない。旧runnerはdefaultを維持、明示的forced_adapterを渡す新coverage経路だけを434で有効化する。終了handlerがruntimeを変更しない場合のみstate.advanceで保存し、対象離脱は未接続として拒否する。過去433結果とdefault再生は維持。

逐次作業:
1. 保存433停止を使い、main終了/装備終了/不正履歴・未知分類のREDを作る。
2. proxy_continuation_end.pyへ共通終了scope・event証明・runtime保持を実装、限定runner接続。
3. 同じ135の旧/new8軌跡を初期入力から実行/再生。433との差はcoverage、新版内policy差は同じ公開情報/contextだけ比較。21旧scope母数を維持。
4. 新専用、433専用34、resource97、関連終了/履歴/開始回帰、npm/design/catalog、505と過去rawを検証。
5. 最後に独立レビュー1回、重要指摘修正、434報告・新artifact・manifestをGitHub保存、Draft/open/unmerged確認。

保護: 505/114/414・既存保存結果不変。112未実行、独立balance0、採用false。完走を成功条件にせず、接続箇所と停止箇所を明記する。
