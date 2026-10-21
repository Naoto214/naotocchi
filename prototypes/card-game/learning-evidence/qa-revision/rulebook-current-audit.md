# Current rulebook content audit

Canonical documents 01, 02, 06 and the normative portion of 07 (before the historical test-deck marker) were read in full. Historical source files and generated SOURCES text remain unchanged. CURRENT_RULINGS is the only display/search corpus for detailed rules.

## Current-policy reconciliation

The user’s current policy makes all 452 playable cards available from the start for viewing and deck building; the 453rd collection entry is the deck-excluded normal egg. This supersedes discovery/unlock wording in historical 01 コンセプト and 02 たまご／たんじょう, without editing those historical documents. Approval logs, development continuation notes, proposed/test-deck content and design-only paragraphs are excluded. Operative exceptions and procedure order remain in current rulings.

## Person placement verification

engine.mjs legalActions uses one personUsed flag for companions and partners, both base cost 0; place marks that shared flag. Relationship progression uses separate relationshipUsed and base cost 1, requires main and partner, and follows its own per-turn restriction. Full catalog inspected: おともだちチケット (I-c_friend) searches into hand; it does not deploy a person. No verified person-deployment exemption was found, so no generic exemption is taught. Concrete examples use actual names ただのはこ (C-box) and がけのヤギさん (P-cliff_goat). Engine/rules/card effects were not changed.

## Coverage

### 1. CARD GAMEとは

- rule-01-1: docs/card-game/01-core-rules.md → コンセプト
- rule-01-3: docs/card-game/01-core-rules.md → 7種類
- rule-02-15: docs/card-game/02-main-system.md → 8段階／固有能力【確定方針】
- rule-02-16: docs/card-game/02-main-system.md → 8属性【確定】
- rule-02-17: docs/card-game/02-main-system.md → 固定属性相性なし【確定】
- rule-02-18: docs/card-game/02-main-system.md → 属性は能力を独占しない【確定】
- rule-02-20: docs/card-game/02-main-system.md → げんそう／ふしぎの差【確定】
- rule-02-21: docs/card-game/02-main-system.md → みずべ／うみの差【確定】

### 2. ゲームの目的・勝利条件

- rule-01-15: docs/card-game/01-core-rules.md → そだち
- rule-01-16: docs/card-game/01-core-rules.md → 勝利

### 3. 40枚デッキの作り方

- rule-01-2: docs/card-game/01-core-rules.md → デッキ

### 4. 盤面の見方・3×3フィールド

- rule-01-17: docs/card-game/01-core-rules.md → 盤面

### 5. たまご状態・ドロー・返却

- rule-02-2: docs/card-game/02-main-system.md → たまご状態と周辺カード【確定】
- rule-02-3: docs/card-game/02-main-system.md → たまごと未解決のこいびと能力（93の接続明文化）
- rule-egg-start: docs/card-game/02-main-system.md → たまご／たんじょう

### 6. たんじょう

- rule-02-1: docs/card-game/02-main-system.md → たまご／たんじょう

### 7. ときおくり・へんしん

- rule-02-4: docs/card-game/02-main-system.md → ときおくり【効果・処理確定／名称暫定】
- rule-02-5: docs/card-game/02-main-system.md → へんしん【確定】
- rule-02-6: docs/card-game/02-main-system.md → 通常のメイン移動の実行時点【確定】
- rule-02-7: docs/card-game/02-main-system.md → メイン移動のカード文語彙【確定】

### 8. 時コスト・通常行動

- rule-01-4: docs/card-game/01-core-rules.md → 通常行動と反応【確定】
- rule-01-12: docs/card-game/01-core-rules.md → 時
- rule-01-23: docs/card-game/01-core-rules.md → 初期時コスト基準
- rule-06-1: docs/card-game/06-action-chain-checkpoint.md → 通常行動・発動の開始手順【確定】

### 9. なかま・こいびと・交際・結婚

- rule-01-18: docs/card-game/01-core-rules.md → なかま
- rule-01-19: docs/card-game/01-core-rules.md → 満員交代の手順（93の未記載境界補完）
- rule-01-20: docs/card-game/01-core-rules.md → こいびと
- rule-01-21: docs/card-game/01-core-rules.md → 交際の開始・進行・結婚の区別（66の接続整理）
- rule-06-4: docs/card-game/06-action-chain-checkpoint.md → 交際開始・進行後の反応（66の接続整理）
- rule-person-example: docs/card-game/01-core-rules.md → こいびと

### 10. セカイ・あそび・アイテム・できごと

- rule-01-5: docs/card-game/01-core-rules.md → アクションカードのプレイ【確定】
- rule-01-22: docs/card-game/01-core-rules.md → セカイ

### 11. すぐつかう・みにつける・しかける

- rule-01-6: docs/card-game/01-core-rules.md → みにつける語彙【確定】
- rule-01-7: docs/card-game/01-core-rules.md → しかける語彙【確定】
- rule-preparation-slots: docs/card-game/01-core-rules.md → 盤面

### 12. ちょうせん（ちから・ちえ）

