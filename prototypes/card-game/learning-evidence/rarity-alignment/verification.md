# PR #403 — 署名・レア表示分離・能力数値整列

## 開始点と保護範囲

- Repository: Naoto214/naotocchi / PR #403 / feat/card-rulebook-tutorial-20261020。
- 開始HEAD: `6a7f271b702bb1e8d56ce6f1337db2b13131e06b`
- 開始tree: `1d9d8254a723da231271359b10c4adbacfefc608`
- remote main / base: `db9ea8e8d86c632a68ed8ab4880968803f78a243`。main tree: `b24d11f8af167b57bcc5da674f07bcdec6db6e1d`。
- 開始時PRはopen / draft / unmerged、既存差分89ファイル。CIはHome layout、Runtime smoke、World visual quality成功、Pages runtime package失敗。
- 実行時変更は `ui-presentation.mjs` / `style.css` / `collection-ui.mjs` / `my-decks-ui.mjs` の4ファイル。
- 452枚の定義・ID・効果・数値・現在のレア分類、デッキ制限、エンジン、CPU判断、response/chain、保存形式、通常たまご、裏面・植物紋章の画像、チュートリアルの処理を変更していない。Python・固定400戦・他PR・本編・なおぽよ・3D・main・本番Pagesは変更していない。

## 原因と修正

### 署名・レア

実配信では専用イラストのWebPとHTML/CSSの枠・カード名・能力・効果を合成している。RAREはWebPへ焼き込まれておらず、共通 `cardMarkup` が `c.rare ? '◆ RARE' : 'NAOTOCCHI'` で署名を差し替えていた。

全452定義の通常・詳細・compact表示で署名をNAOTOCCHIに固定した。compactにも署名用の下端余白を確保。位置・サイズ・字間・色を共通CSSで管理し、既存の金色と字間を維持。植物SVGは無変更。下部の色付き曲線は署名の下に細く配置し、文字との重複を解消した。

◆は署名右側（カード左端から67%、下端から3.1%）に独立したUI要素として配置。正本はこれまでどおり既存定義の `rare`。対戦ではエンジンが公開可能と判定した投影データだけを使い、非公開カードからIDを逆引きしない。裏向きカードは署名・◆・レア説明を出さない。

`cardRarityLabel` を詳細・コレクション・マイデッキで共有し、「通常 · 同名3枚まで」「レア · 同名1枚まで」を表示する。デッキ検証処理は変更していない。今後のrare変更ではイラスト再制作・再出力は不要。

**専用イラスト・配信カード画像の変更数: 0。904 WebP（452×大小2種）が開始点とbyte一致。** 特別たまごは既存画像のまま。

### 数値

旧CSSは `Georgia,serif`、数値の行高はnormal、数字領域の横幅は内容依存、能力欄内はspace-evenlyのflexだった。ブラウザー測定では320pxカードの数値行高が50pxとなり、能力セルが52pxまで膨らみ、指定トラックに収まっていなかった。1桁と2桁で数値領域の幅・他の部品の位置も変わっていた。Georgiaの端末別の数字字形も視覚上の高さに影響し得る（実iOSでの字形測定は未実施）。

共通CSSでアイコン・ラベル・数値の列を固定。数字はArial/Helvetica/sans-serifのlining/tabular数字、共通12cqw、line-height:1、15cqw×12cqwの固定領域に中央配置する。セルのmin-heightを0にして指定能力トラックを維持。数字・ラベル・アイコンの縦中心を揃えた。個別カード補正や数値変更はない。

## 比較資料

- [変更前](cards-before.jpg) / [変更後](cards-after.jpg)：星⑥7/8、星⑦10/3、通常ヒトデ①、320pxと80/110px（通常とcompact）。
- [変更前の配置検査](layout-red.json)：100項目の不一致を再現。
- [変更後の配置検査](layout-green.json)：数値配置15サンプル、不一致0。署名と曲線・◆の非重複も検査。
- [仮切替画像](toggle.jpg) / [切替結果](toggle.json)。正式定義は変更せずコピーを描画。通常→レア、レア→通常とも画像URL・署名不変、◆と1/3枚案内だけ切替。
- [スマホ寸法のカード詳細](phone-detail.jpg) / [横画面](phone-landscape.jpg) / [コレクション](phone-collection.jpg) / [通常盤面](phone-board.jpg) / [練習盤面](phone-tutorial.jpg)。
- 再現用 `cards.html` / `toggle.html` と `tests/ui-rarity-layout.browser.mjs`。以前の署名・数字の状態は開始HEADで再現できる。

## テスト結果

| 対象 | 結果 |
| --- | --- |
| 全452定義×3表示の署名・◆ | 成功 |
| 通常↔レア仮切替、定義不変、アート・署名不変 | 成功 |
| 非公開カードへのレア表示漏れ | なし |
| 差分・関連単体回帰 | 178/178成功（focused.log） |
| DOM: collection / learning / tutorial-board / menu / my-decks CPU / hotseat | 6種類成功。コレクションとデッキのレア説明も追加検査 |
| 453種類、通常3/レア1制限、保存復帰、受け渡し秘匿 | 既存DOM・単体回帰成功 |
| チュートリアル9STEP | 学習DOMで完走成功、通常対戦セーブ分離維持 |
| 80/110/320px | 数値セル・固定幅・縦中心・ラベル/アイコン・署名の検査成功 |
| Chromiumスマホ寸法 | 390×844、320×568、844×390、390×700で横はみ出しなし。詳細/コレクション/盤面を確認 |
| 一時停止/再開 | 外側フレームへのフォーカス移動で既存の停止・再開を確認 |
| reduced-motion | 新規アニメーションなし。既存CSS維持。DOMのreduce設定で回帰成功 |
| 独立レビュー | 重要指摘なし。別途22件の既存/差分テスト成功 |
| カード全体 | **375件中373成功、既存失敗2件**（card-suite.log） |

### 全体テストの既存失敗

1. `catalog.test.mjs` / `regeneration is deterministic and read-only in check mode`: 既知の `Cannot find current array FUN_ITEMS`。今回の範囲外。
2. `adopted-color-design.test.mjs` / `approved soft design is global for every face, not a study opt-in`: コメント以後のCSS全部を配色定義とみなすテストが、既存の `.card-back` 配置ルールまで拾う。**変更前HEADの別checkoutでも同じ失敗を確認**（adopted-baseline.log）。実際の裏面画像・配色は無変更。この無関係なテスト修正は行っていない。

ルート全体の本編・Worldストレステスト、400戦の再実行は今回の表示変更では追加実行していない。前回証跡を維持している。

## 実機限界と公開

実iPhone Safari/WebKit、OSのreduced-motion、実際のSafariバー開閉、非ゼロsafe-areaは未確認。高さ変更はSafariバー開閉の代替検証に留まる。本人による最終iPhone QAが残る。

試遊版は既存の所有者限定サイトを同じURLで更新する。GitHub作業状態との整合: 959ファイルbyte一致＋既存root redirect＝960ファイル。QA専用ページは配信物から除外。公開の確定情報は `publication.json` 参照。mainマージ・Ready化・本番Pages更新は行わない。
