# 手順6 fresh最終QA（2026-09-30 UTC）

- **Expression System：条件付き。** ローカルruntime・正式asset・resolver・名称・保存fixture・Site version74保存ソースは検証済み。公開Siteの本人認証後画面は未確認のため完全GREENとはしない。
- **repo全体test：GREEN。** 今回の正式 `npm test` はexit 0、Node test runner **1,850 PASS / 0 FAIL / 0 SKIP / 0 cancelled / 0 todo**。先行smoke・dialogue・visual QAスクリプトも成功。件数をrunnerの集計へ二重加算しない。
- **GitHub CI：未確認。** Actions / check-runs / statusesは各0、combined pending。ローカルPASSをCI成功に置き換えない。

新しい制作・美的再監査は行わず、本番画像・runtime・セーブschemaの変更0。PR278 Draft/open/未マージ、main取り込み・競合解消・Ready化なし。なおと制作や他作業へ進まない。

## 正本とsnapshot

開始GitHub fresh HEAD `a662da3cedb20f39eabb76ea19b60421d98c4866`、tree `10f17ed7331ddb8c0520486afd20ed4a222c031b`、実main `05b31dfd4c2c2ebecc5890ffc2a23efbcfd1d032`。指定値をAPIとfresh cloneで確認した。QA終了前再取得でも同じHEAD/main。PRはdraft=true / state=open / merged=false / mergeable=false / mergeable_state=dirty。

開始[全tracked snapshot](start-snapshot.json.gz)は4,085ファイル。全画像3,280、通常基準248、表情PNG2,484（正式2,480＋保持する旧pilot4）、正式修正対象26、食事SVG15、主要runtime41、repo内Site関連18のSHA-256を保存。Site source `b282683aa4039eb3af2e999514590727e0f8a61d` はfresh remoteと一致しclean。別途[Site全3,222ファイルのsnapshot](site-source-snapshot.json.gz)を保存。

終了保存HEAD/treeは自己参照を避け、QA本文・証拠の保存コミットを指す `github-save-verification.json` に記録する。最終封印コミット自身のfresh HEAD/tree/PR/CIは最終回答に記載。開始／終了の本番コードtreeは同一内容で、追加はQA資料と台帳の追記のみ。

## fresh testとquick-mode

|実行|今回結果|証拠|
|---|---|---|
|`npm test`（package.jsonの正式コマンドを変更せず実行）|1,850 PASS、0 FAIL、407.3秒|[全ログ](npm-test.log)、exit 0|
|expression/resolver/assets/integration/hunger/migration/save recovery focused|1,154 PASS、0 FAIL、0 SKIP|[focused.log](focused.log)|
|名称4系統のpreview focused|8 PASS、0 FAIL、0 SKIP|[names.log](names.log)|
|quick-mode単独1回|10 PASS、0 FAIL|[quick-mode.log](quick-mode.log)|
|補助セーブfixture検査|248/248 PASS|[save-compatibility.json](save-compatibility.json)|
|31系統248段階gallery/asset参照|2,728参照PASS|[gallery-verification.json](gallery-verification.json)|

focusedの正式ファイルは `tests/pet-expression-test.cjs`、`pet-expression-assets-test.cjs`、`pet-expression-integration-test.cjs`、`hunger-profile-test.cjs`、`migration-test.cjs`、`save-recovery-test.cjs`。名称は `tests/cat-expression-preview-test.cjs` に `--test-name-pattern='starfish preview|sakura preview|world.tree preview|unknown preview'` を付けた実行。quick-modeは `node --test tests/quick-mode-test.cjs`。全体とfocusedは重複があり合算しない。

過去の `tests/quick-mode-test.cjs:57` の `solving dodge counts`（期待✔1/20、実測✔0/20）は原因未特定の履歴として保持。今回は全体test内と単独1回の両方で再発なし。原因特定済み・恒久解消済みとはしない。今回失敗seedや乱数状態は存在せず、既存testもseedを出力しないため捏造しない。

補助QAスクリプトの初回は、空腹saveをloadしても描画がnormalというassertに失敗した。[初回ログ](save-initial-fixture-failure.log)を保存。原因はQA fixture側で `lifeCardOverlay` をhiddenにしていなかったこと。保存stateのhunger=40とhomeEmotion=hungryは正しく、`script.js:petExpressionContextVisible` のoverlay条件→ `resolve({blocked:true})` が契約どおりnormalに抑制していた。既存integration testと同じHome表示条件（storyFlash/lifeCardOverlay/speechBubbleをhidden）に合わせて248/248 PASS。本番コード・正式testを変更して通したものではなく、未解決の製品FAILではない。

