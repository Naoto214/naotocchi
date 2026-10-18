# Dandelion independent reviews

Final Spec PASS / Code quality PASS. All 80 single images and 80 marked composites reviewed. Full test 1405/1405 PASS; operational publication/remote completion is recorded in the QA and PR.

# dandelion 元画像8段階・独立確認

対象：`assets/characters/dandelion/01.png`〜`08.png`。各元画像を単独128px表示で確認し、`dandelion-originals/`の拡大画像も8枚すべて単独表示した。補助資料として`dandelion-anchor-grid.png`を確認。生成画像の判定ではない。元画像・リポジトリ・既存1440表情は変更していない。

## 結論

**提示された顔中心8座標と、08を主顔1つのみ変更する方針に明白な問題なし。**

通常8画像の再生成は不要。元画像の各段階の形状・配色・配置を参照し、表情のみを派生する方針が適切。08は6つの顔のうち中央左の大きな綿毛付き種にある顔だけを変更する。中心(52,65)はその対象と一致し、他5つの顔を維持する方針が明確。

## 各段階の確認

座標は元128×128キャンバス、左上原点。提示anchor配列をそのまま記録。後半2値を顔の編集範囲と誤解しないこと（例06の18〜108は花弁まで含む幅で、顔面そのものはもっと狭い）。

| 段階 | 提示anchor | 顔中心の所見 | 保持すべき形 |
|---|---|---|---|
| 01 | [32,96,11,63] | (32,96)は左下の茶色の種の顔中央に一致。顔は綿毛の白い中心ではない。 | 茶色の丸い種、右上へ伸びる柄、白い放射状の綿毛、斜め姿勢。 |
| 02 | [64,94,34,94] | (64,94)は下の丸い橙色の種・根元の顔中央に一致。 | 左右の大きな子葉、中央の小さい芽、緑の軸、足状の根元。 |
| 03 | [64,106,48,81] | (64,106)は最下部中央の小さいクリーム色の顔に一致。 | 背後の大きな鋸歯状葉、低い顔位置、小さい足。顔を葉の中心へ移さない。 |
| 04 | [64,95,44,82] | (64,95)は葉のロゼット中央下寄りのクリーム色の顔に一致。 | 放射状の緑の葉と中央の丸い顔、小さい足。 |
| 05 | [63,55,41,89] | (63,55)は黄色いつぼみの中央にある顔に一致。 | 先端の尖った閉じた黄色いつぼみ、下側の緑のがく、茎、左右下の葉。開花させない。 |
| 06 | [63,69,18,108] | (63,69)は黄色い花の中央の円形顔に一致。 | 黄色の花弁の輪、茎、左右の鋸歯状葉。顔は花弁へ広げない。 |
| 07 | [68,63,25,108] | (68,63)は白い花・綿毛状の輪の内側の顔に一致。左右非対称の目の間として妥当。 | 白〜クリームの外周、中央の淡い顔、緑の茎と葉。 |
| 08 | [52,65,36,70] | (52,65)は中央左の大きな種の顔に一致。6顔の対象選択が正しい。 | この種の輪郭・綿毛・茶色の下部と、他5種の顔・綿毛・柄、および小さい浮遊種子を保持。 |

## 08の対象を取り違えないための観察

変更対象は画面の中央左、顔が約x45〜59・y62〜71にあり、下に茶色の種が伸びる大きな個体。主顔中心(52,65)を使用する。上左、上中央、右中央、左下、右下の5顔は元のまま保持する。右中央の顔や、画面中央に近い小さい浮遊種子は対象ではない。

08の他顔は必須の元絵要素であり、今後の単独レビューで「余計な顔」として誤検出しない。逆に主顔以外の表情が変化した場合は、主顔方式の要件から外れるため確認対象とする。

今回の元画像・顔位置確認にblocking指摘なし。生成80枚の単独目視・合成レビューは別途必要。


---

# dandelion 最初の31枚・独立単独目視レビュー

