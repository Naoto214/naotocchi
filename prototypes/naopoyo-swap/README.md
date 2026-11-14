# なおぽよ・入れ替え型 独立試作

2026-10-20。**本人試遊用・バランス未確定。既存版へ接続しない。**

- 試遊サイト: https://naopoyo-swap-20261020.kerzion214.chatgpt.site （所有者限定）
- 仕様: [SPEC.md](SPEC.md)。前Workの統合設計・R01〜R28・試作計画を引き継ぐ。
- 実装上の裁定: [LEDGER.md](LEDGER.md)。検証・実測: [REPORT.md](REPORT.md)。
- 正本: `Naoto214/naotocchi`、基点 `db9ea8e8d86c632a68ed8ab4880968803f78a243`。
- 独立ブランチ: `feat/naopoyo-swap-20261020`。mainへのマージ・本番Pages更新は禁止。

## 遊び方

隣り合う2マスを順番にタップ、または隣へドラッグ。空きとの交換も可能。同じ段階を縦横3体以上そろえる。同種は進化、混合は消滅。反応時だけ下へ落ち、連鎖する。同種08の上下左右隣接でクリア。

設定から種族数・卵間隔・段階分布・seedを変更して新規開始できる。標準は4種族・卵4有効手・01〜04均等・低密度12以下で18体目標。高段階分布は01/02/03/04=10/20/30/40%。救済は1回最大12体。

交換総手数と卵用の有効手は異なる。同一内容の交換・既出配置への往復は卵時計が進まない。通常補充1回の後は、プレイヤー交換による反応で供給権が再開する。低密度救済は別途予告する。待ち時間では何も増えない。

設定変更は試作のセーブだけを置換する。「記録を保存」でseed・設定・操作列・最終状態をJSON出力する。保存はブラウザのオリジンごとで、端末間同期はない。別タブで進めた場合は再読み込みが必要。

## 起動・検証

リポジトリルートで静的HTTPサーバーを起動し、`/prototypes/naopoyo-swap/` を開く。直接file URLはES modulesのため使用しない。ビルド・外部依存は不要。

```
python3 -m http.server 8000
node --test prototypes/naopoyo-swap/tests/*.test.mjs
node --test prototypes/growth-clear/tests/*.test.mjs prototypes/slide08/tests/*.test.mjs
node prototypes/naopoyo-swap/simulate.mjs --seeds=5 --limit=300 --policies=random,evolve,goal --out=results/recheck.json
```

## 構成と非干渉

`board/state/resolve/supply/engine`はDOMなしのゲーム核。`ui/input/store`は表示・入力・保存、`replay`は操作再現、`policy/planner/simulate`は検証専用で画面から呼ばない。

保存キーは `naopoyo-swap-prototype-v1` のみ。既存ゲームのコード・保存・記録・実績は読み書きせず、Service Workerを登録しない。既存キャラのPNGは読取利用のみ。サイトは必要な5種族の画像をコピーした独立配信物で、元画像を変更していない。追加ファイルはこのディレクトリだけ。既存ゲームのメニューにも追加していない。

## 次の判断

正式採用には、自然な初期盤面からの08ペアクリア実例と実機QAが必要。自動戦略の未達だけから不可能と断定しないが、現状を達成難度検証済みとも扱わない。対戦・ランキング・既存ゲームへの統合は未実装。