## 名称・意味・resolver

- 31/31系統・248段階について、ゲーム正本とpreview名称表・SiteのSTAGE_NAMESを照合。男女の既存識別補助「（男）／（女）」のみ除いて一致。
- ヒトデ・サクラ・世界樹・unknownの既知4 FAILは再発なし。現行10ファイルを旧名称・旧種子除外規定で検索。[結果](name-search.json)の「芽ぶきのたね」はタンポポ01の承認名であり、サクラへの再混入ではない。履歴QAは削除しない。
- 承認済み種・蛹・変態の段階、鉢クラゲ型参考、サンゴ群体・海の豊かさ、非普遍的なヒトデ幼生経路、描画上の成熟・老成、代表的なカクレクマノミ雄性先熟の説明を正本で維持。空腹semanticを再設計しない。
- hungerは248/248明示解決。19意味カテゴリ・default＋override・unsupported/malformedの契約・未設定fallbackなしをfocusedで確認。正式15食事SVGすべて存在し、本番・Siteと接続。中立養分A、底生小餌Aを含めhash不変。
- 手順1直前remote `df628e6f04802ea1fde21e0088c890e3084fa35b` と現行配置を再比較し、hungryの差はキノコ07 `[-5,-1] → [-23,-9]` だけ。他247位置は不変。[実測](site-source-verification.json)。位置の良し悪しの再監査は行わない。
- 10 IDと本体／汗／代表状態マーク別レイヤーを維持。本体→汗→状態マークのruntime integrationと静的全248シートの順序を確認。病気併存の汗は補助表示で、代表マークは1種類。

## 正式画像・provenance

|対象|fresh照合|維持する裁定|
|---|---|---|
|犬03 wantsPlay|承認after/locked16 SHA一致 1/1|挙上した左前脚・顔・遊びたい表現。他9表情不変|
|ウスバカゲロウ07|承認after/locked16 SHA一致 5/5|strained/hungry/tired/weak/criticalの淡い軌跡・粒子。未指摘5枚不変|
|ヒトデ01〜03通常|承認候補とSHA一致 3/3|03は星型側のみ一顔。青い幼生側に第二の顔なし|
|ヒトデ01〜03表情|正式manifest final SHA一致 30/30|01〜07外部泡0の承認画像を保持|
|ヒトデ04〜08|通常5枚＋既存表情・正式限定補修を保持|08の5泡、B1〜B4自然差、B5位置、保護1px差を維持|
|ヒトデ08|承認after/locked16 SHA一致 10/10|泡の新規pixel監査なし|
|ウスバカゲロウ08|本番＝正式選択元＝manifest SHA 10/10|下表の裁定をそのまま保持|

ウスバカゲロウ08：happy / sick / sulky / weak / sleeping＝方式D正式最終候補、strained=A、hungry=B、tired=D4、critical=A、wantsPlay=CL3。

CL3の本人左眼（character-left / viewer-right）の非対称、critical Aの53成分・189粒子画素・後方占有率5.93%は正式provenanceとして維持。今回再測定・均一化しない。通常基準08の実在RGBを共通色調基準とするD4以降の方針を維持し、状態別の増減光・彩度変更0。

D1/D2/D3、CL1/CL2、strained B/critical B等はQA履歴のみ。runtimeは正式productionパス、Siteはそのbyte一致コピーを参照。候補statusの古い保留記述は日付付き制作履歴で、後続の正式採用正本・台帳を覆さない。[26枚のfresh照合](verification.json)、[全画像hash](final-hash-verification.json)。

## セーブ互換

既存正式migration/save-recovery testsはfocused内PASS。schema5 round trip、schema3年齢換算、pre-schema旧stage/freePlay、形状補正、infiniteReturn、破損／回復系をそのtestで確認。

追加の[読み取りQAスクリプト](verify-save.cjs)で既存schema5形式の合成fixtureを248段階loadし、speciesLine、stage index、ageTicks、承認名称、hungry asset、空腹カテゴリ、状態resolver、schemaVersion=5を実runtime harnessで確認。ユーザーの個別実セーブデータを読み込んだ検証ではない。全schema世代×全表情の網羅までは未実施。script.jsを含めセーブ処理のhash不変、新規migration/schema変更0。

## 実Homeと表示

実Chromeで、正本の `tools/cat-expression-preview.cjs` が作る実Homeを確認。iframe内で本番index/runtime/assetsを実行し、保存はそのページ専用memory storage。ユーザーの永続save・本番runtimeは変更しない。静的contact sheetを実Homeとして数えない。

