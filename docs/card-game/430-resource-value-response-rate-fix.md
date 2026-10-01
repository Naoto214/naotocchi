# 430 — 反応専用fallback率の修正

429 HEAD `44f9c5df1faeeda62d0f267a2948c09d156f1f28`、tree `f1978c0ee3d835996f500c5af113b69dab0efe49`から継続。最後の実データschema照合で、反応専用resolution mode25件が反応fallback率へ入っていなかったことを検出し、canonical反応記録の再現テストをRED→GREENにした。通常判断の率・選択差・subset差は変更しない。

全8経路の反応判断は257件（unique230・seeded25・priority_unique2）。mandatory seeded61、通常判断85件とは母数を分ける。response_pass239＋発動18と反応判断257の対応も照合した。発動と解決をプレイへ二重加算しない。停止後の最終そだち/winnerはnullのまま。

[430評価JSON](data/proxy-resource-value-pilot/evaluation-checkpoint-430/evaluation.json) / [署名manifest](data/proxy-resource-value-pilot/evaluation-checkpoint-430/manifest.json) / [追加照合と修正記録](data/proxy-resource-value-pilot/verification/final-response-rate-fix-430.md)。428/429評価と原本は書き換えない。

前の全proxy912件は修正のため未完了として中断記録を保存し、次の新runへ合算しない。独立レビューは1回、重要指摘2件修正と追加の反応schema修正を同じ最終修正工程で完了する。97件専用検査とnpm/catalog/既定検査、505原本照合の最終結果を保存後、新しい913件全proxyを開始する。専用97/97 PASS（86.907秒）、npm exit0、catalog/既定errors0、原本505変更0、空白検査成功。この430は修正後の復旧checkpoint。

114正本・112未実施・独立balance標本0・PR259 Draft/open/未マージを維持。全8軌跡は検証済みの真正停止であり、完了ゲームの比較・カード強度・方針採用の根拠にしない。
