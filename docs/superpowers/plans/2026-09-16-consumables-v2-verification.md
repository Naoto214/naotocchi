# アイテム再設計V2・復旧と検証記録（2026-09-16）

PR #274はDraftを維持し、mainへマージしない。
この記録は2026-09-16の復旧引き継ぎ文より新しい実行記録。設計正本の未対象フェーズまで実装済みとは扱わない。

## 確認済みの範囲

- 復旧Tasks1–4をGitHubから取得し、完成済み処理を保持した。
- Task5の失われたコミットはGitHub404だったため、たまご2品をRED→実装→GREENで再実装した。
- 新たまごは未経験の通常／レア種族から別々にランダム予約。れんくんを除外し、現在の種族は変えない。
- 予約時は未消費、取消は予約情報だけ解除、成功孵化時に1個だけ消費。有効な旧予約種族は在庫の裏付けがあれば経験済みでも尊重。
- 実際の旧セーブ読込で、freshState由来の移行済みフラグが旧在庫移行を飛ばす問題を修正。保存元のフラグを使って移行する。
- ショップ12品の順序・名称・価格・文言、既存アイコンとの対応を整理した。
- 実ブラウザで見つかった、なかまの招待がショップの背後に隠れる問題を修正。選択成功時だけショップを閉じる。取消では閉じず、在庫も使わない。
- main `bcdd6a6811ce8255ef16895ffff26f53b89d1478` の変更を作業ブランチへ取り込み、indexのキャッシュ指定とpackageのテスト一覧を両側保持して解消した。

## 保存・検証地点

| 地点 | SHA / tree | 状態 |
|---|---|---|
| 再開時PR HEAD | f94fcedb5e2b648607abcfd9485bdc740e6e8092 | Draft・未マージ、当時のCI2本成功 |
| 再開時復旧HEAD | 0bb3f5a90cae337eb46bf475b2c87d7242ddee5b | Task4まで |
| Task5ローカル | 15807a826cc7acf58d41ab1e0b742c8fc600de11 | 個別レビュー通過 |
| Task5 GitHub | b13b4b57a0cf8143f5ca3c0eed88e34f939a89c2 | tree f7e4e221c8180b14becc2da0e556af719473a302 がローカルと一致 |
| 統合途中GitHub | 42fce2f4d84fd366f581101918088cdd3d37b624 | focused71、全体758成功。ブラウザ修正前 |
| ブラウザ修正後ローカル | c0a14afaa71a112905542e14f9d74a4d3b245d78 | tree03e85e35af17e85d851a21e03cf44e2fe8bc7a96 |
| 返金修正後ローカル | 99b7b4ba02bd540b29629bab5737f298455c4d80 | scoped再レビュー通過 |
| 最終コードGitHub | 8df98b402dfbbd32c4e7344405bd695d8328ce1c | tree754d31854893441290276deafe242d665354b3e9、復旧／本来のPR両ブランチへ保存 |

GitHubへの保存はgit-data APIでblob/tree/commitを作成し、ローカルtreeとの一致を確認してrefをforce=falseで更新した。コミットSHAが異なっても同じファイル集合であることを確認している。

## テスト

- 復旧Task1–4の新規runtime: 41/41成功。
- Task5 RED: 95件中14失敗。新在庫からの予約・消費・付与の未実装を確認してから実装。
- Task5 focused: 136/136成功。dialogue、syntax、diff checkも成功。
- Task6: 旧期待値・ショップ順・文言・未対応記号・招待の重なりをそれぞれRED確認後に修正。
- 招待修正までのfocused: 72/72成功（新runtime5ファイル＋関連テスト）。
- 最終レビューの返金指摘はREDで2件失敗を確認。独立した小・大予約の同時存在と保存控えの重複を修正後、focused 113/113成功。
- 最終 `npm test`: node:test 760/760成功。先行するsmoke、dialogue、visual QAも成功。
- `git diff --check`: 成功。

```sh
node --test tests/consumables-v2-migration-test.cjs tests/consumables-v2-life-test.cjs tests/consumables-v2-forms-test.cjs tests/consumables-v2-encounters-test.cjs tests/consumables-v2-eggs-test.cjs tests/item-experiences-test.cjs tests/asset-versions-test.cjs tests/migration-test.cjs tests/save-recovery-test.cjs
npm test
```

## 実ブラウザ

ローカルChromium153.0.8010.0で既存 `normal-equipment-browser.cjs` と新 `consumables-v2-browser.cjs` を実行。各320px／390px、計4ケース成功。新moduleはHome layoutへ接続済み。

確認: 12品の並び・名前・価格・説明／ショップと長いpickerのスクロール／購入・使用・使用不可時の在庫保持／5種のpicker取消／通常なかまの呼出と通常の加入案内ボタン／卵予約・再読込・取消／一時姿の実種族不変・再読込後の元の期限・期限終了／旧セーブ返金（小・大予約2件の160を含む）と2回目読込の冪等性／ページエラー0。

おまもりはブラウザで自動使用表示と手動使用ボタン不在を確認。実際の死亡境界での自動発動はruntimeテストで確認。
通常装具moduleで10種・確定PNG4枚、ゲームパス5秒境界と再読込、即時Lucky、装具の一度だけ返金も検証。招待とpickerの実スクリーンショットも目視した。

## Quickの切り分け

