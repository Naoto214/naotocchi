# なおぽよ。既存資産継承一覧 — VERSION 2

2026-11-02。対象 PR #504。監査基準 e352e3c947ee012ae4cf917e8bce8ef08e205be7、main aafe4abe7842b2fcf57060b207500e5b24f6c7a0。正式01–20面・本編・CARD GAME・Pagesのソースを変更しない。

**全面的な「完全継承」とは判定しない。** 同じ関数を呼ぶ箇所と、D物理・牢・協力条件に適合させた別実装を区別する。iPhone Safari実指QAは本人の再確認まで未確認。Work側はChromeのみで、WebKit実行をしていない。

## 調査した系統

|系統|確認した正本・意味|
|---|---|
|正式第1章|`prototypes/naopoyo-chapter1/`。入口は `naopoyo/index.html` からリダイレクト。`render.mjs` が `actorLayout` を使用。|
|正式第2章|`prototypes/naopoyo-chapter2/`。`ForestSession`、`pointerActor`、contact motion、example関連を調査。|
|V10|6f79d585 系統の既存履歴・検証資料、`docs/naopoyo-v10-20261028/repro-source.json`。contact/余剰/再合体を既存試験で回帰。|
|V11 / #436|e81b64f9 系統・PR436 head ab937a22 系統。入力・表示・連続モーションを統合後ソースと比較。|
|V12|f08b7de2、4dfa17df、d160c03e の履歴。おてほん位置保持、1マス1手、休止UI整理。|
|#482 / #483 / #484|79981dde / 809c1f8 / 統合851cf09 系統。第2章統合後のmainに含まれる正式資産を基準とした。古いDraftを更新しない。|
|#494|329645edf89b6d34ef888e833643819296764f36。新章内Dエンジン・経路規則の出所。|
|#503|38454e4fbf96dff3bedf06291a3d916674fdac97。T1–T8を別ディレクトリに取り出し36試験通過。変更なし。|
|新章V1 / #504|e352e3c。`input.mjs` のキャラヒットより隣接移動を優先する分岐が誤交換の原因。|

以下、F1=`prototypes/naopoyo-chapter1`、F2=`prototypes/naopoyo-chapter2`、W=`prototypes/naopoyo-world`、R=`prototypes/naopoyo-rescue`、V=`prototypes/naopoyo-v2`、N=`prototypes/naopoyo-time-hand-chapter1`。

## 27項目の監査・継承方法