対象は `docs/qa/dandelion-expressions-20260918-checkpoint.json` の `complete:false`, `availableRecords:31` snapshotに含まれるfinal31枚のみ。レビュー開始時のmanifestをscratchの `dandelion-review31-snapshot.json` に固定した。各finalを128px等倍と4倍nearest-neighbor拡大で単独表示し、先行レビューで8枚すべて確認済みの元画像と照合した。manifest未掲載画像は確認していない。生成・リポジトリ編集は行っていない。

## 判定

**対象31枚すべてPASS。明白なblockerなし。**

元の成長段階、顔位置、形の主要部分、配色を維持している。01は左下の茶色の種に顔があり、綿毛側に顔が移動していない。02は子葉2枚・中央の小芽・橙色の根元を維持。03と04は中央下の淡い顔と葉の配置を維持。05は閉じたつぼみのまま。06は黄色い開花、07は白い綿毛状外周と茎・葉を維持している。

余計な顔、独立した状態記号、文字、背景板は見当たらない。顔・葉・花弁などの不透明部分を不自然に抜くalpha穴も目視では見当たらない。綿毛・葉の間の本来の隙間は保持されている。

## 非blockingの微差

- 01の綿毛の枝・先端の形、02の葉の先端や体の丸さ、03〜07の葉の鋸歯・陰影・花弁の細部に描き直し差がある。ピクセル単位の同一保持ではないが、成長段階やキャラクター識別は変わっていない。
- 03/04など小さい顔ではcritical・tired、05ではcritical・weakが近い印象になる。承認済みのproduction-first基準では非blocking。
- 07-sickは不調と悲しさの両方に読めるが、状態マーク併用を前提とする基準で非blocking。
- 05の顔とがくの境界は接近しているが、全5枚で顔が黄色いつぼみ内にあり、開花への段階変更は起きていない。

## 個別確認31ファイル

| stage | state | file | 判定・観察 |
|---|---|---|---|
| 01 | critical | 01-critical.png | PASS。ほぼ閉じた低い目と小さな下向き口。 |
| 01 | happy | 01-happy.png | PASS。笑い目と明るい笑顔。 |
| 01 | hungry | 01-hungry.png | PASS。開いた期待する目と小さな開いた口。 |
| 01 | sick | 01-sick.png | PASS。下がった心配そうな目と不調の口。 |
| 01 | strained | 01-strained.png | PASS。強く閉じた目と緊張した口。 |
| 02 | critical | 02-critical.png | PASS。ほぼ閉じた低い目と小さな下向き口。 |
| 02 | sleeping | 02-sleeping.png | PASS。閉じた目と穏やかな口。 |
| 02 | strained | 02-strained.png | PASS。強く閉じた目と緊張した口。 |
| 02 | sulky | 02-sulky.png | PASS。低いまぶた・眉と不満の口。 |
| 02 | wantsPlay | 02-wantsPlay.png | PASS。明るい開眼と笑う開いた口。 |
| 02 | weak | 02-weak.png | PASS。弱く下がった目と小さい口。 |
| 03 | critical | 03-critical.png | PASS。ほぼ閉じた低い目と小さな下向き口。 |
| 03 | happy | 03-happy.png | PASS。笑い目と明るい笑顔。 |
| 03 | sulky | 03-sulky.png | PASS。低いまぶた・眉と不満の口。 |
| 03 | tired | 03-tired.png | PASS。重いまぶたと疲れた口。 |
| 04 | critical | 04-critical.png | PASS。ほぼ閉じた低い目と小さな下向き口。 |
| 04 | hungry | 04-hungry.png | PASS。開いた期待する目と小さな開いた口。 |
| 04 | sulky | 04-sulky.png | PASS。低いまぶた・眉と不満の口。 |
| 04 | tired | 04-tired.png | PASS。重いまぶたと疲れた口。 |
| 05 | critical | 05-critical.png | PASS。ほぼ閉じた低い目と小さな下向き口。 |
| 05 | hungry | 05-hungry.png | PASS。開いた期待する目と小さな開いた口。 |
| 05 | sleeping | 05-sleeping.png | PASS。閉じた目と穏やかな口。 |
| 05 | wantsPlay | 05-wantsPlay.png | PASS。明るい開眼と笑う開いた口。 |
| 05 | weak | 05-weak.png | PASS。弱く下がった目と小さい口。 |
| 06 | happy | 06-happy.png | PASS。笑い目と明るい笑顔。 |
| 07 | critical | 07-critical.png | PASS。ほぼ閉じた低い目と小さな下向き口。 |
| 07 | hungry | 07-hungry.png | PASS。開いた期待する目と小さな開いた口。 |
| 07 | sick | 07-sick.png | PASS。下がった心配そうな目と不調の口。 |
| 07 | sulky | 07-sulky.png | PASS。低いまぶた・眉と不満の口。 |
| 07 | tired | 07-tired.png | PASS。重いまぶたと疲れた口。 |
| 07 | weak | 07-weak.png | PASS。弱く下がった目と小さい口。 |

