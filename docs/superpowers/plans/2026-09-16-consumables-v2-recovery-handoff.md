# PR #274 消費アイテムV2 復旧・引き継ぎ（2026-09-16）

> **2026-09-16 更新:** この文書は復旧開始時の履歴。Task5の再実装とTask6の統合は進み、[最新の検証記録](2026-09-16-consumables-v2-verification.md)へ実行結果を記録している。開始時の「未保存」「未実装」を最新状態と混同しない。PRはDraftを維持する。

## 最初に読むこと
環境の自動整理によりローカル作業ディレクトリと実行中agentが失われた。完成・全体GREEN・PR反映済みとは扱わない。
ユーザーの目的は残り使い切り11品を加え、既に完成済みのラッキーコインと合わせ12品へ統一し、全体検証後にPR #274へ反映すること。Draft維持、mainへマージしない。

- Repository: Naoto214/naotocchi
- PR: #274
- PR branch: chatgpt/items-v2-home-strip-20260915
- この復旧文作成直前に確認したPR HEAD: f94fcedb5e2b648607abcfd9485bdc740e6e8092 (draft=true, merged=false)
- 前回確認main: 3f4bfda0b8c0d30098ebb68c4313abd370a8576a (再確認必須)
- 復旧ブランチ: chatgpt/items-v2-consumables-recovery-20260916
- 復旧コードHEAD: 642cdb2e38e403f159d30997d96d037067cc30d4
- 復旧コードtree: e2b3ba98d45314a34d57a7c82513200b911f2958
- 復旧ブランチはPRへ未反映。Task4まで復旧できる。Task5/6を完了済み扱いしない。

## 正本と計画
この復旧ブランチ内:
- docs/superpowers/plans/2026-09-16-consumables-v2-completion.md
- docs/superpowers/specs/2026-09-16-items-v2-decision-log.md
- docs/superpowers/specs/2026-09-16-items-v2-final-migration-table.md (追加承認section12含む)
- docs/superpowers/specs/2026-09-16-item-shop-copy-v2.md

Task順とTDD RED→実装→GREENを守る。重大な仕様矛盾は勝手に決めない。
今回対象外: Quick最終経済、将来の日次報酬の再設計、非ゲーム系通常コイン源の撤去。日次由来の保存済みboostTicksを初回移行で消すことは追加承認済み、移行後の新規日次付与を毎回消してはいけない。
新価格の差額請求なし。既存通常10種/Gamepass/Star3倍/Lucky完成仕様維持。PNG4枚不変。

## 復旧できる実装・レビュー済み範囲
1. 最終12品カタログ・旧在庫/旧予約/ゆめ在庫の一度きり移行。focused64/64成功、個別レビュー承認済み。
2. 旧使い切り使用経路削除、いのちのくすり/自動おまもり。focused149/149成功。実tick死亡/100歳遷移を追加して11/11、mutation感度検証済み、レビュー承認。
3. 一時姿3品・3候補へんしんチケット・raisedSpecies。forms8/8、関連116/116、消費回避修正後42/42、レビュー承認。
   チケット候補をstate.transformOptionsへ先に入れると通常overlayから無料変身できるため、picker専用状態に分離済み。
4. なかま/レアなかま/おみあい。focused71/71 + dialogue/cast成功、レビュー承認。
   sameLocalHome表示切替ではcalledMatchを消さず、本当の地域移動/交際成立/次人生で解除。
これらは当時の検証結果。現在の全体成功を意味しない。

## 復旧コミット
- 713f7a7377b2de1057d0db43cf3d3907c8d03867 計画と追加承認
- 3dc0ea1ae68fd5a1f329561be07b60f7150c5668 カタログ移行
- d2cfece8c25eb2b1171e861a91be3268696a3c51 移行重複修正
- 6c95b8b77a5b4a940172b0a65b09c7ae75b2dbf4 旧効果削除/いのち
- 46a847838c52de358a4c06fb02813ed5995044bd 実tick回帰
- ada00427066f0c37b5db9c6d8d36c30ebf32bce7 姿変更/変身
- be0cc3246091702127a179dcecaf9f857d177c2e 変身消費回避修正
- 01f4b5348f2a4a068548090b66cf5a47ff888d3f 出会い
- 642cdb2e38e403f159d30997d96d037067cc30d4 おみあい保持修正

