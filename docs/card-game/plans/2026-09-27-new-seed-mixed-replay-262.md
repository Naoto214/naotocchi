# 262 ターン終了適用計画

261の六段階証明と260保存state/hashを照合し、02-Bのターン終了と次プレイヤー2枚ドローを既存204遷移で適用する。通常行動3経路はstate/hashを保持。専用テストRED→GREEN、event/snapshot/hash、canonical bytesを確認して保存。続いて3経路の通常選択と02-Bたまご交換を進める。
