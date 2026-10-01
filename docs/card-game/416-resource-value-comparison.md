# 416 — 別版パイロット比較器

415 Task1の純粋比較器を実装。上位3項目を保持し、残り時・手札・盤面・予約の4成分から証明済み優越graphとfrontierを計算する。有料の誕生等を時だけで除外せず、誕生の加点・強制はしない。非一意frontierは次工程で116へ渡す。まだ対戦を実行しない。

専用13件PASS。新module欠落のREDと、不正な安全証明IDの型が例外を起こすREDを記録してGREENへ修正した。部分同値を先にtie-breakしない、優越循環を拒否する、安全な無料配置対passの証明を他候補へ拡張しない、入力/返却objectを共有しないことを検査した。

414仕様・114正本・原本505 JSON・112未実施fixture・過去保存結果を保持。productionの追加は新比較器のみ、既存tool/testの変更なし。新規対戦/event/decision0、独立balance標本0。全proxy回帰は未実施。PR259 Draft/open/unmergedを維持する。

実測ログは[data/proxy-resource-value-pilot/verification](data/proxy-resource-value-pilot/verification/)に保存。415の後続Task2〜7は未完了で、次に116選択wrapperを実装する。

保存前検証：npm test成功、catalog／既定設計検査exit0・errors0、current AST inventory829（実行PASS数ではない）、保護505 JSON不変、空白検査成功。
