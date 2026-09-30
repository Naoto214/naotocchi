# 404 R9のAターン・開始時なかま能力とコインの2連鎖

[404計画](plans/2026-09-30-new-seed-mixed-replay-404.md)。403のremote HEAD `e3316cbdc9aee5cfd05b06b99fd4cd7ebbb471f6`・tree `d22ca3498712e61a82b98b1ec4e88846f8829dd6`と保存state raw SHA256 `0c385e99ebc38392b1845e0eda9b34aff640eaf404e14da5b548e6265f76b436`を再取得・照合して再開した。

[監査JSON](data/proxy-new-seed-mixed-audit-404-20260930.json) raw SHA256 `2faaf0fe1e94844c2fb797bf7d909384adc211179785010d35d9287c1df9dc10`。[保存state](data/proxy-new-seed-mixed-replay-404-20260930.json) raw SHA256 `567fc388da16f10b7cc036e78dfb78cf7842d9b700e066aa68e9279d0000bdc2`。

| 経路 | 再生内容 | 次局面 |
| --- | --- | --- |
| 01-A | Aの交換、開始時3候補からseeded pass、通常pass、終了・Bドロー（7 event） | seq149、R9、Bのたまご交換 |
| 01-B | Aの交換、開始時C-chicken起動、次応答でコイン起動、2pass、コイン→C-chicken逆順解決、通常pass、終了・Bドロー（11 event） | seq162、R10、Bのたまご交換 |
| 02-B | Aの交換、開始時C-chicken起動・2pass・能力解決、通常pass、終了・Bドロー（9 event） | seq159、R10、Bのたまご交換 |
| 02-A | Aの交換、開始時C-chicken起動・2pass・能力解決、通常pass、終了・Bドロー（9 event） | seq148、R9、Bのたまご交換 |

01-A/Bの開始時候補は一般stable IDのC-chicken能力、response-pass、response-use-item-A-033#1の3件を完全列挙した。01-Bの能力起動直後は既存142投影遷移で優先者A・連続pass0となる。154のアイテム移動・支払いと142の発動遷移を到達済みのC-chicken単一連鎖へ接続し、155の2リンク逆順解決、196の残る能力解決を再利用した。コインはA-011#1（なかま）を山札下へ置き、A-024#1を引く。そだち増加0。C-chickenは盤上に保持し、起動済み個体の再起動を除外した。window_kind=turn_startを維持し、起動域がある間に通常行動用zone検証を適用していない。

通常行動のコインについては131の既存hidden_top_deck条件付き効果証拠と141の確定そだち差0の比較手順を使った。未公開山札上を予測せず、107・114の確定時収支で通常passを選ぶ。116までpipelineを評価し、通常選択はpriority_uniqueのためfallback不要と記録した。応答は既存response seeded fallbackを使い、抽選に全合法候補・seed context/proofを保持した。

新decision24、event/snapshot各36、completed0、独立balance標本0。専用テストRED→GREEN・3件PASS、正準JSON、全中間event/snapshotと前後game/continuation hash連鎖、六段階終了監査を確認。候補漏れ・hash改変の拒否、未公開山札順の置換でseed選択が変わらないこと、コイン→なかま能力の逆順・源領域を専用検査した。過去state/hash・カード本文・数値・登録区分・保護対象は非変更。

全proxy回帰は環境更新で旧process/logが失われ、完了結果未取得。403で個別再現した119/120件数検査errorは既知問題として区別する。117旧期待190/実際263、112 catalog参照も保持。全体GREEN・CI成功は未確認。次は405でBターンをまとめて進め、R10の先手終了と最終比較を既存正本で区別する。
