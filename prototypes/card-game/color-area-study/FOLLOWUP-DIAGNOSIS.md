# 2026-10-19 追加調査

比較PNGはまだ生成できていません。5案のHTML/CSS・正式デザインは変更していません。

## ブラウザ取得失敗

公式Playwright Chromium配布URLから返った内容はZIPではなく、195byteのHTMLでした。タイトルは `Site Unavailable`、本文は `Unable to access this site.`。ZIP展開失敗はブラウザのバージョンや比較HTMLの不具合ではなく、取得先にアクセスできないことが直接原因です。

既存クラウドChromeは利用可能でしたが、ローカルfile: URLを開く操作はブラウザのセキュリティポリシーにより拒否されました。許可プロトコルはhttp:/https:のみと返され、同じ操作の回避は禁止されました。迂回操作はしていません。

次に検討する方法は、既存の完成HTMLを本人専用HTTPS比較ページとして配置して、許可された通常のWebページとして描画する方法です。今回のユーザー承認はPNG生成・検証・GitHub保存なので、別のホスティング先の作成・配信について確認が必要です。既存サイト・本番Pagesの置換はしません。

## テスト失敗の訂正

前回の「参照ファイル不足が原因」という説明だけでは不十分でした。
不足していたscript.jsを#396の正本から取得して再実行すると、`check-design-data.py`の788行で `ValueError: Cannot find current array FUN_ITEMS` が発生します。

検証コードは「Historical registered 38: the unmerged branch's source baseline」とコメントしながら、最新のscript.jsからSHOP_ITEMS/NAOTO_ITEMS/CONSUMABLE_ITEMS/FUN_ITEMS/RECOVERY_ITEMSの古い38種類構成を探しています。現在のscript.jsにはFUN_ITEMS配列がありません。

したがって、取得不足に加え、歴史的な登録情報と現在の本編ソースを同一視する検証前提の不一致があります。ゲームのカード効果の不具合とは未判定ですが、テストは実際に失敗しており、成功扱いにはできません。

必要な次工程：歴史的チェックの正本を特定し、現在カード452枚の検証を弱めずに最小修正すること。テスト削除、期待値の無根拠な変更、古いscript.jsで現在ソースを置き換える操作はしていません。

## 保護

この追加コミットは調査記録のみです。比較5案・原画・色HEX・SVG・カード効果・main・本番Pagesは無変更。PR #393/#396/#397はDraft/open/unmergedを維持します。
