# V3原本とV4試遊の照合

V4の入力は、Draft PR #570 の保存コミット `a6e257fef32ea2f0664b8c9fbed761f60ab63cb0` にあるV3。#569 の `28628cf336a8ed92efe4e9e197ca03298b798a1e` からV1、V2、V3を順に構築すると、V3の試遊一式は3,909ファイル、相対パスと内容の集合SHA-256は `c98b1de105f27b97fe5c2fd0e9f83b5ce1621d248e0c315c45c59c299c9ecc2c` になる。[保存時の照合記録](../home-cast-size-v3/evidence/guard-package.json)

V4の専用CIは、この3,909ファイルがV4配布物にも同じパス・同じバイト列で存在し、追加は `/v4/` の操作画面4ファイルと `/game/` の比較用7ファイルであることを検査する。V4で実際に読むゲームHTML、人数設定、地形モジュール、描画コントローラーもV3から照合する。相違を認めるのは比較用スクリプトの読み込み、人数の初期化、開始配置の呼び出し、端数倍率を描画キャッシュのキーに含める箇所。全ファイルの照合には、原画、背景、装備、BGM、カードゲームとセーブ処理も含む。[照合コード](verify_protection.py) ／ [専用CI](../../.github/workflows/home-cast-size-v4.yml)

## V3の数値証拠

[旧CIの失敗記録](https://github.com/Naoto214/naotocchi/actions/runs/44542565152)では、次の二つのアーカイブが永続証拠として登録されていなかった。リポジトリの保存手順に従い、元のパス、SHA-256、再現に必要な理由を登録した。圧縮ファイルの内容とV3内の参照先は保存コミットと同一。展開と再集計の手順は[V3の再現方法](../home-cast-size-v3/README.md)と[性能記録](../home-cast-size-v3/PERFORMANCE.md)にある。[保存規約](../../tools/work/README.md) ／ [登録内容](../../tools/work/storage-exceptions.json)

| V3から取得するファイル | 用途 | SHA-256 |
|---|---|---|
| [geometry-fixtures.tar.gz](../home-cast-size-v3/evidence/geometry-fixtures.tar.gz) | 340件のブラウザー記録で輪郭と入力を再集計 | `ffad2ba54a08e5c0363886af22a11e7641b7a9ac69a19b55f7f64345e5429b0b` |
| [perf-grid-raw.tar.gz](../home-cast-size-v3/evidence/perf-grid-raw.tar.gz) | 2,600条件の処理時間と測定時の配置を再確認 | `207083fec9444126166acf4406f667da9637917a8c2510337f85d67095ff610e` |

## 手元での確認

V3の保存コミットと現在のコミットを取得した作業コピーで、V3、V4の出力先を指定する。照合結果にはV4の集合ハッシュと追加ファイルの各SHA-256も出力する。

```sh
python3 -B comparisons/home-cast-size-v4/verify_protection.py /tmp/cast-v3 /tmp/cast-v4
python3 tools/work/check_storage.py --base origin/main --head HEAD
```

## 並行作業とCI

2026年11月19日に開いていたほかの90 PRについて、改名前のパスを含む10,199変更ファイルを照合した。V4ディレクトリと二つの専用ワークフローに重なるPRは0件。#567（`fae83a2`、69ファイル）、#568（`2935622`、44ファイル）、#569（`28628cf`、72ファイル）には保存登録簿の重複もなかった。調査時のmainは `38b4e9d`。[全PRの照合時点とHEAD](evidence/guard-overlap.json)

#551、#553、#563は別の証拠を同じ保存登録簿に加えている。二つのV3証拠パスと重なるキーは0件だった。各PRの共通祖先から登録簿の3方向マージを照合した結果、#563は競合0件、#551と#553は現在のmainとの間に各1件の既存競合があった。今回の登録を含めても競合部分は各行同一だった。PR #570のコミット `5171cd1` でWork storage guardが成功し、V3時の未登録は解消した。[成功した検査](https://github.com/Naoto214/naotocchi/actions/runs/44554929938)
