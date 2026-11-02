# 軽量Work取得の確認 — 2026-11-03

取得元: PR #490の確認時点の最新commit `d604642e5a05f17beb373ec0b6398204577cd09c`。V12保存基準から他作業で更新されていたため、新しい独立コピーにこのSHAを固定して確認した。PR #490へ書き込みなし。

| 項目 | 結果 |
|---|---:|
| GitHub tree全ファイル内容 | 4,540,105,741 bytes / 34,653 files |
| 軽量取得ファイル内容 | 234,124,810 bytes / 4,919 files |
| 展開しない内容 | 4,305,980,931 bytes / 29,734 files |
| 展開内容の削減率 | 94.84% |
| 指定された過去QA2群＋カード原画 | 2,635,186,769 bytes、全12,340 paths未展開 |
| 正式配信対象 | 4,155 files、Git blob SHA-1と全件一致、不一致0 |
| 除外3群のGit内部へのblob取得 | 0（rev-list --objects --missing=printで確認） |
| 新規コピーの実ディスク使用量 | 約452 MiB（Git約218 MiBを含む。ブロック数依存） |
| 作業コピー | git status clean |

容量はGitHubのrecursive tree metadata（truncated=false）と展開済みファイルサイズを比較。全リポジトリや全履歴を取得して測った値ではない。歴史的なGit容量の削減を示す数値でもない。

`python -m unittest discover -s tests/work -v`: 8 tests成功。実Git fixtureで必要ファイル・原画非取得・完全展開による原画復元・既存宛先保護・filter非対応拒否・生成物の検出・hash例外・main先行更新の誤検出防止を確認。

独立コードレビューで指摘されたbase tip比較の誤検出は、merge-base比較に修正し、失敗→成功を確認。初回試作ではGitのサイズ照会が不要blob取得を誘発することを検出したため中断し、サイズ照会を除去した。最終の実取得とblob未取得検証は修正版で実施した。

PR #490はこの環境整備ブランチの新しいignore設定を含まないため、新規コピーのGitローカルexcludeへ出力先を登録。ゲームファイル・追跡ファイルは不変更。以後は取得スクリプトが同じ設定を自動登録する（fixture検証済み）。

全ゲーム回帰、iPhone QA、サイト再公開、原画の再生成、長期保存先への移動、旧ブランチのQA保存workflow変更は実施していない。GitHub Actions上の新guard実行結果はPRのChecksで確認する。
