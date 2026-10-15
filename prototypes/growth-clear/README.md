# なおぽよ：成長・異種消滅 比較プロトタイプ

独立試作です。正式採用・mainマージ・本番公開はしていません。

- [比較報告](REPORT.md)
- [設計と判断](DESIGN.md)
- [測定結果](summary.json) / [固定比較条件](manifest.json)
- [試遊画面](index.html) — リポジトリルートで `python3 -m http.server 8765` を実行し、`http://localhost:8765/prototypes/growth-clear/` を開いてください。

試遊画面では5種族の表示名、seed、旧／新ルール、残存位置A/B/C、費用8/24・2/6・3/9・4/12を選択できます。既存画像・本編保存には触れません。6列12段、現在＋NEXT3、左右・回転・着地、卵・へんしん・だいへんしんに対応。自動落下タイマーはない手動比較画面です。Cは進化する集団ごとに白枠の位置を選び、取消時は資源を消費しません。代表例ボタンで自然な連鎖・08クリア・高段階消失を読み込み、連鎖スライダーで波ごとの結果を確認できます。操作記録JSONの保存・再読込も可能です。

## 再検証

```bash
node --test prototypes/growth-clear/tests/*.test.mjs
node prototypes/growth-clear/tests/mutation.cjs
node prototypes/growth-clear/verify.mjs
node prototypes/growth-clear/analyze.mjs
node prototypes/growth-clear/mirror.mjs
```

`verify.mjs` は `raw-results.tar.gz` から保存済み生データを展開し、全記録のSHA-256と再生hashを検証します。新しい測定を走らせません。再測定は展開先を別途退避してから、run.mjs / supplement.mjs / legacy-run.mjs / confirm.mjs を利用してください。各runnerは既存結果ファイルを上書きしません。

DOMテストは `JSDOM_PATH=/path/to/jsdom node prototypes/growth-clear/tests/dom.mjs`。実ブラウザテストはPlaywright＋Chromiumと上記HTTPサーバーが必要です。今回の環境ではChromium取得失敗のためDOM確認までです。iPhone実機QAは未実施です。

元エンジン・重力・操作探索・乱数・道具候補列挙を `../growth-chain/` から再利用しています。トランザクションは元sessionから独立適応し、元ファイルは変更していません。`raw-results.tar.gz` は操作記録、`qa-logs.tar.gz` はテスト・環境制約の実行ログです。