- rule-01-24: docs/card-game/01-core-rules.md → 勝負
- rule-02-10: docs/card-game/02-main-system.md → ちから／ちえ【確定】
- rule-02-11: docs/card-game/02-main-system.md → ちょうせん【確定】
- rule-02-12: docs/card-game/02-main-system.md → 勝負中に参加メインが場を離れた場合【確定】
- rule-02-13: docs/card-game/02-main-system.md → ちょうせんのカード文表記
- rule-02-14: docs/card-game/02-main-system.md → 得点と挑む判断
- rule-06-16: docs/card-game/06-action-chain-checkpoint.md → ちょうせんの開始・結果・途中終了との接続【確定】
- rule-06-17: docs/card-game/06-action-chain-checkpoint.md → 宣言から結果まで
- rule-06-18: docs/card-game/06-action-chain-checkpoint.md → 途中終了と、処理を残す範囲
- rule-06-19: docs/card-game/06-action-chain-checkpoint.md → 終了と完了

### 13. 応答・チェーン・逆順解決

- rule-01-8: docs/card-game/01-core-rules.md → 発動／解決／効果の適用【確定】
- rule-01-9: docs/card-game/01-core-rules.md → 対象の決定【確定】
- rule-01-11: docs/card-game/01-core-rules.md → 効果の無効／発動の無効【確定】
- rule-06-3: docs/card-game/06-action-chain-checkpoint.md → 条件／コスト／効果【確定】
- rule-06-5: docs/card-game/06-action-chain-checkpoint.md → コスト／効果で起きた出来事の参照【確定】
- rule-06-6: docs/card-game/06-action-chain-checkpoint.md → 反応機会・パス【確定】
- rule-06-7: docs/card-game/06-action-chain-checkpoint.md → 通常行動の完了後・元の処理への復帰【確定】
- rule-06-8: docs/card-game/06-action-chain-checkpoint.md → 強制発動／通常任意発動／しかける【確定】
- rule-06-9: docs/card-game/06-action-chain-checkpoint.md → 同じタイミングで複数条件成立【確定】
- rule-06-10: docs/card-game/06-action-chain-checkpoint.md → 解決中に新しい発動条件が成立【確定】
- rule-06-11: docs/card-game/06-action-chain-checkpoint.md → 同じ能力が解決中に複数回条件成立【確定】
- rule-06-13: docs/card-game/06-action-chain-checkpoint.md → 「対象にする」と「選ぶ」【確定】

### 14. ターン終了・ラウンド進行

- rule-01-13: docs/card-game/01-core-rules.md → 10ラウンド＝100歳
- rule-01-14: docs/card-game/01-core-rules.md → ターンの開始と終了
- rule-06-22: docs/card-game/06-action-chain-checkpoint.md → 開始・終了という出来事と発動機会
- rule-06-23: docs/card-game/06-action-chain-checkpoint.md → ターン開始
- rule-06-24: docs/card-game/06-action-chain-checkpoint.md → 適用済み予約の自動実行
- rule-06-25: docs/card-game/06-action-chain-checkpoint.md → ターン終了
- rule-06-26: docs/card-game/06-action-chain-checkpoint.md → 期限・履歴の読み方

### 15. 特殊な状況・よくある質問

- rule-01-10: docs/card-game/01-core-rules.md → 一部が実行不能な効果【確定】
- rule-02-8: docs/card-game/02-main-system.md → メイン除去【確定方針】
- rule-02-9: docs/card-game/02-main-system.md → メインが捨て札へ行く原因の区別【確定】
- rule-06-12: docs/card-game/06-action-chain-checkpoint.md → 回数制限の共通語彙【確定】
- rule-06-14: docs/card-game/06-action-chain-checkpoint.md → 発動条件と空撃ち【確定】
- rule-06-15: docs/card-game/06-action-chain-checkpoint.md → 適用済みの期限付き・遅延効果と発動元の離脱【確定】
- rule-07-1: docs/card-game/07-advanced-rules-checkpoint.md → ③ 数値変更の重複【確定】
- rule-07-2: docs/card-game/07-advanced-rules-checkpoint.md → ④ コピー【確定】
- rule-07-3: docs/card-game/07-advanced-rules-checkpoint.md → ⑤ 置換【確定】
- rule-07-4: docs/card-game/07-advanced-rules-checkpoint.md → ⑥ 防止【確定】
- rule-07-5: docs/card-game/07-advanced-rules-checkpoint.md → ⑦ 置換・防止と連鎖【確定】
- rule-07-6: docs/card-game/07-advanced-rules-checkpoint.md → ⑧ すでに有効な「～ならない」と発動条件【確定】
- rule-07-7: docs/card-game/07-advanced-rules-checkpoint.md → ⑨ 「～なる時」と「～なった時」【確定】
- rule-07-8: docs/card-game/07-advanced-rules-checkpoint.md → ⑩ 領域移動【確定】
- rule-07-9: docs/card-game/07-advanced-rules-checkpoint.md → ⑪ カード本文と基本ルールの優先関係【確定】

## Validation

- New rulebook-current.test.mjs: initial four checks failed for missing CURRENT_RULINGS/searchRules; added provenance/editorial checks failed for combined non-existent headings and a remaining approval sentence; all five now pass.
- Existing learning.test.mjs rulebook-only case passes, including historical source byte equality and search isolation.
- Generator rerun is byte-for-byte reproducible.
- Full tutorial integration and repository-wide regression are run by the coordinating agent after shared edits complete.
