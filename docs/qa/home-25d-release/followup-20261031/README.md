# 検証資料の対象と読み方

ログはgzip圧縮。失敗・中断した試験も削除せず保存する。

| 資料 | 対象・意味 |
| --- | --- |
| `ci-6f2975b8-*` | GitHub Actions run 41071112382の取得artifact。今回の最終版の成功記録ではない |
| `full-20261031.log.gz` | キャッシュtoken不整合2件が出た初回全体試験。修正のため中断 |
| `guide-red.log.gz` | CSS修正前の案内閉鎖でstage.yが26px変わる再現 |
| `guide-green.log.gz`, `guide-report.json.gz` | e381c591の案内閉鎖15条件成功 |
| `focused-guide.log.gz`, `contracts-guide.log.gz`, `tokens-fixed.log.gz` | e381c591の20件、365件、token/asset 8件成功 |
| `river-guide.log.gz` | e381c591の水辺G・Chromium表示12条件と入力、回転、保存復帰成功 |
| `scroll-home-baseline.log.gz` | 案内修正前のおうちnative matrix。20成功/4失敗 |
| `scroll-home-guide.*`, `native-*x*-home-*.json.gz` | e381c591のおうちnative matrix。16成功/8失敗。閾値は変更していない |
| `native-320-reproduction.json.gz`, `native-390-reproduction.json.gz` | 初期の入力失敗切り分け |
| `http-final.json` | e381c591の配信候補4,121ファイル照合。QA注入前の別フォルダー |
| `isolated-head-contracts.log.gz` | e381c591ブランチ自体の保護・セーブ12件成功 |
| `ci-provenance.json` | run 41175667003の仮マージcheckoutと、ブラウザー開始前の比較基準不一致 |

ローカルブラウザーはChromium 153.0.8010.0。CI Chromium 151、WebKit、iPhone Safari実機とは区別する。
本番セーブは使用せず、QAの隔離キーまたはブラウザーの一時contextで検証した。
入力診断はゲームの会話停止、接地、歩行経路、キャラ間隔、5px超移動条件を変更しない。
成功件数の比較から性能・成功率の改善は推定しない。自律動作と非同期会話のタイミングが異なるため。

追加資料:

- `full-final-20261031.log.gz` と `full-remaining-20261031.log.gz`: e381c591で全グループ実行、3742/3744成功。後続はnpmの&&停止後に別途実行。
- `resident-recheck.log.gz`: 既存住民表情18件の単独再現、16成功/2失敗。
- `scroll-home-diagnostic.*` / `diagnostic-*`: e381c591＋停止理由の観測。18/24成功。統合前の結果。
- `layout-final*.log.gz` / `layout-partial-progress.json.gz`: vite未導入での開始失敗と、依存導入後exit137で終了した追加layout検証。成功とは扱わない。
- `integrated-*` / `http-integrated.json`: 38c3d068を保持して診断を統合した版の結果。全体3744件の再実行とは区別する。
- 統合後の関連365件は364成功/1失敗。companion:chicken会話開始は単独再実行1/1成功。不安定な検証として保持。

`integrated-native-before-hitcheck.*` は22/24、`integrated-native-hitcheck.*` は23/24。
`integrated-before/after-667x375-home-6` は余白への入力失敗とDOM hit確認追加後のtap/drag成功。
`integrated-after-320x568-home-28` は残る候補探索失敗。ゲームのgeometryは変更していない。
