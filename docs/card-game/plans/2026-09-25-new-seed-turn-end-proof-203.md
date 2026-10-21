# 203 新seed4経路終了履歴監査 TDD計画

202保存4状態と184基準履歴をraw SHAで固定。185〜202の保存event/snapshotを各経路で通し、seq・game/continuation hash・growth変化・未処理誘発を照合する。既存六段階終了契約へ分類済み履歴を渡す。専用テストを先にRED、4経路completeと履歴改変拒否を検査。state変更・event追加なしでcanonical JSON、設計データを検査しGitHubへ保存する。
