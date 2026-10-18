# Relationship Expression 全量画像制作

開始HEAD: a8b7e9894b2124946983a4dfa92870a6c20d6af6

2026-09-30 人間指示: pilot8枚を目視承認。残り40体80枚の制作・単体QA・hash監査・テスト・専用branch保存を承認。main merge禁止。

Ruling: 過去のpilot8枚停止制約は今回の明示承認により80枚制作について解除。runtime allowlistの全量展開は今回行わない。

保護: 既存画像3350件（pilot8枚を含む）、normal、通常31系統、なおと。既存8枚再生成0。

Home本人表示QA（クマ／タコ含む）と既存Homeブラウザー回帰は未完了。全量制作後にも必須。pilot画像承認はHome承認を意味しない。

対象: なかま24体・こいびと16体。companions/kinoko.pngは今回の26体正本に含まれないため対象外。

## 制作・単体QA結果

新規80枚（なかま24体48枚、こいびと16体32枚）。既存pilot8枚と合わせ44体88枚が存在する。全画像128×128 RGBA、positive/lonely各1枚。normalは既存参照。

同一個体性、身体、顔、付属物、色、透過、意味、128px自然さを全80枚で確認し、単体QA GREEN。104/80pxは静的比較で確認。長身・小顔・非動物キャラの表情差は小表示で控えめで、実Homeでの可読性は未確定。64pxは致命的崩れなし。微細情報の完全保持は要求しない。新規80枚の人間目視承認は未取得。

対象限定修正2枚: snail/lonely（頬への余分な目を除外し触角先端2眼を維持）、snow_spirit/lonely（衣装に埋もれた両手を回復）。初回不採用候補はassetに含めない。他の自然な微細差は均していない。

透過監査: 3枚の外周に縮小処理由来のalpha 10未満の微弱なリンギングがある。alpha 10以上の可視身体は全80枚で余白内。切断・不透明背景なし。余白判定はこの区別を記録し、画像は加工していない。

SHA-256: 既存3,350画像すべて不変。新規画像集合は指定80枚と完全一致。pilot8再生成・変更0。各hashは full-images JSON参照。

## 未完了・次工程で必須

- クマ／タコ本人を含む実Home表示QA。
- 既存Homeブラウザー回帰。
- 全量画像制作後の上記2検証と新規80枚の人間目視承認。

この環境では前工程からブラウザー起動が制約で停止している。静的縮小比較やNodeテストを実Home QAの代用とはしない。全量Home GREEN・全体承認とは報告しない。

runtime allowlistはpilot4体のまま。残り40体の接続、結婚、減衰、save schema、migration、通常31系統resolver等の変更なし。main/design branch/PR #278変更なし。

## テスト

npm test: exit 0。既存Runtime 2,788 PASS / 0 FAIL + Relationship pilot 14 PASS / 0 FAIL = 2,802 PASS / 0 FAIL。smoke/dialogue/visual QAテストもコマンド連鎖完走。これはNode/harness検証であり実Homeブラウザー回帰ではない。

独立レビュー: 既存3,350 hash不変・新規80枚の集合/形式/hash一致、128/80px全体比較でblocking issueなし。実Homeの小顔可読性確認は未完了のまま。

保存直前main: dd50ce4bc7b2bef1952ca52ab6157579598aacc1。開始時main 6b67591967645e7b022fbe6df65ac9c60dc9f1c8から2コミット進行。取り込みなし。今回保存前pilotはahead6/behind2、今回1コミット追加後はahead7/behind2の見込み。テスト対象はpilotの開始HEAD+今回の画像/資料で、mainの新規2コミットとの統合テストは未実施。

確認用: relationship-expression-full-review-20260930.html（normal/positive/lonely × 128/104/80/64px）、full-images JSON（80枚hash）、full-prompts JSON（制作指示・修正理由）。