## 形式検査

全31枚128×128 RGBA、alpha extrema (0,255)。bboxはPillow右下exclusive形式で、全ファイルで同段階のboundsが一致。

| stage | 今回の枚数 | alpha bbox |
|---|---:|---|
| 01 | 5 | (11,8,117,120) |
| 02 | 6 | (8,11,120,120) |
| 03 | 4 | (8,37,120,120) |
| 04 | 4 | (8,52,120,120) |
| 05 | 5 | (8,24,120,120) |
| 06 | 1 | (8,29,120,120) |
| 07 | 6 | (8,20,120,120) |

08は今回のsnapshotに含まれないため未判定。残り49枚・全80完成・マーク合成・実機表示の完了を主張するものではない。


---

# dandelion 追加19枚・独立単独目視レビュー

対象は50件のcheckpointから `dandelion-first31-checkpoint.json` の31件をfinalパスで除いた19件。対象を `dandelion-review19-snapshot.json` に固定した。各finalを単独128pxと4倍nearest-neighbor拡大で表示した。元画像は先行レビューで全8枚確認済み、08の元画像は今回再表示して比較した。リポジトリの編集・画像生成なし。

## 判定

**17枚PASS、08-hungryと08-strainedの2枚は主顔以外の表情保持の観点で要修正（BLOCK）。**

01〜07の16枚に明白な問題なし。08-happyもproduction-firstでPASS。08-hungryと08-strainedでは右下の脇役顔の口が、元の横長の笑い口から小さな丸い開口へ変化している。元右下顔はおよそ(86,90)、口は(85,93)付近。指定主顔(52,65)以外の5顔を維持する要件に対して、意味のある表情変化と判断した。単に白い綿毛の線が変わったという類の微差とは区別する。

## 08の構造と主顔

3枚とも6つの大きい綿毛付き種と5つの小さい浮遊種が見え、基本配置は元画像に一致する。中央左の主顔も正しく変更されている（happy笑顔、hungry期待の開眼、strained閉じた緊張目）。余計な7つ目の大きな顔や独立した状態記号はない。

3枚とも綿毛の枝・密度・外周が描き直され、周辺顔にも細かい線の変動がある。これら自体は制作優先基準で非blocking。08-happyの右下は笑い口を維持している。対してhungry/strainedの右下は驚きに近い小さな丸口へ変わったため、主顔限定という明示条件でBLOCKを記録する。

alphaの不自然な穴や、画像外に散らばる明白な余剰ノイズは見当たらない。08の綿毛周辺にある細かい白ピクセルは元の綿毛表現・枝先の範囲にあり、それだけでノイズとは判定しない。

## 個別対象19ファイル

