# セミ表情の制作・検証記録

最終結果：セミ80表情を制作・検証・確認Site公開。完成済み範囲は17系統1360表情で、全キャラクターの完成ではない。全体テスト再実行1337成功、失敗/cancelled/skipped/todo各0。PR #278はDraftを維持しmainへマージしない。以下の途中状態は履歴で、最終結果は末尾にまとめる。

承認済み一括制作方針に沿い、cicada 全8段階×10表情＝80枚を個別生成。既存16系統1280表情は再生成していない。全キャラクターの制作完了とは扱わない。

## 基準と分離

開始remote `11c5025e33d3f395898bdb499a42a1f5c108eadb`、local `3708ecace51fb05b5c57296fca27fe3de387a354`、tree `f127d07b6c23ff8841a8022bf3b4e39439e081c9`。開始main `f23398e43eed952d49d5a2b805789a4c87b2b1bd`。PRメタデータのbase_shaは `3f4bfda0b8c0d30098ebb68c4313abd370a8576a` を返したが、後続のbranches/main・git/ref/heads/main・commits/mainとgit ls-remoteの実ブランチ照合はすべて `f23398e43eed952d49d5a2b805789a4c87b2b1bd`。実mainはこのrefを正とし、表情ブランチには取り込んでいない。PR #278はDraft/open/unmerged、既存競合あり。

元checkoutの無関係な画像変更 `docs/art/qa-bm/date-oasis_cactus.jpg` を保持するため、`/workspace/scratch/daf8d241531b/cicada-code` の分離worktreeで制作。

## 画像・配置

元画像8枚を個別に見て実座標グリッドから顔アンカーを設定。01〜03は橙色の幼虫、04は土の輪から出た段階、05は上側の緑色の羽化中セミ、06は緑色の若い成虫、07はオリーブ色と金色の成虫、08は灰褐色の年を重ねた成虫。05の下側の茶色い抜け殻を保持し、表情は生きた緑色の顔だけに置いた。

各段階10表情をそれぞれ元画像参照で個別生成。全80枚に異なる生成元とprovenanceを保存。既存normalizerで128×128・alpha・元画像boundsに正規化。manifestは80/80、complete:true。元画像/生成元/完成PNGの240ハッシュ照合成功。最終manifest後に不完全checkpointを除去。

独立担当が80枚すべてを単独目視しPASS。主担当と独立担当で全80マーク付き合成を確認。小さい表示で弱い・危険・睡眠など近い印象もあるが、確定マークと合わせて識別できる。顔以外の細部、輪郭、陰影は生成による差があり、ピクセル完全一致方式ではない。

新しいセミ8段階だけ配置。既存128段階は保持。1360マーク・816汗動作範囲、issues:[]。配置アルゴリズム変更・追加例外なし。サンゴだけの既存病気マーク上限例外を保持。重なり0と理想的な見た目は区別し、触角・羽・脚のため汗やマークが頭上/外側寄りになる制約は残る。

一覧PNGの日本語が欠字になったため調査。実行環境のfc-list :lang=jaが空だった。既存同梱WOFF2を作業用TTFへ展開し、FONTCONFIG_FILEを設定して一覧8枚を再出力。日本語ラベルを主担当が全8枚で再確認。キャラクターの再生成やゲームコード変更は行っていない。

## 保持・テスト

既存1280PNG/画像参照/SVG、128配置と過去81修正を固定baselineと照合して保持。非表情キャラクターPNG297枚、通常段階画像248枚、他のトップレベルruntime JS24本、pet-expression.cssも同一。ゲーム数値・恋愛条件・セーブ形式を保持。

統合TDDは26red→26green、表情単体338pass。追加前の基準版npm testは1295pass、失敗/cancel/skip/todo各0、498650.179426ms、exit0。これは最終セミ版の結果ではない。

`npm run bump`でindex.htmlの表情JS識別子1件のみ更新：`pet-expression.js?v=20260917-5a78c2c5`。最終80画像と配置・キャッシュを含む版で全体npm testを実行中。最終結果は追記する。

## 保存・確認Site

途中44枚の保存：remote `60634aa227fa2cbccca25114e92e99f9ae92f43b`、local `673fd33521198355734361201635bf078443fcb6`、一致tree `47c8aa103afd455e4123ce1a88e9c28497f6a627`。保存後Draft/open/未マージ確認。Actions/status/check-runs各0、combined pending。CI成功とは扱わない。

