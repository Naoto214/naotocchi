# 海・雪山とワープ演出の比較改善

開始HEAD dc94a568973fff7d73fba84e70fd4fee43f3863f。最新remoteと一致、他の変更なし。

海は盤面座標に沿う砂床・波紋・深さのグラデーションと、つながった岩礁へ変更。珊瑚は疎らな位置に限定。雪山は岩盤を連続させ、露出した縁の積雪、吹きだまり、氷の側面、通路の亀裂で区別。旧案は保持しrefinement.htmlで36px/48px比較。

ワープ原因はchapter2接触timelineがwarpイベントを無視し、最終座標へ補間していたこと。V4限定のtimeline派生にワープイベントを追加。入口まで通常移動→入口で透明化→透明のまま座標を切替→出口で表示。1ワープを含む手は260ms、連続2ワープは520ms。物理・gameMove・正式入力・Undo・保存は変更なし。既存Presentationとキャラ描画を利用し、表示・つかみ直し・アーチの視覚判定を同じ座標列へ統一。reduced-motion時は既存の瞬時切替。旧演出はプルダウン切替。

## 検証
- Node回帰225/225成功。V3保護ハッシュ・100面合法解の回帰を含む。
- 新規:ワープの即時座標更新、間の座標を描かない、単一個体描画、不発時非消失、reduced-motion/reset、連続ワープ、途中のアーチが誤反応しないこと。
- Chromium/Playwrightで320/375/390/430px、36/48px全組合せ。比較canvasは288/384px実寸、ページ横はみ出し0、JSエラー0。大きな見本はカード内スクロール。
- 操作盤面幅304/359/374/414pxを維持。全幅でワープ11手の見本クリア。390pxではtouchStart/move/endによるドラッグ入力でクリア、Undo、retryを確認。
- スクリーンショットsea-snow-36.png/48.pngを目視確認。記号反復を抑え、通路と岩盤の境界、キャラと数字を確認。
- iPhone Safari/WebKit実機は未検証。Chromiumの画面幅再現をSafari成功と扱わない。

再実行: リポジトリrootでpython -m http.server 8765、playwright導入済み環境からnode prototypes/naopoyo-100/v4/tests/refinement-browser.cjsおよびrefinement-touch.cjs。CHROMIUM_PATH指定可能。

物理・V3盤面・正式素材・保存形式を変更せず、比較室のみ更新。mainマージ・本番Pages公開なし。

タップだけの初回検証では合体先の仲間を選択してしまい10手で停止した。正式仕様どおり仲間への接触はドラッグで再検証し、入力仕様は変更しなかった。
