# フェニックス80表情 — 制作記録（2026-09-23）

## 基準と範囲

GitHub基準HEAD `6ccc3d04d9a5295122d9a03c8b8bdae8332e197f`、tree `6da4b6a4a0b3b5a8e0024ef7f89e73f05208168e`。local同treeのHEAD `1b445488d0663a9dbbce7cb135448152841c7be7`。実main `adcc007261191dc36811c362865ad41ee285d4f5`、PR278 Draft/open/未マージ・既存競合、Actions/statuses/check-runs0・combined pendingを開始時APIで実確認。main取り込みなし。既存23系統1840表情と通常297PNG・旧4PNGの計2141基準PNGをSHA256保存した。

## 選定・分類・元画像

masterの未制作rare次系統phoenixを選定。script.jsの8段階成長資料、通常8PNGを主担当と独立担当が原寸・6倍で実見。全8は単一身体単一顔で、A/B/C複数構成の対象なし、新分類曖昧さ0。08の灰・炭・火の粉に顔・生体なし。炎の羽は身体デザインであり状態マークではない。06の金色、07の年齢表現、08の再生構造を保持する。別レイヤーの状態マークや汗をPNGに焼き込まない。詳細と顔アンカーはoriginal-review.md参照。

## 接続の先行検証

phoenix全8段階の画像・SVG・runtime・確認fixtureを既存経路へ接続。テストを先に追加し、未接続による26件のREDを確認した。未対応fallback用に使われていたphoenixは今回対応対象となるため、同じ未対応rareのgodへfixtureを移した。既存dragon fixtureのrare-line-1達成を保持しphoenixにも適用。ゲームの実績条件を変更していない。unit/integration/previewの724件は全成功、exit0、320.154秒。これは画像asset検証・最終全体テストの代用ではない。

## 制作・最終検証

制作中。全80受理・最終配置・全体テスト・Site公開・GitHub保存まで完了扱いしない。完成済み1840表情の再生成・再監査は行わず、画像ハッシュと配置保持のみを照合する。最終結果を以下へ追記する。

### 05の局所修正

05-hungryだけ元画像の横顔にない遠側の第二眼が追加されたため、新規画像の該当箇所をimagegenで1回局所修正。主眼の空腹表情・くちばし・炎翼・尾・足の主要形状を保ち、独立担当が原寸/6倍で修正版を再受理した。他の9枚は受理済み。05-strainedの暗縁は嘴付け根、05-sickの連続白線は嘴内縁ハイライトとして受理し、明確な第二眼／歯列追加とは判定しなかった。生成画像の非顔部分が元画像とピクセル単位で完全同一とは主張しない。修正前後のSHAとpromptは最終manifestのrepair_historyに保持する。

01のtired/weak、hungry/wantsPlayは原寸で差が控えめだが、目・眉・口の状態表現は適合として受理。受理済み画像を小さな好みで再生成しない。

### 07の局所修正

07-sickの初回生成はくちばし内部に白い歯状格子を追加していた。制作担当と主担当が生成元を確認し、同画像のくちばしだけを対象に1回修正して格子を除去した。垂れた病気の眼・眉、頭の向き、灰色混じりの老齢羽、翼・尾・足の主要構造を保持。修正履歴とSHAはmanifestへ記録する。03-sulkyの短く見える嘴は閉じた嘴として構造維持と独立判定され、不要な修正はしていない。06の薄金色の小さい顔では不調系の原寸差が控えめであることを記録する。

### 80枚受理・配置最終結果

80枚を主担当が確認し、独立担当が単独原寸/6倍で全数受理。最終80PNGのSHA256と受理記録が一致。生成80回、必要な局所修正は05-hungry/07-sickの計2回、既存1840表情の再生成・修正0。manifest complete:true。正本A/B/Cルール維持、phoenixは全8段階単一身体・単一顔で新たな分類曖昧さなし。

主担当と別の独立担当が全80マーク付き合成を確認。08病気の汗が高すぎる指摘を受け、新規08の汗だけを同じ余白・動作範囲制約下の低い候補へ調整した。centerY32.1875→54.1875、leftInner31.6875/rightInner70.6875。画像・マーク形・色・他の配置は保持。生成スクリプト自体や制約・例外は変更なし。調整後08を再受理し未解決critical/important/minor各0、Spec PASS／Code quality PASS。全1920マーク・1152汗動作範囲の重なりissues0。

基準2141PNG（active1840＋旧4＋通常297）のSHA256一致、旧184段階の名前/アンカー/配置保持。全1920 assetForが実PNG、accentForがSVGへ接続。Siteとの1920PNG SHA256一致。pet-expression.jsはphoenix一覧追加と新8配置以外が基準一致。indexは同JSのSHA1一致するcache `20260923-592ae494`だけ更新し、他識別子は変更なし。

01の小さな顔、06の淡金色、07の老齢顔は原寸で一部差が控えめ。04〜06の汗は翼を避けて広め、08は火の粉を避け斜め上の両側。重なり0と完全に理想的な見た目は区別する。静止一覧の汗は近似、VM DOM状態検証は実機クリックではない。実機の見た目はユーザー確認。Siteにも制約を記載。

配置調整後の関連テスト（pet-expression unit/assets/integration）は864成功、失敗等0、31468.488636ms、exit0。全体実行中に新08汗とcacheのみ最終調整したため、この関連検証・cache検証・全数配置検証・Site/manifestハッシュ検証を追加した。全体結果は次項に記載。

### テスト完了

全体 `npm test` は1576成功、失敗/cancelled/skipped/todo各0、312233.67314ms、exit0。ログ `/workspace/scratch/bf73fcf410a5/phoenix-npm-test.log`。最終配置後の関連864件とcache2件も全成功、exit0。画像は全体実行前に最終受理済みで、その後PNG変更0。今回の全体テストに初回失敗なし。前回dragonの初回失敗とfixture限定修正はdragon QAを保持。

保存直前GitHub再確認：表情remoteは開始時6ccc3d0のまま。mainは別作業で `0d3a7e348bfd2a33be9efc1131393c79fafac7b7` へ進行。mainを取り込まず、PR278 Draft/open/未マージを維持。基準HEADのActions/statuses/check-runs各0、combined pendingを成功扱いしない。

### 確認Site公開

同一project `appgprj_6aa908e9357c8191abb0f486be58697c`、source `8626bdd0ac5d37e1618cb7d1c54cd80bd8cadfd8`。公開version ID `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_eb9e2591b28081918543e5adb3c154ec`、deployment `appgdep_6ab2c191900c8191a2be99ec2bfef1d2`、status succeeded。URL https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/ と /mark-review/。公開アーカイブ95,337,523 bytes・2524ファイル、SHA256 `53f822b4e9e01d5b119442187efcc85bea27c176cb2c4a5cd03e2ed667595740`。gzip全体を読み切り、各内容を保存sourceと照合済み。

フェニックス80初期表示。りゅう80、キノコ80、A100/B70/C40、過去複数顔100、全1920に切替可能。選択・メモ・コピー・navのVM DOM検証成功。保存KEY `naotocchi-mark-review-mf-0660b59a` 維持、画像版 `phoenix-fc6a6b1a`。全キャラクター制作完了ではなく、24系統1920表情の区切り。

Site実再取得：version64、succeeded、owner-private（owner1名、groups0、external0）。GitHub保存のHEAD/tree・CI最終値はPR278本文へ追記する。
