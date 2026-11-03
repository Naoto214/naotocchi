# Home version 12 — iPhone QA 統合

Draft PR [#426](https://github.com/Naoto214/naotocchi/pull/426) を継続。
本人限定試遊版: https://naotocchi-home-diorama-20261022.kerzion214.chatgpt.site

**Site version 12 / succeeded**。所有者1名・外部0。GitHub Pages本番とmainへの書き込みは行っていない。実機Safariでの最終採用判断は未実施。

## 正本・保護範囲

- v11正本 `11c732ac70d2491986cda76767350d6d01f062d9`。残っていたCIは7 workflowすべて成功（World visual quality / Runtime smoke / Pages runtime package / Naopoyo official release / slide series / integration / Home layout）。
- 調査した最新main `92ac654644351a169b9661e2319b0cd81670c497`（#435）を**Draft側に取り込んだ**。なおぽよ第1章の入口・進行連携・公開リストを巻き戻さない。mainへのマージではない。
- #253の正式画像bounds、#366のRelationship Expression、#382の自由生活・単一来訪資格、めぐる共通地形・経路・衝突・遮蔽、v11の所属全員表示を再利用。
- 仲間26＋現在の恋人/配偶者1＋主役1＝最大28。加入・離脱・求愛・結婚・別れ・報酬・育成値・保存形式をv12では変更していない。
- [保護ソースのSHA-256](logs/protected-sources.json): 20ファイル中19はv11と実バイト一致。唯一の差はmain由来の `conversation-away.js`（第1章の既存進行読取り）。Director、質問・選択肢・専用44キャラ・postgame、Expression、Motion v2、地形、正式boundsは一致。台詞・抽選・頻度の変更はない。
- 正式画像2,991ファイルもHEADとの一致を確認。追加の食事・掃除・投薬画像は制作していない。

## 変更と選択

| 項目 | v12の結果 |
|---|---|
| 主役の大きさ | 1〜5体は従来の**85%**、6体以上はv11の人数別サイズを維持。例: 390px級の比較条件で176→149.6px。仲間は一律縮小しない。カメラ/地形の遠近感・正式bounds・44px補助ヒットを保持。来訪だけで所属人数や縮尺は変わらない。 |
| 配置 | 少人数は主役を中心に後方へ緩い弧。大人数は前・中・奥への既存分散を保ち、各列の深さに曲率を追加。障害物は既存nearest/routeで補正。配置は初期/再配置だけで、その後は自由生活。 |
| 集合リアクション | 既存Motion v2のGROUP/cleanを**比較Pilotのみ**で呼び出せる。新しい定期イベントは採用しない。短い同調と3D配置側のtransform所有権の整合・実機での騒がしさをまだ確定できないため。値/報酬を変えない。 |
| 移動領域 | もともと全役割共通のbounds/destination/navigation/衝突処理だった。恋人専用の狭い矩形は存在しない。画像・装備の幅による安全余白は異なる。役割制限を追加せず維持。 |
| 恋人の接近 | 既存idleのapproach/togetherの選択を主役寄りに調整。自由散歩も残る。選択/ドラッグ後12秒以上の非保存graceを設け、到着・リサイズ・取消で短縮しない。会話/育成/睡眠のblockedと既存5/3/2同時移動上限を尊重。 |
| 育成操作 | 上段「あそぶ・ごはん・そうじ・ねる・くすり」、下段「じゃれる・きゅうあい・たび・メニュー」。20分割gridで上段5等分/下段4等分。正式色・アイコン・機能を維持。 |
| 寝る/起きる | 同じ正式sleep atlasの向きを固定。睡眠中はラベルとtitleを「おきる」に同期。`data-sleeping`を表示状態として追加。キャラクター向きがボタンに伝播する経路は再現しなかった。新しい起床画像は作っていない。 |
| 通知 | 上部に48pxの固定枠。子通知46px、内容はスクロール可能・先頭揃え。空/通知/長文でホームや操作の高さを変えない。既存の順送りと内容/報酬を保持。 |
| 数値通知 | 数値を残して文字/余白を簡潔化する方式を採用。「重要イベントだけ」「バーだけ」は細かな獲得量が見えなくなるため不採用。情報を削除せず密度を調整。 |
| タップ名 | 主役は `currentVisualStage().label`、例「大人のいぬ」。仲間・恋人は正式名。ゲームタイトルの「なおとっち」を個体名として使わない。選択名はホーム上端、会話は下側の予約枠。 |

[主役のみ](compare-scale-1.jpg) / [2体](compare-scale-2.jpg) / [3体](compare-scale-3.jpg) / [6体](compare-scale-6.jpg) / [13体](compare-scale-13.jpg) / [28体](compare-scale-28.jpg)

各画像は左から100/90/85/80%。同じ390×844のブラウザ条件。全景の原本24枚も `scale-人数-割合.jpg` として保存。少人数では90%より85%の余白が自然で、80%より主役の表情を読みやすい。大人数の80〜90%は主役の存在感が弱いため既存100%を保持。これは視覚比較による採用判断であり、実機での好みの確定ではない。

[旧分散](formation-distributed.jpg) / [緩い弧](formation-arc.jpg) / [20体](count20.jpg) / [最終28体](final28-observed.jpg)

## 会話の原因と入力接続

本人の `IMG_6896.png` はConversation v2ではなく、個性システムの**「なかまと、ひととき」**だった。既存の結果は適用されていたが、結果文を `setMessage` にしか渡さず、別のイベント通知があると隠れる。この経路を実装から確認した。既存結果「言葉がなくても、気持ちよさが伝わった。」をホーム内の一時statusにも表示する。新しい発言として扱わない。元のイベントには専用Reactionが定義されていないので追加しない。

この交流/年齢選択をHome限定の小型ポップアップにし、背景の暗幕を外した。再描画しても固定Homeを解除しない。ゲーム進行/actorの既存pauseは保ち、背景描画を継続する。二重・古い選択・閉じるクリックの伝播を防ぐ。

Conversation v2自体の通常選択は、変更前のruntime harnessで成功し、元の不反応を再現しなかった。ただし古い取り外し済みボタンと入力伝播の問題は再現・修正した。既存 `conv2Answer→conv2Play→setSpeechBubble` を使い、既存350msの返答待ち・Reaction接続を維持。ブラウザでも「座れる」→**「じゃあ、席とっとく」**を確認した。

[質問ポップアップ](conversation-question.jpg) / [既存返答](conversation-response.jpg) / [交流ポップアップ](exchange-popup.jpg) / [交流結果](exchange-result.jpg) / [通知と質問](notice-and-question.jpg)

詳細: [会話監査](conversation-notes.md)。再描画中のHome維持について追加RED→GREENを実施し、Home-touchを含む76件成功。最終merge後の関連44件も成功。

## 自動検証

| 検証 | 結果 |
|---|---|
| package.json全9区分、並列上限2 | 3,564件、初回3,557成功/7失敗、skip/cancelなし。smoke/dialogue/visual-QAスクリプトも成功。 |
| 初回7件の原因と閉鎖 | 編集途中のサイズ期待2件、未更新トークン2件、sparse参照不足3件。サイズ/トークンは最終ソース再実行36件成功、参照復元後6件成功、household再実行21件成功。 |
| main取り込み後のv12/会話/asset gate | 44/44成功。 |
| 独立レビュー再検証 | 42/42成功。追加重大問題なし。 |
| 恋人モデル | 11/11。4 seed×600秒、180秒障害物迂回、5/6/28体×300秒、manual grace・衝突・同時実行上限。 |
| なおぽよ第1章 | 88/88成功。 |
| なおぽよ救出 | 205/205成功。 |
| publication unittest | 16/16成功。本番へのデプロイはしていない。 |
| CARD GAME | 411/412成功。残る1件は過去の文書35がsparse入力にないため、歴史資料からの再生成検証が実行不能。ゲームロジック失敗ではないが、全成功とは報告しない。 |

広域検証にはExpressionのpositive>lonely>normal、lonely救済/ハート/指輪/非保存Reaction、Motion v2、全44専用掛け合い、Director/v2/postgame、加入/求愛/結婚/別れ、旧セーブ互換、新性格、地域、地形/経路/遮蔽を含む。新規3テストファイルは `npm test` の明示リストへ追加。旧テストを削除・無効化していない。v8の176pxという視覚期待だけ、依頼された85%の149.6pxへ変更。

[広域結果・全ログ](broad-notes.md) / [最終44件](logs/main-integration-focused.log) / [カード残件](logs/final-card-restored.tap)

## A〜Jの個別回帰対応

| 実機QA | 保存済み回帰・証拠 |
|---|---|
| A 主役サイズ | `home-v12-layout-test.cjs`、24サイズ比較。 |
| B ボタン | 同テストのDOM順序、[4幅の実測](logs/browser-widths.json)。320pxで最小54.19×49px、375以上で高さ53px、全て5＋4。 |
| C 寝るアイコン | `home-v12-conversation-test.cjs`の睡眠state/title。[睡眠中](sleep-icon.jpg)でtransform:none、ラベルおきる。 |
| D 配置 | `home-v12-layout-test.cjs`の弧/密集/正式bounds、旧分散比較。 |
| E 恋人移動 | `home-v12-partner-test.cjs`、[移動監査](partner-notes.md)、共有領域画像。 |
| F 通知伸縮 | 実測でcast334.859375px/care111pxが前後一致。[通知あり](notice-present.jpg)・[長文](notice-long.jpg)。 |
| G 会話入力 | `home-v12-conversation-test.cjs`：現行ボタン・二重/古い/期限切れ・返答/Reaction・交流結果。 |
| H 正式名 | 同テスト、[大人のいぬ](formal-pet-name.jpg)。 |
| I 数値 | 長文の既存情報を保持。46px枠でscrollHeight121px、先頭文字top185.875>枠top181.875。 |
| J 28体生活 | household/partner/terrain既存試験、[28体動作中](final28-observed.jpg)。 |

320×568では300pxのホームとタップ面積を保ち、文書を縦スクロールする。[上側](width-320.jpg) / [操作側](width-320-controls.jpg)。全要素を568px内へ押し込む方式にはしていない。375/390/430の画像も保存。大きい文字時は改行を許可するが、実機の拡大文字・VoiceOverは未確認。

## 動作・視覚QAと限界

- **Cloud ChromiumによるブラウザQA**。本人のv11 iPhone Safari画像（IMG_6895/6896/6899/6900/6906/6907ほか）は不具合の入力証拠として参照し、v12実機確認済みとは扱っていない。個人の画像そのものはこの公開GitHub証拠へ再掲載しない。
- 1/2/3/6/13/20/28体、4幅、3地域、タップ正式名、恋人ドラッグ、通知/質問/返答/交流を確認。入力の詳細な優先順位はモデル/runtimeテストでも検証。主役/仲間を含む全役割の指ドラッグとiPhoneスクロールは実機確認が残る。
- 共有移動領域: [森](navigation-forest.jpg) / [水辺](navigation-river.jpg) / [都会](navigation-city.jpg)。緑は実モデルから取得した全役割の共通安全範囲、黄は体/装備寸法による安全余白差、赤は地形または境界で移動不可。役割ごとの別AI/別地形ではない。
- 恋人: [近く](partner-near.jpg) / [離した後](partner-drag-away.jpg) / [時間差](partner-later.jpg) / [連続フレームGIF](partner-sequence.gif)。GIFは観測静止画を順番に表示したもので、実時間動画ではない。自然な帰還の定量確認は4 seedのモデル試験で行った（近距離63%、遠距離25%、43回帰還）。iPhone実測値ではない。
- 13体/28体の時間差観察で散歩・休憩・見回し・同席・向き変更と背景の継続を確認。Cloud側はWebGL2 unavailableでCanvas fallback。28体の一標本では約0.88FPS、heap約41.7MB、描画処理平均5.45ms/p95 14.1ms。ブラウザ操作/スクリーンショット環境で強く間引かれており、iPhone性能や長期メモリ安定性の根拠には使えない。
- [集合反応前](group-before.jpg) / [Pilot後](group-pilot.jpg)。短いMotionの見え方を確実に評価する高フレームレート動画は取得できなかった。自動発生は正式採用せず、本人限定QAの明示ボタンだけに留めた。
- 公開後、Sites成功・version12・所有者1/外部0を確認。Cloudブラウザは所有者ログイン画面まで確認。公開先の認証後の内部操作は、このブラウザでは未実施。内部画面QAは同一ソースのmanaged previewで行った。

## 次のiPhone確認

1. まず少人数で85%の顔/表情と、仲間・恋人の相対サイズを確認。
2. 通知なし→通知→消失、会話選択中→返答でホーム/操作が跳ねないか。
3. 恋人を離してドラッグし、直後に戻されず、後で自然に近づくか。
4. 320px級短画面で縦スクロールとタップ/ドラッグが競合しないか。
5. ねる/おきる、個性の交流結果、v2の返答が読めるか。
6. 28体で発熱、Safari復帰、10分以上の動作、文字拡大/VoiceOverを確認。

## v13へ分離した事項

食事・箒掃除・投薬の専用アニメーションは未制作。拡張点は既存 `cast-motion.js` のevent→reactionPlan/レベル優先度、care action開始/終了、actor内部のpresentation wrapper、正式画像のbounds/anchor。小物レイヤーを既存画像と組み合わせる試作から始め、専用絵の必要性を個別に判断する。既存育成値・イベント頻度とは分離し、睡眠/会話/ユーザー入力を中断しない設計が必要。

## 保存・公開識別子

- Site source: `34144596a1daae169c3583d8950333578ba6bf2b`
- Deployment: `appgdep_6adc2a740a1481919c8eeb8631541ba2` / succeeded
- 通常試遊保存キー: `naotocchi-home-diorama-preview-v1` を維持。
- 比較QA保存キー: `naotocchi-home-v12-qa-v1`。本番 `naotocchi-save-v1` とも通常試遊とも分離。
- GitHub実装: `7fb7fd0abd4fff400ecf406de60b1f49a576ad89`。v11と最新mainを親にし、ローカル検証済みtreeとGitHub treeの完全一致を確認して保存。
- 本文・画像・テストログはこのフォルダに保持。初回v12 CIのPages packageは、main統合時の検証用ハッシュ3件の旧値への巻戻りで失敗。`cast-motion.js` / `home-touch.js` / `meguru-3d.mjs` の実コードがv11と一致することを確認し、ハッシュのみ修復。実パッケージ生成（216,678,400 bytes）に成功。新HEADのCI結果はPR画面で別途確認する。
