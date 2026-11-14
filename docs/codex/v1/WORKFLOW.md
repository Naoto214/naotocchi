# Codex 開発体制 VERSION 1 — 手順とチェックポイント

## 設計
目的は途中終了後の再調査・再生成・保存漏れを防ぐこと。
今回は既存スクリプトを利用する文書運用を採用し、新しい自動化コード・workflow・ゲーム変更を追加しない。
自動チェックの強制化は別の変更として検討する。この規約は自動的なロックではない。
独立Draftの間、mainや他PRへAGENTS.mdは適用されない。Codexで再開する際はこのブランチの規約を先に読む。

## 今回の基準
- repository: Naoto214/naotocchi
- owner: Codex（開発体制整備のみ）
- write branch: codex/development-workflow-v1-20261114
- base main: 105dba519890c2dc17e94a8c9d1b7679720fddf3
- read-only PR #544: 0cf8100d3ad85888f5e32f670a56631ecb4e82ce
- #544 branch: claude/jolly-cray-xeq38x-v5（Claude担当）
- 記録日: 2026-11-14、日本時間

## 工程の保存記録
1. 完了: #544の32曲についてFLAC32・AAC32を固定SHAのGitHub rawから実際に読み、SHA-256を計算。全64ファイルが各receiptの期待ハッシュと一致。receiptのversionも32曲すべて5。
   証拠: bgm-544-verification.json。保存commit: 8de87df06d54440629e0861876d1b2088d398912。リモートHEAD一致を確認。
   音源再生成は不要。音質・iPhone聴感・比較ページ完成を保証する検証ではない。MIDIのバイト検証は今回の対象外。
2. 完了: AGENTS.mdに担当境界・小工程・ハッシュ・リモート照合・公開禁止を記録。
   保存commit: 7001768ea7c1e28a0733dfff497bb12b77d98e72。リモートHEAD一致を確認。
3. このcommit: 共通進捗様式・再開手順を保存。自分自身のSHAは文書へ循環的に埋めず、GitHubのcommit履歴とDraft PRで確認する。
4. 次: Draft PRの差分が新規文書3ファイルだけであること、保存内容と親commit列、リモートHEADを確認する。CIが起動した場合は結果を独立して記録する。マージ・公開は実施しない。

## 開始時の確認
GitHub APIでPRのhead.sha/base.sha/refを取得。自分のブランチも取得し、そのSHAをexpected_remoteとして記録する。
ローカル作業の場合は次を確認する（BRANCHは記録した専用ブランチを指定）。
```sh
git status --short
git rev-parse HEAD
git ls-remote origin "refs/heads/$BRANCH"
```
他者の変更があれば上書きせず読む。ローカル未保存分がある場合は退避・独立worktree等で保護する。
対象PRのHEADが進んだ場合、以前の検証を新HEADへ無条件に流用しない。ただし不変ファイルのハッシュ一致を根拠に検証結果を再利用できる。

## 共通進捗テンプレート
各タスクで docs/codex/tasks/<task-id>/PROGRESS.md 相当の専用ファイルを用意する。既存PRに進捗ファイルがある場合はそれを正本として使い、二重管理しない。

```text
task_id / 日時（timezoneを明記）:
担当 / 書き込み可能branch / 読み取り専用branch:
目的 / 変更を許可されたパス:
PR URL / base SHA / 開始時HEAD / expected_remote:
工程ID:
状態: planned | running | verified | persisted | blocked
入力: source commit、入力パスとSHA-256、ツール版、設定、seed
成果物: パス、サイズ、SHA-256、保存先、保存期限
検証: コマンド、終了コード、件数、結果、対象SHA、CI URL
未確認: 実機・聴感等
保存commit: 後続記録またはPRから参照（自分のSHAを埋め込まない）
リモート照合: 時刻、期待SHA、実測SHA、一致/不一致
次の工程 / 正確な再開コマンド:
ブロッカー / 担当者の判断が必要な点:
```

