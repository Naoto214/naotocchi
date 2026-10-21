# 208 新seed次優先者response監査 TDD計画

207選択stateのraw SHAを固定。3経路の次優先者は盤上誘発と手札条件、G-animal-shogiの捨て札なかま対象を監査して候補完全性・唯一passを検査する。01-Aの選択済み盤上C-chickenは一般ID・源・起動条件・未公開山札を照合して効果未解決のまま保持。テスト先行RED、候補改変拒否、eventなし、canonical JSONと設計データを確認してGitHub保存。