[Home結果](home-results.json)：ウスバカゲロウ08のnormal/hungry/sick/tired/sulky/weak/critical/wantsPlay/sleepingを各fresh load後の `data-expression` で照合。じゃれる→happy、健康時くすり→strainedも実操作で確認。重点対象は犬03 wantsPlay、ヒトデ01 hungry/02 sick/03 sick/08 hungry、ウスバカゲロウ07 tired、キノコ07 hungryを実ブラウザーで照合。

目視証拠：[ヒトデ03病気＋汗](home-starfish03-sick.jpg)、[キノコ07空腹](home-mushroom07-hungry.jpg)、[ウスバカゲロウ08 happy](home-antlion08-happy-action.jpg)、[空腹](home-antlion08-hungry.jpg)、[病気](home-antlion08-sick.jpg)、[疲労](home-antlion08-tired.jpg)、[睡眠](home-sleeping-final.jpg)。表示欠損・明確な身体破綻はこの確認範囲で認めない。

初期のsrcdoc切替直後はブラウザー観察が旧フレームを拾い、スクリーンショットと要求プリセットが一致しない例があった。誤ラベル画像を証拠から除外し、fresh URL load＋実DOM値で確認した。時間経過の自動回復でcriticalがweakに移行することもあり、後刻の画像だけをcritical判定に使わない。happy/strainedの一時表示はDOM確認と正式integrationを根拠にし、瞬間的な全フレームの録画QAは未実施。

実viewportは約1363×936。実端末の全画面幅・全248段階×全状態の目視網羅ではない。128/104/80/64pxの既承認比較資料はhash保持、focusedの既存サイズ回帰もPASS。今回新しい1px課題や64px白点保持要求を追加せず、サイズ別asset/runtime特例0。

## 確認Site version74

fresh Site metadataでversion74、source `b282683aa4039eb3af2e999514590727e0f8a61d`、archive SHA-256 `f31abbcb896e212a0b151a643ea40f67fc57b99d33635277dea68c6099024cf8`、既存deployment `appgdep_6abbcc0221108191932d092094c234c1` を確認。公開範囲はcustom・本人1名・group0のまま。新version作成・公開範囲変更なし。

- 保存ソース：本番assets全2,862ファイルがbyte一致、主要runtime・名称も一致。
- 31系統×8段階の名称・順序、2,480表情を検証。現行generatorからメモリー上で再合成した全248シートの画像領域が配信ソースPNGとpixel一致（文字フォント領域のみ比較除外）。旧候補・欠損の混入なし。
- 現行Home・regular・mark-review・履歴final-auditの相対参照95件を確認、欠損0。履歴ページは現行assetの正本として扱わない。
- ローカルブラウザーでversion74ソースの[ヒトデ03一覧](site-v74-starfish03-local.jpg)と[ウスバカゲロウ08一覧](site-v74-antlion08-local.jpg)を目視。名前、顔、マーク、画像配置に重大な崩れなし。
- **公開URLの認証後画面は未確認**。公開URLはChatGPTで続ける→本人ログイン画面となり、認証情報を取得・入力せず停止。ソースの確認を公開画面確認済みとはしない。公開状態の最終目視が残件であり、完全GREENの条件を満たしたとは宣言しない。

## 非変更保証・保存

[最終hash結果](final-hash-verification.json)：既存画像3,280/3,280（PNG2,932枚）、通常248、表情2,484、食事15、正式26を保持。本番画像変更0。手順4開始時の対象外character PNG2,755枚も不変。なかま・こいびと・scenery・card-gameを含む全既存tracked画像に差なし。

分類A＝今回追加したQA資料とチェックリスト末尾の手順6結果。分類B＝手順1〜5の承認変更済みassets/runtime/正本（今回は不変）。分類C＝その他非対象tracked（不変）。台帳追記以外の開始tracked 4,084ファイルはbyte保持。使い捨てHome/複製Siteは削除し、debugファイル・node_modulesをstageしない。今回の補助QA検査スクリプトはdocs内証拠で、package.jsonの正式testへ混入しない。

`git diff --check` とstaged diffを保存前確認し、保存後はremoteと一致・working tree cleanを確認する。保存後fresh GitHub証拠は `github-save-verification.json`。CI 0/pendingとdirtyを成功・解消に読み替えない。

残件は公開Siteの本人認証後表示確認とGitHub CI成功確認。過去quick-mode原因未特定は履歴として残る。新規未解決の製品FAILなし。追加の制作・微細調整へ進まず、この区切りで停止。
