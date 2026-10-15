# Character 3D 表情統合 — 実装・検証記録

状態: 実装済み、Draft PRで保管。**iPhone実機Human QA未実施。mainマージ禁止。**

## 正本・再利用

- 開始時最新main: `ad559758bc9101adc7c00ab04ed333572ce37d9d`
- 開始時tree: `6cddcb7ded93275e71581ce8a9778e5a00ba39f4`
- ユーザー提示監査HEAD: `cee3e8726ef3078e9b349e300c976e831786bbf0`、tree: `97d9a836daf44fbcf023aab1bbf9c843aa55892a`
- branch: `feat/character-expression-complete-20261016`。開始時最新mainから分岐。
- #278 / #372 / #376 / #379 はmergedとして確認。Home Pet/Relationship Expression、resident resolver、既存293モデル、顔atlas・目・rig・fallbackを再利用。
- 並行作業 #382 はDraft、確認時HEAD `6a56ce9ecba6b5c17ee898b2b98808d51b8ab8b9`。契約の読み取りのみ。ブランチのmerge/rebase/上書きなし。

## 実装範囲

共有語彙は既存8状態＋hungry / weak / critical / lonelyの12状態。31系統×8段階＋なかま26＋恋人18＋作者1=293体のモデルを再利用。新規メッシュ・本番画像・保存フィールドなし。

`expression-presentation.js`が描画専用の感情解決・短期イベント・終了処理を担当。`script.js`の小さなbridgeはHomeの既存resolverから現在の育成状態を取り、現行のbond/affection・Relationship reactionを読み取る。`meguru.js`とhybrid rendererの描画前で同じ`actor.expr`を作り、3Dと2Dが共用する。住民の生活AIや歩行・同行条件は変更しない。

同行者には住民AIを追加せず、既存のjoy/sulkだけを描画用タイマーとして読む。反応終了後は現在の親密度・生活状態を再評価する。通常会話も既存applyReactionの表示用sequenceで同じpositiveを再発動できる。sequence/exprは一時的なworld actor上の値であり、本編saveへ追加しない。

## 優先順位と終了条件

| 対象 | 優先順位（高→低） | 終了・復帰 |
|---|---|---|
| 自分 | Homeのblocked→sleeping→critical→明示reaction（normal含む）→現在の育成状態 | `PetExpression.resolve`をそのまま使用。実際のworld bridgeは現在状態を毎描画で取得 |
| 恋人・なかま・住民 | sleeping / critical →生活由来dislike→交流positive / 関係positive / 生活positive→sick・weak・strained・tired・hungry→関係lonely→通常生活状態 | 短期レイヤー終了時に現在値を再評価。sleeping/critical/dislikeが来たらsocial cueを破棄 |
| 関係性のみ | positive > lonely（値30未満）> normal | 29→30でnormal。既存回復positive中はpositive、期限後に再評価 |
| 同行開始 | 現在の感情を保持 | `accompany_start`は表情をpositiveに強制せず、短い挨拶cueのみ |

離れて暮らしている距離・不在時間をlonely条件にしない。生活dislikeをlonelyに読み替えない。sick/weak等より一時positiveを優先するのはHomeの通常反応契約に合わせるが、critical・睡眠は保護する。

Home既存2500msとresident既存世界dtのjoy/sulk期間は変更しない。新規social sessionはHome context 2.5秒、world context 10 active presentation seconds。world描画間隔は最大0.1秒に制限し、描画しない期間を一括加算しない。同じ描画時刻で2D/hybrid双方からprepareされてもdtは0。world既存生活時計・AIはそのまま。

実際の`visibilitychange(hidden)`は`suspendExpressions()`へ接続。古いsocial/party cueを破棄し、再開時に現在値を読む。低FPSを非表示と誤判定しない。region/world切替・actor交換・退場でも旧cueを継承しない。stopMeguruでsessionをresetする。

Homeの一時お世話反応は、もともとHome退出時に無効になる仕様を維持する。worldへ古いHome反応を持ち越さない。食事・治療直後のnormal afterglowを共通resolverで受け入れることと、worldで再生することは別。Home画面の挙動は変更しない。

## 2D / 3D 対応表

