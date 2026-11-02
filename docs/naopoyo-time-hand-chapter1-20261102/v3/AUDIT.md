# VERSION 3 — 正式版との差分監査

基準: main `aafe4abe7842b2fcf57060b207500e5b24f6c7a0`、PR504 V2 `1217ebaa39a15df28c48523dd9cfaef1797304b3`。関連PR484 `eb45d64f55e549f1adb368d046e3c3d7cc5c19e9`、494 `329645edf89b6d34ef888e833643819296764f36`、503 `38454e4fbf96dff3bedf06291a3d916674fdac97` を再照会。正本入口 naopoyo は chapter1、最新接触・おてほん資産は chapter2。

F1=`prototypes/naopoyo-chapter1`、F2=`prototypes/naopoyo-chapter2`、W=`prototypes/naopoyo-world`、R=`prototypes/naopoyo-rescue`、E=`prototypes/naopoyo-v2`、N=`prototypes/naopoyo-time-hand-chapter1`。

「直接」は実際のimport。「移植」は正式コードをアダプターに移したもの。「独立」は同じ実装ではない。全体を完全共有済みとは扱わない。

|項目|正式正本・関数|新章実装・相違と必要性|復帰・継承方法|回帰確認|
|---|---|---|---|---|
|1 キャラ選択|F2/app pointerdown, session.pointerActor|N/input.start。正式にない空きマスタップを本人承認で維持|pointerActor直接、隣接キャラ優先。独自select撤去|input-v2:20往復0手|
|2 拡大・浮き上がり|W/render.actorLayout|N/draw.drawBoard。タップ後も選択維持|actorLayout直接。正式倍率・位置・番号|presentation-v2数値試験。実画面未確認|
|3 影|F1/render.render|N/draw.drawBoard|足元ellipse式移植、独自選択枠なし|描画コマンド試験。画像比較未確認|
|4 タップ移動|F2/app pointerdown|N/input.start。空き隣接マスタップは本人承認差分|キャラ選択と空きマス移動を分離|同種/異種ともタップ合体・交換なし|
|5 ドラッグ|F2/session.travel, E/input.enteredCells|N/input.drag|enteredCells直接。正式と同様、通れない場所で一筆を終了しないよう復帰|壁→戻る→別方向試験|
|6 一筆書き|W/session begin/travel/end|N/session gesture/groups。D用独立アダプター|1マス1手、1筆1Undo保持|連続・重力・救出後対象固定|
|7 異種族交換|E/engine.move, F2/contact-motion|N/engine.move|生成候補以外正本一致、描画関数直接|交換1手、正式suite|
|8 同種族合体|E/engine.move|N/engine.move|同上。タップでは発動しない|8+8、同種ドラッグ|
|9 余剰分離|E/engine.arrival, F2/contact-motion|N/engine、app.animate|物理同一、contactVisualActors直接|質量・種族別合計保存|
|10 分裂・落下|F2/contact-motion, session.animate|N/app.animate/tick|表示時間計算移植、ForestSession.animate直接。D生成のみ異なる|D8方向・200配置・正式suite|
|11 Undo|W/session.undo|N/session.undo独立。Dアクション再生のため|V2一筆groups仕様を維持。白画面/追加休止なし|全解答prefix Undo、DOM|
|12 リトライ|W/session.retry|N/session.reset|新章独立アダプター維持|10面reset|
|13 保存再読込|F2/progress, W/session|N/progress, session.restore独立|V2キー・version・actions/groups維持|V2実装生成91保存prefix、DOM起動|
|14 手数|F2/app draw/example|N/app.render|正式見出し行配置を移植。state.moves|10解答・Undo・DOM|
|15 選択画面|F1/app.selectScreen|V2はselect、V3はN/stage-ui.stageGrid|正式gridマークアップ移植＋正式CSS直接import。データ供給だけ差分|初期9面無効、クリア後8面無効、DOM|
|16 順次開放|F1/progress.allowed/clear|N/progress.unlocked/record独立|次の1面、既クリア再訪、記録維持|progress.test, stage-ui, DOM|
|17 クリア演出|F1/app victory-star/nextStage|V2はテキストのみ|正式星・解除・次面ダイアログ移植、CSS直接|DOMクリア→回転イベント→次面。実ブラウザー未確認|
|18 おてほん|F2/example-replay/UI/clock|N/replay独立、app demo|playbackClock直接。前後/自動/停止/位置Map維持。正式ダイアログ全体は未共有|全10面、位置保持、通常save分離。自動再生実ブラウザー未確認|
|19 ヒント|F1/app.showHint|N/app hint/details独立|既存dialog CSS、短い面別ヒント。キーボード案内なし|DOMヒント|
|20 説明|F1/app.storyHTML|N/details章物語用|キャラselect撤去、指定タッチ文2文。通常物理説明のみ|HTML/DOM文言確認|
|21 魔法ゲート|E/engine, F2/gate-art.drawGate|N/engine, draw|描画関数直接、物理同一。新効果なし|第9面、gate+岩対角比較|
|22 トゲ|E/engine.arrival, F2/render|N/engine、drawSpike|物理D生成以外同一、描画式移植|8方向分裂、support比較|
|23 岩・支持|E/engine.supportsAt/canAscend, F2/stone|N/engine、draw|drawStone直接、支持判定同一|支持物別15条件＋stage08|
|24 出口・救出|E/engine.complete/arrival, R/fixtures|N/session.cleared、draw|独自出口ロック撤去、全員出口で完了。drawExit/drawCondition直接|全10面、封印不要テスト|
|25 盤面配置|F1/world CSS、F2見出し|N/style, sizeBoard|正式CSS直接import、8×8残余高さ、V2盤面維持|ビルド依存検証。視覚QA未確認|
|26 縦横|W/style landscape, F1 short portrait|N/style|正式基準＋5ボタン・おてほん行の最小override|指定6サイズの実ブラウザーQA未確認|
|27 画像|R/sprites.drawSprite/loadSprites|N/draw, app|同じ関数・正式32画像。新素材なし|build-preview manifest|
|28 物語・コメント|F1/app story/end|N/stages, app|10面タイトル/短文維持。恋人専用解除台詞のみ撤去|第10面のふたりの結末DOM|
|29 音・演出|F2/contactEffects, F1 victory-star|N/app/draw/stage-ui|共通contactEffects直接、クリアCSS直接。対象正式appに音声再生処理なし|正式suite。実音/実表示未確認|
|30 保存互換|F1/F2保存独立|N/STORAGE_KEY v1|本番キー不使用、削除なし、V2完了盤面も履歴保持|91prefix、完了→起動→Undo、破損拒否|

