# Workの軽量開発

正式素材・原画・承認済み比較画像・検証証拠・履歴はそのまま保持し、通常のホーム修正では必要なファイルだけ取得します。既存作業コピーへの適用、削除、公開、PR #490の更新は行いません。

## 新しいWorkで開始

Python 3.9以降とGit（partial clone対応）、ネットワークが必要です。取得先は**存在しない新しいディレクトリ**を指定してください。

このPRの `tools/work/checkout.py` を小さな単独ファイルとして取得し、次を実行します。PRが未マージの場合、mainにはまだスクリプトがありません。Python以外の依存インストールは不要です。

```sh
# checkout.py の保存先も、既存ファイルがない場所を使う。
curl --fail --location --output checkout.py 'https://raw.githubusercontent.com/Naoto214/naotocchi/chore/work-lightweight-20261103/tools/work/checkout.py'
# PR #490を再開するときは、GitHubで確認した最新head SHAを指定する。
python checkout.py ./naotocchi-home --ref <確認済みのcommit-SHA>
cd naotocchi-home
git status --short
```

`<確認済みのcommit-SHA>` は置き換えてください。branch名も指定できますが、実際の取得SHAは必ず出力されます。ローカルの `work/home-ui` ブランチを作成し、リモートブランチへ書き込みません。PR #490へpushすることは、この環境整備の手順には含みません。

取得対象は、そのcommitの `tools/pages/allowlist.json` に載る全正式配信ファイル、ルート直下ファイル、`tools/`・`tests/`・`.github/`。原画やQAの親フォルダーを丸ごとコピーしません。カード配色モジュール、物語の `dist/`、正式WebP画像も配信リストに従って残します。

以下は通常取得しません。

- `docs/qa/character-3d-full-v0/`
- `docs/qa/meguru-3d-ci/`
- `prototypes/card-game/art-pilot/illustrations/`
- 配信リスト外の過去プレビューや他の制作資料

Gitの履歴はdepth 1、blobは必要時取得です。filter未対応サーバーでは全取得へ自動フォールバックせず停止します。既存の宛先やsymlinkも拒否します。途中失敗時は残った新規ディレクトリを勝手に削除・再利用しません。

実測用のファイル数・論理容量は `.git/work-checkout.json` に保存されます。Git管理外です。`du -sh .git` は圧縮された取得オブジェクト、`du -sh .` は展開済みファイルとGitを含む実ディスク量で、論理容量とは別です。

## 必要な資料を追加取得

軽量checkoutに限り、必要なディレクトリを追加します。元のリモート、原画、履歴を変更しません。

```sh
# 例：ホームの過去検証記録。対象フォルダーの全量を取得するため、必要な範囲に絞る。
git sparse-checkout add --no-cone '/docs/qa/home-25d-release/'

# カード原画の制作・再生成が必要な場合のみ（約1.20GiB＋生成入力）。
git sparse-checkout add --no-cone '/prototypes/card-game/art-pilot/'
```

現行commitの**全ファイル**が必要な場合は、空き容量を確認して `git sparse-checkout disable` を実行します。これで過去資料・原画も取得されます。履歴はまだ浅い状態です。履歴まで必要なときだけ `git fetch --unshallow --filter=blob:none origin` を追加します。過去の画像blobは引き続き必要時取得で、全ブランチ・全blobのオフラインバックアップを作る操作ではありません。

## PR #490のUI作業

新規checkoutは正式配信対象とテスト・ツールを持ちます。ゲーム本体を編集する前に取得SHAを確認し、作業指示に合わせた独立ブランチを使ってください。既存Workの未コミット変更はこのコピーに含まれません。

`python -m http.server 8000` で本体を配信できます。QAテストが `docs/` 内のfixtureを要求する場合は、そのパスだけ追加取得します。全ゲームテストやすべての過去QAを軽量profileだけで実行できるとは保証しません。

## 生成物を蓄積しない

日常のスクリーンショット、ログ、配信用コピーは `.work-output/` に保存します。取得スクリプトが新規コピーの `.git/info/exclude` にも出力先を登録するため、PR #490などこの変更より前のcommitでも即利用できます。既存の正式素材や過去証拠をそこへ移動しません。ignore設定は既存追跡ファイルを消したり追跡解除したりしません。

```sh
# ビルドは必要なときに一度だけ。生成先はソースツリー外。
python tools/pages/package.py --out ../work-output/pages-runtime --report ../work-output/package-report.json
```

同じ版の展開コピー・tarを何度も作成せず、通常は上記のようにtarを省略します。生成先が非空なら既存packagerは停止します。既存のコピーを消す指示ではありません。

`Work storage guard` はPRで追加・更新されたファイルだけを検査します。配信対象を保護し、過去の未変更資料を検査し直しません。アーカイブ、予約した出力ディレクトリ、QA画像、大きなJSON/ログを検出します。GitHubへ保存する必要がある証拠は、`tools/work/storage-exceptions.json` に**正確なパス・SHA-256・保存理由**を記録してPRでレビューします。例：

```json
{
  "docs/qa/milestone/approved.png": {
    "sha256": "実ファイルのSHA-256・64桁",
    "reason": "本人承認済みの最終比較。長期保存が必要"
  }
}
```

日常出力は期限付きCI artifact、重要証拠は復元確認済みの長期保存先、Gitにはcommit・再現条件・保存先・hash・結果要約を残す方針です。今回、既存証拠の移動や保存期限の変更は行っていません。

既存の `character-3d-qa-package.yml` と `character-3d-quality.yml` には特定の旧3Dブランチへ証拠をcommitする処理があります。過去成果の保護と他作業への非干渉のため、その処理自体は変更していません。新規Workではそれを複製・再利用せず、上記の出力先とguardを使います。

Git内のファイルが減る対策ではなく、通常取得量と今後の不要な追加を抑える対策です。独立Draft PRが未マージの間、guardはmainや既存PRへ自動適用されません。
