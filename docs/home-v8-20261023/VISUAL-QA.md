# version 8 画面QA・比較画像

Cloud Chrome管理プレビューによる検証。本人iPhone Safari実機QAとは区別する。画像転送を復旧し、22枚の個別画像と5枚の比較画像を保存した。

## 要求された比較

| 対象 | 画像 |
|---|---|
| 都会の修正前後 | [v7 / v8](screenshots/city-before-after.jpg) |
| 歩道・車道・建物 | [都会の通常画面](screenshots/city-normal-390.jpg) |
| 正式最大人数（主役＋来訪者1人） | [恋人・仲間の選択と歩行](screenshots/maximum-cast-drag.jpg) |
| サイズ・配置 | [90% / 80% / 70% × 恋人・仲間](screenshots/size-comparison.jpg) |
| 初回操作案内あり | [初回案内・状態表情・会話](screenshots/guide-first-390.jpg) |
| 通常プレイの案内なし | [通常画面](screenshots/city-normal-390.jpg) |
| イベント通知表示中 | [通知と会話](screenshots/notice-normal-390.jpg) |

補足: [案内表示・非表示・通知の比較](screenshots/guide-comparison.jpg)、[森・水辺・都会](screenshots/region-comparison.jpg)、[メニューのヘルプ](screenshots/menu-help-390.jpg)、[320×568のヘルプ](screenshots/menu-help-320-short.jpg)。

## 幅別確認

| CSS幅 | 基本情報の下端 | 通知の上端 | 案内なしの高さ | 画像 |
|---|---:|---:|---:|---|
| 320 | 156.59 | 161.59 | 0 | [320](screenshots/notice-normal-320.jpg) |
| 375 | 157.98 | 162.98 | 0 | [375](screenshots/notice-normal-375.jpg) |
| 390 | 157.98 | 162.98 | 0 | [390](screenshots/notice-normal-390.jpg) |
| 430 | 157.98 | 162.98 | 0 | [430](screenshots/notice-normal-430.jpg) |

高さ844px相当。通知は基本情報の5px下。会話の上端は466〜468pxで通知と分離し、育成ボタンも画面内に表示。320×568では既存の短画面レイアウトとスクロール可能なメニューを確認。数値は[DOM測定記録](screenshots/layout-measurements.json)のcurrent。通知はqa-layoutの表示fixtureで、報酬条件を変更・試験したものではない。会話は既存Conversation v2が継続更新する。

## 操作・見た目

- 最新公開sourceの操作見本で恋人をドラッグし、`partner:forest_bear / selected=true / walking=true / activity=walk`を確認。
- 仲間も`companion:shiba / selected=true / walking=true / activity=walk`を確認。状態欄の直近イベントは別キャラの到着で上書きされ得るため、選択・歩行datasetも読み取った。
- 176pxは主役の画像枠（390px幅時）。正式最大2体のため一律縮小はせず、相対サイズ・自律移動を維持。比較写真は同じ時刻・同じ姿勢を保証しない。90%はより重なりやすく、70%は表情が小さくなる。完全な重なりでは手前がタップ優先となる制約は残る。
- 初回案内写真では病気の正式表情を保ったまま案内・通知・会話が分離。再表示写真はメニュー経由であり、初回状態の再現と混同しない。
- 都会の前景は芝生と細い散策路。中央車道・両側歩道・入口へつながる建物が分離。森・水辺の既存構図を維持。

## 撮影の出所と限界

通常画面、通知4幅、メニュー390、案内再表示、2種類のドラッグ画像は公開済みSite source `3d2c2cacafdc4d8d7ac914ed928a500b678af55d`を再取得した管理プレビューで撮影。その他は同じv8実装の先行検証で撮影した画像を復旧した。先行検証から現行版への差分はキーボード選択修正とmainのquick.js更新・cache tokenで、掲載したHome地形・画像・CSS・サイズは同じ。v7側は既存の`docs/home-free-terrain-20261023/screenshots/city-390.jpg`。合成はラベル追加と並置のみ、ゲーム画面を書き換えていない。

Cloud Chromeの画面はiPhone実機／Safari／実指入力ではない。管理プレビューの描画品質や速度も実機WebGL性能を保証しない。本人実機では表情、2体のタップ・ドラッグ、初回案内の終了・再表示、safe-area、車・通行人・魚、通知＋会話、画面復帰・長時間の滑らかさを確認する。