## 未承認要素と撤去

V1は学習目的（分裂数、曲がり回数、仲間による誘導、ゲート通過）の達成を `learned` に蓄積し、`policy.canEnter` で出口を閉じていた。第10面は `cageOpen` と `partnerHelp` で金印/青印/恋人操作を要求。これはV1コードの実装目的であり、本人承認の根拠ではない。V3はこれらの状態・判定・封印表示・金青スイッチ・格子・★目標を撤去。物理エンジンへ別ルールを追加していない。

`ALL` は正式R/conditions.conditionLabelが無条件出口に付ける既存ラベル。全員脱出も正式completeの条件。独自条件として削除しない。門内部の淡い光は正式F2/gate-art.drawGateのグラデーションであり、煙の新物理は存在しない。出口を覆った「封」の暗い膜のみ撤去した。

第10面は岩で囲われた部屋と既存の開口部、ペンギン、犬、トゲ、出口を維持。恋人は最初から通常のキャラとして操作できる。特別な解錠動作を必要としない救出物語として扱う。新ギミックの本人判断は不要。

学習目的はヒント/目標/おてほんに維持するが、達成しないと出口を使えない強制は廃止。一部の面では学習ルート以外でもクリアできる。これを封印で再制限しない。盤面の難度を上げる改造も行わない。

## 第08面の斜め移動

座標は内部0始まり。犬(2,6)→トゲ(3,5)：元の下(2,7)は岩、行先の下(3,6)はかえる。正式 `canAscend` の「元と先の実支持」が両方ある。かえるを除くと移動不可。そこへトゲだけを置いても不可。トゲの台は支持に含まれない。

犬が(3,5)→(4,4)へ上がる場合、(4,5)は空きなので支持不足で不可。(4,5)へ横移動なら下(4,6)の岩が支える。`cornerBlocked` は2本の直交経路が両方閉じている場合に禁止する。片側だけなら通行可能で、`canAscend` は別に評価される。ゲート上面＋岩で両経路が閉じる条件も正式と同じ。物理変更は不要。

エンジン全ソースを検査し、正式との差分がD候補ディスパッチと分裂観測フックだけであることを自動試験化。V3ではengine/prioritiesに変更なし。

## 保護と未確認

正式ファイルへのdiffなし。新章boardデータ・solutionsもV2と同一。旧盤面・解答・独自仕様はV2コミットに完全保存。独立Undo/save/replay/入力アダプターの全面共通化は行っていない（本番改変と保存契約変更を避けるため）。

52/52新章、1529/1529正式。DOM単体試験はjsdom＋描画/画像/寸法stubであり、ブラウザーQAやスクリーンショットの代替証拠ではない。Chrome接続はERR_CONNECTION_REFUSED、その後ブラウザーURLアクセス制御により拒否。指定viewport、実指、Safari、画面スクロール、視覚的モーション一致は未確認。ブラウザーQAを必須条件とするため、本人限定公開は保留。V2公開を保持する。

ローカル全体 `npm test` はsparse checkoutに本編テスト4ファイル（menu-12/story-navigation/individuality/individuality-runtime）が無いため開始不可。省略したまま成功と扱わない。本編/CARD GAMEは完全checkoutの既存GitHub CIで確認する。
