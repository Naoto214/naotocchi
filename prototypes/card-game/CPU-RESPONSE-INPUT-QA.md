# Response input safety — 2026-10-19

## Stage 1 checkpoint

Base PR #398: f3c7e9fdd807b09e4fc6cfc10ca7a2c7a4eb5f49 / tree e44f638e170d8e09d16095af2a90c669a8203ffe.
Remote main: fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7. No merge or Pages changes.

The document click handler formerly looked up actions from the current projection, without binding the initiating gesture to its rendered UI. Response and normal end-turn both used kind=pass in the same visual slot.

- UI-local generation + session object + revision + viewer tickets; disconnected nodes are rejected.
- Capture pointer/keyboard start before click; consume once; reject retargeted and pre-render gestures.
- New accessible clicks remain available; browser multi-clicks cannot activate end-turn.
- Response (blue, left) and end-turn (gold, right) have permanently separate slots. No timer or confirmation added.
- Existing engine revision validation remains the final boundary. No state/schema/engine/CPU policy changes.

Evidence: cpu-evidence/response-input-20261019/. New tests fail before the fix (5/5), then pass (5/5). Full CARD GAME baseline: 313/314 pass. Stage 1: 318/319 pass. The only failure in both is `regeneration is deterministic and read-only in check mode`: existing `Cannot find current array FUN_ITEMS`. No audit originals changed.

Browser/Safari touch geometry has not been validated in this environment. iPhone portrait/landscape rapid-tap QA remains required.

Stage 1 saved to GitHub via connected API (CLI push has no credential): **24b9c92382d821885c9c89931779d9262a2f6977**, tree **2bad2c0a0ca3290a67592aeeb0b54472e7e1b5eb**, identical to locally tested tree. This checkpoint was saved before stage 2.

## じんとりの正式条件

- ID: `G-area-claim`、あそび／すぐつかう、通常時3、通常カード（構築上同名3枚）。既存コスト増減はエンジンを正本として維持。
- 本文: 「たまごを除く自分の場のカードが7枚以上なら、自分のそだち+10。9枚あるなら、さらに自分のそだち+5。」
- 出典: `docs/card-game/85-play-batch-4-card-text-draft.md`、共通手順 `01-core-rules.md`、`06-action-chain-checkpoint.md`、終了手順 `64-turn-boundaries-and-victory-timing.md`。
- 7枚は解決時の効果条件であり発動条件ではない。06は「空撃ち禁止」を設けず、効果成功を新しい発動条件にしないと明記。7枚未満でも時を払える発動機会では合法。
- 自分の通常行動機会、自分／相手の行動後・開始／終了・ちょうせん等で自分に渡る応答機会、連鎖構築中に使用可。必須選択・解決手順の途中には割り込まない。
- 同一chainの同名制限は本文にない。別の1枚は手札と時があれば追加可。使用した現物は手札から発動領域へ移るので再使用不可。使用時に時を払い、逆順解決を経て捨て札へ。
- 解決時の3×3実カードを数える。たまご・発動領域・捨て札は除外。装備は準備枠の1枚としてのみ数える。0/7/8/9枚で効果0/+10/+10/+15を検証。

## 頻発の原因と応答UI

じんとりは特定の相手行動を条件としないため、手札に残って時を払える限り多くの応答機会で合法候補になる。通常行動後に両者へ応答を渡すのも正式ルール。候補を消す修正はしていない。

既存の自動進行は合法候補がパスだけの場合に限り動く。同じ判断をUIで再要求するループは再現されなかった。人間Aがパス→応答不能Bを自動パス→Aの通常行動、をCPU/2人対戦で検証。相手が新しく発動を積んだ場合や後続の応答は新しい判断機会として残す。

- 手札にある応答候補の重複したボタン列を除去し、手札の合法カードを強調。場・捨て札の合法候補へのショートカットは残す。
- CPU対戦で「詳細閲覧できる」ことと「応答できる」ことを分離。閲覧可能なだけのカードを強調しない。
- 案内は「行動後」「ターン開始」「効果への応答」等の理由を表示。自動で大きなダイアログは開かない（従来から自動表示なし）。既存のカード詳細・時支払い確認は保持。
- レビュー指摘を再現して補強: Enter/Space押しっぱなしのnative click抑止、native selectも開始時の入力世代を検査。画面更新前の入力を再利用しない。

### 操作数の比較（再現器で確認）

| 場面 | 修正前 | 修正後 |
|---|---:|---:|
| 相手に合法応答なし、じんとりを使わず通常行動へ | 明示パス1回 | 明示パス1回 |
| 両者に合法応答あり、どちらも使わない | 各1回の意思判断 | 各1回の意思判断 |
| じんとりの使用（カード→使用→時支払い確定） | 3タップ | 3タップ |
| 通常ターン終了 | 1タップ | 別位置の1タップ |
| 手札だけに応答候補がある縦画面の案内領域（CSS指定） | 108px | 60px |

合法な判断回数を削る改善ではなく、誤操作防止・重複表示削減。iPhone実機のタップ数／描画寸法は未測定。

## 最終検証

- 新規・重点14/14成功。旧入力連打5件、UI簡素化2件、レビュー修正の失敗→成功を保存。
- 全CARD GAME 328件中327成功、既知FUN_ITEMS再生成監査のみ失敗。baselineと同じ原因。
- CPU既存独立12対戦: 全件R10完走、途中復帰、合法コマンド再生一致。`cpu-evidence/completions.json`は再実行後もGit差分なし。
- 既存2人対戦、全452枚、初級／中級、必須選択、response/chain、自動パス、保存復帰、非公開情報、4秒通知、手番・演出回帰を既存スイートで確認。
- 独立レビュー: pointer連打対策と応答UIに阻害事項なし。キー連打・selectの2指摘は追加テストで再現・修正。
- 実ブラウザは環境にcontrol-browserがなく未実施。新規ブラウザ導入や代替経路は使っていない。
- main、本番Pages、#393/#396/#397、正式ルール・452枚定義・Python・固定400戦・CPU判断・save/schemaは無変更。

## iPhone実機QA残件

縦横で青い応答パスを連打し、通常復帰後にターン終了へ化けないこと。右側の金色ターン終了の新規タップがすぐ効くこと。画面回転・背景復帰・保存復帰・カード詳細／支払い確定／宣言選択、応答表示の省スペース化、通知と演出の重なり。これは実機確認待ちであり視覚品質の最終完成宣言ではない。

## 配信結果

同じ本人専用URLへ更新成功（owner-private、succeeded）:
https://naotocchi-card-cpu-20261019.kerzion214.chatgpt.site/

- 実行コードGitHub HEAD: b95a560520931aa46f3126d45ad77a46427dc4b1
- 実行コードtree: a7431135fcf63ec112d422ed28cbd99719861e93
- Site source: bd55935e553d8a034b47163cf2a9f88ba5433c3d
- Deployment: appgdep_6ad5dc33b408819180493b793bd3b9ae
- Version: appgprj_6ad59d0af478819190a03552d586bbeb~appgver_6368cc522c7c81918eadccbfeafde66e
- 37実行ファイル一致、既存画像290枚Git blob一致。配信後の追加保存は証跡・報告だけ。
