# 400戦preflight継続・2026-10-07引継ぎ

GitHub `Naoto214/naotocchi` / `design/card-pool-master-20260914` を正本にする。最初にfresh remote HEAD/treeとPR259 Draft/open/unmergedを確認し、remoteが進んでいれば最新を採用。対象はdocs/card-game/だけ。main・frontend・World/Character 3Dは変更しない。基盤を作り直さない。

まず data/proxy-population-effective-application/status.md の末尾、plans/2026-10-06-effective-application-to-preflight.md、verification/{hand-bundle,board-bundle,response-bundle,response-board}-* のreviewを読む。過去ログを会話へ展開し直さない。

## 最新実装

通常core/手札15種/能動盤上のpredicateと供給unit対応、response通常手札13種と能動盤上predicateを実入口へ接続済み。現在源・対象・cost・variant・時・履歴・回数・priority actorを照合。E-bossのmain離脱後の当該ターン敗北履歴を維持する修正も保存済み。効果・選択は既存処理を再利用。最後のbundleはpreparedをcapability照会前に未証明へ分離する補強を含む。

最後の検証：関連28PASS、統合24PASS（123.873s）、独立review C0/I0/Minor2対応後の最終関連29PASS（13.747s）。統合24はprepared分離順変更前、最終関連には実入口を含む。設計errors=[]、番号付きtop-level保護476件不変。87638396の1630全proxy/406npmは旧版のみ。局所一致・同じ実行器の再構成を完全合法性/情報利用/全機会の別実装証明へ昇格しない。

## 次の作業・未完了

preflight-ready=false。事象依存response/手札反応/予約、実際に使用する許可情報、比較operand根拠、全判断・自動処理機会を共通責務で接続。結果前remote lockと外部生成/実行承認gateも未完了。既存generation entry/package、edition、attempt runner、supervisorを再実装しない。非空approval_referenceは承認認証ではない。remote fresh照合gate案はまだ未実装。

既存正本から一意に進む実装はinline逐次TDD。安全な大区切りで検証、変更bundle末尾に独立レビュー1回、commit/push、fresh remote確認して次工程へ。小検査や保存だけを終了理由にしない。

## 保護・承認境界

- 既存107デッキ、独立初期順200組×先後鏡像2＝予定400行を維持。結果後に追加/削除/差替えしない。
- seed生成・本番入力固定・400戦開始は未実施/未承認。preflight-ready後に生成/固定を確認。完全manifest保存後も開始前に別途最終確認。
- 114/116/119、過去結果、保護正本を維持。旧116は除外。唯一候補/非fallback/再現一致だけで算入しない。除外/未証明が残れば全体結論null、適格部分は診断限定。
- 指定mandatory policyのみ完全合法集合から事前固定1/N。初期順seedとpolicy root分離、鏡像初期順共有/policy乱数分離。strategic_unprovenとpolicy_eligibleを区別。通常/response/指定外へ許容を広げない。
- 同時任意誘発は合法な次の発動＋残り見送りを逐次選択し再列挙。474B：実増加0かつ他の実効部分なしは適用なし、履歴は保持。じんとり発動時7枚以上は114/127確定、解決時6枚0と両立、再質問しない。
- 新方式414/A未採用、policy promotion=false、独立balance標本0。未知を0/同価値にしない。新価値点数・期待値・任意優先順位・有限先読み・現物同値化を追加しない。

このcheckpointはタスク完了ではない。テスト編集の誤挿入を修正・再検証したが、このタブの編集精度低下を認め、ユーザーの品質優先ルールに従い新タブ移行を提案した。稼働中テスト/対戦やバックグラウンド処理を残さず停止する。
