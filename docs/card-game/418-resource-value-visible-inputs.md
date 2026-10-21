# 418 — 可視情報adapter

415 Task3を実装。自分が知る手札・場と相手の公開盤面・時・そだち・捨て札・予約だけを投影し、相手手札・山札順・相手裏向き準備札の本文/IDを除く。公開表示の証拠がない相手準備札は保守的に伏せ、公開コストが明示されている場合だけ保持する。既存121のfull projectorを戦略入力として無条件に使わない。

専用7/7、比較器14/14、選択wrapper8/8、計29/29 PASS。旧passのcard_copy_idが空文字であることを実データから確認し、passに限る互換性testのRED→GREENで修正。証拠の構造欠落・不明な予約形式・参照外sourceは拒否し、証拠が揃って価値だけ未知なincomparableは116へ渡す。source hashはfresh読込で確認しcacheを導入しない。

114正本・414仕様・原本505 JSON・既存結果・112未実施は保持。新規対戦/event/decision0、独立balance標本0。次は110局面のshadow比較。paired比較・全proxy・最終独立レビューは未完了。実装上の判断はledgerと専用testへ記録。

保存前検査：npm test成功、catalog／既定設計検査errors0、保護505 JSON不変、空白検査成功。source manifestと実装ledgerも保存。
