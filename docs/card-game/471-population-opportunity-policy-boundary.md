# 471 誘発機会・開始効果の条件付き検証と選択単位の承認境界

470の連続runtime接続後、06の全判断機会を接続する途中で、**同区分の通常任意誘発をどの単位で選ぶか**が既存契約から一意でないことを確認した。これは1phaseの完了checkpointではなく、ユーザー判断を要するpolicy境界である。preflight-readyはfalse。400戦のseed生成・入力固定・開始は0。

## 共通部品の検証範囲

|部品|追加した条件付き検証|未証明／未接続|
|---|---|---|
|opportunity ledger|06の4区分、現物とorigin別の機会、見送り、chain終了までの繰越、journalのcanonical再構成|供給occurrence自体の完全性・実際の支払い・選択policy|
|start obligations|107の41 IDと本文hash、開始時の現物、C-chicken/I-bowtieの公開条件、後から来た発動元の拒否|実際の開始eventからのcapture認証、予約／移動を伴う開始|
|boundary response|既存効果の最終link後に開始／終了の反応機会を戻す。外側linkと効果判断を保持|実origin認証、後続誘発を終えた証拠、runtime接続|
|activation reference|発動前envelopeへ結び付けた参照記録。発動元の合法な離脱後も同じ旧個体への参照を保持|receipt単独は真正な発動証明でない。entry replay・再登場個体管理は未接続|
|start effects|196の既存C-chicken公開／分類／条件付き移動を再利用。外側連鎖を保持。空山札で新しい禁止・敗北を作らない|発動候補／選択／処理境界の全体認証|

これらはopt-inの条件付き部品と合成unit testであり、470実行版を置換していない。全判断機会網羅、戦略的解決、balance算入を主張しない。現物同値化、点数、期待値、有限先読みは追加していない。

196は単一linkの古い所在検査を持つため、外側の物理quickを私的projectionのdiscardへ置いて既存効果を呼ぶ。その効果が参照・変更するdeck/handだけを実stateへ戻し、投影discard／連鎖／処理境界を実stateへコピーしない。実際の全連鎖stateに対してevent・snapshot・hash・所在を再検証する。開始後の反応再開は別のboundary adapterであり、この効果を二度解決しない。

## 承認が必要な点

[比較詳細](data/proxy-population-opportunity-ledger/selection-boundary.md)。06は合法な順序と見送りを定めるが、比較不能時の抽選単位を定めない。116の汎用seed機構、119の通常反応、463の指定mandatory policyを確認しても一意には決まらない。

- **A（推奨）**：全合法な次発動actionと残群見送りから逐次選ぶ。毎回、対象／コストと残群の合法性を再確認する。既存116を使う場合は戦略未解決・除外を維持する。
- **B**：合法な発動部分集合と積む順を一括で選ぶ。合法な列全体の列挙・検証が必要で、Aと抽選分布が異なる。

これは旧116の除外条件を緩和する提案ではない。463〜465の指定範囲へ誘発順序を追加する承認も求めていない。通常行動・response等の既存適格性審査、全予定集合に除外／未証明が残れば結論保留、適格部分は診断限定を維持する。A/Bのいずれでも400戦全体の適格性は保証しない。

## 残る大きな接続

選択単位確定後、実event由来の群生成・実発動・後続誘発とentry replayを接続する。その後、再登場個体／期限・予約／100到達維持、未接続の正条件handler、実行版source manifest、判断・対戦・鏡像審査、469入力真正性／lockと最終preflightを接続する。470の固定合成入力によるR10完走を、これらの網羅証拠として流用しない。

## 保存・検証

検証ログと最終集計は[data/proxy-population-opportunity-ledger/verification/](data/proxy-population-opportunity-ledger/verification/)に保存する。専用16件はREDを経てPASS。population関連114件（専用を含む）PASS、npm406件PASS、設計データ検査errors=[]。独立レビューは1回のcycleで行い、Critical0／Important0／Minor1（計画がA採用済みと読める表記）を記録し、同じcycleで修正確認、未解決0。全proxy回帰の今回再実行は行わず、468での実測結果を今回の結果として数えない。旧保護正本・過去結果・114/116/454〜470・新方式未採用を維持する。停止中のバックグラウンド作業は行わない。
