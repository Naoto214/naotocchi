# 169 TDD計画：開始時response次優先者

168保存raw SHA、各decision/event/hashと現在stateを入口とする。初回passの3経路について、priorityが移った相手の手札quick-use・盤上なかま・こいびと・準備枠を119/138/144/74の既存本文で再監査する。02-Aは選択済みI-c_coin2の現物・時・山札と連鎖が空という起動前境界を検証する。

REDは3件の唯一passと1件のitem境界、改ざん拒否の専用2テスト。GREENは新event0で候補・除外理由・保存state/hashをJSON化する。169ではpass適用やitem起動を行わない。
