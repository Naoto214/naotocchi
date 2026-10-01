# Motion System v2 — recovery pilot 実行結果

Branch: `design/motion-system-v2-20261001`。
開始時にremote HEADをfresh確認し、`4d61057d5d8d3f6e32da8e77ebbb40c953ee14fe` と一致。
このremoteから新規cloneして作業。main mergeなし、回復pilot以外への横展開なし。

## 実行した検証

| 検証 | 結果 | 証跡 |
|---|---|---|
| 指定のcast-motion＋emotion-integration | 69 PASS / 0 FAIL | [log](motion-system-v2-recovery-20261001/dedicated-green.log) |
| Home関連8ファイル | 364 PASS / 0 FAIL | [log](motion-system-v2-recovery-20261001/home-green.log) |
| cure表情の通常/reduced-motion追加確認 | 2 PASS / 0 FAIL | [log](motion-system-v2-recovery-20261001/cure-expression-green.log) |
| Relationship関連＋既存QA tooling | 104 PASS / 0 FAIL | [log](motion-system-v2-recovery-20261001/relationship-green.log) |
| asset integrity | 6 PASS / 0 FAIL | [log](motion-system-v2-recovery-20261001/asset-green.log) |
| 全 `npm test` | exit 0; Node test 2,802＋80＝2,882 PASS / 0 FAIL | [full log](motion-system-v2-recovery-20261001/npm-test-green.log) |

全npm testに含まれるsmoke、dialogue、visual QA routeの各scriptも成功。
上表は重複を含むため合算しない。Home364件の実行後、cure表情テストを
通常/reduced-motionの2ケースへ拡張し、その2ケースと全npm testで検証した。
全npm testのNode test第1段は850.7秒、第2段は5.9秒。主な待ち時間は既存のめぐる全地点移動検証。

実行順は指定専用テスト→Home→Relationship→全npm test。
初期のRelationship予備実行はHome実行中に起動してしまったためgateには使わず、
Home修正後に指定順で再実行した結果だけを上表に記載。

コマンド:

```sh
node --test tests/cast-motion-test.cjs tests/emotion-integration-test.cjs
node --test tests/cast-layout-test.cjs tests/viewport-design-test.cjs tests/home-touch-test.cjs tests/ui-integration-test.cjs tests/care-status-test.cjs tests/care-status-integration-test.cjs tests/pet-expression-integration-test.cjs tests/overlay-test.cjs
node --test tests/relationship-expression-test.cjs tests/relationship-expression-integration-test.cjs tests/relationship-reaction-test.cjs tests/relationship-home-qa-test.cjs
npm test
```

## REDと修正

1. 初回指定テストは67 PASS / 1 FAIL。focused recoveryテストの正規表現が
   二重エスケープされ、実際は−14pxのフレームをNaNとして読んでいた。
   パーサーを修正し、有限値・16px上限・原点・集団非移動も検証。
2. 初回Homeは363 PASS / 1 FAIL。遅延bounce削除時に、既存のhappy表情の余韻まで
   削除されていた。`scheduleCareAfterglow` にmotionなしの表情のみ経路を追加。
   recoverの後は静的happy表情を維持し、2回目のbounceを戻していない。
3. 独立レビューで、回復会話の恋人の「ゆっくりしよ」がsettleとなり、
   周囲全体を7px動かす経路を確認。再現テストのREDを確認後、medicine_cure会話では
   話者や台詞にかかわらずgroup motionを停止。26体の回帰を追加。
4. 初回全npm testで変更済みJSのcache token不一致を2テストで検出。
   このrunは中断（exit 130）し、全回帰完了とは扱っていない。
   `cast-motion.js` / `script.js` の2つのtokenだけ更新して全npm testを再実行し成功。

REDログも上の証跡ディレクトリに保存。
検証対象sourceとログのSHA-256は [manifest](motion-system-v2-recovery-20261001/evidence-sha256.json) に固定。

## 保護対象と判断

- medicine_cureはrecover、medicine_wrongはshake。苦味の成功台詞よりイベント意味を優先。
- recoverは1回の主ピーク、16px focused budget、原点復帰、装備同期を維持。
- 回復会話による周囲全体の大きな移動を抑止。ambient全体の振幅は変更していない。
- reduced-motionと既存の表情復帰判定を維持。
- 画像・save schema・progression・Relationshipのハート/オーラ/指輪の所有関係は変更なし。
- 設計正本/実装計画の広域工程は実装しない。旧design-only文言は履歴として保持し、
  今回のユーザー指示で許可された回復pilotの修正/検証だけを実行。

判断: 回復後のhappy表情は既存契約として残し、motionをnull指定して分離する。
誤った判断だった場合の影響は約1秒の表情表示であり、進行・報酬・セーブには作用しない。

## 未実施・次のgate

- 実ブラウザ自動runnerは未実施。Playwrightブラウザ本体の取得が失敗した。
  上のHome/Relationship GREENはNode runtime/geometry検証であり、browser GREENではない。
- 人間による回復motionの可愛さ・大きさの確認は未実施。
- 独立レビューでwoman/06＋既婚クマの指輪と、主役の上昇時の矩形交差リスクを指摘。
  可視ピクセルの衝突は未確認。ring所有関係を変えず、実画面の頂点を確認する。
- 次に専用QAシーンと操作手順を用意する。人間目視承認前の横展開・main mergeは禁止。
