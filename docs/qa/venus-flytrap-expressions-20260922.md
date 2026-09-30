# ハエトリグサ表情追加 QA — 2026-09-22

## 開始時の実確認

- PR #278: Draft / open / 未マージ。既存競合あり。main の取り込み・マージは実施しない。
- GitHub HEAD: `d4b1b78947cae17d87c0884d88f92fedaab94023`。
- 制作 worktree HEAD: `fafed8fc76a39915da8d97fe05c44e3bf51c2a09`。双方の tree は `18d5ec185bbee9edc5f86deff994ba57849d899f` で一致。
- 実 main: `0be2f5d516b16642522f7cf5d7bc461c4121ed90`。GitHub git/ref/heads/main と git ls-remote の双方で確認。PR metadata の古い base_sha は採用していない。
- HEAD の Actions / statuses / check-runs は各0件、combined status は pending。GitHub CI 成功とは扱わない。
- 制作 worktree、元 checkout、確認 Site は開始時 clean。元 checkout に記録されていた別作業の cactus 未コミット変更は今回存在しなかった。
- Sakura 最終 manifest、QA末尾、review、正本・実装済み一覧を読み、完成20系統・1600表情を基準に固定。
- 次の未制作系統は資料と8元画像を実確認して `venus_flytrap` を選択。全キャラクター完成ではない。

## 制作方針と元画像

承認済み一括制作を継続。通常制作・独立レビューは Astra medium。各段階を元画像から個別生成し、顔以外の構成と脇役の表情を保持する。生成方式のため輪郭・陰影までのピクセル完全一致は要求しない。小さな好みだけで再生成しない。

元画像8枚を個別に128px、6倍、実座標グリッドで確認。独立担当も元画像と顔アンカーを確認した。

| 段階 | 顔アンカー [x,y,left,right] | 編集対象と保持対象 |
|---|---|---|
| 01 | [57,73,10,117] | 茶色い種の顔。殻と輪郭を保持。 |
| 02 | [64,94,42,86] | 根元のクリーム色の顔。芽と小さな捕虫葉を保持。 |
| 03 | [61,104,43,79] | 根元のクリーム色の顔。葉と根を保持。 |
| 04 | [43,50,14,65] | 左上の大きな赤い捕虫葉。根元の驚き顔・右の眠そうな顔を保持。 |
| 05 | [65,42,37,90] | 上中央の最大の赤い捕虫葉。左右と根元の顔を保持。 |
| 06 | [65,87,49,82] | 巨大な捕虫葉の中の紫色の丸い顔だけ。周囲の赤い内側・緑の縁・突起を保持。 |
| 07 | [65,43,45,83] | 上中央の捕虫葉。残る4つの顔を保持。 |
| 08 | [61,39,49,72] | 上中央の最大の花の黄色い中心。左右の花の顔、白い花びら、小花、根元の捕虫葉を保持。 |

## 中間検証（最終結果ではない）

- 開始前 `npm test`: 1439成功、fail/cancelled/skipped/todo各0、246989.525514ms、exit0。
- 実装前 RED: route/preview 458件中448成功・意図した10失敗、231795.09361ms、exit1。
- 黄色い昆虫の空腹マークについて追加したテストも、実装前に意図した失敗を確認。既存 frog の黄色い昆虫SVGを共有する。
- 統合途中の新系統限定テスト: 19件中11成功・8失敗。8失敗は配置生成前の顔相対方向であり、最終結果とは別扱い。
- 生成途中で1回、出力側 moderation 400 Other エラーが発生。その時点で記録済み24件を保持し、未記録分のみ元画像から継続。対応する記録のない生成元は採用しない。
- 中間保持検査: 既存1600 PNG/参照/SVG、160段階配置、通常PNG297枚（通常段階248枚を含む）、他runtime JS24ファイル、pet-expression.css が固定baselineと一致。

後続の最終検証・公開・保存記録をこの文書末尾に追記する。現時点の中間記録だけでは80枚完成、1680表情完成、Site更新、GitHub保存を主張しない。

## 画像・配置の最終検証

- 全80枚を各段階の元画像参照で個別生成。manifest complete:true、80/80、異なる生成元80件。
- 全80枚128×128、alpha、元画像bounds一致。元画像／生成元／完成PNGの240SHA256を実ファイル照合。
- 全80単独画像を独立担当が128pxと6倍で確認。最終80PNGのSHA256が各レビューのACCEPT行に含まれることを照合。
- 明確な脇役変化を12コマ修正: 07-critical/sleeping/weak、08-wantsPlay以外の9コマ。07は脇役のウインク・閉じた目、08は3つの小花に追加された顔や左右の大きい花の目を元画像へ復元。主役の表情を保持。各recordにreplaces_source/repair_reason/repair_promptを記録、独立再レビューで全件解消。
- 生成途中の中断で記録がなかった08-tired修正版は採用せず、記録可能な修正版を再生成。完成済み20系統や受理済みコマの再生成はしない。
- 日本語段階別一覧8枚を主担当が全80合成目視。欠字なし。一覧はPNG/SVG/CSSの静止合成で実機撮影ではない。汗は静止近似。
- node tools/place-expression-marks.cjs venus_flytrap のみ実行。新8段階を追加し、既存160段階は再配置していない。アルゴリズム変更・追加例外なし。
- node tools/check-expression-placement.cjs: 1680マーク／1008汗動作範囲、issues:[]、exit0。
- 既存1600PNG/画像参照/SVGと160段階配置、過去81修正を保持。通常PNG297枚（段階画像248枚）、他トップレベルruntime JS24、pet-expression.cssを保持。ゲーム数値／恋愛条件／セーブ形式変更なし。
- npm run bump 後、表情JSの完全トークンだけ採用し他36識別子はbaseline保持。index.htmlは1件のみ変更。pet-expression.js?v=20260922-6348f2d6、最終JSのSHA1先頭8桁と一致。
- 小さい顔の疲労／弱い表情などは確定マークと合わせて識別。葉・捕虫葉・花びらとの衝突を避けるため頭上や外側寄りになる制約を保持。とくに根元の顔02/03、内側の顔06、複数顔07/08は「衝突0」と理想的な距離を区別する。