同じowner-private Site `appgprj_6aa908e9357c8191abb0f486be58697c` の更新を準備。画像版 `ci-dd2dbb00`、17系統1360件、新規セミ80件、初期セミ・今回分フィルタ有効。既存1280PNG保持、8シート/80PNG一致、JSキャッシュ一致を検証済み。タップ選択・メモ・コピーを保持。操作確認はソース/状態評価であり実機クリックではない。一覧はPNG/SVG/CSSの静止合成、実機撮影ではなく汗は近似。

現時点ではSite公開版は53のまま。最終全体テスト・レビュー通過後、同じSiteへ公開し、同じDraftブランチへ完成保存する。mainへマージしない。

公開前のSite version54を保存済み。source `6d425f0843a54ed69d674164eda01eed1ce11968`、version ID `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_5272427dc088819191bfb1f8b4214009`。package-site helper終了後、gzip正常と必要90項目（hosting設定、index、8一覧、80表情）を検証。公開は全体テスト完了待ち。

再現メモ：一覧出力時は日本語フォントがfontconfigから読めることを確認する。この環境では同梱 `assets/fonts/mplus-rounded-1c-regular.woff2` をTTFへ展開し、`FONTCONFIG_FILE=/workspace/scratch/daf8d241531b/cicada-fonts/fonts.conf` と `NODE_PATH` を指定して既存gallery toolを使用した。フォント変換と一覧再出力は表情PNGの生成ではない。

## 全体テスト初回と再検証

最終セミ版の初回全体テストは1337件中1336成功・1失敗、cancelled/skipped/todo各0、511464.281737ms、exit1。失敗は `tests/quick-mode-test.cjs:57` の `solving dodge counts`（0/20と1/20の差）。同ファイルには避ける系のランダムな落下物に自動操作が当たることがある旨の既存記述があり、過去の引き継ぎにも同失敗の前例がある。関連ゲーム/テスト/harnessは固定baselineと同一。

ゲームコード・テスト・乱数を変更せず、該当ファイルを再実行して10成功・失敗0（1615.687604ms、exit0）。同じ最終80画像・配置・cacheの全体npm testを改めて実行中。初回失敗を隠さず、再実行結果を別記する。

全80表情と配置の保存：remote `26c98bee8a9af0c40bd9b8681ed4d6ffbfcd5d0e`、local `03be1fe1d6b8ef4cea16b63450e2463346f4bd08`、一致tree `9a385f0e953dffb0532731a36f68f011835cfb9d`。この保存時点は全体テスト結果の確定前であり、Site公開/最終完了保存ではない。

## 最終検証・公開結果

最終80画像・新8配置・cacheを含む同一コードの全体再実行は **1337成功、失敗/cancelled/skipped/todo各0、507497.37217ms、exit0**。初回の1336成功/1dodge失敗と、無変更の該当テスト10成功も上記に保持。ゲームやテストの改変・乱数固定はしていない。独立最終レビューはSpec PASS / Code quality APPROVE。全80単独画像と全80マーク合成を確認し、日本語ラベル問題も解消。

同じowner-private確認Siteのversion54を公開し、deployment status **succeeded** を確認。

- ゲーム：https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/
- タップ一覧：https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/
- project：`appgprj_6aa908e9357c8191abb0f486be58697c`
- version：`appgprj_6aa908e9357c8191abb0f486be58697c~appgver_5272427dc088819191bfb1f8b4214009`
- deployment：`appgdep_6aac7c4ea19c81918450bfa2779a31df`
- Site source：`6d425f0843a54ed69d674164eda01eed1ce11968`
- image version：`ci-dd2dbb00`

公開用archiveはhelper正常終了後にgzipと必要ファイルを検査してから保存。Siteコードはclean。独立レビュー内の公開未確認はレビュー時点の記述で、その後の公開成功をここに記録する。実機の見た目はユーザー確認とし、こちらの一覧/操作確認を実機撮影・クリックと混同しない。

コードの最終保存SHA/tree/保存後CI・Draft・実main refはPR本文へ追記する。元emotion-codeの無関係な画像変更は保持し、今回の分離worktreeには取り込んでいない。
