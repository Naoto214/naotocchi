# 独立ゲーム標準仕様（2026-10-14更新）

最新の卵報酬正本は [EGG-REVISION-20261014.md](EGG-REVISION-20261014.md)、検証結果は [EGG-REPORT-20261014.md](EGG-REPORT-20261014.md)。その他の標準ゲーム仕様は [FINAL-SPEC-20261014.md](FINAL-SPEC-20261014.md)。以下の旧ラボ説明・比較結果は履歴として維持する。

- 6×12、選択5系統×各4体の20体バッグ、01の2体セット、NEXT3。
- 接続全体を最下段・最左へ1体に統合、最大＋4。独立集団は同じ波。両方着地後に解決。
- 各進化イベントの最終段階04/05/06/07で普通/銀/金/プラチナを各1個。08進化・寿命消滅は卵なし。旧死亡報酬は比較用に保持。
- ゲージは実際の成長段階数。8/24を試遊基準、12/36と比較。具体的な得点係数も暫定。
- 犬・ペンギン・クマノミ・キノコ・蝶は全段階表示。本編全8段階発見で追加系統を解放。saveは読み取りのみ。
- 左右長押し／回転／落とす。右の道具→種類と盤面を選ぶ→結果予告→確定。選択中も落下する。重なる卵や無効な対象は消費しない。
- 進化解決中は操作をロック。落下ペアは道具で変身しない。ゲームオーバー後の救済なし。
- standaloneは初期5系統の既存画像を内包。追加系統の画像はリポジトリのassetsを参照し、読めなければfallback。
- iPhone実機Safariは未確認。Chromium結果と混同しない。本番統合・マージ・公開は禁止のまま。

新比較の再現：`tar -xzf results-final-20261014.tar.gz` → `node verify-final.mjs`。
新比較の再開：`node measure-final.mjs`（保存済み試行をスキップ）。旧比較は下記の手順を使用。

---

# Growth-chain rule laboratory

本編から独立した検証用プロトタイプ。設定値は比較用であり、正式ルールではありません。
既存ゲーム、World、Character 3D、save/schema、ルートの依存関係を変更していません。

`growth-chain-standalone.html` をブラウザで開くとオフラインで試遊できます。
`index.html` は本ディレクトリを静的配信して使用してください。
初期状態は自動落下OFF。左右は長押し、回転はタップ、「落とす」で確定。
着地・連鎖の完了後は次の2体を始めるまで待機し、卵・へんしん・だいへんしんを選べます。
道具は対象と種類を選び、盤面の結果予告を確認して「この結果で使う」。キャンセルは資源を使いません。
比較設定・盤面編集・ログは「検証モード」にあります。資源付与は人工条件として区別してください。
最新のUI検証と未確認項目は `MOBILE-QA-20261013.md`。暫定ルールの正式確定はしていません。

## 再現・検証

リポジトリルートから:

```sh
tar -xzf prototypes/growth-chain/results-20261012.tar.gz -C prototypes/growth-chain
node --test prototypes/growth-chain/tests/*.test.mjs
node prototypes/growth-chain/verify-results.mjs
```

測定の再開は `python3 prototypes/growth-chain/run-all.py`。保存済み結果はスキップします。
完全再測定は結果ディレクトリを別名に退避してから実行してください。
`jobs/` に48条件のseed・ルール・方策・打切り条件を保存しています。
`manifest.json` は主要比較、`supplement-manifest.json` は観測後に宣言した探索的追加比較です。

UI開発用依存関係は本ディレクトリだけで `npm install`。
`npm test`、`npm run test:dom`、`npm run build:standalone` を使用します。
`npm run test:mutation` は6種類の故障を一時コピーへ注入して検出します。
`npm run test:browser` は実行可能なChromiumが必要です。CHROME_PATHで指定できます。
ブラウザテストは同じプロセス内でローカルHTTPサーバーを起動します。別途サーバーの起動は不要です。
QA_FONT_CSSは任意のローカルNoto Sans JP CSS（参照woff2込み）をテスト時だけ注入する指定です。ゲームの実行時依存には含みません。

## 証拠

`results-20261012.tar.gz` は195ファイルの生ログ・再現盤面・検証結果を保持します。
SHA-256: `f45cba1a9c4905be139ae734abd21ce305023c1376dddd9315829acb5c43d9db`

展開後の全48条件・3,840試行・95再現ログ・554,528操作を再生し、seed初期状態、最終checksum、連鎖・08イベント、卵収支、終了と打切り、集計分母の一致を確認済みです。
詳細と引き継ぎは `HANDOFF.md`。実行履歴は `LEDGER.md`。


## 2026-10-14 最終バランス検証

[BALANCE-REPORT-20261014.md](BALANCE-REPORT-20261014.md)を参照。576試行、自然卵獲得は初期0でも成立。ただし自然な卵由来の再獲得循環は未確認。8／24推奨はユーザー決定待ち。確定ルール・本番挙動は変更なし。旧0/200と今回の探索的結果を混同しない。
