# タンポポ表情の制作・検証記録

タンポポ80表情の制作・検証・確認Site公開完了。完成・検証済みは19系統1520表情。全キャラクターの制作完了ではない。PR278はDraft/open/未マージを維持しmainにマージしない。

開始時remote946279bff950d4408784a2e60159ced9efc725a1、local20d870685d9a8fdce5f12641b9db33ec9eebabb0、一致tree5cd6075108e5e19ec3e0965b0f6d8ad2ede3da2a。実main d8036775d35f21fc12c20d5bf450e93d3a2e8846をgit/ref/heads/mainとls-remote双方で確認。PR metadata base_sha3f4bfda0b8c0d30098ebb68c4313abd370a8576aとは区別する。Actions/status/check-runs各0、combined pending、CI成功扱いしない。制作worktree/Site開始時clean。別emotion-codeのdocs/art/qa-bm/date-oasis_cactus.jpg変更は保持。

資料順で次の未制作系統dandelionを選定。元画像8枚を等倍・6倍・座標グリッドで確認。01は左下の種と右上綿毛、02はふたばと丸い種、03/04は葉のロゼットと下部顔、05は閉じた黄色いつぼみ、06は黄色の開花、07は白い綿毛頭、08は顔のある6個の種。08は中央左の大きい種の顔(52,65)だけを編集し周囲5顔を保持する。顔座標8点と方針を独立担当も確認PASS。

各段階10枚を元画像参照で個別生成し、provenanceを保存。細部の生成差は許容し、顔以外ピクセル完全一致方式とは扱わない。既存1440表情は再生成しない。

新規ルート/previewのREDは10件すべて期待通り失敗（未対応）、7490.7935ms。旧未対応例に用いていたdandelionは今回対応になるため、実未対応sakuraへfixtureだけ置換し未対応契約を維持する。

現在までの保持検査：1440既存PNG/asset参照/accent SVG/144配置一致。81既存修正を含む。非表情PNG297枚中通常段階248、他runtime JS24本、表情CSS一致。ゲーム・恋愛・セーブは変更しない。新規配置・最終テスト・公開・保存は未完了。

## 中間確認（最終完了ではない）

- 部分正規化31枚：128×128、alpha、元画像bounds一致。original/source/finalの93ハッシュ一致。checkpointはcomplete:false。
- 独立コード中間レビュー：既存1440画像・画像参照・SVG、144段階配置、非表情PNG297枚／通常段階248枚、他runtime JS24ファイル・CSS保持PASS。未対応例をsakuraへ移動したfixtureもassert維持を確認。
- 独立dandelion route/preview検証10件成功、失敗0、15498.191186ms、exit0。最終画像／配置／全体テストは未完了。
- 同じSiteを取得しversion55、owner、自分1名のみ／グループ0／外部閲覧者0を確認。まだ新しい版を保存・公開していない。

## 最終画像・配置（全体テストと公開・保存は別ゲート）

- 80枚の個別生成完了。08-hungry/strainedは右下の脇役の笑い口が丸い開口に変わったため、生成元と元画像を参照して各1回修正。replaces_source/repair_reason/repair_promptをmanifestに保持。修正版2枚の独立再確認でBLOCK解消。
- 最終manifest complete:true、80/80 unique sources。全80枚128×128、alpha、元画像bounds一致。original/source/finalの240SHA256を実ファイル照合。
- 独立単独レビュー31＋19＋30＝全80枚、および修正2枚再レビューPASS。主担当・独立担当が段階別一覧8枚の全80合成コマと日本語ラベルを確認。欠字なし。
- 全1520マーク／912汗動作範囲の衝突検査issues:[]。タンポポ8段階だけ新規配置、既存144段階保持。配置アルゴリズム変更・追加例外なし。サンゴ／antlion02既存例外を維持。
- 既存1440 PNG／参照／SVG、過去81件修正を含む144配置、非表情PNG297枚／通常段階248枚、他のトップレベルruntime JS24ファイル・pet-expression.cssを固定baseline20d870685d9a8fdce5f12641b9db33ec9eebabb0と照合し保持PASS。ゲーム数値・恋愛条件・セーブ形式の変更なし。
- npm run bumpを実行。index.html変更はpet-expression.js?v=20260918-5ee55a08の1件だけ。日付＋SHA1先頭8桁の一致、他36キャッシュ識別子保持を確認。
- 顔以外の輪郭・陰影・綿毛・葉や周辺の小さい顔線には生成による差があり、ピクセル完全一致ではない。特に08は小さい主顔のため弱い／危険／睡眠などが近い印象になるが、確定マークと合わせて識別可能。葉・綿毛・分散した種を避けるためマーク／汗が上方・外側になる制約は残る。重なり0は理想的な好みの配置を保証しない。
- 一覧はPNG/SVG/CSS静止合成で実機撮影ではない。汗は静止近似。実機の最終見た目はユーザー確認。
- 最終版の全体npm testを開始し、結果待ち。出力が増えないことだけで停止と判断しない。

## 確認Site準備

- 同じowner-private Siteのソースをcommit・push成功後、git rev-parse --verify HEADで304dfe108e5b91201207b622097021de4bde63ecを取得。
- 19系統1520件、今回dandelion80件、初期表示dandelion、タップ選択・メモ・コピー保持をソース／状態評価で確認。実機クリックとは区別。
- 既存1440PNG保持、新80PNG／8一覧／最終JS SHA1とキャッシュ一致。画像版da-fb63bfed。
- package-site helper正常終了後、gzip全体読み取り、hosting設定、index、8一覧、80PNGの必須90ファイルを確認。保存・公開の最終結果は追記する。

## 最終全体テスト・独立判定

最終80画像・8配置・キャッシュ更新を含む版でnpm testを実行。1405件成功、失敗／cancelled／skipped／todoは各0、609425.702809ms（約10分9秒）、exit0。今回の全体実行は初回成功、再実行なし。ログ: /workspace/scratch/c45f03af27e5/dandelion-npm-test.log。RED時の未対応10件失敗は実装前の検証であり、この全体テストとは別。

独立最終レビュー: Spec PASS / Code quality PASS、blockerなし。最終単独80枚・マーク付き80コマ・保持・provenance・配置・cacheを確認。レビュー中の公開／remote未確認はその時点の記述であり、後続の完了結果を本QA／PR本文に記録する。

## 公開完了・Git保存

同じowner-private Site version56の公開status succeededを確認。version ID: appgprj_6aa908e9357c8191abb0f486be58697c~appgver_5a45f069981c81918c056ed69812f9bf。deployment ID: appgdep_6aacde59b5748191bb5dcaabd2eff09a。URL: https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/ 。Site source HEAD304dfe108e5b91201207b622097021de4bde63ec、画像版da-fb63bfed。既存Siteを継続、owner-private維持。

Git保存は既存Draftブランチの最新remote treeをbase_treeに使用し、local tree一致確認後にforce:falseで更新する。保存後の完全SHA／tree／実main双方照合／CI／Draft状態はPR278本文のタンポポ最終保存記録を正本とする。mainへマージしない。
