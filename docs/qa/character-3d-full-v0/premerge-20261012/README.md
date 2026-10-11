# Character先行マージの技術監査・iPhone実機手順

2026-10-12 JST。World完成はCharacterのマージ必須条件ではない。現在main上での安全性と、将来統合の契約を分ける。PR376はDraft・未merge、Ready/main実行承認なし。細かな293体造形QAはQuality Passへ。ナオト・鹿を含め造形変更なし。

## 監査対象と結論

- Character正本 `f82e9c0fa61dbd628d84e4d9bdfc76366aecfd2e`。main `0b0a6b30e8e098472b2fa965604f4901874942e3` は祖先（GitHub compareのmerge_base一致）。mainとの機械的競合なし。Expression368/Motion375を含む。
- World最新確認 `a0124f35e1ade1a2f2e007bb520cedb61de72b4d`、PR374 Draft。共通祖先 `591b9def6a88733721249f80d3138087d00764f0` をGitHubで照合してmerge-treeのみ実行。branch取り込みなし。最新の木1本移動も取り込まない。
- 現在のゲーム実装は `00a83a4c6847bc2b6609fd42e413561973c91830` と同一。Character38140123557 / Runtime38140131275 / Home38140131288 SUCCESSをfresh確認。全体回帰3022+80、直前の関連109/109、mutation29/29、保護11群の証跡は同一実装に限定して再利用。
- 今回はQAページ・QA専用診断・テスト・記録のみ。ゲームentrypointから新規QA moduleをimportしない。save/schema、2D/Expression/Motion、Characterモデル、World、package/test一覧を変更しない。
- 将来World統合は未実施。以下の解消方法と回帰条件を固定したが、未統合コード全体の無不具合を保証したわけではない。現在mainへのCharacter先行マージをWorld完成待ちにしない。

## 4ファイルの競合原因と解消方法

| ファイル | 原因 | 将来統合時の解消方法 |
|---|---|---|
| index.html | 両laneがmeguru.js/meguru-3d.mjsのcache tokenを更新 | 統合後の実ファイルからtokenを生成。片側の古いURLをそのまま選ばない |
| meguru.js | WorldのquietMark/mapSpotShownと、main由来のExpression公開APIが同じreturn objectを編集 | Worldの公開項目とexprQa/applyReaction/syncExpression/residentExpression等を両方保持。Worldの配置/collision設計をCharacter都合で変更しない |
| package.json | npm test一覧への独立追加が同じ行 | 両側のテスト集合を保持・重複除去。Characterテストを落として競合解消しない |
| meguru-3d.mjs | Character presenter/cleanup/diagnosticと、World ghost/adaptive DPR/visibilityが同じライフサイクルに追加 | presenterへのchar3d option、begin/endFrame、despawn cleanup、scene reset、animLevelを保持し、Worldのghost disposal・adaptive DPR・overlay引数も保持。両診断の有効化と出力を別フィールドで維持。全文ours/theirsは禁止 |

これらは未merge lane同士の競合であり、現在mainとの競合ではない。今CharacterからWorldのreturn objectやrendererを上書きする必要はない。

## 正常3Dを消失と判定する原因・Character側対応

Worldの `billboardVisible` は `!m.visible` をhiddenとする。一方Characterの `placeActor` は3Dのpresent成功時に2D板を意図的に隠す。そのため将来の単純結合では、正常3Dのplayerをhidden扱いする。

既存 `instanceOf(actor)` を使うQA専用 `tools/character-3d/presentation-diagnostic.mjs` を追加。3D instanceがあればscene接続・可視祖先・非ゼロscale・body/faceメッシュとmaterialを確認し、なければ2Dへ判定を戻す。2D板が渡されなければrenderableはnullにして未確認を保持。アクセントだけが見えてもbodyを正常扱いしない。

これは描画可能な構造の診断であり、画面の実ピクセル・frustum・霧・遮蔽は `NOT_MEASURED`。将来Worldへつなぐ際はこのactive-representation選択を使い、Worldのray/frustum/fog判定を3D本体にも適用する。単なるpresenter.has→ok=trueや、消失カウンター削除で回避しない。