verifiedは検証済み、persistedはGitHubへの保存と読み戻し確認済みを表す。
同一commit内では「このcommitに含む」と書き、persistedの確認は次の記録またはPR本文に置く。
本人への報告には未保存・未確認を明示する。

## 成果物の照合と再開
1. 最新の進捗ファイルとmanifestを取得する。
2. manifestのsource SHAと入力条件を確認する。ブランチ名の現在値で過去証拠を置き換えない。
3. SHA-256を実ファイルから再計算する（例: sha256sum <対象ファイル>）。期待値と全件比較し、欠落・不一致を列挙する。
4. 一致した完成済み成果は再生成しない。欠落の場合は固定SHAのGitHub保存物を読み戻す。復旧できない場合のみ、別途承認された制作範囲で再生成を検討する。
5. runningで終わった工程は、出力の存在だけで完了扱いせず、検証とハッシュから状態を判定する。
6. 新しい入力・設定での制作は新工程IDを用い、既存原盤を別名で保護する。
7. 長時間処理は1単位ごとに一時出力→検証→確定出力→checkpoint保存。1〜数単位ごとにcommit・pushする。エラー後の自動全件再実行をしない。

#544は読み取り専用。bgm-544-verification.jsonを根拠に64音源の保存を引き継ぐ。
最新HEADが変わったら差分を調べ、変わった対象だけを追加検証する。
BGM生成スクリプトはこの運用整備で実行しない。

## GitHubへの保存
- commit前に差分が許可範囲内か確認する。
- push直前にリモートを再取得。expected_remoteから変化していたら差分を照合し、通常pushで安全に統合できるまで停止する。
- 通常の git push origin HEAD:refs/heads/<専用branch> を使う。force指定をしない。
- push後にgit ls-remoteまたはGitHub branch APIでHEAD一致を確認する。差分・ファイルも読み戻す。
- API保存もGitHub上のcommitを作る方法として利用できる。専用ブランチ上で連続保存し、各commitの親が直前の確認SHAか検証する。
- 通信失敗時は先にリモート履歴を調べる。同じ工程を盲目的に再送しない。
- Draft PRには「対象版、完了工程、未確認、次の工程、commit、試遊先」を短くまとめる。

## 実行環境
今回利用できた環境: Node 24.22.1 / npm 11.9.0 / Python 3.12.14 / Git 2.52.0 / FFmpeg 7.1.5。
今回は文書と標準Pythonでのハッシュ確認だけなのでNode変更は不要。
将来コード作業ではNode 22を選択し node --version で確認してからnpm ciを実行する。
既存CIはNode 22。ブラウザQAは対象workflowのPlaywright版とOSを合わせる。
環境はセッションをまたいで保証されないため毎回版を確認する。
巨大リポジトリ全量の展開を既定にせずtools/work/checkout.pyを使用し、必要なdocs/fixtureのみ追加する。
npm testを軽量取得で実行する場合は不足ファイルを記録し、全件成功と混同しない。

## 正本と公開
README.md / NAOTOCCHI_MASTER_SPEC.md / docs/TEXT_STYLE.md / CHARACTER_ASSET_SPEC_V1.md、および機能別承認資料を参照。
tools/work/README.md、tools/work/check_storage.py、tools/pages/allowlist.jsonを尊重する。
tools/pages/README.mdには旧公開方式の説明が残るため、公開判断では現行 .github/workflows/pages-runtime.yml と実行記録を照合する。
現在のworkflowはmain pushでdeployする。本人がマージ・公開を許可するまで独立Draftを維持する。
今回の運用文書をallowlistへ追加しない。

## 今後この作業を再開する人へ
最初に専用ブランチの最新HEADとDraft PRを読む。
AGENTS.md → この文書 → bgm-544-verification.jsonの順で確認する。
このV1の成果は文書運用であり、既存PRへの自動適用や自動排他制御ではない。
次に実装タスクを受けた場合、そのPR担当の確認・最新SHA照合・対象環境整備を行い、共通テンプレートを使って最小工程から始める。
