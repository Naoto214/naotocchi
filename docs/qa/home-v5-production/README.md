# 移動VERSION 5 正式採用の統合前検証

## 判定

**本番統合は保留。自律移動による住民会話の既存ブラウザーテストに失敗があるため、mainへのマージ・本番デプロイを行わない。**

ユーザーの「重要テストの失敗・既存機能の退行があれば停止する」条件を適用する。移動のスモークテストや単体テストの成功をもって、この失敗を無視しない。テストの待ち時間・乱数種・成功条件は変更していない。

## 統合対象と分離

- 基準main: `408c72e6ebef71da3eab33cfb268c7494117aaaa`
- 採用元: [PR #558](https://github.com/Naoto214/naotocchi/pull/558)、HEAD `02df2efc39cd18543b9c66df281872ed1751b02c`
- 統合準備: [Draft PR #561](https://github.com/Naoto214/naotocchi/pull/561)、`codex/home-v5-production`
- 実装抽出コミット: `cb2a31dd87979820c4e24b6eec3c990992ce20a6`

積層PRを丸ごとマージせず、mainから独立したブランチへ本番用9ファイルだけを抽出した。全9ファイルは#558のHEADとバイト単位で一致する（[v5-hashes.json](v5-hashes.json)）。関連する回帰テスト8ファイルも採用。配信許可リストには新規依存モジュール2個を追加し、変更ソースのSHA-256を更新した。

PR #559の調査コード、#560の手動・自律道譲り、比較ページ・デバッグ描画は採用していない。`script.js`、CSS、画像・背景・アイテム資産、保存処理はmainから変更していない。モデルに`setYieldMode`は存在せず、通常ページに比較用`MovementQA`は存在しないことをブラウザーでも確認した。既存の通常操作の目的地表示は変更していない。

## ローカル検証

| 検証 | 成功 | 失敗 | 中断・未完了 |
|---|---:|---:|---:|
| npm test全段階 + 移動V1〜V5/production回帰（Node、延べ件数） | 3,853 | 0 | 0 |
| standalone smoke / dialogue / visual QA コマンド | 3 | 0 | 0 |
| Pages Python unit tests | 20 | 0 | 0 |
| Chromium/WebKit × 幅320/375/390/430 × 1/28体の操作スモーク | 16条件 | 0 | 0 |
| 既存住民会話ブラウザー検証（ローカルChromium） | — | 1工程 | 後続工程は未実行 |

全11コマンド段階の終了コードは0（[test-results.json](test-results.json)、`test-1.log`〜`test-11.log`）。広範な第7段階は約21分22秒かけて完了し、3,293件成功。以前未完了だった59ファイルは今回の実行コマンドに全て含まれる（[一覧](previously-incomplete-59.txt)）。別実行の会話ブラウザー検証は、この全テストコマンド群に含まれないため、全検証成功とは判定しない。

[ブラウザー記録](browser.json)では通常のindexを起動し、主人公を実際のポインターイベントで上下左右へドラッグ、移動後の足元座標、表示人数、ページエラー、横方向のはみ出しを確認した。各操作後900msの位置であり、最端到達量を再測定したものではない。主人公は保存データの年齢から再計算されるヤドカリ段階で、全進化段階の総当たりではない。1体条件の全4方向で要求方向への移動を観測。28体条件は接触制限を含むスモークで、全員の全方向到達を保証するものではない。

移動範囲・経路・個体別描画境界はV5専用回帰テストとソース完全一致で保持を確認した。主人公110%・深度・描画順・接触係数を新たに調整していない。保存・復元、アイテム、背景・地域、既存ゲームは対応する既存テストを実行した。ブラウザーで全装着物の交換や全セーブ操作を総当たりしたという意味ではない。

## 配信パッケージ

[package.json](package.json)、[http.json](http.json): 4,321ファイル / 293,671,666 bytes。全ファイルを`/naotocchi/`配下でHTTP取得し、欠落0、ハッシュ不一致0。非公開の検証用パス7件は404。9本の本番ソース、52背景を含む既存資産のみを許可リストで配信し、今回追加したレポート・検証ツール・スクリーンショットは本番配信対象外。

最初のCIでは、新規モジュールを許可リスト末尾へ追加したためBGM検証のリスト整列規約に違反した。`files`配列の並び順だけを修正し、`PYTHONPATH=/workspace/v5-python-deps python tools/music/sync_pages.py`の成功を確認。BGMファイル・選曲・処理への変更はない。

## 統合を止めた検証

[Production 2.5D home CI](https://github.com/Naoto214/naotocchi/actions/runs/43821558076)の`fixed-controls (chromium)`と`fixed-controls (webkit)`が、同じ既存assertionで失敗した。

```
390x844-autonomous no authored exchange after a real ambient meeting
at tests/helpers/home-resident-dialogue-browser.cjs:111
```

このテストは通常の本番indexを使用し、いぬ＋しばいぬの2体、同じ保存データ、乱数種1182、390×844pxで自律移動を3分間進める。実際の`social`イベントと対応する会話本文・発言者・肖像・UIを要求し、合成会話では代用しない。手動の会話4条件は成功したが、自律会話で停止した。後続の固定UI検証はCIのfail-fastにより未実行であり成功扱いしない。

別の隔離ランタイムで9ファイルだけをmainへ戻した同条件対照では、約21秒で実際の出会いと`b-shiba-mouth`会話が成立した。V5の失敗はローカルChromiumでも再現した。V5の3分記録にはmove 20回・arrive 20回がある一方、socialは0回だった（mainは会話成立までmove 10回・arrive 5回・social 1回）。移動そのものが全停止したという失敗ではなく、出会いイベントが成立しない差が確認された。

コード上、通常の接近先の横間隔は`(a.w+b.w)*0.55+14`で、この2体では約105.589 native px。一方、social発火条件は距離100 native px未満。これらの式はmainから変更していない。V5で意図した接近先に正確に到達しても、この間隔のままでは会話距離に入らない。mainでは境界補正や相手の移動で100未満となる機会があった。経路変更と既存の距離条件の不整合が有力な原因だが、全乱数種・全住民の会話が消えることを示すものではない。今回は接触・行動・会話条件を追加調整せず、元のテストも弱めず、統合を止める。

診断: [main](meeting-main/result.json) / [mainイベント](meeting-main/trace.json) / [V5](meeting-v5/result.json) / [V5イベント](meeting-v5/trace.json) / [集計](meeting-summary.json)。`tools/home-v5-production/meeting-probe.cjs`は既存テストをメモリー上で読み込み、観測だけを追加する。本番ファイルは書き換えない。

## 検証環境と制約

ChromiumおよびLinux Playwright WebKitで検証した。WebKitの不足ライブラリはローカルの検証環境へ展開した。**実機iPhone Safariは未検証**であり、WebKit成功を実機成功とは報告しない。Safe Areaの実機挙動、全端末・全装着物の総当たり、公開後の確認は未完了。

混雑時の一時停止、多少の画像の重なり、奥行きの誤差は承認済みV5の既知の制約として維持した。今回移動範囲をさらに拡張していない。

本番URLは https://naoto214.github.io/naotocchi/ 。今回は公開せず、従来のmainが継続する。マージコミット・新しい本番デプロイは存在しない。

公開サイトの読取確認ではindex・model・dioramaの3ファイルは現行mainとSHA-256一致、新規V5モジュール2個は404だった（[public-unchanged.json](public-unchanged.json)）。V5の公開後確認は、公開自体を停止したため未実施。
