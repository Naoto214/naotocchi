# CARD GAME 同一端末2人対戦 — 452枚試遊版

全452枚の正本定義を収録し、452 IDすべてを明示的な実行処理に登録しています。メイン248・ともだち26・パートナー18・アイテム26・あそび100・ワールド13・イベント21枚をデッキ編集から使用できます。対応一覧・カテゴリー集計は `evidence/coverage.json`。全組み合わせの正しさを証明したものではありません。

## 試遊

本編メニューの「CARD GAME」から同一端末2人対戦を開けます。

- 本編: https://naoto214.github.io/naotocchi/
- CARD GAME: https://naoto214.github.io/naotocchi/prototypes/card-game/
- 本人専用UI試遊版（維持）: https://naotocchi-card-ui-trial.kerzion214.chatgpt.site/
- 以前のブラウザ試遊版（維持）: https://naotocchi-card-trial.kerzion214.chatgpt.site/

Pagesと本人専用Siteの保存領域は別です。途中対戦を移す場合は既存の書出し／読込を利用してください。11回のiPhone QAを反映していますが、公開版での最終通し対戦・回転・Safariバー開閉は実機で確認してください。

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
- `selection.mjs` / `replacements.mjs`: 複数カードの指定、同種・異種制約、依存する支払いと対象、移動置換・成長／能力値の減少防止。
- `event-effects.mjs` / `remaining-rules.mjs`: 出来事に結び付く予約、勝負終了、場を離れた自身の誘発、期限と同時処理順。
- `ability-copy.mjs`: 本文能力のコピー、コピー元と独立した使用回数、参照先と期限。
- `advanced-inspection.mjs`: 相手の選択を含む複数段階の公開・探索・並べ替え。
- `costs.mjs` / `advanced-equipment.mjs` / `advanced-effects.mjs`: 複合支払い、装備つけ替え、数値設定、減少防止、同時移動の保護対象選択。
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

452枚対応版の代表的な実ブラウザ操作（Chromium、390×844、タッチ）では、追加カード入りデッキで429操作・291交代・R10 A65/B45まで完走しました。保存復帰・二重クリック拒否・交代時の手札非表示・452枚のデッキ編集を確認しています。共通handler／回帰158テスト、正本カタログ再生成一致、Python代表717例は成功。記録は `evidence/expansion-452-browser.json`、`expansion-452-tests.log`、`expansion-452-review.md`。実機Safari完走と全カードの個別完走・全組み合わせは未証明です。

## 残る確認と対象外

実機iPhone Safariの表示・タッチ・保存復帰・通し対戦はユーザーによる最終QAが必要です。今回の検証で未解決の重大な進行不能は確認していませんが、全組み合わせに不具合がないことの保証ではありません。AI対戦、オンライン対戦、アート・音響、細かなバランス調整、網羅的戦略証明は対象外です。

固定400戦入力、承認、停止証拠、正本docsは変更・実行しません。非アート版はPR259→381→384の順にmainへ統合します。制作中の専用アートPR393は取り込みません。統合記録は `INTEGRATION-20261018.md` を参照してください。
