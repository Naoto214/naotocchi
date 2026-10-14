# なおとっち CARD GAME — 同一端末2人対戦

静的ブラウザ試作版。7種類・15カードIDの閉じたプールで、2人が端末を渡しながらR10の結果表示まで操作できます。AI対戦ではありません。

## 起動

この独立ブランチをチェックアウトし、リポジトリのルートで次を実行します。

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

PC: `http://localhost:8000/prototypes/card-game/`。iPhone: 同じLANのPCのIPアドレスで `http://<PCのIP>:8000/prototypes/card-game/` をSafariで開きます。公開ホスティング・本編導線への組込みは未実施です。HTMLをfile://で直接開かず、HTTP配信してください。

## 操作

1. 「新しい対戦を開始」。A先攻、B後攻、両者同じ構成の40枚を別々にシャッフルします。
2. 交代画面の本人確認後、自分の手札だけ表示されます。相手は画面から目を離してください。
3. 手札をタップするとそのカードの合法な行動・対象を絞り込みます。「すべての行動を表示」で通常行動へ戻ります。必須選択では提示された選択肢を選びます。
4. 発動後も発動者が先に追加発動できます。双方の連続パスでチェーンを逆順解決。必須選択中は割り込めません。通常行動の「ターン終了を申し出る」から終了時応答へ進みます。
5. 自動保存後は「保存した対戦に戻る」で再開できます。書出し・読込みも可能です。読込時は操作列を最初から検証し、不正形式・不正行動を拒否します。

非公開情報の保護は通常の画面表示に対するものです。交代・非アクティブ化・復帰時には手札DOMを削除します。ローカル保存・ファイルには両者の山札・手札を再現できるseedと操作列が入ります。開発者ツールや保存ファイルを相手と覗き合わない、同一端末対面用です。複数タブの同時対戦には対応しません。

## 対応範囲

|種類|カードID|各デッキ枚数|
|---|---|---|
|メイン|M-beetle-01 / M-antlion-01|各3|
|なかま|C-box / C-chameleon|各1（レア）|
|なかま|C-cat_friend|3|
|こいびと|P-cliff_goat|3|
|セカイ|W-deepsea|3|
|あいてむ|I-c_coin2 / I-sleepboost1 / I-bowtie|各3|
|あそび|G-hit-blow / G-animal-shogi / G-archery-3d|各3|
|あそび|G-area-claim|2|
|できごと|E-first-date|3|

たんじょう・異種へんしん、人物共有1人制限、満員なかま交代、装備対象・離脱、セカイ配置、交際・結婚、挑戦比較、時支払い、成長、response/chain/pass、誘発任意選択、手札を山札下へ戻す必須選択、私的な山札確認、100維持勝利・R10比較を実装しています。

閉じたプールのため、ウスバカゲロウ①のしかける軽減、がけのヤギさんの異名セカイ変更軽減、カメレオンの異名セカイ分岐は発生しません。これらを使えるカードを追加する前に対応処理と照合テストが必要です。高段階メイン、しかける、ほかの437カード、自由なデッキ編集は未対応です。

## 正本との接続

既存サイトが静的配信のため、Pythonサーバーを追加せず、閉じた範囲のルールを `engine.mjs` へ移植しました。UIは `legalActions` の結果だけを実行し、独自に支払い・合法性・効果を裁定しません。全452枚エンジンの移植完了を意味しません。

- 正本: `docs/card-game/01-core-rules.md`, `02-main-system.md`, `06-action-chain-checkpoint.md`, `64-turn-boundaries-and-victory-timing.md`。
- `build_catalog.py`: 既存114表のIDとカード本文を読み取り、出典・ファイルSHA256つき `cards.mjs` を出力。
- `tests/python_oracle.py`: 既存Pythonの `main_transition`、`challenge.stats`、`apply_hit_blow_effect` を直接呼び、75代表例を出力。既存対戦ランナーは実行しません。
- `tests/contract.test.mjs`: Python結果との比較、および閉じた範囲の処理テスト。
- `tests/browser.cjs`: 実DOMの両席操作を自動で行う完走試験。人間2人の実地試遊を済ませたという意味ではありません。
- 保存版 `hotseat-1` はこの実装専用。将来のルール変更では保存互換性を明示的に扱います。

```sh
python3 prototypes/card-game/tests/python_oracle.py > /tmp/python-oracle.json
cmp /tmp/python-oracle.json prototypes/card-game/tests/python-oracle.json
node --test prototypes/card-game/tests/*.test.mjs
# ルートをポート8765で静的配信し、Playwright + Chromiumのある環境で:
node prototypes/card-game/tests/browser.cjs
```

ブラウザ実行パスは `BROWSER_EXECUTABLE`、WebKitは `BROWSER=webkit` で指定できます。検証環境では390×844タッチ対応Chromiumで328操作・244交代、途中の保存復帰を経てA50/B40のR10決着を確認しました。実機iPhone/Safariの試遊は未実施です。テストログは `evidence/` に保存しています。

## 次の展開

まず実機iPhoneで2人の対戦・端末交代・タブ切替・保存復帰を確認します。その後、既存Pythonの対応済み処理を単位としてカード群を拡張し、代表的な状態・イベントを双方で比較します。未対応能力を無視したままカードIDだけを追加しません。全カード展開と、固定400戦の新edition・承認・実行工程は別です。

## 保護境界

本実装は `prototypes/card-game/` のみ。固定400戦入力・seed・初期順・承認・停止原本は読み替えず、変更しません。新規の人間対戦seedはこの試作版専用です。承認消費・population supervisor/worker・retry/resume機能を接続していません。既存PR #259とは別の作業ブランチ・Draft PRです。
