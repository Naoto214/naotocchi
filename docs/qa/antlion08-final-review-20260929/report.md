# WP-CL1正式採用・10表情最終人間確認

2026-09-29。source HEAD: `7c878f86c08557970387e42f7f69a186ef505cd9`。

人間裁定：wantsPlay **WP-CL1正式採用**、WP-CL2不採用（履歴のみ保持）。本人左目＝character-left / viewer-right、本人右目＝character-right / viewer-left。128pxの自然さ・顔全体との調和を優先し、104／80pxの白点消失は許容。64pxで細かな眼の識別を要求しない。正式な「かまって」状態マークで補完する。128px単一PNGを通常表示系で縮小する構造を維持し、サイズ別asset・runtime特例は追加しない。

## 確認資料

- [通常基準＋10表情、128／104／80／64pxを一枚にした最終contact sheet](contact-sheet.png)
- [同一範囲・倍率の顔一覧](faces.png)
- [strained／critical：旧本番・元QA候補・限定候補と局所比較](selection-comparison.png)
- [全入力パス・候補ID・SHA-256](sources.json)

一覧のstrained／criticalには**未承認の限定候補**を表示した。本番採用を意味しない。比較のcurrent productionは現在の旧本番、original QAは限定修正前候補、limited candidateは最新限定候補。選択は人間へ留保する。tiredは本番D4、wantsPlayは本番反映済みWP-CL1、hungryはB・現状維持のQA候補。他候補も保存済み画像をfreshに読み直し、過去記録のSHA-256と一致を確認した。

全セル共通背景、共通セルサイズ、状態マーク・汗なし。128pxは原寸、縮小はPillow NEARESTによる静止資料。実ブラウザーのスクリーンショットではなく、DPR・補間の実機保証を意味しない。前回のブラウザー実表示未検証を完了扱いにはしない。今回の人間裁定により白点保持自体を採用条件とはしない。

## 本番反映と差分

対象：`assets/characters/expressions/antlion/08-wantsPlay.png`。

|比較|結果|
|---|---|
|旧本番SHA-256|`570ab10e05d0e99109ad147964f77bb2808e6af62dec4949de158bde672bb11b`|
|反映後SHA-256＝WP-CL1|`3eb3149d55224531a287eec6eb1965c9702b444ddbd4181f669e34bf99fc7a10`|
|WP-CL1→反映後|ファイルbyte完全一致、追加変更0画素、alpha含め全保持|
|旧本番→反映後|RGBA差分4,929画素、範囲x=8..119／y=12..115（両端含む）、alpha差分1,361画素|
|元QA wantsPlay→WP-CL1|RGB3画素 `(104,62)` `(105,62)` `(105,63)`、alpha差分0|

旧本番は元QA候補と別画像なので、今回の採用全体を「旧本番から眼3画素のみ変更」とは扱わない。承認済みWP-CL1の本人右目（viewer-left）、口、顔外形、頭部、触角、翅、腹部、脚、粒子・軌跡・alpha等はbyte一致で完全保持。新規修正・再生成は0。全変更座標と前後RGBAは[verification.json](verification.json)に収録。

## 横断目視の記録（最終承認ではない）

|項目|今回の確認・人間判断事項|
|---|---|
|同一個体・画風|通常基準と共通する褐色の頭部・縞状腹部・淡色の網目翅・細い触角が保たれている。顔の微差を保ったまま同一個体として比較できる。|
|表情|wantsPlayは開眼と口の期待感、sleepingは閉眼、tiredは重いまぶたが見える。小表示では近い表情の差が弱まる。64px単独で完全識別を合否基準にしない。|
|脚・翅・触角・腹部|全体配置と細線の方向は共通する。静止一覧で新たな大きな欠損・別構造化は見出さなかった。脚の本数を機械的に断定しない。strainedの既存脚監査判断は維持。|
|strained|限定候補の口は元QAより笑顔方向が弱まって見える。つらさとして自然か、強すぎないかを顔比較で最終判断してほしい。今回正式採用しない。|
|critical|限定候補は元QAの後方散布が疎になり、軌跡の流れは残る。顔・身体は元QAと同じ。粒子量の落ち着きが自然かを最終判断してほしい。今回正式採用しない。|
|粒子・軌跡|大きな粒子の散らばりは各表情に残る。顔より目立つと感じるかは一覧の小表示で人間確認。通常08の実在RGBを共通基準とする既決方針を保持し、状態を理由に減光・低彩度化を追加していない。|
|hungry／sick|hungryのB・自然な非対称を維持。sickの脚脇8画素も既存候補内で保持し削除しない。|

## 検証・停止

- 本番変更PNG **1枚**。新規スプライト候補 **0枚**。比較PNG3枚のみ新規作成。
- 既存4,033ファイル中4,031のGit blob保持。変更は本番wantsPlayとQA正本だけ。既存非対象PNG **2,922枚すべてhash保持**。通常08、D4、hungry、WP-CL1、WP-CL2、限定strained／critical、他候補、既承認16枚を含む。
- focused tests：`node --test tests/pet-expression-test.cjs tests/pet-expression-assets-test.cjs tests/pet-expression-integration-test.cjs`、**1,120 PASS／0 FAIL／exit 0**。[実行ログ](focused-test.log)。全体テストは今回未実行、既知の別件を解決扱いにしない。
- git diff --check／git diff --cached --checkは保存直前に実行。リモートHEAD・tree・実main・PR・CIは保存後fresh取得して応答に報告する。

PR #278はDraft/open/未マージを維持。main取り込み、競合解消、手順5、残り候補の一括承認・本番置換は行わない。**strained／criticalを含む最終人間確認待ちで停止**。
