# 154 新seed選択済みquick item連鎖起動 TDD計画

1. 153保存JSONのraw SHA・再生成・event/hashと、02-Bで選択済みのB I-c_coin2を検査する。
2. RED: 01-A/Bの状態非変更、02-Bの時1支払・手札現物からactivation zoneへの移行・2リンク・pass reset・新event1を先にテストする。
3. 77のI-c_coin2本文、114の手札quick item登録、119の連鎖activation遷移を照合し、142と同じリンク形式で起動する。カードcopyや経路IDによる処理分岐は作らない。
4. 次のresponse候補と逆順解決を先回りせず停止する。専用・設計データ・全proxy・差分と保存JSONを検証してGitHubへ保存し、次checkpointへ継続する。