| 共通状態 | 成長キャラ2D | 恋人・なかま2D | 3D |
|---|---|---|---|
| normal | normal/base | normal/base | 既存 |
| positive | happy | positive | 既存、social中は連続bounceを抑える |
| dislike | sulky | normal/base | 既存 |
| tired | tired | normal/base | 既存 |
| sleeping | sleeping | normal/base | 既存・最優先 |
| strained | strained | normal/base | 既存 |
| wantsPlay | wantsPlay | normal/base | 既存 |
| sick | sick | normal/base | 既存 |
| hungry | hungry | normal/base | 軽い半目・小口・控えめなうなだれ |
| weak | weak | normal/base | 半目・活力低下・小さな姿勢変化 |
| critical | critical | normal/base | さらに閉じた目・gloom・明確なうなだれ |
| lonely | sulky（近い代替） | lonely | 寂しげな眉・口・軽い姿勢変化 |

作者の2Dは全状態base。恋人・なかまの2Dにはlife専用画像がないためnormalを使い、dislike等を関係性悪化のlonely画像へ誤変換しない。これらは完全再現ではなく明示したfallback制約。`expr.emotion`の意味は保持する。

遠距離・build待ち・build失敗・個体更新失敗・2D切替は同じ`expr.asset`を参照する。画像decode待ちには従来どおりbase/glyphを使用し、decode後に現在表情へ戻る。画像未読込中まで全感情が視覚的に再現されるとは主張しない。

既存2D 2480参照とRelationship 88参照の画像ファイルは変更なし（tracked expressionファイルは旧版等を含む2484件、digestも保持）。asset fixtureは変更しない。source保護fixtureは許可された`meguru.js`の表示接続差分だけを更新。

## 種族と動作

共通表情パラメータを既存顔atlasと立体目へ適用。犬は既存耳・頭のdroop、鳥は頭・翼、魚は既存bodyの小さな傾き、植物はstem、キノコはcapの姿勢へ渡す。個体id別の大量分岐なし。全面画像方式Aも同じパラメータで描画する。

交流動作は900msの小さな首振り/うなずき。4 active秒の動作cooldownがあるが、新しいイベントの表情とtokenは更新する。遅れて構築された3Dに古い動作を再生しない。cueを解除するとgreetも止める。reduced-motionでは一時動作を出さない。相手への実方向・視線target、専用ハートの追加は本差分では行わず、既存姿勢・accentを再利用。

## 自由行動側との独立契約

PR382の`socialSession.subscribe(listener)`に合わせたオプション購読。`relationship-life.js`のimportや未完成AIへの依存はない。socialSession不在でも通常育成・生活・関係性は動作する。

```js
// source may be absent on current main.
const unsubscribe = meguruMod.expressionEvents.subscribe(socialSession);
// Or feed one immutable v1 notification:
meguruMod.expressionEvents.accept({
  version: 1,
  type: 'reunion',
  actorKey: 'companion:shiba', // partner:cat_ceo など、現在viewのkey
  at: 12.4,                 // active session seconds; epoch millisecondsではない
  context: 'meguru',        // Home用factoryは 'home'
  regionId: 'forest',       // Homeでは省略可
});
```

| type | 表現 |
|---|---|
| reunion / greeting / visit | positive＋短いgreet |
| affection_interaction | positive＋控えめなgreet |
| accompany_start | 現在の感情＋greet（状態は上書きしない） |
| accompany_end | positiveによる穏やかな別れ |
| return_to_free_life | 原則一時反応解除。同じatのaccompany_end直後は別れを一度だけ保つ |

`reason`がexit / region_change / relationship_changedなら演出を取消す。その他（time_elapsed / destination / player_choice等）は上表どおり。日付・デート開始終了は自由行動側が既存typeへ対応付ける。

イベントは対象actorが現在viewで登録された後に送る。生成/region切替直後に通知する接続側は、先に`prepareExpressions(view, now)`を呼ぶか初回描画後に通知する（未知actorのイベントは保留せず拒否）。PR382実統合時にこの順序も確認する。

v1・context・現在region・現在actorを検証。不明イベントはfalse。actorKeyごとに直近16イベントを`at,type,reason`でdedup、時刻の逆行を拒否。履歴上限512key。region/actor交換後も履歴は保持し、明示session resetで破棄。別イベントは新しいatまたはtype/reasonを持つこと。同一tick・同一type・同一reasonの別イベントを区別するeventIdはv1にないため、送信側で時刻を進める必要がある。

