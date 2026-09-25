# 185 新seed4経路ターン終了・開始ドロー TDD計画

184の六段階完全監査と183保存stateをraw SHAで固定する。先に専用テストをREDにする。1〜3roundで各経路の終了処理を適用し次の手番へ移し、ターン開始の2枚ドローまで既存01/123/164に従って進める。開始時の盤上なかま・こいびとの条件は72/74の本文から確認し、たまご交換より先に能力を解決しない。event seq、game/continuation hash、snapshot再生成、canonical JSON・設計データを検証してGitHub保存する。
