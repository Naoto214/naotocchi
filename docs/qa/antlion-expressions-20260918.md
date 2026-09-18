# アリジゴク表情の制作・検証記録

進行中。完成済み範囲はセミまでの17系統1360表情。新規antlion80枚の生成・検証・公開が完了するまで18系統完成とは扱わない。PR #278はDraft/open/未マージを維持し、mainにマージしない。

## 開始時の実確認

remote HEAD `7fcf817088f19ca0b1f736500380a2dc7aac8f9e`、local HEAD `f57c352a2ea2d71bec5d0151d7742921457f3809`、一致tree `1867465be422e7ee3abd31f9b5cc90a0bae8cb5c`。実mainはGitHub git/ref/heads/mainとgit ls-remoteで `d8036775d35f21fc12c20d5bf450e93d3a2e8846` と確認。PRメタデータのbase_shaとは区別する。実mainの更新は取り込んでいない。

PRはDraft/open/未マージ、既存競合あり。最新HEADのActions/status/check-runsは各0、combined status pending。CI成功とは扱わない。制作worktreeとSiteは開始時clean。skip-worktreeなし。元emotion-codeにある別作業のdocs/art/qa-bm/date-oasis_cactus.jpg変更は保持。

## 系統選定・元画像

資料の順序と未制作リストからantlionを選定。元画像8枚を個別に拡大し、128座標グリッドと照合して顔アンカーを設定。01は左下顔の幼虫、02は大きな砂穴底の小さい幼虫、03は大きな幼虫、04は既存の顔がある閉じた砂のまゆ、05は開いた殻内のさなぎ、06は左頭と右の畳んだ羽、07は広げた羽と元からある金色の軌跡、08は傷んだ羽と右側の顔・枝。04の殻を勝手に開かず、顔のある部分を編集対象とした。

各元画像を参照し10表情を個別生成。既存1360表情は再生成しない。生成元とpromptのprovenanceを記録し、既存normalizerで128×128・alpha・元画像boundsに合わせる。顔以外の輪郭・陰影等には生成差があり、ピクセル完全一致方式ではない。

## 途中検証

01〜04全40枚の独立単独画像レビューPASS。04の閉じた殻と02の小さい顔を保持。弱い・危険・眠る等が近く見える場合は最終マークと合わせて確認し、小さな印象差のみを理由に再生成しない。

固定baselineと既存1360PNG/asset参照/accent SVG/136配置の一致を確認。通常段階PNG248枚、非表情キャラクターPNG全297枚、他のトップレベルruntime JS24本、pet-expression.cssも一致。過去81件の位置修正は136配置全体の同一性により保持される。

新規接続のREDは未対応ルートで10失敗。ルート追加後の途中確認は10成功・8失敗。8失敗はまだ生成していない新規顔配置に対する方向テストであり、最終配置後に再実行する。全体テスト・最終独立レビュー・Site公開・GitHub保存は未完了。

## 配置の原因調査と単独画像の修正

全80枚の個別生成・正規化後、240ハッシュ・全80枚の128×128/alpha/元画像bounds一致を確認。独立単独レビューは79枚PASS、07-wantsPlayの無傷の左上羽に余計な欠損があり1枚block。主担当も元画像と完成PNGを見比べて確認し、この新規1枚だけ元画像から再生成。置換前sourceと理由は最終recordに残す。完成済み1360枚は再生成していない。

配置初回は `No placement antlion/02 sick`。読み取り専用診断で、顔中心(52,86.9375)、病気マークの横方向上限66.5に対し、砂穴と汗を避けた候補中心は89.75等となり300候補が上限だけで落ちることを確認。小さい顔が幅広い砂穴底にあることが原因。顔座標は変更せず、antlion/02だけ既存サンゴと同じ横方向上限の除外を適用する仮説で診断を再実行し、全8段階が配置可能となった。角度・距離・alpha衝突・汗回避・キャンバス条件は維持。他7段階・既存17系統には条件変更なし。

## 最終画像・配置・一覧

07-wantsPlay修正後に最終80枚を正規化し、240ハッシュ・全80boundsを再照合PASS。独立担当が修正版単独を再確認PASS、累計全80単独レビュー完了。最終manifestはcomplete:true、80/80、不完全checkpoint除去。

新8配置追加後、1440マーク・864汗動作範囲はissues:[]。既存1360PNG/参照/SVG/136配置、通常297PNG中248段階、24runtime JS、CSSの保持を再確認。限定例外はantlion/02 sickだけ。サンゴ既存例外を保持。

同梱フォントの既存fontconfig設定で一覧8枚と概要2枚を出力。主担当・独立担当が全80合成と日本語全8シートを目視確認PASS。02の小さい顔、羽・触角による外側配置など制約は残り、重なり0を理想的な見た目と同一視しない。

npm run bumpの生成した完全識別子 `pet-expression.js?v=20260918-70da9d04` を使用。日付更新でhelperは37tokenを更新したため、その生成結果から表情JSの完全tokenだけ採用し、無変更資産36tokenはbaselineから保持。index.html差分は1件、最終JS SHA1と識別子一致を独立確認。

同じ確認Site向けデータ検査PASS：18系統1440件、新規antlion80件だけのfilter、初期antlion、8一覧/80PNG一致、既存1360PNG保持、image version al-e1fadd22、production JS/cache一致。タップ・メモ・コピーのソース/状態確認を保持。実機クリック・実機撮影ではなく、一覧は静止PNG/SVG/CSS合成、汗は近似。

Site checker初回は追加prefix al-がCSSのinitial-scale/vertical-alignにも誤一致した。実際のcacheは正常で、検査正規表現を?v=値に限定して修正後PASS。アプリコードへの変更なし。

最終全体npm testは現在実行中。公開・GitHub完成保存は結果待ち。

確認Site公開前のversion55を保存。source `ca316cd4c0bac3831b6a22343b781127ffaa9b07`、version ID `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_5f9cd2e570788191a2c442dbce7425a4`。Siteソースcommit/push成功後に完全SHAを取得。package-site helperのexit0後、gzipとhosting設定/index/8一覧/80PNGの必要90項目を検査して保存。まだ公開成功とは扱わない。

## 初回テスト失敗と対応

対象4ファイル初回は721件中710成功/11失敗、cancelled/skipped/todo各0、596631.078895ms、exit1。最終版全体初回は1371件中1360成功/11失敗、cancelled/skipped/todo各0、593970.658142ms、exit1。

全11件は既存テストがantlionを「表情未対応」の例として使い、base portrait/空accent/null sweatを期待していた箇所。今回の対応追加で期待の前提が古くなった。実際のエラーを確認し、pet-expression-test.cjsとpet-expression-integration-test.cjsの該当fixtureだけを未対応のdandelionへ変更した。antlionの新規対応検査は残す。ゲーム・乱数・画像・配置・キャッシュは変更していない。

該当2ファイル再検査と、修正後の全体npm testを実行中。初回の失敗をランダム失敗扱いせず、原因と変更を記録する。Site version55は保存済みだが未公開のまま。

該当2ファイル再検査は525成功、失敗/cancelled/skipped/todo各0、73830.785727ms、exit0。独立レビューでもdandelionの未対応挙動と変更範囲を確認PASS。全体再実行は引き続き待機中。