この層は「誰が・いつ・どこへ行くか」を決めない。AI、経路、同行判定、訪問頻度、bond/affectionは書き換えない。接続候補の競合箇所は`script.js`のmeguruBridge/meguruMod初期化/終了・visibility handler、`meguru.js`のinstall/export。PR382側が同じ箇所を変えている場合はこれら数行を手動で統合して両契約テストを再実行する。本Workでそのブランチをmergeしていない。

## 検証結果

- `focused.log`: 48/48 PASS（最終差分、専用17件＋既存resolver/品質/2D保護/asset gate）。
- `browser.json`: 実Canvas atlasで293/293構築、12状態×293=3516適用成功、全面画像face16箇所。pageerror 0。
- `world-browser.json`: PASS、8チェック。実アプリbridgeのhungry/weak/critical/sleeping/normal、bond29→30、模擬再会、reduced-motion、2D hungry texture upload、個体failUpdate時lonely textureを確認。
- `relationship-bridge.json`: 全44体の実bridge 29→30、恋人18体の既存reinforceRelationship→positive→2500ms後の現在値復帰がPASS。
- `preservation.json`: inventory293体と既存8表情パラメータは開始mainと一致。model builder/geometry/rigの変更なし。
- `protection-final.log`: 既存Character/World保護42/42 PASS。
- `full-suite-before-export-fix.log`: 全体3161件実行、3157 PASS / 4 FAIL。4件ともexport行の先頭名を固定した静的検査。既存export先頭を維持する並び順へ修正し、検査は変更しない。
- `export-regression.log`: 修正後、該当4suiteとCharacter/asset保護を含め101/101 PASS。
- `full-suite.log`: 最終全体通し再実行中。結果確定までDraftを維持。
- `load-browser.json`: 27体・60フレーム・12状態同時切替。CPU animation p50 0.2ms / p95 1.7ms、render submission p50 2.7ms / p95 15.3ms、303 draw calls / 287308 triangles。800×500の独立シーン、SwiftShader。GPU完了時間、World FPS、iPhone性能、RAM、旧版比較ではない。
- RED→GREEN: missing4/API、critical上書き、古いcue再生、同一actorKey再配送、flag off、同行開始の感情保持、低FPS誤判定を再現後修正。
- 初期回帰では新規ファイルのgit未登録によるasset gateと古いmodule cache token、8状態固定assertを検出・修正。初期world browserでは低FPSを非表示とみなす誤りを検出・修正。失敗を最終PASSへ混同しない。

## 画像QAと実機ゲート

`contact-species.jpg` / `contact-growth-party.jpg`は11体×6表情の66画像。犬1/4/8、魚・鳥・植物・キノコ・全面画像face、なかま・恋人・作者を目視確認。weak/criticalを区別でき、顔の消失・明確な破綻は見られない。魚の正面、小さな恋人の顔はhungry/lonelyが控えめで、通常World距離の判別性は未確定。

World 3画像は実体/2D texture経路の証拠。ソフトウェア描画では遅く、字幕の一部に代替不能なglyphの四角が見える。World全体の視覚合格・実機性能を示す画像として扱わない。背面視点の主人公は顔が見えないため、顔の判断はgallery画像と実機で分ける。

iPhone Human QA（未実施）:

- Safari実機、通常サイズ/距離/斜め/側面でhungry・weak・critical・lonelyを判別できるか。特に魚と小さい顔。
- 実際のお世話・治療・食事→Home normal afterglow→world再入場の現在状態、睡眠/critical中の交流競合。
- 恋人/なかま29↔30、回復positive期限後、自由生活中の距離がlonelyを発生させないこと。
- 再会・親密交流・同行開始/終了/復帰、重複配送・同じpositive別イベント。連続ジャンプ/長すぎる喜びがないか。
- 背景化/復帰・region/通路切替・退場/再入場・相手交換後に古い反応が戻らないか。
- 遠距離LOD、初回構築待ち、強制build/update失敗、2D/3D切替の表情とdecode待ち。
- Reduce Motion ON/OFF、縦横、熱/電池/RAM/FPS、27体同時変化。実測端末名・OS・ブラウザ版を記録。
- #382統合後に実イベント購読・actorKey/region/atを確認。現時点は模擬入力で接続契約を検証。

未完了: iPhone Human QA、PR382実装との実統合、相手方向への視線target、関係キャラのlife専用2D画像（既存のnormal fallbackを使用）。新規2D大量生成は今回の必須条件に含めない。
