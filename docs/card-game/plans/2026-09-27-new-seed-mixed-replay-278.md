# 278 再生計画

1. 277の選択、276の候補監査、275の保存stateとhashを照合する。
2. 01-A・02-Aのresponse pass、01-Bの証明済み終了と次手番ドロー、02-BのC-box無償配置を適用する。
3. 各event・snapshot・前後hashを保存し、RED→GREEN、専用テスト、canonical一致を確認する。
4. GitHub保存後にremote HEAD/treeとPR状態を再取得し、次局面を監査する。