| stage | state | file | 判定・観察 |
|---|---|---|---|
| 01 | sulky | 01-sulky.png | PASS。低い眉・まぶたと不満の口。 |
| 01 | tired | 01-tired.png | PASS。重いまぶたと疲れた開口。 |
| 01 | weak | 01-weak.png | PASS。弱い下がった目と小さい口。 |
| 03 | hungry | 03-hungry.png | PASS。期待する開眼と開いた口。 |
| 03 | sick | 03-sick.png | PASS。心配そうな下がった目と不調の口。 |
| 03 | sleeping | 03-sleeping.png | PASS。両目を閉じた穏やかな表情。 |
| 03 | strained | 03-strained.png | PASS。強く閉じた目と緊張した口。 |
| 04 | happy | 04-happy.png | PASS。笑い目と笑い口。 |
| 04 | sleeping | 04-sleeping.png | PASS。両目を閉じた穏やかな表情。 |
| 06 | hungry | 06-hungry.png | PASS。期待する開眼と開いた口。 |
| 06 | sick | 06-sick.png | PASS。心配そうな下がった目と不調の口。 |
| 06 | strained | 06-strained.png | PASS。強く閉じた目と緊張した口。 |
| 06 | sulky | 06-sulky.png | PASS。低い眉・まぶたと不満の口。 |
| 06 | tired | 06-tired.png | PASS。重いまぶたと疲れた開口。 |
| 07 | sleeping | 07-sleeping.png | PASS。両目を閉じた穏やかな表情。 |
| 07 | wantsPlay | 07-wantsPlay.png | PASS。明るい開眼と期待する笑顔。 |
| 08 | happy | 08-happy.png | PASS。中央左主顔が笑顔。6大種+5小種を保持。周辺顔の小さい描き直しは非blocking。 |
| 08 | hungry | 08-hungry.png | BLOCK。主顔は適切だが右下の脇役顔が笑い口から丸い開口へ変化。 |
| 08 | strained | 08-strained.png | BLOCK。主顔は適切だが右下の脇役顔が笑い口から丸い開口へ変化。 |

## 形式検査

全19枚128×128 RGBA、alpha extrema (0,255)。boundsは同じ段階内で一致。

| stage | 枚数 | alpha bbox（右下exclusive） |
|---|---:|---|
| 01 | 3 | (11,8,117,120) |
| 03 | 4 | (8,37,120,120) |
| 04 | 2 | (8,52,120,120) |
| 06 | 5 | (8,29,120,120) |
| 07 | 2 | (8,20,120,120) |
| 08 | 3 | (8,17,120,110) |

01〜07にも綿毛の枝、葉の鋸歯、花弁、陰影の描き直し差があるが段階・顔位置を保持。似た疲れ・弱り表情は既に承認された基準に従い非blocking。この報告は19枚の単独画像のみ。最終30枚と合成配置は未判定。


---

# dandelion 最終30枚・独立単独目視レビュー

対象は初回80件の `dandelion-expressions-20260918-manifest.json` から `dandelion-first50-checkpoint.json` の50件をfinalパスで除いた30件。対象をscratchの `dandelion-review30-snapshot.json` に固定した。各finalを128px等倍と4倍nearest-neighbor拡大で単独表示し、確認済みの元画像と照合。08-hungry/strainedの修正版は今回の範囲に含めない。画像生成・リポジトリ編集なし。

## 判定

**今回の30枚はすべてproduction-first基準でPASS。新たな明白なblockerなし。**

01〜07の23枚は顔位置、成長段階、種・綿毛・葉・茎・つぼみ・花の主要形状を維持。余計な状態記号や顔、背景板、不自然な透明穴は見当たらない。

08の7枚も6つの大きい綿毛付き種と5つの小さい浮遊種を保ち、中央左の主顔に指定の表情がある。他5顔の細かい線や口の縦横比は変動しているが、今回の範囲では概ね元の笑顔／驚き顔の種類を維持している。前回08-hungry/strainedで指摘したような、笑顔が明確な小丸口へ置き換わる別表情化とまでは判断しない。綿毛の枝・先端の描き直しは非blocking。

## 個別確認30ファイル

