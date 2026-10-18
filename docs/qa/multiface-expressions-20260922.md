# 複数顔共有状態の最小修正（2026-09-22）

## 開始確認
GitHub HEAD817e19624b684f9aa23ca4ccc6a5d332e638be12、local471cb46f93d088cbdc9aa5eef0cab087067236b6、共通tree d28f1cd2f96e0e37b45835a7b133980751e7769f。実main0be2f5d516b16642522f7cf5d7bc461c4121ed90をAPI refとgit ls-remoteで一致確認。PR278 Draft/open/未マージ、既存競合あり。Actions/statuses/check-runs各0、combined pending。制作worktree・元checkout・Site sourceはclean。main取り込みなし。

実assetForで21系統×8段階×10状態=1680参照と全ファイル存在を確認、欠落0。通常168元画像を主担当と独立担当が走査。対象10段階は元画像拡大と既存100表情を監査。対象・除外根拠はreviewと正本を参照。修正対象81PNG、維持1599表情。新系統はまだ開始しない。

開始baseline npm test:1474pass、fail/cancelled/skipped/todo各0、225237.359225ms。最終版テストとは区別。最初の補助件数確認スクリプトは非公開のEXPRESSIONSを参照してTypeErrorになったため、正本10状態を明示した読取専用スクリプトに訂正。製品コード変更なし。

## 作業中
81対象を既存表情＋通常元画像参照で個別編集。生成元・旧画像SHA・プロンプトを保存。現在未完了。公開・GitHub保存はまだ行っていない。

## 81枚の画像修正・検証

81/81生成・正規化済み。各画像は修正前PNGと通常元画像を参照。128×128・alpha・通常画像bounds一致。元画像／修正前／生成元／最終PNGの324 SHA256を実ファイル照合。新manifestを81ファイルの現行ハッシュの正本とし、過去の各系統manifestは制作当時の履歴として保持する。

対象外1599 active表情PNGと過去の追加4PNG、通常等297PNGを保持。非docs保護対象2099ファイルのGit blob一致を確認。全runtime JS、CSS、マークSVG・配置・アンカー・状態resolver・ゲーム数値・セーブ形式を変更していない。21系統1680画像参照が存在。配置再計算なし。1680マーク／1008汗動作範囲、問題0。

主担当が81単独最終PNGと10段階100コマの日本語付き合成一覧を目視。欠字なし。小さい顔の疲労・病気・弱い状態などは近く見えるが、既存マークとの組合せで識別可能。輪郭・陰影の生成差はあり、顔以外ピクセル完全一致ではない。サクラ06の小つぼみの黄色差は閉じた形状を保ち独立レビューで受理。

生成処理中断時はrecord保存済み53枚を照合し、未記録28枚だけ再開。venus05-sleepingのレビュー依頼が正規化反映より先になったが、manifest件数・SHAチェックで旧版混入を検出し、修正版へ更新して受理。画像の再生成は不要だった。

npm run bump実行。無関係な36識別子の日付変更をbaselineから戻した。表情JS完全トークン20260922-6348f2d6は最終JSのSHA1先頭8桁と一致し変更なし。index.htmlもbaseline一致。

確認Siteは既存sourceをsite-workflowでopen済み。81PNGと10一覧・レビュー画面のみ更新中。画像版mf-0660b59a、複数顔対象100件で保持19表情も比較可能。公開・最終全体テスト・GitHub保存は以下の後続記録で確定する。

## 最終テスト・独立レビュー

修正81PNGを含む最終版のnpm testは1474成功、失敗/cancelled/skipped/todo各0、268158.267584ms、exit0。今回の最終実行は初回成功・再実行なし。開始前baseline1474成功とは別。以降コード・PNG変更なし。全81最終ハッシュが独立レビュー受理記録に存在することを照合。Spec PASS / Code quality PASS、critical/importantなし。

Site検証：21系統1680件、対象100件、81PNG/10一覧が制作版と一致、変更94ファイル、タップ・メモ・コピー処理保持（ソース/状態評価であり実機クリックではない）。push後source HEAD f12d369b37b73d1f24cd753def6f79f2fdad25d4、clean。初回gzip末尾欠損を検出し未使用。再パッケージ版は同一実行・別実行の両方でgzip全体検査PASS、95パス内容一致。archive SHA256 a91852f4022b062a9f4a7c010e2c6e132de474da842d424b7c91e5060ec9c3db。

## 確認Site公開

同じowner-private Site version59を公開、status succeeded。画像版mf-0660b59a。version ID appgprj_6aa908e9357c8191abb0f486be58697c~appgver_3242a9d28de48191b350b12d96f02077、deployment ID appgdep_6ab21875c7bc81919fb4d6d9c7d7c03d。
https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/

GitHub保存直前remote HEAD817e19624b684f9aa23ca4ccc6a5d332e638be12/tree d28f1cd2f96e0e37b45835a7b133980751e7769fを再確認。保存後HEAD/tree/main/CIはPR本文の「複数顔最終保存」に記録する。完成数は21系統1680表情で増減なし。次の未制作系統は未着手。
