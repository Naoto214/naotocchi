# Pages容量修正 — 2026-10-19

## 範囲と結論

PR #399の実行ファイルを変更せず、公開対象をexact allowlistへ切り替える
独立修正ブランチです。mainマージ・本番公開・Pages設定変更は未実施です。
PRのbaseは #399の統合ブランチであり、#399自体もこの作業では変更しません。

開始時のGitHub正本:

- main: `fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7`
- main tree: `00f8ce47b39c76e25440c54d349a0e83d483dd76`
- PR #399: `d32e652bb799e09e403a9eb0feac74b45d7771b6`
- PR #399 tree: `3e1d823ecee59a6531fa77023e9a3b125f94c05e`
- #399はDraft/open/unmerged。mainとの差分は18 commits・3868 files。
  この容量修正はそのHEADから分岐し、ゲーム資産の差分を追加しません。

## 修正前の実測と公開方式

現行はmainのrootをdefault Jekyllで公開（`source: .`、`Configuration file: none`）。
既存[Pages run 39121756569](https://github.com/Naoto214/naotocchi/actions/runs/39121756569)
のartifact ID `12133833949` は **1,622,902,025 bytes**（ダウンロードZIPのサイズ）。
deployログには1GB超過警告がありますが、既存deploy自体は成功しています。

#399の `art-pilot/` は2844 files・**2,097,269,741 bytes**、
さらに最適化画像904枚が **137,575,124 bytes** です。
未マージの#399について旧方式で本番deployした実績はありません。
上記ZIPと下記非圧縮容量は計測形式が違うため、同条件の削減率は計算しません。

| 実測対象 | bytes | 約MB (10進) |
|---|---:|---:|
| 修正前: 現行mainのPages artifact ZIP | 1,622,902,025 | 1,622.9 |
| 修正後: 公開ファイル4098件の合計 | 213,299,405 | 213.3 |
| 修正後: 生成済み非圧縮tar | 216,453,120 | 216.5 |
| この修正の公開予算 | 350,000,000 | 350.0 |

tar SHA-256: `e92cdf167179f0133936526faf6707369a3fb8dc24cb19651fe9f1c2bdee38e0`

PR #399の既存追跡29140ファイル中25043ファイルを公開対象から除外。
4097既存ファイルをそのまま残し、空の`.nojekyll`を生成します。
GitHub管理のPages CDNでの配信確認は別承認後です。今回のHTTP確認は
生成物をローカルHTTPサーバーで同じ`/naotocchi/`配下に置いて実施しました。

## 修正方式

- `tools/pages/allowlist.json`: レビュー済みの完全なファイルパス一覧を正本にする。
- `package.py`: ファイルをbyte単位で保ったままコピー。全ファイルhashを検証し、
  ファイル合計とtarの双方を350,000,000 bytes以下に制限。
- 静的参照、動的画像群、動的サンプルJSON一覧を検証。
  全165実行ソースのhashを固定し、動的URLを含むソース変更時は依存関係の再レビューを要求。
- 新規原画やQAを追加しても自動的に配信へ入らない。新規参照先が未登録なら失敗。
- 新workflowはPRでbuild/verify/uploadのみ。deployはmain限定。
  `.gitignore`に頼らず、実際のupload対象を生成済みディレクトリへ限定。

**有効化には別承認後のPages Source → GitHub Actions切替が必須。**
切替前に#399をmainへマージすると旧root/Jekyllが動くため、リリース順を
`tools/pages/README.md` に記載しています。今回は設定を変更しません。

## 残すファイル・除外するファイル

残す: 本編HTML/CSS/JS、2974件の2D/表情/UI/アイテム/World/フォント資産、
Character 3Dモジュール、Three.jsとライセンス、CARD GAMEコード/正式色/分類マーク、
452ID×small/largeの904画像、なおぽよと既存3プロトタイプの入口/プレイヤー、
実行中に選択できるサンプルJSON。既存CARD GAMEからリンクされるUIガイドも残します。

除外: 原画、比較画像、rollout画像、制作記録、QA画像/動画、固定対戦証跡、
Python正本、開発・テストツール、その他ドキュメント。
`results/`や`witnesses/`に置かれた実行用サンプルだけは個別例外です。

全原画・カード定義・Python・固定400戦・承認/停止証跡・本編ゲーム・save/schemaは
Gitの既存blobを維持します。削除・移動・再圧縮・再生成なし。
本人専用試遊URLと外部試遊デプロイには変更を加えていません。

## 検証

- `package-report.json`: 実際に生成した全ファイルのhash、容量、tar hash。
- `http-report.json`: `/naotocchi/`で全配信ファイルをHTTP取得し、hashまで照合。
  全452カードID・904画像が既存配信manifestと一致。除外した原画等は404。
- 静的参照1656件、動的依存3007件を確認。
- packager単体11/11成功。初期REDの記録と最終GREENログを保存。
- 本編アセット/保存互換/World routing/2D保護/Character save境界、CARD GAME入口/
  アートCPU/CPU session: **59/59成功**。古いsave、200件のsave変異も既存テスト内で成功。
- なおぽよ系3プレイヤー/保存の重点回帰: **19/19成功**。
- #399の既存340/341、独立12対戦完走/復帰/再生一致、追加重点47成功、CI全9job成功を
  再利用。ゲームファイル無変更のため大規模対戦再監査は実施していません。

FUN_ITEMS再生成監査の既知失敗、形態名8件/履歴hash2件の参照不整合は別件の
未解決事項として維持。正式定義や履歴を修正して成功扱いにはしていません。

## mainマージに残る条件

1. 本修正Draft PRの容量/配信検証結果を確認し、統合・公開の別承認を得る。
2. #399へ修正を取り込み、最新HEAD/treeとCIを再確認。
3. 別承認の下でPages SourceをGitHub Actionsへ切替後、#399のみmainへマージ。
4. 実際のActions build/deployと公開URLのCPU/2人対戦・画像配信を確認。

#393/#396/#397/#398は直接マージしません。iPhone実機での縦横/可読性、連打、
背景復帰/保存、応答/宣言/進行演出、長時間メモリと速度のQAは従来どおり残ります。
