# 08消滅スライド：独立プロトタイプ

2048型の四方向スライドと成長・連鎖を組み合わせた、解法証明付きルール検証版。
本編・落下型なおぽよ・save/schemaに接続しません。mainマージ・本番公開は禁止。

## 試す
リポジトリのルートで `python3 -m http.server 8000` を実行し、
`http://localhost:8000/prototypes/slide08/` を開きます。
同一LANのiPhoneで試す場合は開発PCのLANアドレスを使ってください（公開サーバーへ配信しない）。
初期表示は6×6/24体/3系統・seed3、17手の確認済み解法を同梱。
盤面を動かす前に「1手進める」または「最初から自動再生」で解法を確認できます。
やさしい候補（30体/11手）・費用2/6候補（8手）も選択できます。
比較設定のランダム生成は**未証明**と表示し、採用対象にしません。

## 再現コマンド
Node 20以上（今回実測Node24.19.0）。エンジン・探索・検証に外部依存なし。

```sh
npm --prefix prototypes/slide08 test
npm --prefix prototypes/slide08 run test:mutation
npm --prefix prototypes/slide08 run verify
node prototypes/slide08/experiments.mjs matrix
node prototypes/slide08/experiments.mjs policies
node prototypes/slide08/analyze.mjs --diversity
```

DOM/ブラウザ検証のみ開発依存を使います。

```sh
npm --prefix prototypes/slide08 install
npm --prefix prototypes/slide08 run test:dom
# サーバーをポート8765で起動した別ターミナルで:
npm --prefix prototypes/slide08 exec -- playwright install chromium
npm --prefix prototypes/slide08 run test:browser
```

`SLIDE08_JSDOM`, `SLIDE08_PLAYWRIGHT` で既存ライブラリを指定可能。
`CHROME_PATH` で既存Chromiumを指定可能。今回Chromiumは環境のsocket制限で起動できず、ブラウザテスト・iPhone実機QAは未完了。
DOM検証は読込中Reset、解法再生、単体選択、取消、再生リセット競合、手動操作後の再生と補助記録を検査。

## 構成
- `engine.mjs`: 純粋な状態遷移。UIも探索も同じルール。
- `search.mjs`: bounded beam / exhaustive BFS。未証明と不可能証明を分離。
- `replay.mjs`, `verify-all.mjs`: 探索器に依存しない別プロセスの全手再生・SHA-256検証。
- `metrics.mjs`, `experiments.mjs`, `analyze.mjs`: 固定比較・操作ログ・集計。
- `results/manifest.json`: 事前の比較条件と固定seed。`matrix.json`: 全320件（未証明含む）。
- `results/proof-*.json`: seed・全設定・初期状態・全操作・各手のhash・最終資源。
- `DESIGN.md`: 暫定解釈と保護境界。`MATCH-MODEL.md`: 将来の対戦契約。
- `REPORT.md`: 結果と未完了事項。

証明は「この操作列なら解ける」という存在証明です。途中で任意の手を選んでも解ける保証・最短解・人間の成功率ではありません。

## 追加バランス比較（2026-10-15）

[追加比較レポート](balance-20261015/REPORT.md)にA/Bと補助C/D、40seed×3方策の結果を記録。
試遊画面の「追加比較・同じseed 3」から4条件の検証済み解法を試せます。すべて未採用の候補です。

```sh
node prototypes/slide08/balance-20261015/measure.mjs
node prototypes/slide08/balance-20261015/verify.mjs
node prototypes/slide08/balance-20261015/summarize.mjs
node prototypes/slide08/balance-20261015/mutation.mjs
```

旧320盤面・87証明は変更せず、追加の全履歴・SHA-256証明を`balance-20261015/results/`に保存。
追加探索は`itemPenalty`と`actionSet`を選択可能です。既定値では従来の探索順を維持します。
`bestPath`は打切り時の診断用履歴で、`status === 'solved'`以外は解法として採用できません。
