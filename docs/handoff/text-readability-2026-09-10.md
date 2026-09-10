# 全表示文言修正の引継ぎ（2026-09-10・最新main統合後）

文言本体と最新mainの統合を実装・検証済み。**PR #234は未マージ・未公開。全体開発は未完了。** 確定HEAD・tree・CIのrunは[PR本文](https://github.com/Naoto214/naotocchi/pull/234)を参照し、再開時は最新main・open PR・本文・コメントを実際に確認する。

- ブランチ：`feature/text-readability-20260910`。統合前HEAD `21844921f76a3da504302cfc26c23be70d81e967`にmain `927456d1c3bea2897f1526268d8a8d05742a8356`（#233・#232マージ済み）を取り込んだ。旧#92は未取込。
- 新しい作業環境はGitHubの実履歴を持つ `/workspace/scratch/672c8ab7b12b/naotocchi-text-integration`。以前の再構築ローカル履歴は使用していない。PRの既存履歴を残すマージコミット。
- games.js・script.js・index.html・minigame-lifecycleテストの競合を解消。#233のdrawPropと読込、#232のAI反撃・育成／睡眠・報酬・日常／中年／留守イベント・図鑑／旅・ゲーム時間・安全処理を保持した。
- #232の追加文言も承認済み方針で点検。おまもりの実効果、得点と記録の違い、報酬内訳、成長時間上限、保存／書出しの限界を正確にした。数値、入力、ID、素材、保存済みの名前や思い出は変更していない。
- 最新ローカル全体テストは**Node214件成功、失敗・skip・cancel0**、既存smoke・会話・QAも成功。8経路の追加実行、318素材、JSの数値／キー、HTML構造、16キャッシュ参照を確認。独立レビュー承認、未解決の重大・重要指摘0件。
- [文章方針](../TEXT_STYLE.md)／[統合QA](../qa/text-readability-integration-2026-09-10.md)／[JSON](../qa/text-readability-integration-2026-09-10.json)／[全体テスト](../qa/text-readability-integration-2026-09-10-tests.txt)／[独立レビュー](../qa/text-readability-integration-2026-09-10-review.md)。初回179件とCI#323の記録は履歴であり、最新main統合後の証拠ではない。
- `package.json`、CI、runtime-harness、visual-qa、prop-illustrations.jsは統合mainとバイト一致。全テストと追加JS登録を保持。
- 新旧デート記録は末尾4種類を比較時だけそろえる既存処理を保持。保存済み文章・人物名・旧キャラは一括置換しない。
- 実画面は0件。公式ブラウザーは接続・タブ取得まで成功し、確認URLへの移動で`net::ERR_BLOCKED_BY_CLIENT`。狭幅・iPhoneタッチ／音／FPS・ムービー描画・公開配信一致は未確認。
- 残る保存やアイテムの挙動上の制約は統合QAの末尾に記載。文言だけで修正済みの機能とは扱わない。マージ・公開は今回の依頼で禁止されているため行わない。