| stage | state | file | 判定・観察 |
|---|---|---|---|
| 01 | sleeping | 01-sleeping.png | PASS。閉じた目と穏やかな口。 |
| 01 | wantsPlay | 01-wantsPlay.png | PASS。明るい開眼と開いた笑い口。 |
| 02 | happy | 02-happy.png | PASS。笑い目と笑い口。 |
| 02 | hungry | 02-hungry.png | PASS。期待する開眼と開いた口。 |
| 02 | sick | 02-sick.png | PASS。下がった心配そうな目と不調の口。 |
| 02 | tired | 02-tired.png | PASS。重いまぶたと疲れた口。 |
| 03 | wantsPlay | 03-wantsPlay.png | PASS。明るい開眼と開いた笑い口。 |
| 03 | weak | 03-weak.png | PASS。弱く下がった目と小さい口。 |
| 04 | sick | 04-sick.png | PASS。下がった心配そうな目と不調の口。 |
| 04 | strained | 04-strained.png | PASS。強くつぶった目と緊張した口。 |
| 04 | wantsPlay | 04-wantsPlay.png | PASS。明るい開眼と開いた笑い口。 |
| 04 | weak | 04-weak.png | PASS。弱く下がった目と小さい口。 |
| 05 | happy | 05-happy.png | PASS。笑い目と笑い口。 |
| 05 | sick | 05-sick.png | PASS。下がった心配そうな目と不調の口。 |
| 05 | strained | 05-strained.png | PASS。強くつぶった目と緊張した口。 |
| 05 | sulky | 05-sulky.png | PASS。低いまぶたと不満の口。 |
| 05 | tired | 05-tired.png | PASS。重いまぶたと疲れた口。 |
| 06 | critical | 06-critical.png | PASS。ほぼ閉じた低い目と小さな不調の口。 |
| 06 | sleeping | 06-sleeping.png | PASS。閉じた目と穏やかな口。 |
| 06 | wantsPlay | 06-wantsPlay.png | PASS。明るい開眼と開いた笑い口。 |
| 06 | weak | 06-weak.png | PASS。弱く下がった目と小さい口。 |
| 07 | happy | 07-happy.png | PASS。笑い目と笑い口。 |
| 07 | strained | 07-strained.png | PASS。強くつぶった目と緊張した口。 |
| 08 | critical | 08-critical.png | PASS。ほぼ閉じた低い目と小さな不調の口。中央左主顔を確認、6大種+5小種を保持。 |
| 08 | sick | 08-sick.png | PASS。下がった心配そうな目と不調の口。中央左主顔を確認、6大種+5小種を保持。 |
| 08 | sleeping | 08-sleeping.png | PASS。閉じた目と穏やかな口。中央左主顔を確認、6大種+5小種を保持。 |
| 08 | sulky | 08-sulky.png | PASS。低いまぶたと不満の口。中央左主顔を確認、6大種+5小種を保持。 |
| 08 | tired | 08-tired.png | PASS。重いまぶたと疲れた口。中央左主顔を確認、6大種+5小種を保持。 |
| 08 | wantsPlay | 08-wantsPlay.png | PASS。明るい開眼と開いた笑い口。中央左主顔を確認、6大種+5小種を保持。 |
| 08 | weak | 08-weak.png | PASS。弱く下がった目と小さい口。中央左主顔を確認、6大種+5小種を保持。 |

## 非blockingの微差

- 全体に葉の鋸歯、綿毛の枝、花弁の陰影や輪郭に再描画差がある。元画像のピクセル単位完全一致を主張するものではない。
- 03/04の小さい顔、05の弱り・病気・疲れ、06の弱り・危険は似た印象がある。承認済みのマーク併用・制作優先基準で非blocking。
- 08-critical/sleeping/weakなど右下の脇役の開いた笑い口は元より縦に見える場合があるが、笑顔の範囲に読める。08-wantsPlayの上中央の小さな口も輪郭が変わるが、開口した驚き顔の範囲と判断。周辺5顔のピクセル単位同一保持を確認したわけではない。
- 08の白い綿毛付近の散在ピクセルは枝先の描画の範囲であり、今回明白な余剰ノイズとは判断しない。

