# 183 新seed終了response再開 TDD計画

182の監査証拠と180保存stateをraw SHAで固定する。先に専用テストをREDにする。01-B・02-Bの候補完全性を現stateから再評価し、119の唯一`response-pass`で連続passを2にして`turn_end`へ復帰する。01-A・02-Aは既存の終了stateを保持。event seq・game/continuation hash連鎖・snapshot一致、canonical JSON・設計データを検証してGitHubへ保存する。終了処理そのものは全履歴証拠の更新後に行う。
