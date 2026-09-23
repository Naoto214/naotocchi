# ぬいぐるみ80表情 — 制作記録（2026-09-23）

開始remote HEAD `d299c2bb03d471745dddd0928c03541d99863907`、local HEAD `13aa5b7fc2b16a5949d9c29eee1d99c28bdb9ecf`、共通tree `ab8e2427406a5ae1c0cb9525adcd93b212f1a451`、local clean。Git Data API保存による履歴差のためlocal履歴をpushしない。実main `91d6b10d7237c8a66a7f8f9e3f1ca016f5b16024` は取り込まない。PR278 Draft/open/未マージ・既存競合dirty。Actions/statuses/check-runs各0、combined pending。

既存2541PNG（active2240＋旧4＋通常297）の全SHA256と224配置・28anchors/namesを今回の保持基準に記録。master rare順・全8成長文・全8元画像からplushを選定。fallbackから選定していない。主/独立担当の原寸/6倍レビューで単一身体1顔、新たな分類曖昧さなし。

同じowner-private Siteはversion68、owner1/groups0/外部0、source `03f2674309db7dfe4aa8906c52235184b1609150` から開いた。80生成・独立受理・配置・テスト・Site更新・GitHub保存が終わるまで完成扱いしない。

## 制作途中の確認

01/03/05/07の40枚は各原寸/6倍の独立目視受理済みで、受理したSHA256と最終PNGが一致。残る40枚は制作中。この時点では全80完成・最終検証成功とは扱わない。

接続テストの先行REDは不足するplush接続/previewを確認。初回4file一括REDは無出力長時間実行を中断しexit130で、成功扱いしない。対象名限定の確定REDログを採用。接続追加後subset32件中24pass/8failは未生成placementのみで、最終GREENではない。最終focusedと全体テストは80PNG・配置完了後に別途実施する。

## 全80制作・独立受理・配置・保持

built-in imagegenを80枚それぞれ個別に呼び出し、重複・再生成・局所修正0。全128×128 RGBA、alpha0/255、元画像bounds一致。全原画像/生成元/完成PNGのSHA256とprovenanceを記録、全80独立native/6倍受理と最終SHA照合済み。既存2541PNG全SHA保持（active2240/旧4/通常297）。表情の微差・素材の生成微差はreviewに記録し、非顔部分までpixel完全一致とはしない。

新plush8配置だけ既存generatorで追加し、旧224配置・28anchors/namesを同値保持。generator本体/制約/例外は不変。全2320marks/1392sweatEnvelopesでissues0。pet-expression.jsは新8配置とplush登録以外baseline同一。cache20260923-fbcc8334はJS SHA1先頭8一致。

最終plush focused34/34 PASS、fail/cancelled/skipped/todo各0、10794.595347ms、exit0。未対応unknown fallback関連11/11 PASS。fallback変更はテストのみで次選定ではない。rare-line-1のplush達成済フラグ追加は使い捨てpreview限定、ゲーム本体の実績条件は不変。

全2320 assetForは実PNGへ接続、accentForはSVGを返し、Site側全2320PNGのSHA256一致。Site新画像版plush-db80cb75、plush80初期表示、旧各80/A100/B70/C40/過去複数顔100/全2320と選択保存KEYを保持。VM DOMで選択/メモ/コピー/ダイアログ/navと旧保存内容の保持を確認。VMは実機クリックではない。

## 全80合成受理・全体テスト開始

PNG生成/配置の非担当3名が01〜04/05〜06/07〜08を分担し、全80静止合成を原寸・拡大で受理。主担当も全8シートを実見し、8シートSHAと受理記録を照合した。修正0。03は元の上方ハートを避けてマークが高め、06の一部上部マークは耳に近いが非接触、08の汗は元の光を避け広め。衝突0を完全に理想的な配置と同義にしない。静止合成の汗は近似で、実機/iPhoneの見た目は未確認。

最終80PNG・8配置・cache・全80独立合成受理の後に `npm test` を開始。ログ `/workspace/scratch/0e1d599677f2/plush-npm-test-final.log`。結果取得前は成功扱いしない。

## 保存前の再取得

全体テスト実行中の再取得で表情remoteはd299c2bb03d471745dddd0928c03541d99863907のまま。実mainは `a7832694ff3decc3daf12a881176dca55d761020` へ進んだが取り込まない。PR278はDraft/open/未マージ、mergeableはnull/unknown（開始時はfalse/dirty、既存競合あり）。競合解消やReady化は行わない。表情HEADのCIはActions/statuses/check-runs各0、combined pending。

## 公開前archive検証

Site source `259c4ee33a30b1c9150464c6b7e79f5d8eed4c56` を保存し、対応archive `/workspace/scratch/0e1d599677f2/plush-site-final.tar.gz` を作成。111510694 bytes、2964 files、SHA256 `6278205fe40aa769f032064bbaa861ea29f91729eafe3ee7cc1b6a10db5583eb`。gzip全体読取、全ファイルlocal bytes・保存済みsource Git blob・完全ファイル集合を照合し一致。archive内dist/.openai/hosting.jsonはrepo .openai/hosting.jsonへ対応。

scratch検証器の初回実行は旧系統名一括置換でstartswithが誤記となりfileset判定で停止した。検証器だけ訂正して全検証を再実行しexit0。初回失敗を成功扱いせず、archive・Site source・画像・ゲームコードは変更していない。公開は全体テスト成功後に実施する。

## 最終全体テスト

最終PNG・配置・cache・全80合成受理後に実行したnpm testは1746成功、fail/cancelled/skipped/todo各0、595616.834519ms、exit0。途中無出力区間を含むが、終了コードと最終集計で成功を確認。その後runtime/PNG変更なし。git diff --check成功。

## 確認Site公開完了・GitHub保存準備

同じproject `appgprj_6aa908e9357c8191abb0f486be58697c`、version69はsucceeded。公開後get_site/get_site_version/get_deployment_statusを再取得しowner1/groups0/外部0、source `259c4ee33a30b1c9150464c6b7e79f5d8eed4c56` を確認。URL https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/ と /mark-review/。version ID `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_4904dd5051748191884291037886649c`、deployment `appgdep_6ab3a0639a7c8191aaf24f59e8f40e8d`。画像版plush-db80cb75、選択保存KEY `naotocchi-mark-review-mf-0660b59a` 保持。

公開API側archiveはTAR/2964files/121047040bytes、SHA256 `9766c99179b2828f030b1704fd9cbb249a7293eee86e8e4dabc6d88eb4070a44`。公開に渡したlocal GZIPとは容器形式が異なりbyte同一性は主張しない。local gzip全読取・全内容と保存済sourceの一致、API source commit/file_count一致、公開成功を確認済み。

完成素材は29系統2320表情、全character PNGは2621（active2320＋旧4＋通常297）。全キャラクター制作完了ではない。生成80回、再生成/局所修正0、既存2240表情の変更/再生成0。Spec/Code qualityの制作検証PASS、未解決critical/important/minor各0。全体1746PASS後runtime/PNG変更なし。最新remote treeをbase_treeに使うGit Data APIで必要100ファイルのみ保存し、localとremote treeの完全一致を要求する。保存後HEAD/tree/main/PR/CIはPR追記と最終報告へ記録。PR278 Draft/open/未マージ、main取り込み・競合解消・Ready化なし。この1系統保存後に停止する。
