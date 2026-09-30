# Relationship Expression pilot — 8枚制作・runtime接続

日付: 2026-09-30
開始正本: `41f6bbf4399f8b49828334b868d18cf3004f7381`

## 状態

- 画像単体QA: **8/8 GREEN**（AIによる比較確認。人間最終承認ではない）
- 専用resolver / runtimeテスト: **14 PASS / 0 FAIL**
- asset検証: **8 PASS / 0 FAIL**
- 全npm回帰: 実行中。完了扱いにしない。
- actual Home / 既存Homeブラウザー回帰: **未完了**
- forest_bear / rock_octopus本人の実Home: **必須・未完了**
- pilot全体: **未GREEN、人間最終目視承認待ちへもまだ移行しない**

生成前Homeゲートは `relationship-expression-home-human-check-20260930.md` の人間確認により解除。以前のsocket制限による生成前停止は再開済み。ただし今回の実Home QA完了を意味しない。

## 画像8枚

normalは既存PNGを継続使用。新規画像は以下のみ。

| 対象 | positive | lonely |
|---|---|---|
| otter | assets/characters/relationship/otter/positive.png | assets/characters/relationship/otter/lonely.png |
| clock | assets/characters/relationship/clock/positive.png | assets/characters/relationship/clock/lonely.png |
| forest_bear | assets/characters/relationship/forest_bear/positive.png | assets/characters/relationship/forest_bear/lonely.png |
| rock_octopus | assets/characters/relationship/rock_octopus/positive.png | assets/characters/relationship/rock_octopus/lonely.png |

built-in image_genを使用し、各normalを編集対象として各2枚生成。RGBA透明背景を保持し、全canvasを128×128へLANCZOS縮小。手描き修正、部分合成、背景除去、既存normal変更なし。再生成0。原寸の生成結果は生成サービス側の保存物を保持する。

同階層の `relationship-expression-pilot-review-20260930.html` は既存normalと新規8枚を128/104/80/64pxで比較する静的ページ。追加のキャラクター画像は生成しない。ファイルhash・生成元識別子は `relationship-expression-pilot-images-20260930.json` に記録。

### 画像単体確認

- 全8枚: 通常基準との個体性、身体構造、顔、付属物、色、背景透明、positive/lonelyの意味、128px自然さを確認。
- otter: 横たわる身体、両前肢で抱く灰色の石、両後肢の肉球、耳、ひげ、尾を保持。positiveは閉じた笑い目と笑顔。lonelyは開眼・控えめな口・内側の上がった眉で構ってほしい意味。
- clock: 文字盤、針、目盛り、上部ハンドル、ベル、横ねじ、両手足を保持。顔は文字盤下部に限定し、針を表情へ置換していない。細かな目盛り位置・色調等の自然な生成差は許容。
- forest_bear: 座位、両耳、両前肢、両後肢、肉球、茶色の身体と淡色の腹・口元を保持。positiveは笑い目・笑い口、lonelyは控えめな口と気を引きたそうな開眼。64pxでは細かな目の差の完全保持を求めない。
- rock_octopus: normal/positive/lonelyを3倍で並べ、8本の腕の根元から先端への可視経路、重なり、巻いた先端、主要な吸盤列を照合。腕の追加・欠損・明確な接続破綻なし。模様・吸盤の微細差を機械的に統一しない。
- 状態マーク、汗、涙、ハート等の装飾焼き込みなし。lonelyに病的な青白さ・苦痛・瀕死表現なし。
- 104/80px: 表情の方向とキャラ識別を確認。64px: 致命的崩れなし。実Homeは64pxより小さくなるため、この確認をHome GREENの代用にしない。

## runtime

