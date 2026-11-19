# 進化名19件の統一（VERSION16名称承認済み）

VERSION16で19件すべての名称が承認されました。ヒトデ⑥「若いヒトデ」、⑧「長生きしたヒトデ」も承認済みです。表示名のversion値は既存候補と同じ名称集合を識別するため維持し、statusに承認を記録します。mainへの統合・公開は行いません。14件の漢字変更、画像・配色・効果・数値・CPU・時計・デッキは対象外です。

## 表示名の正本と生成

- `tools/evolution-display-names-v13-20261119.json` に19件の表示名、検索専用の旧名、候補版を記録。
- 現行 `character-world-master.v1.js` と `tools/expression-stage-names.json` を同期。本体・図鑑は既存の `installMasterSpecies()` 経由で現行マスターを表示します。
- `build_full_catalog.py` は従来の設計監査を通した後、19件だけ `form` に候補名を適用。現行マスターとの一致も検査します。`python prototypes/card-game/build_full_catalog.py --check` で再生成一致を確認できます。
- `docs/card-game/data/design-source-20260917`、設計本文、source/hash、正式カード名（種族＋段階）は変更しません。表示名の出典は上記候補表です。旧名は `searchAliases` でコレクション／デッキ検索に対応します。
- カード見出しは既存のフォント・枠のまま「浮かぶ｜あかちゃん」「長生きした｜ヒトデ」を意味で区切ります。CSS・画面構造は変更しません。

## 保存・履歴

ID・段階・図鑑の開放条件・保存キー・保存スキーマを変更せず、保存データを書き換える移行処理もありません。既存の本体履歴に保存された文字列はそのまま残ります。現在の姿・図鑑・カード面の表示だけが候補名になります。

カード保存の `version/seed/decks/commands` は不変です。エンジンのログ／操作文は従来の `name` を使用するため、再生で作られるログも変わりません。現行カード面の `form` は再表示時に候補名になります。変更前mainから作成した19対象ID入りの40枚デッキで hotseat-2〜8 の旧保存7件をfixtureに保持し、保存文字列と再生後の状態全体のSHA-256が一致することを検証しました。hotseat-1は既存互換テストでも再生・戦績保持を確認済みです。

## 検証

- RED確認後に実装：19名一致テスト、カード見出しの意味区切りテスト。
- 名前・生成・凍結原典・カード表示・検索・デッキ・戦績の集中テスト：52件成功。
- 本体の save-compat / save-integrity / progress-counts / migration：76件成功。古い図鑑開放・過去の達成・未知IDを保持。
- 452枚すべてのIDと表示以外の全フィールドを変更前mainのダイジェストで保護。過去のdoodle-jump／tier1固定ダイジェストは19件の旧formだけを明示的に復元して照合し、期待hashを変えず成功。
- カード全体テストの初回は661件中657成功、4失敗。2件は上記旧表示名ダイジェストで修正後に再実行成功。残る2件は初回時点の疎なcheckoutによる画像欠落（`adopted-color-design` の `art-delivery/small/C-bat-e2a6f384cd5f.webp`、`life-clock` の `assets/dial-art-v4.png`）。この候補で画像・検査条件は変更していません。
- `npm test` はsmoke-testで未取得 `assets/characters/author/naoto.png` により停止。それ以前の実行分は成功。全体成功とはしていません。
- `build_full_catalog.py --check` と `git diff --check` 成功。設計監査に必要な既存gzipとQA文書だけをgitの同一bytesで補完し、原典の改変や検査の緩和はしていません。
- 実ブラウザ／WebKit／実機iPhoneの文字収まりは未検証。Nodeで全248メインの文字保持・最大2行・行長・既存フォント値を検査。ブラウザ試行は完了せず中止し、結果を検証証拠に使っていません。

## 統合準備の追加検証

既存画像910件を元のバイトで取得し、上記画像欠落の2スイートを再実行して15件成功。Pagesの依存契約は新たなローダーがないことを確認し、変更済みの既存runtime5ファイルの正確なSHA-256だけを更新。検査自体や対象ファイル集合は変更しない。