## 失われた/未確保範囲
Task5たまごはローカルccbe46efaf86a11710b7a8e3e55c4aab8078b0f1で実装、focused115/115と個別レビュー完了報告があった。
ただしGitHubへそのコミット保存を確認できず、ローカルは消失。復旧ブランチには含まれないので再実装・再検証が必要。
Task6 browser/full統合は開始していたが完了報告なし。作業ファイル・テストログは失われ、結果未確認。
新全体test、ブラウザ、最終全差分レビュー、PR反映、最新CIは未完了。

## Task5再実装で重要
- 新c_egg_normal/c_egg_rareの在庫から、experiencedSpecies未経験の通常/レア種族を別々にランダム予約。ren除外。
- 予約はnextEggLine/nextEggKind、一件のみ。予約時消費せず、取消は情報クリアのみ、成功孵化で一度だけ1個消費。
- 有効かつ在庫のある旧予約種族は、経験済みでも尊重。未払い/不正予約で指定孵化しない。
- 孵化後再呼出による二重消費を防止。reload/reset/infinite継続。
- 旧ゆめUIは新共通予約helperへ。旧自由種族pickerを残さない。
- 節目の旧dreamEggsへの付与を新stockへ。節目そのものは対象外なので消さない。
- Task3のclownfish-romance-testは途中整合用に旧+新の両在庫と即孵化fixtureになっている。新stockだけ＋現実の温め5回へ戻す。
- Task5旧レビューminorは「dying警告中に卵予約可能」と「stage farewellでは不可」の混同の可能性がある。正本を確認し、勝手に新制限を追加しない。

## 実装判断の記録
Ruling: ライブ/無限復帰控えの同じミニゲーム予約でsmallとbig/greatRewardが食い違う場合、最上位の証拠1件だけ返金する。同じ病気予防状態のどちらかに1/2回残の使用証拠があれば効果返金なし。
理由: 一件予約を重複返金せず、使用済みを返金しない。

2026-09-16 補足: 上記は同じ予約欄のライブ／復帰控えの食い違いに対する判断。旧PR HEAD f94fcedの実コードでは `c_mgsmall` と `c_mgbig` を順に使うと両方が成功し、同一状態に `minigameBoost:small` と `greatReward:true` が成立する。この場合は別々に購入・引落済みの未発動予約2件なので40+120=160を返金する。`minigameBoost:big` と `greatReward` の同一大予約、および同じ状態の復帰控えは二重計上しない。仕様変更ではなく、全未使用予約を旧価格で返金する既存方針への修正。
誤っていた場合のコスト: 矛盾した旧保存の補償額が元の購入と異なる可能性。在庫自体の旧価格返金は別扱い。

## Task6以降
- Task2 reportが.superpowers/sdd/以下へ誤ってtrackedになっている。git rm --cachedでindexから除外、作業reportはローカル保持。成果の検証記録はdocsへ。
- 既存item-experiences等の旧fixture期待値を新仕様へ修正、無関係な検証を消さない。
- 新5runtimeテストとaffectedfocused→npm test→実ブラウザ320/390→個別/全差分review。
- Quick moleLv4失敗ならf94fced基準で同条件比較し原因切分け。単純リランで済ませない。
- Browserはpublicsave/UI、固定時計をgoto前に設定、旧保存注入は次documentのone-shot addInitScript。beforeunloadに同page注入を上書きされないようにする。
- ローカル旧driver/browser-runtimeは失われた。環境の既存Playwright/ブラウザを確認して再構築。CI Home layoutはChromium/WebKit・job10分。
- PR本文は古いStar10倍/旧HEAD等が残る。検証後、Star3倍/通常10/使い切り12/未対象Quick日次を正確に更新。
- レビュー済み全体を元PRブランチへfast-forward。forceなし。Draft/未マージ維持。
- Git直接pushは以前認証不可、GitHub git-dataでblob/tree/commit作成しツリー一致確認、update_ref force=falseを使用した。SHAはローカルと変わるがtree同一。
- 最終報告: 変更ファイル、主要SHA、focused/full/browser/CI、移行とGamepass除外、Draft未マージ。

## 確定PNG blob SHA (assets/items/normal-equipment/)
bento-box.png f02296e488dcf7b19b96b1b56cf9db5e67629423
toy-box.png fc601ae0292158e401239231fc9c319eaeb1ce1d
first-aid-box.png fad04de9e1bc740863b18b90c328295718d8b8fa
game-pass.png 903c482ce593e7869bc6f39b5c1d72b2e4da9642
