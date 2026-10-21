# ミニゲーム改善 Phase 1 実施記録（2026-10-21）

- ブランチ: `claude/minigame-phase1-fixes`
  - ベースは main `79d59aec` と Phase 0 の docs。
  - **main への merge はしていない。**
- 承認された範囲:
  - 確定不具合19件の修正
  - 文言・コメントの修正（性格に関わる W15 は除く）
  - 回帰テスト
  - 共通リアクション基盤 v0
- 変更していないもの:
  - 通常100本・クイック50本の構成（追加・削除・統合・id 変更はしていない）
  - T1〜T10 の仕様（02-pending-decisions.md）
  - 性格の獲得方法、育成効果、セーブの形
- 項目の定義は `docs/audit/minigame-phase0-2026-10-12/01-confirmed-defects.md` にある。

## 実施した修正

| No | 対象 | 変更 | 修正単位 | テスト |
|---|---|---|---|---|
| B01 | quick の疑問形の指示 | 本体の voice ラッパーが第2引数を落とさない | U8 | core |
| B02 | quick「なかまは？」 | 恋人がいないときは、自分の仲間全員をハズレ候補から外す | U9 | core |
| B03 | quick「1本ずつ」の結果カード | その1本の記録（lifetime.quick.single）と比べる。`minigameRecords` の形は変えない | U10 | core |
| B04 | なかまの誘いから始めたプレイ | `notePlayStarted()` で actionCounts.play と envPlays を記録する | U7 | core |
| B05 | 結果カード | 結果を処理している間に出た吹き出し（そだち・とし）は、カードを読んだ後に出す | U11 | core |
| B06 | breakout / pingpong | 開始の猶予中は残り時間が減らない | U3 | timing-display |
| B07 | rhythm-highway | 長さを mgDuration に通す | U4 | timing-display |
| B08 | mini-golf | ボールの近くを押したときだけ引っぱれる。遠くを押したら「ボールから引っぱろう」と案内する | U12' | timing-display |
| B09 | mini-golf | 池ポチャの後も6打の上限を判定する。ホールの切り替え中は打てない | U1 | locks-generators |
| B10 | push-puzzle | クリア後の切り替え中は入力を止める。1問につき1回だけ数える | U1 | locks-generators |
| B11 | bento | 置いた枠に ⭕/❌ を出す | U6 | timing-display |
| B12 | bubble-shooter | 六角グリッドの偶奇を parity の1か所で持つ。降下しても泡が消えない・ずれない | U12 | timing-display |
| B13 | lights-out | 「さいてい」を真の最小手数にする（零空間を使って求める） | U12 | timing-display |
| B14 | darts | 「おちつき」ゲージと照準円を、実際の揺れと同じ値で描く | U12 | timing-display |
| B15 | shanghai | 検証つきのリトライで配る（全部の牌に絵柄があり、取りきれる配りだけを使う） | U2 | locks-generators |
| B16 | memory-cards | 判定待ちの間は3枚目をめくれない | U1 | locks-generators |
| B17 | sudoku | 唯一解の盤だけを出す | U2 | locks-generators |
| B18 | sudoku | ミスと判定した数字を赤く表示する | U6 | locks-generators |
| B19 | checkers | 勝ち方（全部取った／相手が動けない／時間切れ）に合った文言を出す。点数は変えない | U5 | timing-display |
| W01, W04〜W14 | コメント・タイトル・README・CONTROLS | 実装の値に合わせる | U13 | wording |
| W02 | bento の終了文言 | 時間切れのときと、全部置いたが間違いがあるときの文言を正しく出し分ける | ― | timing-display |
| W03 | 4本のヘッダー初期値 | 実際の制限時間から作る | U3 | timing-display |
| W05 の追加分 | 「みじかめ」の画面文言（設定ボタンの通知、プロフィールのヒント） | 「90秒以上を60%」を「20秒以上を70%」に直す（README・コード・テストと一致させた） | U13 | ― |

## 共通リアクション基盤 v0

- `minigame-reactions.js`（新規。純関数とデータの表だけ）
  - `buildContext` → `detectMoments` → `resolve`（＋`pickLine` / `audit`）。
  - 検出する瞬間は10種類: companionRecruit / companionMiss / firstS / firstClear / newBest / milestone / nearMiss / losingStreak / repeatPlay / plain。
  - 台詞の表 `LINES` は**空**。引き方は `game:` → `category:` → `genre:` → `any` の順。
- script.js
  - `minigameReactionPlan` と `dispatchMinigameReaction` を追加した。
  - 既存のイベントキー（minigame_great / minigame_bad / companion_new）と確率をそのまま使い、`speakEvent` を名前で呼ぶ。
  - 直近8回の結果をメモリだけに持つ（**保存しない**）。
  - モジュールが読み込まれていない環境では、同じ挙動の代替表を使う。
- 挙動の変化は **B05（結果カードの保護）だけ**。台詞・表情・動きは変えていない。
- pet-expression.js は character-3d の保護対象のハッシュに入っているので、触っていない（表情の追加は v2 で、人間の確認を受けてから）。

## テスト

- 追加したテスト（npm test に登録済み）
  - `tests/minigame-phase1-core-test.cjs`（10）
  - `tests/minigame-phase1-locks-generators-test.cjs`（11）
  - `tests/minigame-phase1-timing-display-test.cjs`（13）
  - `tests/minigame-phase1-wording-test.cjs`（14）
- 新しいテストは、修正前のコードでは失敗することを確かめた（ガード用の数件を除く）。
- 既存テストの変更
  - post-integration-audit-test: 数独の盤が唯一解になったため、入れるマスを変えた。テストの意図は変えていない。
  - runtime-harness / smoke / dialogue: 新しいモジュールを読み込むようにした。
- index.html の `?v=` トークン: 内容が変わった4ファイル（quick.js、games.js、minigame-reactions.js、script.js）だけを更新した。
- 全体の結果は「npm test の結果」の節に記す。

## npm test の結果

（統合後に記入）

## 残っていること（判断待ち）

- **ゴール⑤の復旧**: [goal5-recovery-options.md](goal5-recovery-options.md)（R1 を推奨候補とした）。性格の B 案の設計とは切り離して、先に決めることもできる。
- T1〜T10（Phase 0 の 02-pending-decisions.md）。
- 実機での確認: B08 のボールの近くと判定する距離（24×S。約29px）が、スマホで自然か。
- shanghai: 途中の「まぜる」は、残った牌の配置そのものが取りきれない場合には救えない（以前と同じ挙動。絵柄なしの牌はもう出ない）。