実presenterを使った3件のテストで正常3D、hidden/detached/zero-scale/empty、本物の1actor失敗後2Dを確認。mutation4/4検出・完全復元。関連44/44 PASS。既存NodeのThree.js module形式警告は記録し、package種別は変えない。将来統合時にはこのテストに実rendererのcamera/occlusionとbrowser消失controlを加え、両laneのcleanup/regressionを再実行する。

## iPhone：開発PC不要の確認順

[実機確認ページ](iphone.html) はゲームを既存commit00a83a4固定で開く。QAページ自体も保存commit固定URLで使う。既存makeSaveの [1/5/27コード](../batch-human-qa-20261011/iphone-fixtures.json) と既存プロフィール読込を再利用。自動save編集なし。SafariでQA専用プロファイルを作る（同じrawcdn originのcommit間は保存領域共有）。端末名・iOSを入力する。

1. **表示・移動**：5体コードをゲームのプロフィール→セーブのバックアップから読み込む。めぐる→森に入り、playerと仲間5体が表示されること、60秒ほど移動・方向転換できることを確認。空白・消失・二重描画・固着を記録。
2. **表情**：ページの表情選択で8canonical表情を順に確認し、「通常の表情制御」へ戻す。全293体の細かな造形確認は不要。表情変更で消える・例外が起きる場合は不合格。
3. **地域切替**：ゲームの通常操作で森→街→森を3往復。現行Character基盤では非対応地域の2D表示は仕様。戻ったときの再表示、人数、残像、操作を確認。「状態記録」を往復前後に押してresourcesを記録。将来World全地域3Dの承認ではない。
4. **2D切替**：「2Dキャラ」→「3Dキャラ」を3回。同じactorが保持され、二重表示・欠落がないことを確認。
5. **actor fallback**：森・5体で「柴犬1体をfallback」。柴犬のみ2D、playerと猫ほかは3D、world3Dは継続することを目視。「状態記録」後、「再読込・障害解除」→めぐるへ戻り復元確認。既存broken WeakSetは同じactorに残るため、hooksを空にするだけを復元完了とはしない。
6. **27体性能**：27体コードを読み込み、森・障害未注入・通常表情で準備。構成を27にし、perfの `c3d 27 actors` を確認。warmup10秒以上の後「60秒測定」を押し、同じ経路を歩く。2Dキャラでも同じviewport・カメラ・経路・端末条件で60秒測定。通常モードの直接リンクでもperf値と体感を補助確認する。
7. **復帰・継続**：バックグラウンドに10秒→復帰して操作と再表示を確認。27体で5分継続後にもう一度60秒測定。測定中はバックグラウンド化や地域切替をしない。実施時間を記録し、30分試験済みとは扱わない。
8. 「記録JSONを保存」で保存し、下記の目視所見と一緒に共有。自動判定はUNREVIEWED_NOT_PASSのまま。端末のユーザーエージェントだけでは実機確認済みにしない。

| 測定・記録 | 内容 |
|---|---|
| 環境 | 端末/iOS、低電力モード・充電・発熱、縦横、viewport/DPR、commit、fixture |
| 正確な構成 | player dog04＋native仲間26、実際のテンプレート・live数。不一致は測定開始しない |
| 性能 | RAF間隔avg/p95/p99、60ms超数/標本数、draw CPU avg/p95、calls/triangles、textures/geometries、c3d resources |
| 操作・安定性 | タップ反応、引っ掛かり、消失、クラッシュ/再読込、背景復帰、5分後の発熱と劣化 |
| 判定 | 実機目視＋数値の併記。RAF値はGPU時間ではなく、Safari未公開heapは推定しない。普遍的FPS閾値のPASSは作らない |

iframe制限や配信エラーなら直接固定URLを使用し、画面perfを手動記録。強制fallback/JSON測定を実行できなかった項目はBLOCKEDのまま報告する。リンク生成・Node検証・desktop browser確認はiPhone実機PASSではない。

## 停止条件

現在の残る必須gateは実機表示・移動・表情・地域切替・fallback・27体性能の実測と評価。重大問題が出たらCharacter側の該当範囲だけ修正し再検証する。技術条件が揃った後も最終結果を報告して停止し、ユーザーの明示的Ready/main承認を待つ。Pilot baseの扱い・mainへのretargetも最終実行計画に明記する。World完成や細かな造形QAを再び必須条件に戻さない。
