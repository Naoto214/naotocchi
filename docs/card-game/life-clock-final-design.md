# 人生の時計 — V23 最終正式採用仕様

2026年11月3日（日本時間）、本人の最終判断により **V23を最終正式採用**。V24は比較後不採用。最新の制作番号V24と正式採用版V23を混同しないこと。

## 正式仕様

| 色 | 意味 | 視覚上の役割 | 長さ / 幅 | 上からの順序 |
| --- | --- | --- | --- | --- |
| 金 | 現在のラウンド | 秒針型・最長最細 | 388.8 / 5 | 1（最上層） |
| 赤 | 先攻Aの残り「時」 | 分針型・中間 | 345.6 / 16 | 2 |
| 緑 | 後攻Bの残り「時」 | 時針型・最短最太 | 302.4 / 32 | 3（最下層） |

共通回転中心は512,500。SVGの描画順は下から緑→赤→金→中心キャップ。金→赤→緑は上から見た針の積層順。実時間の秒・分・時ではない。角度は各値×30度、ゲーム上の意味・更新条件は変更しない。左赤・右緑・下金のインダイアルとの対応を維持。

V23の形状・金属色・太さ・中心軸・層ごとの影をそのまま採用。V24の先細り・稜線・軸の反射調整は適用しない。V22承認済みの青銀文字盤、立体銀葉、中央双葉、真円リング、3つのインダイアル、全体寸法・構図、表裏、縦横レイアウト、拡大・縮小・回転・ピンチを継承する。

## 確定原本と復元

- **V23デザイン確定コミット：`0ac97d1681c117dc1ceb1744172418bb9d5f412f`**（既存の完全なV23復元点を正式採用）。今回の採用記録コミットはPR #506の後続履歴に保存する。
- 正式レンダラー：`prototypes/card-game/life-clock/v23/clock-v23.mjs`
- 原本SHA-256：`637b67d972edafb615a2514770fa22a05a8b7dda98f04af57823f9d6b7ed4654`
- 実ゲーム入口：`prototypes/card-game/life-clock-render.mjs`。表裏ともV23を直接参照。
- 機械可読の正式台帳：`prototypes/card-game/life-clock/provenance.json` の `adoption`。
- 最新制作・不採用履歴：V24、`e08a0408471eba0823af9c582b2b1c6ec22c5f66`。V24原本・比較ページ・検証記録は保持する。

全V23環境の復元は、作業中のブランチを破壊せず別ディレクトリで行う：

```sh
git fetch origin feat/life-clock-v23-20261103
git worktree add --detach ../naotocchi-v23 0ac97d1681c117dc1ceb1744172418bb9d5f412f
```

今後のブランチで時計だけを戻す場合、同コミットから `life-clock-render.mjs`、`life-clock-view.mjs`、`life-clock/v23/clock-v23.mjs` を復元し、今回の正式台帳を維持する。依存する旧版モジュール・v16画像も保持する。allowlistの実行ファイルハッシュを再計算し、時計テストを通す。reset/force pushやV24履歴の削除は不要。

## 確認用URL・比較画像

本人限定サイト（本番GitHub Pagesとは別）：

- [V23正式採用 CARD GAME](https://naotocchi-clock-v23-20261103.kerzion214.chatgpt.site/prototypes/card-game/index.html)
- [V22 / V23比較](https://naotocchi-clock-v23-20261103.kerzion214.chatgpt.site/clock-compare.html)
- [V23正式採用 / V24不採用の比較履歴](https://naotocchi-clock-v23-20261103.kerzion214.chatgpt.site/clock-compare-v24.html)
- [同一条件のV23 / V24比較画像（SVG）](https://naotocchi-clock-v23-20261103.kerzion214.chatgpt.site/prototypes/card-game/life-clock/v23/comparison.svg)

比較画像の保存場所：`prototypes/card-game/life-clock/v23/comparison.svg`。表裏の確定画像は同ディレクトリの `front.svg` / `back.svg`。画像参照は相対パスのためv16素材を併せて保存する。再生成は `node prototypes/card-game/life-clock/v23/export.mjs`。状態はround=7、A.time=4、B.time=9、A.growth=65、B.growth=40、end=10。動的比較ページは両バージョンの固定モジュールを読み、ゲーム入口の変更によって比較版が入れ替わらない。

## 実装一致・検証・公開状況

ゲーム入口と表示モジュールはV23確定コミットのバイト列へ復元。比較ページだけでなく実際のCARD GAMEもV23を使用。エンジン・時/ラウンド/そだちの計算、保存形式、状態投影、操作CSSは変更しない。

時計関連39件成功：V23原本と実ゲームの全重なり条件におけるSVG完全一致（IDと画像URLのみ正規化）、積層、中心軸、裏面、324状態の角度・値、保存復帰、V24比較固定、原本ハッシュ。既存5種類のDOM検証成功（縦横7寸法、保存復帰、CPU停止再開、拡大・ピンチ・表裏）。package単体11/11成功。Siteの全runtimeファイルとの不一致0。実機iPhone Safariの新規検証は行っていない。

デザイン採用は確定。ただし **PR #506はDraft継続、main未マージ、本番GitHub Pages未反映**。現在の確認用CARD GAMEだけがV23。残作業は別途指示によるPR確認・mainマージ・通常Pages配信・本番上の表示確認。
