# 操作ボタン固定・横向きCSS追補

対象: PR #490 / `integration/home-25d-release-20261030`。
開始HEAD: `59a5ea7e16dd865f622aee5914e35d06f716ae92`。
main: `851cf09a80c7ed41ba7293888084272917e4582c`。

## 原因と最小修正

既存CI run `41059940785`、WebKit job `124076851925` は
`meters reachable` で失敗していた。artifact `12978713338` の
667×375pxでは中央欄が y=6..365、操作ボタンが y=259..362。
画面下のボタンと中央欄が重なり、ヘッダーも背景上に重なっていた。

`world-scene.css` の横向きルールは `:has(#screenNormal:not(.hidden))`
を含み、`.screen-frame` に `grid-row:1/-1` を指定する。
本番用の上書きにはIDセレクターがなかったため、詳細度で負けていた。
本番の中央欄セレクターに同じ `:has(...)` 条件を追加し、既存の
`grid-row:2` が優先されるようにした。寸法・文字・ボタン・背景は変更しない。

レイアウト試験に「中央欄がヘッダーより下」「操作ボタンより上」の
実測assertionを追加。従来の44px・42px・76px・スクロール検証は維持し、
失敗時もスクロール後の寸法をprogress.jsonに保存する。
CSSの参照トークンと配信allowlistの確認済みハッシュも更新した。

## 保護と検証範囲

- 本番接続・実セーブ互換性: 12/12成功。
- 本番用育成・会話・保存等の既存契約: 365/365成功。
- 配信: 4,121ファイル / 220,190,239 bytes。HTTP欠落0、ハッシュ不一致0。
- `script.js`、本番モデル・描画・world・マニフェスト・タッチ処理は開始HEADと一致。
- 全体回帰の経過・追加の検証結果は本書末尾に記録する。

## 未完了・公開保留

この環境のブラウザーは初期化時に接続エラーとなった。修正後の
Chromium/WebKitおよびiPhone Safariの実操作検証は未確認。
旧HEADの312条件成功を、この修正の成功として流用しない。
既知の水辺28体連続ポインタ操作とカクレクマノミ通知表示の失敗も
未解決として保持する。歩行判定やテスト閾値を緩めていない。

PRブランチへのgit pushは自動承認審査により拒否された。
送信先の明示承認不足との判定であり、別経路による送信はしていない。
変更はローカルの `fix/home-controls-followup-20261030` に保存した。
再開時は最新PR HEADとこの差分を照合し、承認後に非強制で保存する。

mainマージ、GitHub Pages公開、本人限定v9更新は行っていない。
全13地域・4幅・1/6/28体・回転・タップ/ドラッグ・会話と必要CIが
合格するまで公開を保留する。

## 追加検証記録

ログは `fixed-controls-followup/` に保存。

| 検証 | 結果 |
|---|---|
| 本番接続・旧セーブ | 12成功 / 0失敗 |
| 本番用の既存契約 | 365成功 / 0失敗 |
| 会話・関係性の後続グループ | 159成功 / 0失敗 |
| ホームの後続グループ | 238成功 / 0失敗 |
| Pagesパッケージ単体 | 16成功 / 0失敗 |
| HTTP照合 | 4,121成功 / 欠落0 / 不一致0 |

全体回帰の初回では部分チェックアウトに含まれないQA資料により
5件失敗した。ゲームやテストの変更ではなく、HEADの既存ファイルを
復元した。34件の対象グループで31成功、追加の参照資料不足による
3失敗を確認し、その資料も復元後に該当6件すべて成功した。
対象34件はすべて再検証で成功したが、初回の失敗ログも保持する。

失敗していた検証名:

- Claude QA uses the current actor input adapter while preserving immutable geometry and presenter
- legacy coverage references the reviewed rightmost four tiles without claiming raw photos or later gates
- legacy coverage rejects unreviewed, missing, changed, or wrongly mapped boards
- legacy board reuse requires the exact companion model at stage zero
- AD-17 Human QA gateの既存記録確認

ブラウザーの新しい非重複assertionは、旧CIの667×375の記録
（中央欄下端365px、ボタン上端259px）を失敗として検出する。
これは失敗検出の確認であり、修正後ブラウザー試験の合格ではない。

## 引き継ぎ時点の全体回帰

`npm test` は先頭32件・24件成功後、大グループを実行中。
`meguru-phase3b4-test.cjs` の全スポット探索が継続しており、
全体回帰完了・全件成功とは報告しない。後続159件・238件は
別途実行し、いずれも成功した。現在の全体ログは
`/workspace/scratch/9c6745e0ed55/full.log`。完了時に集計を更新する。