最終全体テストと独立合成・code/specレビューは進行中。公開とGitHub保存は後続記録参照。

## 最終全体テスト初回の失敗と調査

- 最終80画像・8配置・cacheを含む初回 npm test は1474件中1473成功・1失敗、cancelled/skipped/todo各0、231029.689049ms、exit1。初回成功とは扱わない。
- 唯一の失敗: tests/meguru-test.cjs:69、entering めぐる…、assertion「the closest inhabitant is picked up」。期待は先頭のキノコ、実際はもりのクマさん。
- systematic-debugging の手順で失敗入力・選択ロジック・差分を照合。テストは先頭住人の(x,z−30)へプレイヤーを置き40ms進め、その住人が最寄りだと仮定している。しかし同地点周辺にランダム移動する別住人がいて、失敗記録ではキノコ(-498.13995121217533,1049.4544514511672)に対しクマ(-508.06496823902813,1008.7671026492483)が配置されていた。要求したプレイヤー位置からはクマが約14.6、キノコが30の距離となる。
- meguru.jsは全住人・同行者の最小距離を選択する既存処理。meguru.js、tests/meguru-test.cjs、tests/helpers/runtime-harness.cjsはbaselineと差分0。今回の表情差分とは別の、ランダムな相対位置に依存する既存テストの仮定を確認した。
- 該当テストだけをコード変更なしで1回実行:1成功、失敗等0、218.431829ms、exit0。
- 無関係なゲームコード・乱数・既存テストは変更しない。失敗ログを保持して、同じ最終版の全体テストを1回再実行。結果は後続に記録する。

## 最終全体テストと独立レビューの完了

- コード・画像・配置・cacheを変更せず全体npm testを1回再実行し、1474成功、fail/cancelled/skipped/todo各0、237839.72999ms（約3分58秒）、exit0。初回1473成功/1失敗と区別し、初回成功とは記録しない。以降コード・画像・配置・cacheの変更なし。
- 新系統限定route/preview/food検証は19成功、失敗等0、4942.50883ms、exit0。
- 全80合成独立レビューPASS、日本語欠字なし。8一覧PNGのSHA256も受理記録と照合。
- 独立Spec PASS / Code quality PASS、critical/important/actionable minorなし。全体テスト待ちの条件は上記実行結果で満たした。失敗原因も独立確認し、既存テストのランダム位置関係の仮定と判断。
- 本系統の制作・検証で21系統1680表情。mushroomなどの未制作系統は残っており、全キャラクター完了ではない。

## 同じ確認Siteの公開完了

- project_id: appgprj_6aa908e9357c8191abb0f486be58697c。別Siteは作成していない。owner-privateのままversion58を公開、status succeeded。
- Site sourceをcommit/push後、git rev-parse --verify HEADで確認:2306d372f00efd4ff8351b671e4679afecd5ff7a。
- version ID: appgprj_6aa908e9357c8191abb0f486be58697c~appgver_788f515bafb08191afba01ba6b89daa8。
- deployment ID: appgdep_6ab1e9788a2481918b8a0a1ee1e00ae2。
- 最新Sites0.1.70のsite-workflow/package-site helper完了後、独立gzip全体検査と94ファイル（index、JS、レビューUI、8一覧、80PNG）一致・hosting設定確認。別実行のgzip検査とSHA256も一致。gzip SHA256:1b41e25a0dc3ec789fd98632dcca100a712089bcc85c010c4263286a551f0094、85598255bytes。保存サービス側の展開tar SHA256は別形式の識別子。
- ゲーム確認:https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/
- タップ式一覧:https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/
- 画像版vf-99f0c875。初期系統ハエトリグサ、「今回の追加分だけ」で80件。全21系統1680件、重複navなし、選択／メモ／コピーの既存実装保持、全既存1600PNG保持、cacheと最終JS SHA1一致を検査。操作確認はソース／状態評価で実機クリックではない。

## GitHub保存手順

この検証済み内容だけを95ファイルとして保存する。既存PR278のDraftを維持し、mainにはマージしない。最新remote treeをbase_treeに使い、local/remote tree完全一致とforce:false更新、保存後の実main/CI/Draft確認を行う。最終SHA/treeと保存後状態はPR本文への追記に記録する。
