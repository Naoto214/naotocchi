# VERSION 6 第1工程 — 調査と保護基準

調査日: 2026-11-15 JST。PR #535最新HEADは `03b47d8ba42551c67c44fb6ab5574e5f264aa611`。参考HEADと一致。Draft、base `design/naopoyo-gimmick-atlas-v1-20261109` を維持。

## 確認した事実

- V5カタログ76 IDは一意。地形・装飾・世界を含む同じカタログを図鑑と配置パレットで使用。新しいIDの再採番は不要。
- 31系統×8段階の正式PNGはGit上に248点すべて存在する。画像の存在はパズル能力の承認を意味しない。
- 実データを `serializeBoard → deserializeBoard` で検査すると、受理される操作種族はdog/frog/fish/penguinのみ。他27系統はInvalid actorで拒否される。魚の正式画像系統IDはclownfish。
- 現行 `drawActors → drawSprite → spriteSpec` も4種のスプライトレジストリを使用。未知種を犬へ偽装して通す設計は採用しない。
- 飛行の承認済み種族・段階表は見つからない。PR #532の `ability.flight` は「未承認・旧比較室候補」。butterfly/cicadaは6以上、beetle/stagbeetleは5以上の候補。成長マスターのfloat/quick等は描画用性格で、飛行能力ではない。
- 掘削はPR #532で種族・段階・消費・方向が未承認。既存burrowは地下転送であり自由掘削ではない。
- V5の保存形式は `naopoyo.material-study.v1`、キーは `naopoyo.material-study.owner.v5`。boardとappearanceを分離し、PlaySessionが開始盤面と試遊履歴を分離。編集履歴はUndoのみでRedoは未実装。
- V5配置はpointerdownで直接編集。配置済み素材をタップして選択・条件編集する操作は存在しない。追加時には配置と選択を区別する必要がある。
- formal solverはshortest/exhausted/limitを返す。深さ打ち切りもlimit。既存 `v3/search.mjs` のforbidフックで、正式gameMoveのまま特定効果禁止探索が可能。装置の撤去と「使わない」探索は同一ではない。

詳細な76 ID、31種の交換形式受理結果、248素材のGit上の存在は [research.json](research.json)。V5全ソースの保護SHA-256は [v5-protected.json](v5-protected.json)。

## 実際に設定できる条件

|対象|正式に使われる設定|追加しない設定|
|---|---|---|
|箱|weightはスイッチ上の重量。exact/min/max/speciesは押す個体の条件。縦横1マス押し|引く、斜め押し、重量に応じた飛距離|
|ワープ|pairIdで2個接続。exact/min/max/speciesで使用条件。同じ対は1手1回|塞がれた相手を押す、3個以上の同じ対、任意の不発ルール|
|ワープ不発|出口が塞がっていれば転送せず、再進入で再試行。消失演出なし|「失敗時に消える」等の選択肢|
|条件通路/出口|exact/min/max/species。複数出口可。出口は全員救出でクリア|出口ごとの人数ノルマ、任意のORクリア条件|
|スイッチ|hold/weightは在席中、latchは保持、toggleは進入時反転、sequenceは順番|効果持続を全素材共通の独立チェックボックスにすること|
|連動|needsは全入力、anyはいずれか。入力元IDを選択。制御扉はfixture.door|fixture.gate（数値通路）を回路扉と混同すること|
|時間差|period=2〜8、phase=0〜period-1。成功した手数に同期|実時間タイマー|
|NPC|npc.owlの訪問条件とpartner、回路出力。操作しない|恋人/他NPCの未実装行動を正式素材として有効化|
|重力看板|board.gravity。描画位置は正式の(0,7)で固定|看板の自由移動、マスごとの重力方向|
|初期向き/状態|正式な初期向き設定は未対応。通常状態は開始盤面から生成|向きや凍結等が物理に効くかのような保存項目|

入力欄はエンジンが「受理する」だけでなく、当該素材が実際に「利用する」条件に限定する。範囲条件は矛盾検査を行い、既存表示で読み取れない複雑な混在条件は説明欄へ明示する。

## 現在の検証

- Nodeの正式物理・入力・保存・V3/V4/V5回帰: **250/250成功**。
- この回帰にはV3盤面/解法ハッシュ、100面×6世界の合法解、絵本8×6の再生、V5の最短再探索記録と現盤面の照合を含む。今回の調査では100面のBFSを再実行していない。
- V5コードHEADのGitHub Actionsは5件すべてsuccess。V4/V5: run 43596396780、100面:43596396796、Chapter1:43596396824、Chapter2:43596396792、Contact:43596396855。
- ローカルPagesテスト初回はsparse checkoutによる素材/入口不足で不成立。本番ファイル・allowlistは変更なし。既存同HEADのCI成功と区別して記録する。
- ブラウザー/実機Safariを今回実行したとは報告しない。

## 工程状態

1. 調査: 完了。テスト後、調査資料のみcommit/push。
2〜8. 実装: 未着手。採用済みUIへの追加差分と、31種・飛行・掘削の未定義部分を [PROPOSAL.md](PROPOSAL.md) に記載。本人確認前に正式ルールへ補完しない。

V5の稼働URL、保存キー、画像、76 ID、正式物理・入力・アーチ・新ワープは変更していない。本人限定配信もまだ更新していない。
