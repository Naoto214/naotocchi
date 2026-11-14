# 共通石ブロック A/B/C 比較（採用待ち）

本人のiPhone評価により、前回の海・雪山改善案は不採用。形状を世界別に変える方針を終了し、正式版の石ブロックを共通基盤にする。開始HEAD b988b33de187d9e7747b0643deaa7bbe1f3f4790はremoteと一致。

- A: 正式版drawTerrainを直接呼ぶ。海・雪山・森で同じ表示。
- B: 同じdrawTerrainに素材色だけを渡す描画context。元の石の質感・輪郭・陰影構造・マス目をそのまま保持。世界別の色へ28%寄せ、元の色72%を残す。第一候補だが未採用。
- C: Bに小さな珊瑚、雪、苔を最大4か所。壁の空いた部分だけで、床・キャラ・数字・ギミックと看板には重ねない。

同じV4箱比較盤面を使用。新規stone.htmlに海/雪山/森×A/B/Cを表示。36px/48pxを切替、比較PNG6枚をダウンロード可能。旧worlds.html、前回refinement.html/landscape.mjs、新ワープpresentation/warp-motion、操作app、盤面データを無変更で保持（protected.json）。V3の100面・エンジン・素材・保存も既存SHAテストで保護。

## 検証
- Node回帰228/228成功。
- A/Bの全6環境について、正式版と描画パス・座標が一致することをテスト。
- Chromium/Playwright:320/375/390/430px×36/48px。9枚すべて288/384px実寸、ページ横はみ出し0、JavaScriptエラー0。
- Aの3環境canvasの画像データが完全一致。
- 6枚のPNGは1CSS px=1画像pxで保存。3案を横に並べた比較画像。実寸36/48pxは各盤面内のマス幅。
- iPhone Safari実機は未検証。上記はChromiumでの画面幅確認。

再実行: rootでpython -m http.server 8765、その後playwright利用環境でnode prototypes/naopoyo-100/v4/tests/stone-browser.cjs。CHROMIUM_PATH指定可能。

正式採用・100面への反映・mainマージ・本番Pages公開はしない。本人限定比較版だけに追加。
