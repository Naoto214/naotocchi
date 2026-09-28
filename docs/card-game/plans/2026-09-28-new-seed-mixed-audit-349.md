# 349 新seed混合4経路横断監査計画と実施記録

1. 修復済み348保存stateのraw SHA256・正準JSON・各経路のgame/continuation hashを照合する。
2. 01-A連鎖相手、01-B配置後のresponse候補を手札・盤上・条件付き候補から監査する。02-A/BはP-cliff_goatに対応した既存179の通常行動候補完全性検査を適用する。
3. 専用テストRED→GREEN、生成JSON一致、README・報告・計画をGitHub保存しremote HEAD/treeとPR #259を再確認する。

新event0、独立balance標本0。選択は後続チェックポイント。
