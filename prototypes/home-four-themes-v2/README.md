# 朝昼夕夜4大テーマ・音色と編曲 VERSION 2

本人限定の12パターン比較。**Draft、mainマージ禁止**。#529 `c3508ff8780c14aa4691ed74a4889a5158124ea2` から独立し、このディレクトリだけを追加しています。

試聴URL: https://naotocchi-four-themes-arrange-v2.kerzion214.chatgpt.site

## 内容

4曲×原曲/A/B、原曲と同じ位置で60msクロスフェード切替、各版の朝→昼→夕→夜、個別・ループ・音量、13地域/52背景、曲別・編曲別の評価/メモ、端末内保存とJSON書出し。縦画面は背景を見ながら操作できる固定欄付き。

原曲4曲は#529の参照とエンジンをそのまま使用。比較時だけゲイン補正と末尾余韻の循環加算を行います。元データは変更せず、原曲WAV保存では未加工レンダリングを書き出します。A/BはCC0楽器サンプルの打ち込み。生演奏ではありません。

各8編曲のAAC再生用ファイル・FLAC原盤、原曲4＋編曲8のMIDI、全演奏イベント `scores.json`、権利 `RIGHTS.md`、編曲内容 `ARRANGEMENTS.md`、原音サンプル出典・ハッシュ `samples/manifest.json` を保存。AACは1曲約0.8〜1.35MB、選択した曲のA/Bだけ取得します。原曲はブラウザーで合成し、次曲先読みを含め2曲分まで保持します。

## 再現

PythonにNumPy/SciPy、FFmpeg、Nodeが必要。元の正式配信allowlistのファイルを取得した軽量checkoutを使います。

```sh
python prototypes/home-four-themes-v2/tools/fetch-samples.py
node prototypes/home-four-themes-v2/tools/events.cjs
python prototypes/home-four-themes-v2/tools/render.py
node prototypes/home-four-themes-v2/tools/original-midi.cjs
node prototypes/home-four-themes-v2/tools/measure-decoded.cjs
node --test prototypes/home-four-themes-v2/tools/verify.test.cjs
node prototypes/home-four-themes-v2/tools/build.cjs /absolute/external/output
```

サンプルWAVは固定URLからハッシュ検証して復元できます。既存PRやV1サイトへ上書きしないでください。本番ゲームへの統合は今回含めません。

## 配信容量

Sitesの展開後256MiB上限に合わせ、FLAC原盤はGitHubに保持し、試聴ページから保存済みコミットの原盤へリンクします。AAC・正式ホーム・52背景は本人限定サイトに同梱します（約250.4MiB）。音源の再圧縮・背景の縮小はしていません。
