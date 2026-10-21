# 196 新seed盤上C-chicken解決

[196 TDD計画](plans/2026-09-25-new-seed-ability-resolution-196.md)。195の連鎖解決入口01-Bで、72本文のC-chicken「あさのおしらせ」を解決。山札上のP-cat_ceoはパートナーで、公開した情報をeventに記録し、なかま以外なので山札上の同じ位置へ保持。盤上C-chickenは移動せず、連鎖を閉じ、通常行動入口へ戻った。他の01-A次優先者と02-A/02-Bターン終了入口は保持。

新decision0、event/snapshot各1、completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用2件PASS、保存JSON一致、設計データerrors空。固定168全proxy478件中477件PASS、唯一のFAILは既知117旧テストの期待190・実際263。196全proxy回帰の結果としては扱わない。
