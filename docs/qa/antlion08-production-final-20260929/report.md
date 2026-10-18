# ウスバカゲロウ08：10表情正式反映・手順4対象項目完了

2026-09-29。開始remote HEAD `852ac7b98cd0c2bbb5bbaba73b12187c3e65721c`。
ユーザーの最終確認に従い、承認済みの10画像を追加修正なしで本番へ正式反映した。**手順4のウスバカゲロウ08項目は完了。追加の人間確認待ちなし。**

## 正式採用

|表情|最終採用|本番ファイル|
|---|---|---|
|happy|方式Dの現在最終候補|assets/characters/expressions/antlion/08-happy.png|
|strained|A|assets/characters/expressions/antlion/08-strained.png|
|hungry|B|assets/characters/expressions/antlion/08-hungry.png|
|sick|方式Dの現在最終候補|assets/characters/expressions/antlion/08-sick.png|
|tired|D4（既存一致）|assets/characters/expressions/antlion/08-tired.png|
|sulky|方式Dの現在最終候補|assets/characters/expressions/antlion/08-sulky.png|
|weak|方式Dの現在最終候補|assets/characters/expressions/antlion/08-weak.png|
|critical|A|assets/characters/expressions/antlion/08-critical.png|
|wantsPlay|CL3|assets/characters/expressions/antlion/08-wantsPlay.png|
|sleeping|方式Dの現在最終候補|assets/characters/expressions/antlion/08-sleeping.png|

[manifest.json](manifest.json)に選択元パス／SHA-256、本番前後SHA、旧本番からのRGBA差分画素数、選択元からの追加変更0、正式採用statusを記録。旧本番からの差分と、承認済み候補からの追加変更を混同しない。

## 固定した人間裁定と停止線

- wantsPlay CL3の本人左眼＝character-left / viewer-rightのハイライト位置を正式採用。viewer-right向きの3/4構図で奥側・側面にある眼の非対称性を意図した表現として維持し、左右の反射位置を機械的に揃えない。CL1・CL2は不採用QA履歴のみ保持。
- hungry Bを採用。自然な非対称を保持し、完全対称化・追加白点補正を行わない。hungry Aは未選択履歴として保持。
- strained A、critical Aを維持し、各Bは不採用QA履歴。critical Aの後方代理測定53成分／189粒子画素／5.93%を、危険・限界・切迫感の意図した表現差として固定。外れ値だけで修正対象にせず、他表情へ粒子量を揃えない。測定ROIと意味的粒子総数ではない制限もmanifestへ継承。
- 通常08実在RGBを粒子・軌跡の既存共通色調基準とし、状態別の追加減光・低彩度化なし。sickの保存済み小成分もそのまま。
- これ以降、新しい1px差・左右非対称・縮小時の微細消失を修正課題へ追加しない。128pxで明確な描画破綻がなく、104／80pxでゲーム可読性が保たれ、64pxで致命的崩れがなければ許容。64pxの白点消失単独は修正理由ではない。今回は承認済み画像のcopyのみで新しい画像候補・微細修正なし。

## 同期・検証

- 本番変更PNG9枚、D4は変更なし。承認済み10選択元と本番がbyte完全一致。候補再生成0・追加画素変更0。候補原本の上書きなし。
- 既存4,067ファイルを開始Git blobと照合。変更を本番9PNGと文書4ファイルに限定し、その他4,054ファイル保持。非対象PNG2,923枚すべてhash一致。従来承認済み16枚＋D4計17枚の既存SHA-256台帳とも一致。
- 系統manifestのstage08・10件を現在の本番SHAへ同期。元生成時のSHA／prompt／sourceを履歴として保持し、最終採用元を別記。stage01〜07の記録は変更しない。
- 現行選択表、眼候補status、チェックリストを正式反映済みへ同期。過去の人間確認待ち報告・旧contact sheetは当時の履歴であり、現在のpendingを意味しない。本報告とmanifestを現在の最終状態とする。
- [verify.py](verify.py)で本番一致・非対象Git blob・承認済みhash・正本同期を検証。[verification.json](verification.json)に結果を保存。
- focused tests：`node --test tests/pet-expression-test.cjs tests/pet-expression-assets-test.cjs tests/pet-expression-integration-test.cjs`。今回結果は[focused-test.log](focused-test.log)と[test-summary.json](test-summary.json)。全体npm test・quick-mode・実Homeブラウザーは今回未実行。既知の他問題を解消扱いしない。
- git diff --check／staged差分検査を保存前、remote HEAD／tree／実main／PR／競合／CIを保存後fresh確認。CI0件／pendingは成功扱いしない。

**PR #278 Draft／open／未マージを維持。main取り込み・既存競合解消・手順5は行わない。ウスバカゲロウ08の制作・正式反映は完了し、追加の人間確認は求めない。PR全体や他の未完了項目を自動的に完了扱いしない。**