## 形式検査

全30枚128×128 RGBA、alpha extrema (0,255)。alpha bbox（右下exclusive）は各段階で一致。

| stage | 今回枚数 | alpha bbox |
|---|---:|---|
| 01 | 2 | (11,8,117,120) |
| 02 | 4 | (8,11,120,120) |
| 03 | 2 | (8,37,120,120) |
| 04 | 4 | (8,52,120,120) |
| 05 | 5 | (8,24,120,120) |
| 06 | 4 | (8,29,120,120) |
| 07 | 2 | (8,20,120,120) |
| 08 | 7 | (8,17,120,110) |

既に要修正とされた08-hungry/strainedの修正版再確認は別途必要。合成配置や全体作業の完了判定ではない。

## 追記：08-hungry / 08-strained 修正版の再確認

全80の修正版正規化完了連絡後、上記30枚とは別枠で2枚を単独128pxと6倍拡大で再確認した。

- `08-hungry.png` 修正版：PASS。中央左の主顔は期待する開眼・開口。右下の脇役は横に広がる笑い口を取り戻しており、前回の丸口化は解消。6大種+5小種を維持。
- `08-strained.png` 修正版：PASS。中央左の主顔はつぶった目と緊張した口。右下の脇役は笑い目／笑い口となり、前回の丸口化は解消。6大種+5小種を維持。

周辺の綿毛の枝や顔線には小さな描き直し差が残るが、表情の種類は元の範囲に収まる。新しい顔・記号・明白な不自然alpha穴は見当たらない。`dandelion-next19-review.md` に記録したこの2ファイルのBLOCKは、この修正版再確認で解消。静止単独画像の確認であり、配置合成や実機動作までの完了を意味しない。


---

# dandelion 最終Spec視覚判定・80合成レビュー

## 最終判定

**単独画像80枚とマーク合成80コマは、承認済みproduction-first基準でPASS。未解消の視覚blockerなし。**

単独画像は31枚、追加19枚、最終30枚の3回に分けて全80枚を個別確認した。追加19枚でBLOCKとした08-hungry/08-strainedはimagegen修正版を単独等倍・拡大で再確認し、右下の脇役顔に笑い口が戻ったことを確認済み。この2件は解消している。元の通常8画像を再生成したという意味ではない。

今回 `dandelion-gallery/dandelion01.png`〜`dandelion08.png` を8枚とも個別表示し、各シートの10コマを番号順に目視した。日本語ラベル、対応する顔とマーク、目立つ重なり、カード内の切れ、顔の識別性を確認した。

## 日本語ラベルと状態マーク

全8シートで次の10組を確認。欠字、文字化け、番号欠落、状態の入れ替わりは見当たらない。

| 番号 | 日本語ラベル | マーク | 結果 |
|---:|---|---|---|
| 1 | うれしい | 黄色のきらめき2個 | 8/8 PASS |
| 2 | いやだ・つらい | 灰色の折れ線 | 8/8 PASS |
| 3 | おなかがすいた | 黄色の魚と小円 | 8/8 PASS |
| 4 | びょうき | 緑の横線と左右の汗 | 8/8 PASS |
| 5 | つかれた | 紫の大小円 | 8/8 PASS |
| 6 | すねる | 青い不満雲 | 8/8 PASS |
| 7 | いのちが少ない | 小さめのピンク下矢印2本 | 8/8 PASS |
| 8 | いのちが危険 | 大きめの赤い下矢印2本 | 8/8 PASS |
| 9 | かまって | オレンジ色の注意線3本 | 8/8 PASS |
| 10 | ねむる | 青いZ | 8/8 PASS |

段階タイトルも正常に表示：芽ぶきのたね、ふたば、地面に広がる葉、葉がしげるタンポポ、つぼみ、花咲くタンポポ、わたげ、旅立つたね。

## 全80コマの個別判定

