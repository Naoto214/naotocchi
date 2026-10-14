# CARD GAME 同一端末2人対戦 — 対応拡大中

全452枚の正本定義を収録し、196 IDを明示的な実行処理に登録しています。残り256 IDは一覧で未対応と表示し、デッキに入れられません。全452枚完成版ではありません。対応一覧・カテゴリー集計は `evidence/coverage.json`。

## 試遊

オーナー専用試遊Site: https://naotocchi-card-trial.kerzion214.chatgpt.site

Site project: `appgprj_6acf7174c93c8191af3ec3af31994e7d`。既存本編やGitHub Pagesには組み込まず、独立配信します。公開結果・配信commitは `evidence/trial-deployment.json` を参照してください。実機Safariの最終確認は未実施です。

ローカル配信: リポジトリルートで `python3 -m http.server 8000 --bind 0.0.0.0`。PCでは `http://localhost:8000/prototypes/card-game/`、同じLANのiPhoneでは `http://<PCのIP>:8000/prototypes/card-game/`。

## 操作と保存

開始画面でA/Bそれぞれ40枚のデッキを編集できます。通常同名3枚・レア1枚上限。名前、ID、本文、種類で検索し、デッキの書出し・読込も可能です。編集内容と進行中の対戦は別保存です。初期デッキは従来の15 IDを使用します。

対戦開始後は端末を渡し、本人のボタンで手札を開きます。手札の選択で合法行動を絞り、行動のボタンから対象・宣言・支払いを選びます。双方の連続パスでチェーンを逆順解決し、必須選択を終えて進行します。通常行動からターン終了を申し出られます。100維持またはR10比較で結果を表示します。

保存はseed・編集デッキ・操作列を検証して再生する方式です。旧 `hotseat-1` は変更しない `legacy-engine.mjs` で復帰し、新対戦は `hotseat-2`。同一端末の二重操作はrevisionで拒否します。複数タブの同時操作は対象外です。

非公開情報保護は通常画面での対面試遊を対象とします。交代・非アクティブ化・復帰で手札DOMを消去し、伏せ札、探索中の私的カード、対象ラベルを非公開にします。ローカル保存から両者の状態を再現できるため、開発者ツールや保存ファイルを相手と覗き合わないでください。

## 実装と検証

既存の静的配信構成に合わせたJavaScript移植です。Pythonをブラウザ内で直接実行しているわけではありません。UIは `legalActions` の結果を使い、独自裁定は持ちません。

- `build_full_catalog.py`: 既存design-data checkerから452枚、本文・数値・出典SHAを取得。
- `rules.mjs` / `main-rules.mjs`: 明示的な共通効果プログラム。未対応本文を無効果扱いするfallbackはありません。
- `effects.mjs`: 探索・公開範囲・並べ替え・カード移動・予約・条件・一時補正・割引・誘発・発動前の時／手札コスト・mandatory choice。
- `engine.mjs`: 40枚編集入力、高段階遷移、履歴、generation対象固定、伏せ札、保存互換。
- `tests/python_oracle.py`: 既存Python正本から660遷移支払い・48能力値・9ヒット＆ブロー、計717例を取得。追加カードすべてのPython一致を証明したものではありません。
- `tests/expanded.test.mjs`: 編集デッキのR10完走・保存同一再生、予約、伏せ札、公開範囲、対象再入場、履歴条件等。
- `tests/deck-ui.cjs`: 390×844タッチ画面、452一覧・同名上限・別席編集・保存分離・交代保護のDOM試験。

```sh
python3 prototypes/card-game/build_full_catalog.py --check
python3 prototypes/card-game/tests/python_oracle.py > /tmp/python-oracle.json
cmp /tmp/python-oracle.json prototypes/card-game/tests/python-oracle.json
node --test prototypes/card-game/tests/*.test.mjs
```

従来版のブラウザ完走は328操作・244交代・R10 A50/B40。今回の拡張デッキではエンジン操作によるR10完走と保存の完全再現を検証しています。拡張後の実機Safari完走と全カード個別完走は未証明です。

## 残作業

残る主な処理は、複数対象・複数カードの発動コスト、除去や成長減少の置換・防止、能力コピー、チェーン発動無効・対象変更、相手が選ぶ探索、ラウンド単位制限と勝負後の誘発です。既存共通handlerへ順に追加し、未対応IDを解放します。AI・細かなバランス・網羅的戦略証明は範囲外です。

固定400戦入力、承認、停止証拠、正本docsは変更・実行しません。PR381とPR259はDraft/open/unmergedを維持します。
