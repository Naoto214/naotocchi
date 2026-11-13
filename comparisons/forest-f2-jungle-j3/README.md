# 森F2・ジャングルJ3 本人限定比較

正式採用前の背景候補です。既定背景は切り替えていません。

- Draft PR: https://github.com/Naoto214/naotocchi/pull/502
- 開発ブランチ: `compare/forest-f2-jungle-j3-20261101`
- ブランチ基点 main: `aec03c20ae8b064c6c2f8aca5537f1938df6439f`
- 読み取り専用の試遊ランタイム: PR #490 `323debc35f44136d64ae74fadf8f36da7f358e86`
- 比較サイトは新規の本人専用Site。既存ホーム・GitHub Pagesは更新しない。

## 原画と景観評価

原画は各1024×1536 PNG、配信用は同寸法WebP。生成時に人物・キャラクターを描き込んでいない。過去の参考写真は今回の作業環境に添付されていないため、提示された植生・光・構図の詳細指示を制作基準とした。

| | 現行 | 新候補 |
|---|---|---|
| 森 | 滝、苔むした小道、冷涼な谷の奥行き | F2: 大きな広葉樹、柔らかい黄緑の草地、開けた水平的な広場、暖かな木漏れ日。水なし |
| ジャングル | 赤土の一本道、両側の亜熱帯植物 | J3: 巨大シダ、深い翡翠色、広い赤土の林床、奥の暗い湿地、斜めの黄金の光芒 |

F2は視線が草地で休まり、木の枝に包まれる安心感を重視。J3は湿地の反射と細かなシダの重なりに発見があり、奥の原生林へ視線が向かう。白飛び・蛍光色を避け、J3の明暗はF2より強くした。長時間鑑賞への適性は制作上の評価であり、数時間の実機鑑賞を実施したという意味ではない。最終的な好みと採用は本人判断。

## 正式キャラクターの1・6・28体比較

`evidence/*-{1,6,28}.jpg` はChromium上の実際のゲーム画面（390×844）。現行2景観と候補2景観、計12枚。撮影元コードHEADは `083a100967e5f24e88758072cad06f02180b0444`、Actions run `41308152626`。後続の変更は回転待機・ギャラリー検証と画像掲載で、キャラクター描画処理は変更していない。

- 1体: 中央の主役を大きく表示。F2の草地、J3の林床に接地。
- 6体: 個々の正式2D画像と表情が判別でき、背景の奥行きも残る。
- 28体: 全員の安全な接地点と既存の身体可視判定を検証。密度は上がるが、湿地への侵入・画面外への初期配置は避ける。細かな葉や落ち葉との重なりは実機で確認してほしい。
- 背景にキャラクターを焼き込まず、既存の縮尺・接地影・前景遮蔽を使用。

## 歩行領域と実装分離

`scenes.mjs` に候補専用のground、foreground、seats、activity points、depthを定義。F2は草地、J3は水面より手前の乾いた林床に限定。既存ナビゲーション・接地・衝突・遮蔽アルゴリズムは変更しない。

`build.mjs` は固定HEADかつ追跡ファイルが未変更のPR490 checkoutを要求する。4,122個の正式配信ファイルをSHA-256照合し、ギャラリーが使用するindexの原本も `home-original.html` に保存。比較専用のmanifest/world/diorama/scriptを別名で生成する。正式manifestも原本のまま残す。

独立Siteオリジンと `naotocchi-f2j3-qa:<scene>:<count>:` のStorage接頭辞で比較状態を分離。本番セーブを読まない。通常の試遊は元のゲーム時計を動かす。`qa=1` の明示的なテストURLだけ時計固定。ギャラリーからの試遊リンクにはqa指定なし。

正式2Dキャラクター、13地域、最大28体、育成31系統、仲間26体、恋人18体、Relationship Expression、Motion System v2、Conversation Director、会話・通知UI、育成・仲間・恋愛ルール、セーブキー／スキーマ、5＋4操作ボタンへの変更なし。

## 検証

- 候補地形・生成物契約: 8件成功。5つの投影幅×各36経路×2景観=360経路、安全地点・水面禁止点も検証。
- PR490 production regression: 365件成功（各ブラウザーCIジョブ）。
- 初回の広範囲baseline suite: 3,292件中3,279成功、13失敗はsparse checkoutで除外された既存QA資料不足。資料を同じHEADから復元し、該当ファイル再実行80件＋256件が全成功。単一の全件再実行成功とは表現しない。
- Chromiumの48条件成功を `evidence/chromium-083a-results.json` に保存。320/375/390/430幅×4景観×1/6/28体、縦横回転、安全な主役の退出を確認。候補は390幅の各人数で物理タップ・ドラッグ・自律移動差分も検証。
- 後続CIはWebKitのネイティブviewport更新完了を待ち、同じ条件を検証。最新結果はPR502のchecksを参照。
- ギャラリーにゲームiframeを常駐させず、選択した一画面のみ試遊。歩行領域ボタンと12画像の読み込みも検証対象。
- 独立レビューで指摘された通常時計停止、累積距離だけの自律判定、身体可視・画像デコード不足、未コミットbaseline入力の問題を修正。

## 再現

```sh
# baselineには上記PR490固定HEADをcheckoutする
F2J3_BASE=./baseline node --test comparisons/forest-f2-jungle-j3/geometry.test.mjs
node comparisons/forest-f2-jungle-j3/build.mjs baseline /tmp/f2j3
F2J3_OUT=/tmp/f2j3 node --test comparisons/forest-f2-jungle-j3/build-contract.test.mjs
# Playwright 1.62.1と対象browserを用意
F2J3_ENGINE=chromium node comparisons/forest-f2-jungle-j3/browser.cjs /tmp/f2j3 baseline
F2J3_ENGINE=webkit node comparisons/forest-f2-jungle-j3/browser.cjs /tmp/f2j3 baseline
```

## 残る本人確認

iPhone Safari実機のGPU・タッチ・ブラウザー上下面バー・横向き・長時間鑑賞は、デスクトップWebKitの自動検証では代替できない。比較URLで1/6/28体を確認し、正式採用を判断する。今回mainマージ、PR490変更、既定背景変更、本番Pages配信は行わない。