- `relationship-expression.js` に4体限定の薄いresolverと一時Reaction管理を追加。
- `positive > lonely(<30) > normal`。値未指定は既存saveの扱いに合わせ100相当。
- 2.5秒の一時positiveはWeakMapで実entity objectに結びつける。状態objectへ書かない。恋人や人生の差し替えで同じIDが現れても引き継がない。
- 成功したじゃれる: 仲間全体から代表1体を抽選し、開始前<30かつ終了後>=30の救済個体を全件追加、重複除外。非pilotが代表になった場合は既存normalのまま。
- 既存の求愛・恋人成立・仲直り努力・結婚成立・デートの関係上昇処理にpositive開始だけを接続。既存の進行条件・増減量は変更しない。
- 終了時は現在のbond/affectionでHomeを再描画。reload後の一時positiveは消え、関係値からnormal/lonelyを解決。
- 図鑑・プロフィール・ムービーのnormal表示はそのまま。今回の表情表示の接続先はHome。
- 残り40体の追加時は承認済み画像とallowlistを追加する構造。新しいsave欄やキャラ別条件分岐は不要。

## 検証

専用テストは未実装REDを確認後に実装しGREEN。

- 優先順位、29.99/30境界、通常値50、低値20、4体・種類違い・非pilot fallback。
- 代表1体、複数救済、重複除外、拒否じゃれるでpositiveなし。
- 実Home描画関数のHTML切替、期限終了、現在値による戻り先、同ID別entityへの漏れ防止。
- 実save書き込みとreload再解決。表情フィールド非保存。
- PNG寸法/カラー形式、開発用Home fixture8件。

runtime harnessはDOM/clock代替であり、実ブラウザーの配置・見え方を検証したという意味ではない。

初回全npm実行では新規JSをgit indexへ登録前だったため、`asset-integrity-test.cjs` のtoken検証2件が失敗。検証はgit ls-filesを基準にするため未追跡ファイルのhashをnullとして扱った。新規ファイル登録後、asset検証8/8通過。初回全体runを中止し、最終状態で全npmを取り直している。

独立コードレビュー: Critical 0 / Important 0。minorとして、新規恋人成立・仲直り・結婚・デートの各UI経路を個別に通る追加テストは未実施（接続はコード確認、共通reinforceRelationship経路は実行確認）。誤解を避けテスト名はshared court reinforcementへ修正。現時点では追加テストを保留し、実Homeゲートで通常求愛も確認する。

## 実Home再開方法

ブラウザー実行が許可された別環境で、pilot branchの最新HEADから実施する。ここで拒否済みのローカルsocket権限を回避しない。

1. `npm ci` と既存Home QA同様のPlaywright Chromium/WebKit準備。
2. `npm run dev` の開発URL `/__qa` を開く（開発originのsaveをfixtureに置換するので、本番のoriginを使わない）。
3. `relationship_forest_bear_20_pair` 等のsceneを選ぶ。ID=forest_bear/rock_octopus、値=20/50、密度=pair/denseの8scene。
4. 390×844と320×568等の実Homeで本人の顔、身体・タコ8腕、切れ・重なり・透明境界を確認。じゃれる・求愛を押しpositiveと終了後の戻り先を確認。
5. 自動撮影用: `node tests/relationship-expression-browser.cjs`。Chromium/WebKit、2 viewport、8scene、通常UI clickを使用。synthetic clockでReactionの時間を進める。結果と画像を `test-results/relationship-expression/` に保存。**このrunnerは当環境では構文確認のみで実ブラウザー未実行。**
6. 既存 `node tests/home-layout-regressions-browser.cjs` / `node tests/home-layout-browser.cjs` も実行し、結果とスクリーンショットをpilot branchへ保存。

自動検証が通っても画像目視を行う。クマとタコ本人の実Homeが未確認ならpilot GREENにしない。完了後、人間目視承認待ちで停止。残り80枚へ進まない。

## 保護

既存画像3,342件は開始remoteのblob hashと全件一致。通常31系統resolver/emotion、hunger、z-order、汗、状態マーク、なおと、normal画像は変更なし。save schema/migration、結婚条件、全26体の減衰個体差は未実装。main merge、設計branch、PR #278変更なし。