各セルは当該段階・状態のカードを目視した結果。

| シート | 1うれしい | 2つらい | 3空腹 | 4病気 | 5疲れ | 6すねる | 7少ない | 8危険 | 9かまって | 10眠る |
|---|---|---|---|---|---|---|---|---|---|---|
| dandelion01.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| dandelion02.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| dandelion03.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| dandelion04.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| dandelion05.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| dandelion06.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| dandelion07.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| dandelion08.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

## 配置・見え方の所見

- 01は左下の種の顔をマークが隠さず、綿毛の上・外側へマークを配置。病気の汗も顔の左右の高さに見える。綿毛が大きいため一部マークが顔から離れているが、キャラクターとの対応は明瞭。
- 02は大きな子葉の外側を使ってマークを置き、下部の丸い顔を保持。小ピンク矢印と大赤矢印の位置は同一ではないが、色・大きさ・形で区別可能。
- 03/04は顔が小さいが、葉に顔が埋もれず、マークで状態を判別できる。左右の病気の汗は葉の外側にあり顔を隠さない。
- 05は閉じたつぼみを維持し、顔・がく・葉をマークが隠さない。
- 06は黄色い開花、07は白い綿毛状の花頭を維持。マークは花の外周外にあり、目・口が見える。
- 08は6大種+5小種の構成、中央左の主顔を維持。集合全体の外側にマークがあり、主顔・周辺5顔を覆っていない。修正版の空腹・つらいも正しいカードに現れている。白い綿毛は白背景で淡く見えるが顔・種の本体は識別可能。空腹の綿毛線が他状態より少し濃く見える点は非blocking。
- どのコマもマークがカード境界で切れたり、日本語ラベルと重なったりする問題は見当たらない。
- 疲れ・弱り・危険・睡眠で顔の印象が近い場合も、異なる色・形・大きさの状態マークが判別を補う。承認済みの制作優先基準に適合。

## 検証範囲

主担当から配置checkerの1520mark・912sweatでissues0、新規例外なしとの結果を受領した。これは独立に再実行した数値検査ではなく、今回の独立確認は8シート・80コマの目視判定である。

ギャラリーは実機スクリーンショットではなく、ゲーム画像・色・座標を使う2倍の静止合成。病気の汗は静止近似。背景、動き、異なる画面幅の実機動作はこのレビューに含めない。

関連報告：`dandelion-original-review.md`、`dandelion-first31-review.md`、`dandelion-next19-review.md`、`dandelion-last30-review.md`（末尾に修正2枚のBLOCK解消追記）。この独立レビューでは画像・コードを変更していない。


---

# Dandelion independent spec/code review

Status: FINAL Spec PASS / Code quality PASS. No unresolved blocker in reviewed implementation. Full npm test passed on first complete run. Site publication and final GitHub delivery are separate operational checks, not claimed complete by this report.

Repository: `/workspace/scratch/daf8d241531b/cicada-code`
Baseline: `20d870685d9a8fdce5f12641b9db33ec9eebabb0`

## Reviewed changes

- Production dispatcher adds dandelion to the existing eight-stage, ten-expression mapping. No gameplay/romance/save changes.
- Preview enumerates all eight age boundaries; assets/integration/routing/preview tests add dandelion consistently. Gallery and placement checker include the species. Japanese labels are compared with canonical master labels in the new preview test.
- Anchors add exactly eight dandelion entries; stage08 selects [52,65] with head span [36,70], matching the approved dominant central-left seed-face plan. Other five stage08 faces are a visual production requirement, not a claim established by this code review.
- Existing coral and antlion/02 placement exceptions remain unchanged. No new placement exception or global relaxation added.
- Existing unsupported-species examples move from dandelion to sakura with assertions intact. Explicit dandelion support test loops remain enabled; this prevents the prior batch's obsolete unsupported-fixture failures.

## Independent checks

