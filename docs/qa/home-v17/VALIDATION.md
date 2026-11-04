# v17 検証の範囲と時点

## 実装HEADと最終調整

`c536b8d4f6817a6c56d7f69604f51d4500f1cfc5`が匿名Reactionの重複除去を含むJavaScript実装HEAD。このHEADで847件の重点回帰が成功し、GitHub Runtime smoke testも成功した。その後の製品変更は名前の`text-wrap:balance`と対応するcache/hashのみ。QA手動操作には撮影用の返答フレーム保持を追加した（自動検証と製品のタイマーには適用しない）。最終コミット・最終CI・公開情報はPR #426にも記録する。

| 検証 | 結果 | 証跡 |
|---|---:|---|
| 実装HEADのHome/Conversation/44キャラ/恋愛/Motion/Save等 | 847成功、0失敗 | `final-head-runtime.log` |
| 全体npm test | 3,646成功、0失敗、0skip、exit 0 | `npm-final.log.gz`。ローカルは途中修正前に開始したため最終HEAD実行とは区別。実装HEAD固定のGitHub Runtime smoke成功で再確認 |
| CARD GAME（実装HEAD） | 412成功、0失敗 | `card-final.log` |
| なおぽよ。全対象プロトタイプ（実装HEAD） | 526成功、0失敗 | `naopoyo-final.log` |
| Pages保護テスト | 16成功 | `pages-final.log` |
| 最後の名前CSS/cache調整 | 17成功、0失敗 | `name-balance.log` |
| 最終描画マトリクス・Chromium | 105条件、問題0 | `chromium-release.json.gz` |
| 実装HEAD・Chromium＋WebKit | 各105条件のCI工程成功 | Home layout run `40189646947`（工程名v17 typography and actor identity） |
| 最終配布物 | 欠落0、hash不一致0 | `package-release.json.gz`, `http-release.json`, `package-release.log` |

`npm-final.log`のNode集計は209+26+24+3225+138+9+15=3646。同じチェーンのsmoke/dialogue/visual QAもexit 0。最終HEAD後の再検証結果はPRに追記する。

## 描画検査

320×568、320×844、375×844、390×844、430×844。各条件で28体。7重点文、日本語長文、英語、絵文字、長い正式名、仲間・恋人の発言、通常／長文通知、2択、長文3択、実際の選択後の返答、交流質問・Reaction。

Rangeで字面の矩形と行数を取得し、枠内の上下、横はみ出し、末尾1文字、画像・名前と本文の重なり、短い2択の全ボタン収まり、44pxタップ高さ、長い3択末尾までのスクロール到達、フォント再計算後、話者ID・画像を検査。出現前後で通知・ホーム・会話・メーター・操作の位置と高さが変化しないことを確認。単にtextContentが存在することだけを合格条件にしない。

製品の会話頻度・抽選・台詞・効果とセーブ形式は変えていない。QAは合成セーブと独立キーを使う。試遊版は`naotocchi-home-diorama-preview-v1`、QAは`naotocchi-home-v15-qa-v1`、本番は既存`naotocchi-save-v1`で分離する。配布scriptを本番キーに戻すとGitHubのscriptとbyte一致する。

## 途中の失敗を最終結果と区別

- `red.log`, `review-red.log`, `expression-red.log`, `author-red.log`, `duplicate-red.log`: 追加した問題再現テスト。後続greenで修正確認。
- `head-runtime.log`: 847中4失敗。話者更新の順序2件、旧同時表示期待1件、旧表情画像禁止期待1件。更新順を修正し、今回指定の順次表示・正式Expression画像を厳密に検査する期待値へ変更。テストを削除・skipせず、反応本文・主体・効果一回の検査を維持・追加した。
- `npm-test.log.gz`: 途中実装で開始。3225群中、旧表情画像期待の1失敗。全体成功には数えない。
- `v17-choices-before-fix.json.gz`: 105条件中4問題。3択長文を2列から全文幅1列へ変更後、同じ検査で問題0。
- 最後のCSS cache更新時にindexのallowlist hash更新漏れを配布gateが検出。正しい実ファイルhashへ更新し、最終package/HTTP検査は成功。gateを弱めていない。

独立レビュー：重大な追加指摘なし。交流→ごはんの実経路、表情と主体の更新、関連20テストを再確認。iPhone Safariの実機操作・セーフエリア・長時間動作は未確認で、本人QA待ち。
