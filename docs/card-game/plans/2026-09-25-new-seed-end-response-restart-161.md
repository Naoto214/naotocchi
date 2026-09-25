# 161 TDD計画：新seedターン終了response

160のraw SHAと再生成一致を入口とする。ターン終了前responseの3経路について、06・119・144・158に従い、現在のイベントと盤上誘発条件を照合した候補完全性を確認する。唯一の`response-pass`を専用IDで記録し、双方の連続passにより`turn_end`へ遷移する。既に終了入口の02-Aは変更しない。

REDは4経路と連続hashの専用テストから始める。GREENでは158の一般候補列挙・pass遷移を再利用し、source raw、event seq、game/continuation hash、snapshot、canonical bytesを再計算する。カード変更とbalance標本への算入は行わない。ターン終了の履歴出所は次の独立監査へ残す。
