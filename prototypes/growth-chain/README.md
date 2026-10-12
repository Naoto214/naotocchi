# Growth-chain rule laboratory

本編から独立した検証用プロトタイプ。設定値は比較用であり、正式ルールではありません。
既存ゲーム、World、Character 3D、save/schema、ルートの依存関係を変更していません。

`growth-chain-standalone.html` をブラウザで開くとオフラインで試遊できます。
`index.html` は本ディレクトリを静的配信して使用してください。
初期状態は自動落下OFF。盤面編集・資源付与は人工条件として区別してください。

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
`npm run test:browser` は実行可能なChromiumが必要です。CHROME_PATHで指定できます。

## 証拠

`results-20261012.tar.gz` は195ファイルの生ログ・再現盤面・検証結果を保持します。
SHA-256: `f45cba1a9c4905be139ae734abd21ce305023c1376dddd9315829acb5c43d9db`

展開後の全48条件・3,840試行・95再現ログ・554,528操作を再生し、seed初期状態、最終checksum、連鎖・08イベント、卵収支、終了と打切り、集計分母の一致を確認済みです。
詳細と引き継ぎは `HANDOFF.md`。実行履歴は `LEDGER.md`。
