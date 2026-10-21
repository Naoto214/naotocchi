# NAOTOCCHI署名の限定修正

基準 HEAD 24d9eb513433887badf924ec08c481068f5ea8c0 / tree 3bdd68a173fd5bb39c7f1590433350cbed08ffb8。
main 0130bb2ba4deb7e4a174f48d56dbb3edfc76afb9、PR #401 Draft/open/未マージを確認。

style.cssの通常カード.card-footerの最終宣言から色 #94703c、サイズ2.7cqw、字間.18emを直接取得。:rootのフォント列 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif を直接取得。通常のweight400/opacity1を指定。600px時14.904px/字間2.68272px。中心座標/基線/装飾形状は維持。既存の署名楕円の塗りだけを既存効果欄の #fffef3 に変更（新しい帯や装飾は追加しない）。文字と背景の色コントラスト4.46:1。

完成PNG 1024×1536。変更画素20317、境界x81–942/y1454–1485。それ以外は基準原画と完全一致。本文・タイトル・中央イラスト・外枠変更なし。WebPは非可逆圧縮の再出力。共有CSS・runtime・ルール・452枚・save・CPU・Pages allowlistは無変更。

検証: signature-final/verify.cjs（範囲外画素一致、正本スタイル、コントラスト、600/110/80比較）、frame-unification/verify.mjs 11件、既存回帰19/19。配信4,100ファイル、213,493,586bytes、直前比+2,398bytes。allowlist SHA256 6d2dd2d635594afe5f32e2354fb202706d70bebc2fcbe61a35059abf08e9ab31。

comparison-{600,110,80}.png 左:正式メインのユーザー提供画像、右:修正版たまご。静的画像出力でOSフォントの解決結果は端末と異なり得る。iPhone実機・Safariでのフォント画素一致や表示QAは未実施。実機の拡大署名、縮小表示、キャッシュ更新が残件。

試遊: https://naotocchi-card-egg-20261019.kerzion214.chatgpt.site/prototypes/card-game/
比較: https://naotocchi-card-egg-20261019.kerzion214.chatgpt.site/prototypes/card-game/egg-design/signature-final/
mainマージ・本番GitHub Pages更新なし。