|# / 項目|正式版ファイル・関数|新章ファイル・関数 / V1の状態・欠落|区分・継承方法 / 検証|
|---|---|---|---|
|1 選択|F2/app `pointerdown`, session `pointerActor`|N/input `BoardInput.start`、app pointerdown。隣接キャラを移動先扱い|同等継承：キャラヒット最優先。動いている生存キャラは正式 `pointerActor` 直接使用。20往復タップ試験・Chrome犬→蛙、0手。|
|2 選択モーション|W/render `actorLayout`、F1/render `render`|N/draw `drawBoard`。V1四角枠のみ|完全継承（形状計算）：`actorLayout` を直接importし選択倍率・位置・番号位置を再利用。5盤面幅×四隅試験。時間ベースの浮遊を新作しない。|
|3 選択中表示|F1/render held・影・番号|N/draw `drawBoard`|同等継承：影・番号の式を移植。正式はactive中、新章はタップ選択を離した後も保持する仕様差。四角選択枠なしを描画試験。|
|4 タップ移動|F2/app pointerdownはキャラからbegin|N/input `start`。空き隣接タップはV1に存在|同等継承（要求仕様）：空きマスのみ移動、キャラなら選択。正式の空きマスタップを同一挙動と偽らない。単体試験。|
|5 ドラッグ|F2/session `travel`、V/input `enteredCells`|N/input `drag`。V1に存在、落下後絶対位置依存|同等継承：enteredCells直接再利用、正式の指カーソル相対移動を移植。Chrome交換・落下後連続試験。|
|6 一筆書き|W/session begin/travel/end|N/input、ChapterSession.beginGesture/endGesture|同等継承：IDを一筆中固定、救出後の他キャラへの操作移譲を禁止。3マスドラッグ→3手→Undo0手をChromeで確認。|
|7 選択切替|F2/app pointerdown / pointerActor|N/input start|同等継承：選択の優先順位を修復。同種族もタップでは合体しない。ドラッグは合体/交換。回帰試験。|
|8 同種族合体|V/engine move|N/engine move、F2/contact-motion contactVisualActors|完全継承（演出関数）、物理はD派生を維持。新章解答・contact回帰。|
|9 余剰分離|V/engine contact、F2/contact-motion|N/engine、N/app animate|完全継承（描画関数）。duration式はForestSession.travelから移植。Dエンジン無変更、正式contact試験。|
|10 異種族交換|V/engine move、F2/contact-motion|N/engine move / input.drag|完全継承（描画関数）、入力同等継承。タップ0手とドラッグ1手を別々にChrome確認。|
|11 分裂モーション|F2/contact-motion contactVisualActors|N/app animate/draw|完全継承（イベント→描画関数）。Dの生成イベントを渡す。旧BFSを実行しない。経路と10面再生試験。|
|12 落下モーション|F2/session animate、contactVisualActors|N/app presentation/tick|完全継承（時間進行）：ForestSession.prototype.animateを直接call。state/motionだけの表示アダプタ、active=null。正式の待ち行列加速を再利用。|
|13 おてほん|F2/example-replay、example-position、example-clock.playbackClock、example-ui.openExample|N/replay ExampleReplay、app openDemo/demoStep。V1に前後/保存済|一部継承：時計は直接再利用、D用セッション/解答/位置Mapは別実装維持。10面前後・位置保持・通常保存非干渉をChromeハンドラ経由で確認。正式ダイアログ全体は未共有。|
|14 Undo|W/session undo、F2/session undo|N/session undo、app undo|同等継承：Dアクション再演算＋一筆グループを維持。通常/再読込後Undo試験。Chrome白画面なし、即再操作。|
|15 リトライ|W/session reset|N/session reset、app retry|同等継承：V1を維持。Chrome/単体試験。|
|16 保存再開|F2/progress ForestProgress、W/session serialization|N/progress ChapterProgress、session restore、app save|同等継承（検証範囲）：別キー、合法手再演算、V1互換維持。破損拒否・再読込・クリア記録を試験。正式保存移行は対象外。|
|17 手数|F2/example/WorldSession|N/session actions、app render|同等継承：1マス1手。一筆Undoと再生解答の手数試験。|
|18 ステージ選択|F1/F2 app select|N/app switchStage/render|同等継承：新章はコンパクトなselect。10面/無効化状態試験。正式選択ダイアログ全体のコピーなし。|
|19 順次開放|F2/progress ForestProgress|N/progress unlocked/record|同等継承：V1実装を維持。単体試験。ブラウザー環境は既存クリア記録あり、初期開放は単体試験が証拠。|
|20 縦画面|F1/style、W/layout|N/style main grid、app sizeBoard|同等継承（Chrome測定）：固定操作44px＋残り高さの盤面。CSSは新章内容に適合。320/375/390/430幅でページ溢れ0。Safariバー未確認。|
|21 横画面|F1/style landscape|N/style landscape|同等継承（Chrome測定）：568×320、844×390でページ溢れ0。実機回転は未確認。|
|22 正式画像|R/sprites loadSprites/drawSprite、sprite-data|N/app loadSprites / draw.drawSprite|完全継承：同じ素材32枚・関数。犬/魚/蛙/ペンギン各1–8。猫のプレイ用画像はこの正式パイプラインに無し。語り手cat_friendは別用途。新規画像なし。|
|23 岩等|F2/stone drawStone、gate-art drawGate、R/fixtures drawExit/drawCondition|N/draw drawBoard / drawSpike|完全継承（岩・ゲート・出口の関数）、同等継承（トゲ描画の移植）。牢/封印は新章固有で維持。|
|24 通知コメント|F1/F2 app message、render|N/app command/render、details|一部継承：通知領域と短文・長文分離。新章物語/恋人台詞を保持。正式の章固有コメントは対象外、通知表示システム全体は未共有。|
|25 音・演出|F1/F2/W/R実装検索、F2/contactEffects|N/app/draw|演出は完全継承（contactEffects、contactVisualActors）。対象正式実装に効果音再生を確認できず音は対象外。全旧実験の音源不存在までは断定しない。|
|26 アクセシビリティ|F2/app keydown、正式reduced-motion|N/app keydown、index dialog/select、style focus|一部継承：矢印＋斜めキー維持、44px主要操作、reduced-motion。方向ボタン8個は明示要求で撤去。スクリーンリーダー実機未検証。|
|27 iPhone Safari|正式pointer capture・coalesced events・touch-action|N/app pointer handlers、style dvh/safe-area|一部継承：primary/pointerId/cancel/lostcapture、最終up座標、touch-actionを整備。時間閾値は正式に無いため新設しない。実指/バー伸縮/高速タップ/回転は未確認。|