初回全体でQuickのchainテストが、ランダムに選んだdodgeを自動操作で解けず `✔ 0／20` と `✔ 1／20` の差で失敗した。Quick本体とテストはf94fcedから変更なし。
同一Node24.19.0環境で基準f94の `npm test` は726/726成功し、今回の最終全体も760/760成功したが、成功だけで不安定性を否定しなかった。

元のchainテストcallbackとsolve関数を変えず、harness生成直後・render/start前に同じMulberry32 seed45を入れた比較で、**基準f94と今回の両方がdodge・同一アサーションで失敗**した。最大64seedの探索は45で終了。既存の自動操作テストの不安定ケースとして分離し、Quickのコード・テスト・経済は変更していない。

## 移行と維持条件

- 未使用在庫・発動前予約は旧価格で一度だけ返金。発動済み旧効果は返金せず終了。
- 現在状態と無限復帰控えの重複予約を二重計上しない。購入履歴だけから補償を生成しない。
- 旧コードで同時購入・使用が成立する小予約＋大成功予約は40+120=160を返金する。大予約の別名や復帰控えの同一予約は重複させず、再正規化・再読込も追加返金しない。
- 再読込・次人生・無限復帰で返金／変換を繰り返さない。旧ばんそうこうと旧ゆめは1:1。新価格の差額請求なし。
- 旧成長ブーストは初回のみ解除。移行後に日次から新たに得たブーストは保持。
- たまごの再孵化呼出と再読込による二重消費なし。実際の温め5回でも検証。
- ゲームパスは通常成功固定・30コイン・5秒待ち。実プレイ回数、今日のチャレンジ、自己ベスト、点数実績、勧誘判定、人生記録を加算しない。通常装具1枠を維持。
- 通常成功30／大成功60、Starは通常ミニゲームのコインのみ3倍。Luckyは独立即時抽選。通常10種と使い切り12種を維持。

## 確定PNG（変更なし）

| ファイル | Git blob SHA |
|---|---|
| bento-box.png | f02296e488dcf7b19b96b1b56cf9db5e67629423 |
| toy-box.png | fc601ae0292158e401239231fc9c319eaeb1ce1d |
| first-aid-box.png | fad04de9e1bc740863b18b90c328295718d8b8fa |
| game-pass.png | 903c482ce593e7869bc6f39b5c1d72b2e4da9642 |

## 対象外・実装判断

Quick最終経済、今後の日次報酬、伝説報酬など通常コイン発生源の再設計は未実施。保存正本の将来方針と今回の完成範囲を区別する。
計画Task6の「新runtime6ファイル」はTask1–5が実際には5ファイルを作るため表記不一致。実在5ファイル全件と関連テストを実行した。商品仕様やテスト範囲の削減はない。

## 最終レビュー・PR・CI

全差分レビューは旧小予約＋大成功予約の返金不足1件を検出。基準f94実コードで両方の購入・使用を再現し、修正後の限定再レビューでspec／qualityともPASS。他の指摘なし。
PR本文の旧Star10倍等を確定仕様へ更新し、8df98b4をforce=falseで本来のPRブランチへ反映。GitHub RESTで最新head、main bcdd6a6、Draft=true、merged=false、mergeable=trueを再確認。
コードSHA 8df98b4の[Runtime smoke test](https://github.com/Naoto214/naotocchi/actions/runs/35155466748)は成功（760/760、失敗0、skip0）。[Home layout](https://github.com/Naoto214/naotocchi/actions/runs/35155466625)も成功。ログのPASSを集計してChromium81／WebKit81、合計162ケースを確認。通常装具・使い切りの両moduleは各engineで320px／390pxを通過した。CIはNode22、Chromium151／WebKit26.5。
この結果を記録する文書コミットはゲームコード・テスト・PNGを変更しない。文書保存後の最新HEADのCI結果はPR本文に追記する。

## 変更ファイル（再開時PR f94fcedから）

下記にはmainから取り込んだめぐるとそのテスト・履歴文書も含む。それらの新機能はこのアイテム作業で再設計したものではない。

- `.gitignore`
- `DEVELOPMENT_CHECKPOINT_2026-09-07.md`
- `README.md`
- `docs/superpowers/plans/2026-09-16-consumables-v2-completion.md`
- `docs/superpowers/plans/2026-09-16-consumables-v2-recovery-handoff.md`
- `docs/superpowers/specs/2026-09-16-items-v2-final-migration-table.md`
- `index.html`
- `item-system.js`
- `meguru.js`
- `package.json`
- `script.js`
- `tests/clownfish-romance-test.cjs`
- `tests/consumables-v2-browser.cjs`
- `tests/consumables-v2-eggs-test.cjs`
- `tests/consumables-v2-encounters-test.cjs`
- `tests/consumables-v2-forms-test.cjs`
- `tests/consumables-v2-life-test.cjs`
- `tests/consumables-v2-migration-test.cjs`
- `tests/dialogue-test.js`
- `tests/economy-test.cjs`
- `tests/egg-hatching-test.cjs`
- `tests/helpers/runtime-harness.cjs`
- `tests/home-layout-browser.cjs`
- `tests/item-care-game-test.cjs`
- `tests/item-collections-economy-test.cjs`
- `tests/item-experiences-test.cjs`
- `tests/item-inventory-test.cjs`
- `tests/item-relations-travel-test.cjs`
- `tests/meguru-fauna-test.cjs`
- `tests/meguru-region-identity-test.cjs`
- `tests/midlife-test.cjs`
- `tests/migration-test.cjs`
- `docs/superpowers/plans/2026-09-16-consumables-v2-verification.md`（本記録）
