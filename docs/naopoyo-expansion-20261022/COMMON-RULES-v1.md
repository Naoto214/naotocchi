# なおぽよ。共通ルール仕様書 v1

正本調査: main `f69310c79131f51ceed043417cf4c39cab925331` (PR #418後)。本仕様は既存実装の記述であり、ルール変更ではない。コード参照は `prototypes/naopoyo-rescue/` 相対。テストは同ディレクトリ `tests/`。

## 共通モデルと1マスの処理順

盤面8列×6行、座標0始まり、正式種族dog/fish/penguin/frog、段階1〜8。1体の価値は `2^(段階−1)`。`mass(state)` = 救出量 + 盤面価値の和。種族は変わらず、合体2×2^(L−1)=2^L、分裂2^(L−1)=2×2^(L−2)。救出は価値をrescuedへ移す。キャラ数は保存しない。

`move` の順: ID/方向 → 盤外/壁 → 重力上昇の足場 → 移動先の占有/合体上限 → 門(合体前段階)・出口(合体後予測段階)の条件 → 合体 → 座標更新 → 門履歴 → 出口救出、そうでなければトゲ分裂 → moves加算。拒否時は状態を変更しない。通常入力も落下も同じmoveを使う。

## 1. 8方向移動

- プレイヤー: 隣接する8マスへ。斜めは行き先が通れれば岩の角も通れる。
- 内部: 整数dx/dy、max(abs(dx),abs(dy))=1のみ。盤外/壁拒否。行き先の異種・異段階・段階8同士は衝突。同種同段階なら合体へ。
- 順序/例外: 上記共通順序。横・縦の側面マスは衝突判定に使わない。ただし重力中の上昇は項目7/8の足場判定を行う。
- 参照: engine.mjs `move`、input.mjs `movePointer`。
- テスト: destination-only.test.mjs、eight-way.test.mjs、pointer-app.test.mjs。
- 制作制約: 斜め迂回を前提に全方向で壁境界を閉じる。角抜け禁止へ戻さない。

## 2. 合体

- プレイヤー: 同種・同段階2体で1段階上へ。8同士は合体しない。
- 内部: 操作IDを維持し、相手を除去、操作キャラを移動先へ置きlevel+1。
- 順序/例外: 門判定は合体前の操作キャラ。出口は合体後。移動先がトゲなら合体後に分裂し得る。連続操作は同一IDで継続。
- 参照: engine.mjs `move`。
- テスト: engine.test.mjs、levels.test.mjs、pointer-app.test.mjs。
- 制作制約: 位置は相手のいた移動先。合体と分裂が同じ手で相殺される配置を理解し、総量を毎手検証する。

## 3. 分裂

- プレイヤー: 2以上でトゲへ入ると1段階下の2体に。1はそのまま通る。
- 内部: 操作IDの子はトゲ上、生成childNは移動前セル。nextIdを進め重複回避。事前シルエットなし。
- 順序/例外: 出口処理を優先し、救出されなかった場合だけ分裂。分裂で置かれる子の元セルに対し門条件・トゲ処理を再実行しない。したがって高段階門内に低段階の子が残るのは合法。その子は門から出られるが再進入には条件が必要。
- 参照: engine.mjs `move`、render.mjs。
- テスト: engine.test.mjs、world-guardian.test.mjs、levels.test.mjs。
- 制作制約: 前セルを含む戻り道と子の回収経路を確認。段階と総量、生成IDを保存する。

## 4. ドラッグ中の連続操作

- プレイヤー: 同じキャラをなぞって続けて動かす。指を離すまで1回の操作。
- 内部: point→pointerTrace→角を小さく除いた入力領域entersTile→movePointer→move。高速入力も隣接マスへ分解。描画は1.4倍/上10px/足元位置を維持。
- 順序/例外: pointerupは最後の座標も処理してfinish。cancel/lostcapture/pagehide/非表示でもfinish。救出でIDが消えたらそのドラッグの移動終了。入力領域の角処理は壁を参照せず、斜め衝突ルールではない。
- 参照: input.mjs、app.mjs `travel/begin/finish`、render.mjs。
- テスト: pointer-app.test.mjs、destination-only.test.mjs、input-store.test.mjs。
- 制作制約: サンプル密度や速度を攻略条件にしない。保存解答にドラッグ境界を明記。既存の任意表示タップ補助/キーボードは維持するが、新しい十字キーや自由ジャンプは追加しない。

## 5. 魔法門

- プレイヤー: 毎回、動かすキャラが門の条件に合う必要がある。通過しても消費しない。
- 内部: `matchesCondition` は指定species/exact/min/maxを全てAND判定。段階条件なしはALL。種族指定だけのALLは全種族ではなく指定種族の全段階。
- 順序/例外: 合体前段階で判定。`open` は通行履歴/占有表示で、将来の通行許可ではない。実通過数WeakMapは保存しない。
- 参照: conditions.mjs、engine.mjs `move/gatePassages`、render.mjs `gateVisual`。
- テスト: conditions.test.mjs、magic-gate.test.mjs、passages.test.mjs、expansion.test.mjs。
- 制作制約: 必須性をopen/requiredだけで主張しない。条件札は既存種族アイコン/1〜8を使う。

## 6. 星型出口

- プレイヤー: 条件に合うキャラは救出され盤面から消える。複数出口を使える。
- 内部: 条件は門と共有。合体後予測段階で判定し、成功時に価値をrescuedへ加算、操作IDを除去。
- 順序/例外: トゲより先。落下からの進入も同じ救出処理。不一致の出口は進入拒否だがsupport関数の明示的足場には含まれない。
- 参照: conditions.mjs、engine.mjs `move/complete`、app.mjs `finish/update`。
- テスト: engine.test.mjs、levels.test.mjs、pointer-app.test.mjs。
- 制作制約: 出口上に初期キャラを置かない。入口から到達可能でも出口条件と全員回収を別々に確認。

## 7. 重力

- プレイヤー: 指を離すと全員が落下する。速さではなく配置と操作の区切りを考える。
- 内部: `release`。非重力は無処理。重力はy降順(下から)、同yはx昇順で各キャラを1マス下へmove(...,true)。各巡回で並べ直し、動きがなくなるまで繰り返す。新しい分裂子は次巡回の対象。
- 順序/例外: fall=trueは上昇足場制限だけを回避。壁/盤外/不一致門/出口/異種異段階で止まる。同種同段階には落下合体し、トゲ分裂・出口救出も起こる。状態反復または2048巡回でrelease開始前へ戻しfalse。appはそのドラッグ全体を開始前へ戻す。
- 参照: engine.mjs `release/move`、app.mjs `finish`。
- テスト: engine.test.mjs、levels.test.mjs、pointer-app.test.mjs、expansion.test.mjs。
- 制作制約: 初期状態に自動releaseはない。浮いた配置を作るなら最初の操作終了時の全員の落下まで検証。無限分裂・合体循環は不採用。重力を毎マス即時処理へ変えない。

## 8. 仲間の足場

- プレイヤー: 仲間や壁を使って高い所へ登り、最後に足場の仲間も救う。
- 内部: 上向きdy<0の任意移動には、移動前の真下support AND (左support OR 右support)。supportは盤外/壁/任意の仲間/そのキャラに不一致の門。斜め上も同じ。横/下移動には上昇条件なし。
- 順序/例外: 同種同段階も判定上は足場だが、上からreleaseすると合体する。足場役が移動・救出・合体で消えてもドラッグ途中の一斉落下はなし。次のreleaseで落下。分裂で足場が増えた時も同じ。上昇条件は各1マスの移動前に再評価。
- 参照: engine.mjs `support/move/release`。
- テスト: destination-only.test.mjs、engine.test.mjs、expansion.test.mjsの19〜24、pointer-app.test.mjs。
- 制作制約: 一段上へ行く直前に真下と左右の支持を図示できること。足場を先に救うと詰む場合はUndoで戻れること。実体を移動不可地形と誤解させない。

## 9. Undo・リトライ・保存復帰

- プレイヤー: Undoは1ドラッグ前へ。リトライはその面を最初から。クリア記録は保持。
- 内部: beginでclone、finishでrelease後に変更ありなら開始前をhistoryへ追加。最大80件。保存key `naopoyo-rescue-v1`、version1、index/state/history/cleared。restoreは全履歴のvalidState/総量/地形を検証。
- 順序/例外: ドラッグ途中のUndoはfinishしてからpop。クリア記録はUndoしても達成履歴として残る。旧地形互換と旧10の魚門移行を維持。リトライで現行地形へ。保存容量エラー時は表示し、その画面でプレイ継続。
- 参照: app.mjs `begin/finish/choose`、store.mjs `pack/restore`、engine.mjs `validState`。
- テスト: input-store.test.mjs、destination-only.test.mjs、pointer-app.test.mjs、expansion.test.mjs。
- 制作制約: 既存index/IDの並びと定義を変更せず末尾追加。旧12面の定義はoriginal-twelve.jsonで固定。新面から旧版へ戻した場合の前方互換は保証しない。本番は別originで保護。

## 10. 行き詰まりとクリア

- プレイヤー: 全員脱出でクリア。進めなくなったらUndo/リトライ。
- 内部: completeはactors.length===0 AND 全required門のopen。既存07/10はrequired履歴も要求。新13〜24はrequiredフラグに頼らず構造で門必須性を保証。
- 順序/例外: finishの重力解決後にclear追加、updateで演出。自動行き詰まり判定なし。可逆な手戻りと数学的な詰みをUIで断定しない。
- 参照: engine.mjs `complete`、app.mjs `finish/update`。
- テスト: levels.test.mjs、passages.test.mjs、expansion.test.mjs、pointer-app.test.mjs。
- 制作制約: 救済アイテム・自動配置修正・勝利条件変更なし。

## ステージ採用基準（50面・100面へ）

1. 固定初期配置/8×6/正式4種族/段階1〜8。actor/壁/門/出口/トゲは意図しない重複なし。ランダム補充なし。
2. 本体エンジンと実appポインタで全員脱出、各手の総量と保存妥当性を確認。解答はIDと0始まり座標列、ドラッグごとに保存。
3. 必須門は1個ずつ封鎖し不可能性を検証。探索上限は未証明。切断証明は全8方向、種族保存、前セルにだけ生じる分裂子、重力にも適用できるか明示する。
4. 旧12面/旧解答/旧セーブと既存画像を維持。Undo/retry/reloadが正常。
5. 操作速度不要。攻略の発見、順序、役割、足場回収の説明がある。手数だけで星を決めない。
6. iPhone寸法で盤面と操作が収まる。実機難易度・楽しさは本人評価待ちと記録。
7. 全必須項目合格は試遊採用。短絡でテーマが消える場合は要調整。不整合/未検証は保留。全体の開発完了と本人の最終採用を区別する。

将来版でルールを変える場合はv2として互換性と既存解答への影響を別途検証する。本v1はエンジン/入力/保存の変更を含まない。