- Preservation helper PASS: 1440 prior PNGs, 1440 asset references, 1440 accent SVG values, all 144 prior placement records (including the 81 corrections); 297 non-expression PNGs including 248 normal stage PNGs; 24 other top-level runtime JS files and pet-expression.css unchanged.
- Verified real sakura PNGs for 01/02/08. Independently checked 30 state asset/accent fallback cases and three sweat null cases, all PASS.
- Route/preview selected tests: 10 tests, 10 pass, 0 fail/cancelled/skipped/todo; exit0, 15498.191186ms. Includes eight routing tests and two preview/canonical-label tests. Log: `/workspace/scratch/c45f03af27e5/dandelion-review-routes.log`.
- `git diff --check`: PASS.

## Remaining gates

80 generated and normalized portraits, provenance/240 hashes/bounds; final eight placements and collision/sweat checks; cache bump; independent final single-image/composite QA; full npm test; owner-private Site publication and final GitHub Draft/open/unmerged checks. No completion claim is made for these pending gates.

## Final asset/configuration review (full test pending)

No blocking code/spec findings in final diff.

- Final production diff adds exactly eight dandelion placements plus the dandelion stage dispatch entry. Placement generation rules are unchanged from baseline; no additional exception added.
- Independently verified manifest complete:true, 80 unique records, all 240 original/source/final SHA256 hashes. Both 08-hungry and 08-strained include replaced-source and repair prompt/reason for restoring the peripheral bottom-right mouth while retaining the intended main-face expression.
- Independently decoded all 80 final PNGs: each is 128x128 with alpha and transparent pixels, and alpha>0 bounds exactly match its original stage PNG.
- Re-executed preservation helper after final placement and asset assembly: all 1440 PNGs/asset references/accent SVGs, 144 placement entries (including81 corrections), 297 normal/non-expression PNGs including248 normal stages, 24 other runtime JS files and pet-expression.css PASS unchanged.
- Compared all37 baseline/current URL cache tokens: expression token alone changed to `pet-expression.js?v=20260918-5ee55a08`; actual final JS SHA1 prefix is5ee55a08; other36 tokens unchanged.
- `git diff --check`: PASS.

Primary agent reports independent art reviewer has passed all80 single images including both repaired08 expressions. This code reviewer does not claim to have independently repeated those visual checks. Full npm test remains in progress. Site publication and final GitHub delivery remain separate pending operational gates.

Independent final placement checker completed: exit0, 1520 marks, 912 sweat envelopes, issues:[]. Log: `/workspace/scratch/c45f03af27e5/dandelion-review-placement.log`.


## Final Spec / Code quality verdict

**Spec PASS. Code quality PASS. No blocking findings remain.**

Independently inspected `/workspace/scratch/c45f03af27e5/dandelion-npm-test.log`: 1405 tests, 1405 pass; failures/cancelled/skipped/todo all0; duration609425.702809ms. Primary agent confirms exit0. This was the first complete npm run for this batch; no full rerun was required. The unsupported-fixture issue was prevented by moving fallback examples to sakura while retaining all assertions and adding explicit dandelion coverage.

After test completion, independently reran the fixed-baseline preservation helper: all1440 prior expression PNGs/routes/accent SVG values and144 placements unchanged, all297 non-expression PNGs (248normal stages),24 other runtimeJS andCSS unchanged. `git diff --check` also passed. Final80 PNG/240hash checks, exact original bounds, eight-placement-only diff, unchanged placement rules,37-token comparison and independent1520mark/912sweat collision pass are documented above.

Reviewed scope satisfies intended dandelion addition without gameplay, romance or save changes. Visual art verification remains attributed to the primary and independent art reviewers, including the repaired stage08 peripheral faces; this reviewer independently assessed the code/configuration, provenance and numeric image properties.

Primary agent reports Site version56 saved but not yet published, and GitHub blob upload underway with branch ref not yet updated. Final owner-private deployment, GitHub tree/ref equality and Draft/open/unmerged checks remain delivery gates for the primary agent. Earlier pending paragraphs in this report are historical checkpoints superseded by this final implementation/test decision.
