# 道譲り A/B/C 比較環境

`build.cjs` はV5の凍結比較生成物を読み取り、Aを変更せず、B/Cに現在の道譲りモデルを組み込む。既定の入力は `/workspace/sites/naotocchi-movement-v5/dist`、出力は `/workspace/work/yield-runtime`。入力元は変更しない。

入力元を再生成する場合は、**道譲りブランチ上でV5のbuilderを実行しない**。V5のbuilderは作業ツリーのモデルをvariant eに取り込むため、Aまで新しい挙動になってしまう。まず基準コミットの独立チェックアウトを作る。

```sh
git worktree add --detach /tmp/naotocchi-yield-baseline 02df2efc39cd18543b9c66df281872ed1751b02c
```

そのチェックアウトを作業ディレクトリにして、新規の出力先へV5を生成する。元リポジトリの資産がsparse checkoutで除外されている場合は、先にその独立チェックアウトで必要な資産を利用可能にする。

```sh
V5_SHARED_ASSETS=1 node tools/home-movement-v5/build.cjs /tmp/yield-v5-baseline
```

続いて道譲りブランチの作業ディレクトリへ戻り、次を実行する。

```sh
YIELD_BASE_DIST=/tmp/yield-v5-baseline node tools/home-yield-v1/build.cjs /tmp/yield-comparison
```

builderはAのモデルに `setYieldMode` が含まれる入力を拒否する。また、入力の `build.json` にあるV5本番モデルのSHA-256が、基準コミットの `0df78b159cefa53535337db1064016c0ba2a81e66f3ec6e4d0b08bdd8caa85cc` と一致することを必須とする。出力の `yield-build.json` に元の本番ファイルhash、QA生成物hash、今回の比較UIのsource hash、A/B/C各モデルhashを保存する。

ローカル生成では共通資産をsymlinkで共有する。公開用には新しい出力先で `YIELD_MATERIALIZE=1` を指定するか、生成物を `dereference:true` でコピーして実体化する。測定中の出力先は再生成せず、別ディレクトリを使用する。

試遊入口は `index.html`。各方式の直接入口は `game/a/movement-b.html`、`game/b/movement-b.html`、`game/c/movement-b.html`。保存キーは `naotocchi-home-yield-v1-{a,b,c}` で本編・過去の比較から分離する。各iframe読み込み時に固定の比較seedを復元する。方式・人数・地域・時間帯・リセット操作は新しいiframe読み込みを使い、個体配置だけでなくモデルの乱数・時間・道譲り状態を初期化する。

検証フックは `MovementQA` / `ReachAudit` を保持し、`YieldQA.setup(config)`、`mode('off'|'manual'|'all')`、`autonomy(bool)`、`status()`、`initial()`、`step(seconds,{autonomy})` を追加する。`setup` は描画待ちを含む非同期処理なので、偽時計を停止したブラウザ検証では既存の `MovementQA.setup` と時計進行を利用する。
