# 196 新seed盤上能力解決 TDD計画

195の4保存状態・raw SHAを固定し、01-Bの盤上C-chicken単一連鎖だけを解決する。72本文・119連鎖と142/155の逆順解決を照合する。TDDでは山札上が非なかまの場合に公開情報をeventへ記録し、山札・手札・盤上源を保持して通常行動へ戻すことと、改変hash拒否を先にREDにする。残る3経路は保存state/hashを保持する。全event/snapshot/hash、canonical JSON・設計データを確認し、保護対象に触れずGitHubへ保存する。
