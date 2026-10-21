# 共通枠・植物SVG・NAOTOCCHI

基準PR #401 HEAD 96876f777f4e386c25540ba50f4078cfc29fddd9 / tree 79fd9865b0a5b86e294d68d33117fc786a65631b。開始時main 0130bb2ba4deb7e4a174f48d56dbb3edfc76afb9。Draft/open/未マージを維持。

## 再利用した正本

- ui-presentation.mjs / cardMarkup(M-beetle-01)のbotanical SVGをそのまま取得。leafSprig、4隅の反転配置、外周の二重線、下部曲線はshared-botanical.svgと文字列完全一致検査。
- style.cssの2:3・外角丸5%・内余白4%・20%タイトル領域・25%効果領域・3%署名領域を600×900の静的SVGへ展開。A+B控えめ版の内枠1.4cqw、タイトル上12%/下8%角丸、イラスト13%角丸、効果欄8%角丸、下部8%左右余白/2%高さの色帯を基準にした。
- 署名は通常カードの2.7cqwと字間.18emを600pxの内容幅552pxへ換算（14.904px/2.68272px）。同じ小さなsans-serif表記NAOTOCCHI。金色系を銀灰へ、属性色を青銀へ置換。
- 原画をAIで再生成して似た枠を描く方法は使用していない。build.mjsは共有SVGとテンプレート寸法の静的画像書き出し用アダプター。common-template.htmlには実際のcardMarkupからたまご用に要素を除いたHTMLも保持。

## 保持と限定差分

C案previous-C.pngの中央画像（65,355,890,680）を画素完全一致で切り出し、preserved-art.pngへ保存。たまごと光を描き直していない。タイトル・本文もCの既存の文字画素を背景から分離して配置。日本語本文は変更なし。不要2文・コスト・能力値は追加しない。

たまごに能力値欄がないため、その領域のみイラストへ統合。タイトル開始、効果欄開始、署名位置を共通枠へ合わせる。空欄の能力値枠や新しい説明は作らない。既存runtime/style.css/452枚の原画・テンプレートは無変更。

SVGへの静的書き出しであり、SafariのCSS描画との全画素一致を主張しない。日本語文字はCの書体を保持し、署名は共通sans-serif仕様（端末フォント差はあり得る）。実ブラウザーQAは未実施。

## 成果物と検証

- reference-main.png: ユーザー添付画像からカード領域だけを切り出した比較基準。電話・端末情報は含まない。
- previous-C.png: 旧C原画を保持。
- ../original.png / ../egg-card-print.png / ui-assets/egg-card-{small,large}.webp: 現行共通枠版。
- comparison-{600,110,80}.png: 正式メイン・旧C・修正版を同サイズで比較。
- checks.json: 11件成功（共有SVG一致、署名、イラスト画素一致、画像復号/寸法/ハッシュ、比較寸法、本文）。
- tests.log: 既存回帰19件成功。タップ詳細、たんじょう、メイン離脱、保存再生、非公開情報を含む。
- pages-package.json / pages-http.json: 配信容量とHTTP検査。allowlistは無変更。原画と比較画像は本番Pagesへ追加しない。

既存試遊URL: https://naotocchi-card-egg-20261019.kerzion214.chatgpt.site/prototypes/card-game/
比較URL: https://naotocchi-card-egg-20261019.kerzion214.chatgpt.site/prototypes/card-game/egg-design/frame-unification/

iPhone実機で拡大署名・本文、盤面表示、タップ詳細、画像キャッシュ更新を確認する。mainマージ・本番Pages更新・正式ルール変更なし。