## 入力境界と実装差分

- V1は選択済キャラに隣接するヒットを `step` へ送っていた。キャラがあれば常に選択が先。空きマスの隣接タップのみ移動。
- ドラッグは正式 `enteredCells` の面取りセル境界通過判定。時間でタップをドラッグへ変換しない。セル内長押し/微振動では移動しない。
- `pointerdown`で表示上の生存キャラを正式 `pointerActor` で拾い、演出のみ追い付かせる。`pointermove`は捕捉IDだけ受理し、coalescedサンプルを処理。`pointerup`も最終点を処理して一筆終了。cancel/lostcaptureで終了。
- 非合法移動時に新章の入力は一筆を終了する。正式の継続再試行と完全一致ではない。今後の共有化で仕様を明文化する。
- 第三者レビューで「救出後に選択フォールバックした仲間が残りのドラッグで動く」を発見。失敗試験を確認後、gestureActor固定で修正。
- `ForestSession`は生成/移動に使わない。`animate`の表示専用メソッドと`pointerActor`のみ再利用。D物理のmoveはN/engineのみ。
- 選択枠・通常座標・方向ボタンを除去。目標マスや牢の枠はゲーム情報なので維持。座標はdrawBoardのdebugCoordinates=trueで検証用に残す。

## ブラウザー証拠・限界

Chromeで正式公開第1章を開き、キャラへのタップと正式盤面を確認した。V2では犬→隣接蛙の選択切替0手、ドラッグ交換1手、Undo0手、3マス一筆3手、再読込3手復元→Undo0手を確認。全10解答はUIハンドラを操作するQAページで最後まで再生した（実指とは異なる）。

`viewports.json` は同一Chromeの正確なiframe viewport寸法。通常画面のボタンは44px、ページスクロールなし。320×480では盤面218px（1マス約27px）となるため視認性制約あり。文字/操作全体を縮小していない。実Safariのアドレスバー/セーフエリアは未確認。正式とV2の選択中フレームを並べた動画比較は未完了。形状は直接再利用と数値試験で確認し、見た目が似ているだけで完全継承とはしない。

## 自動試験

- 新章 `tests.txt`：選択、ドラッグ、重力後一筆、救出時対象固定、選択表示、10面解答、Undo、保存、協力・恋人救出、D経路。
- 正式 `formal-tests.txt`：1529/1529。最初の実行はsparse checkoutの検証資料欠落で失敗、Gitの同一ファイルを復元して全件通過。ゲーム/テストを通すために改変していない。
- #503 `tutorial-tests.txt`：36/36。T1–T8の固定HEADを別配置して実行。
- `pages-tests.txt`：公開allowlist/正式入口/本番保存保護の16試験。最初はsparse checkoutの旧ページ3ファイル欠落、Git同一ファイルを復元。
- Runtimeはsparse環境の全入力不足でローカルnpm testが失敗。CARD GAMEとRuntimeの最終判定は完全checkoutのGitHub CIで行う。

## 100面への継承境界

新章生成時はN/input、draw、appの表示アダプタをコピーして増やさず、ステージ定義・解答・章メタデータを供給する方針。正式のenteredCells/actorLayout/contactVisualActors/contactEffects/animate/pointerActor/playbackClockは今回直接共有した。次段階はBoardInputと表示アダプタを章非依存モジュールに抽出し、正式側のテスト契約も通してから正式側を移行する。今回、正式ゲームを改変する大規模リファクタはしない。

Undo/save/replayは `ChapterSession` のD物理と牢の条件に結合するため正式セッションをそのまま置換できない。今後は物理バージョンとsession factoryを注入し、保存キー/解答identity/一筆境界を共通契約化する。旧BFSへ戻す移行はしない。
