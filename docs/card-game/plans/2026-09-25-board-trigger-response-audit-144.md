# 144 盤上誘発response分類・現在機会完全性計画

143保存JSON raw SHA `19a2a21d45d9304a8c1cdd1a98859254d5cdda4973dded2b67b6e3d72c4cd8b4` を固定し、未証明01-A/Bの盤上なかまを72本文と現在の配置eventから分類する。119の`triggered_ability` familyへ接続し、手札・盤上・しかけの全familyを現在機会に限って監査する。発動条件が成立する別局面の列挙・ID・解決は対象外。143以前のJSONは変更しない。

1. TDD RED: 現在4候補集合、C-chicken開始時とC-bat相手quick-useの肯定・否定、未登録能力での停止を専用テストで要求。
2. GREEN: カードIDごとの正本本文に接続したtiming分類で、発動元の実際のevent種・ターン主体・現在windowを照合する。経路名や現物IDによる条件分岐はしない。発動条件に未到達なら除外理由を記録する。
3. 143原本のtuple→JSON配列差は原本を改変せず正準bytesで独立再生成一致を確認し、144側の保存再検査を通す。全proxy、設計検査、保護対象、remote保存を検証する。
