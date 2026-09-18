# アリジゴク表情・独立レビュー記録

単独画像レビューの初回指摘と修正後レビューを併記する。最終コード/Specレビューは後で追記する。


---

# Antlion first-stage expression visual review

Scope: read-only review of original `assets/characters/antlion/01.png`, all ten `assets/characters/expressions/antlion/01-*.png`, and originals 02–08. Each image was opened individually at native size and again at 6× nearest-neighbor enlargement. No repository assets were changed. This covers 10 of the intended 80 expressions only.

## Overall result

All ten reviewed expressions retain the recognizable golden antlion larva, diagonal pose, orange curved jaws, legs, segmented spiny body, and sandy rocky base. No added status icons, text, hearts, drops, or similar detached state symbols are visible. Every reviewed expression is a 128×128 RGBA PNG with both transparent and opaque pixels; all have alpha bounding box `(16,46,112,120)`.

The images are redraws rather than pixel-exact facial replacements: rock shapes, body highlights, segment details and jaw curvature vary slightly. Identity, broad pose and palette remain consistent. If the preservation requirement means exact non-face pixel preservation, these would require another workflow; under visual identity preservation they pass.

Most faces convey a meaningful state. The main remaining quality concern is weak separation among tired, sick, weak and critical at actual display size. Tired is particularly ambiguous because its large open right eye and asymmetric left eyelid read as a wink or mild concern more readily than exhaustion. Sick reads sad/worried without a particularly clear illness-specific facial cue. Critical reads exhausted but does not clearly exceed weak in severity. These three merit refinement or conscious acceptance before broad expansion.

| File | Individual finding |
|---|---|
| 01-happy.png | Clear upward-curved closed eyes and smiling mouth; strong readable happy state. |
| 01-wantsPlay.png | Bright enlarged open eyes and eager open smile; distinct from happy and plausibly playful. |
| 01-hungry.png | Round open mouth and wide eyes convey asking/anticipation; plausible hunger, also could read surprise. |
| 01-sulky.png | Lowered asymmetric lids and tight mouth convey displeasure; good fit. |
| 01-strained.png | Pinched shut eyes and tense downturned mouth read discomfort/effort; good fit. |
| 01-weak.png | Heavy lowered eyes and small downward mouth read depleted; good fit. |
| 01-sleeping.png | Both eyes closed with relaxed face; clearly sleeping, no detached symbols. |
| 01-sick.png | Uneven eyes and downturned mouth read unhappy/worried; weaker illness-specific differentiation. |
| 01-tired.png | One conspicuously open eye and one low lid read wink/concern; weakest tired-state signal. |
| 01-critical.png | Nearly closed eyes and small sagging mouth read exhaustion; stronger severity relative to weak could be clearer. |

## Face placement observations for later stages

Coordinates below are approximate visual suggestions in the original 128×128 canvas, origin top-left. Boxes describe the face-only working area, not the entire head or safe mandatory edit boundary. Preserve anatomy and use each original as the reference.

| Original | Suggested face area (x1,y1)–(x2,y2) | Approximate existing eye / mouth anchors | Observed constraints |
|---|---|---|---|
| 01 | (42,79)–(59,94) | eyes (45,84), (55,87); mouth near (49,90) | Maintain two prominent curved orange mandibles below/alongside face. |
| 02 | (58,94)–(70,104) | eyes about (61,98), (68,99); mouth (64,102) | Tiny larva lies at bottom of a large funnel. Actual head is only roughly 13 px wide. Enlarge reference while editing; never place the face in the funnel walls or enlarge the larva to make expression easier. One-pixel eye/mouth distinctions may be necessary. |
| 03 | (41,82)–(57,94) | eyes (44,86), (54,87); mouth (49,92) | Large larva in funnel; retain existing rosy cheeks, mandibles, crater and diagonal orientation. |
| 04 | (44,43)–(79,59) | closed eyes about (49,47), (75,48); tiny mouth (61,53) | Closed textured cocoon ALREADY HAS a subtle face embedded in shell: closed eye arcs, pink cheeks and a tiny central open mouth. Do not open the cocoon or invent an exposed larval head. Preserve stony scales around the embedded facial features. |
| 05 | (56,34)–(75,46) | eyes (59,38), (71,39); mouth (63,43) | Exposed golden pupa inside split shell; facial area is the smooth top segment, not wrapped lower body. |
| 06 | (25,57)–(36,68) | eyes (27,60), (34,60); lower face near (30,65) | Small adult head at upper-left of body; keep antennae, wings and sand. Face is dark and tiny; do not place expressive features on thorax. |
| 07 | (71,55)–(85,66) | eyes about (73,59), (82,59); mouth near (78,64) | Adult head near center-right amid spread wings. Preserve wing veins, antennae and original golden sweep below. |
| 08 | (91,56)–(106,68) | eyes about (94,60), (103,60); mouth near (99,65) | Head close to right edge. Preserve damaged wings and gold trail. Avoid extending facial edits into antenna roots or right canvas boundary. |

The original 07/08 gold arcs/trails are existing artwork, not newly added state symbols.


---

# Independent Antlion stages 02–04 review

Scope: exactly the thirty normalized `02-*.png`, `03-*.png`, and `04-*.png` files in `assets/characters/expressions/antlion/`. Each file was individually viewed at native 128×128 and 6× nearest-neighbor enlargement, with original 02–04 references already individually examined in the preceding review. Read-only repository review; no generation or repository edits.

## Decision

**Production pass for all thirty reviewed files under the user's production-first standard. No blocking wrong anatomy, misplaced face, duplicate face, added status symbol, or lost transparency was observed.** Small similar weak/critical/sleep impressions are treated as nonblocking, as expressly accepted by the user where UI state markers distinguish them. This review does not validate those UI markers or the remaining stages.

All thirty are 128×128 RGBA PNGs with alpha extrema (0,255). Palette, stage identity and overall pose match their respective originals. Minor redraw drift in sand, rocks, shell texture and body details is present but does not disrupt identity.

Stage 02 preserves the tiny larva at the bottom of its large funnel. Every edited face remains on that tiny head; none migrated onto the pit wall. Expression readability is inherently limited at native size, but differences in eye opening and mouth are visible when enlarged. Stage 03 preserves the large diagonal larva and its two orange mandibles within the funnel. Stage 04 remains a closed textured cocoon: expression changes modify its existing embedded face, without inventing an exposed larval head or opening the shell.

## Individual observations

| File | Observed face | Result |
|---|---|---|
| 02-critical.png | Almost closed low eyes and small flat/sagging mouth on tiny head. | Pass; subtle at native size. |
| 02-happy.png | Curved eyes and tiny upward mouth. | Pass. |
| 02-hungry.png | Open bright eyes and small pink open mouth. | Pass; anticipation also plausible. |
| 02-sick.png | Low uneven eyes and small unhappy mouth. | Pass; subtle at native size. |
| 02-sleeping.png | Closed eyes and relaxed face. | Pass. |
| 02-strained.png | Tight eye marks and tense mouth. | Pass; subtle at native size. |
| 02-sulky.png | Lowered lids and flattened mouth. | Pass; subtle at native size. |
| 02-tired.png | Droopy low eyes and downward mouth. | Pass; subtle at native size. |
| 02-wantsPlay.png | Larger dark eager eyes and visible pink open mouth. | Pass. |
| 02-weak.png | Low eyes with small highlights and depleted mouth. | Pass; subtle at native size. |
| 03-critical.png | Near-closed eyes and downturned mouth. | Pass; resemblance to weak accepted. |
| 03-happy.png | Smiling closed eyes and open cheerful mouth. | Pass. |
| 03-hungry.png | Wide pleading eyes and rounded open mouth. | Pass. |
| 03-sick.png | Uneven heavy eyes and unhappy open mouth. | Pass. |
| 03-sleeping.png | Relaxed closed eyes and tiny resting mouth. | Pass. |
| 03-strained.png | Squeezed eyes and strongly tense mouth. | Pass. |
| 03-sulky.png | Lowered inward lids and frown. | Pass. |
| 03-tired.png | Heavy half-open eyes and small open mouth. | Pass. |
| 03-wantsPlay.png | Bright eager open eyes and smiling mouth. | Pass. |
| 03-weak.png | Sagging half-closed eyes and unhappy mouth. | Pass; resemblance to critical accepted. |
| 04-critical.png | Closed/slit eyes and small downturn, embedded in shell. | Pass. |
| 04-happy.png | Large cheerful eye arcs and open smile. | Pass. |
| 04-hungry.png | Wide bright eyes with rounded open mouth. | Pass. |
| 04-sick.png | Uneven drooping eyes and strong frown. | Pass. |
| 04-sleeping.png | Both eyes smoothly closed and small resting mouth. | Pass. |
| 04-strained.png | Tightly angled eye lines and tense downturned mouth. | Pass. |
| 04-sulky.png | Narrow lowered eyes and small frown. | Pass. |
| 04-tired.png | Heavy half-lids with visible lower whites and tiny open mouth. | Pass. |
| 04-wantsPlay.png | Large bright open eyes and wide cheerful open mouth. | Pass. |
| 04-weak.png | Low eyes, tiny highlights and small downturned mouth. | Pass; resemblance to critical accepted. |

No blocking repair recommendation. Optional future refinement: stage 02 facial contrast could be increased carefully within the same tiny head if native-size expression legibility ever becomes a separate product requirement. It is not a reason to regenerate this accepted production batch.

This report covers only these thirty images. It makes no completion claim for the entire eighty-image Antlion batch or the existing 1,360 expressions.


---

# antlion 中盤17枚・独立目視レビュー

対象は `assets/characters/expressions/antlion/` 内の05全10枚と、06の下記7枚のみ。各PNGを単独で128px等倍と6倍nearest-neighbor拡大で目視し、元05・06も単独拡大表示して比較した。リポジトリの画像・コードは変更していない。全80枚の完了判定ではない。

## 判定

**17枚すべてproduction-first基準でPASS。明白なblocking問題なし。**

05は外側のまゆ、暗い内側、中央の黄金色のさなぎ、包まれた節構造を維持し、表情は上部の元の顔位置に収まっている。まゆ側に別の顔を追加した画像はない。

06は左の頭と触角、脚、右へ伸びる畳まれた網目状の羽、腹部、砂・岩の台を維持。顔は左の頭部にあり、胸や羽へ移動していない。羽が開いたり、別の成長段階になったりした画像はない。目を大きくした表情でも頭の位置・基本形は維持されている。

17枚に余計な顔、独立した状態記号、文字は見当たらない。細かな岩・羽脈・輪郭の描き直し差はあるが、承認済みの制作優先基準では非blocking。06 sleeping/criticalの顔が小さく似た印象になる点や、hungry/wantsPlayがともに期待顔となる点も非blocking扱い。

## 形式・境界

全17枚は128×128、RGBA、alpha最小0・最大255。切れた不透明背景はなく、外周までの余白あり。alpha bounding boxはPillowの右下exclusive形式。

| 段階 | 個数 | alpha bounds |
|---|---:|---|
| 05 | 10 | (25, 8, 103, 120) |
| 06（今回の対象のみ） | 7 | (8, 36, 120, 120) |

## 個別に確認した17ファイル

| ファイル | 顔の観察・判定 |
|---|---|
| 05-critical.png | 閉じ気味の目と小さな下向き口。元のさなぎ顔位置。PASS。 |
| 05-happy.png | 上向きの笑い目と笑顔。PASS。 |
| 05-hungry.png | 大きく開いた期待する目と開いた口。PASS。 |
| 05-sick.png | 下がった目・眉と不調を感じる口。PASS。 |
| 05-sleeping.png | 両目を閉じた静かな表情。PASS。 |
| 05-strained.png | 強くつぶった目と緊張した口。PASS。 |
| 05-sulky.png | 低いまぶたと小さな不満顔。PASS。 |
| 05-tired.png | 重い半閉じ目と下がった口。PASS。 |
| 05-wantsPlay.png | 明るい開眼と楽しげな開いた口。PASS。 |
| 05-weak.png | 下がった目と小さく力のない口。PASS。 |
| 06-critical.png | 左頭部に低いまぶたと小さな弱った口。PASS。 |
| 06-happy.png | 左頭部に笑い目と笑顔。PASS。 |
| 06-hungry.png | 左頭部に大きな目と開いた口。PASS。 |
| 06-sick.png | 左頭部に重い不均一な目と下がった口。PASS。 |
| 06-sleeping.png | 左頭部に小さな閉じ目。等倍では控えめだが位置・形状正常。PASS。 |
| 06-strained.png | 左頭部に狭く締めた目と緊張した口。PASS。 |
| 06-wantsPlay.png | 左頭部に明るい大きな目と笑う開いた口。PASS。 |

今回の未確認対象：06-sulky、06-tired、06-weak、および07・08の全画像。生成・正規化中の他画像について本報告は判定しない。


---

# antlion 最終23枚・独立単独目視レビュー

対象は06-tired/sulky/weak、07全10枚、08全10枚。各PNGを単独で128px等倍と6倍nearest-neighbor拡大で確認。元07・08を今回再表示し、06は先行レビューで単独比較済みの元画像と照合。リポジトリ変更なし。

## 判定

**22枚PASS、07-wantsPlay.pngのみBLOCK（要修正）。**

07-wantsPlay.pngの左上の大きな羽に、元07にはない黒い穴・欠損状の斑点が複数ある。およそ128px座標のx11–38、y28–54の羽面に見える。08にある損傷した羽の印象を07へ持ち込んでいるため、単なる表情の印象差ではなく段階の形状保持の問題。顔位置は正常だが、この羽面を元07の無傷の網目模様へ戻す必要がある。

07-strained.pngは元の金色軌跡の左側が短くなり、下側中心の小さな弧になっている。弧そのものは残り、顔・羽・身体の段階識別は維持されているのでproduction-firstでは非blockingの差として記録する。他07でも粒子密度や軌跡の太さに描き直し差がある。

06の3枚は左頭・右の畳まれた羽・砂台を維持。07は上記1枚を除いて無傷の広げた羽と金色軌跡を維持。08の10枚は傷んだ羽、右側の頭、触角、腹部と枝を保持している。08の羽穴は元の段階特徴であり問題ではない。

23枚で余計な顔・顔位置の移動・文字・新しい状態記号は見当たらない。小さいweak/critical/sleeping等の印象の近さは承認済みのproduction-first基準に従って非blockingとした。

## 形式

全23枚128×128 RGBA、alpha extremaは(0,255)。bboxはPillowの右下exclusive形式。透明余白を保ち、画像端での目立つ切断なし。

| 段階 | 今回確認枚数 | alpha bbox |
|---|---:|---|
| 06 | 3 | (8,36,120,120) |
| 07 | 10 | (8,21,120,106) |
| 08 | 10 | (8,12,120,116) |

## 個別確認一覧

| ファイル | 観察・判定 |
|---|---|
| 06-tired.png | 左頭部の重い目。羽・砂台を維持。PASS。 |
| 06-sulky.png | 左頭部の低いまぶたと不満顔。PASS。 |
| 06-weak.png | 左頭部の弱った目・口。PASS。 |
| 07-critical.png | 頭部の閉じ気味の目。無傷の羽、弧を維持。PASS。 |
| 07-happy.png | 小さな笑い目と笑顔。羽、元由来の粒子と弧を維持。PASS。 |
| 07-hungry.png | 大きく開いた期待の目と口。PASS。 |
| 07-sick.png | 下がった目と弱った口。PASS。 |
| 07-sleeping.png | 閉じ目の落ち着いた顔。PASS。 |
| 07-strained.png | 締めた目と口。金色弧の左側短縮は非blocking。PASS。 |
| 07-sulky.png | 狭い目と不満顔。PASS。 |
| 07-tired.png | 半閉じの重い目。PASS。 |
| 07-wantsPlay.png | 顔は適切。左上の大羽に元にない複数の黒い穴・欠損状斑点。BLOCK。 |
| 07-weak.png | 閉じ気味の弱った顔。PASS。 |
| 08-critical.png | 右の頭に閉じ気味の目。傷んだ羽と枝を維持。PASS。 |
| 08-happy.png | 右の頭に笑い目と口。傷んだ羽と枝を維持。PASS。 |
| 08-hungry.png | 右の頭に開いた期待の目と口。PASS。 |
| 08-sick.png | 右の頭に下がった目。PASS。 |
| 08-sleeping.png | 右の頭に静かな閉じ目。PASS。 |
| 08-strained.png | 右の頭に強くつぶった目。PASS。 |
| 08-sulky.png | 右の頭に半閉じの不満顔。PASS。 |
| 08-tired.png | 右の頭に重いまぶた。PASS。 |
| 08-wantsPlay.png | 右の頭に大きく開いた目。PASS。 |
| 08-weak.png | 右の頭に閉じ気味の弱った顔。PASS。 |

この報告は上記23枚の単独画像確認。配置合成・UI上のマーカーは未確認。07-wantsPlay修正後の再確認が必要。


---

# antlion 80表情・マーク合成の独立目視レビュー

## 判定

**修正版07-wantsPlay.pngはPASS。8段階×10状態＝80合成もPASS。新たなblocking問題なし。**

修正版07-wantsPlay.pngを単独128pxと6倍nearest-neighbor拡大で再確認。以前あった左上の大羽の黒い穴・欠損状斑点はなくなり、無傷の網目模様に戻っている。元07の広げた羽、頭、触角、腹部、金色軌跡を維持。既存の `antlion-last23-review.md` に記録した同ファイルのBLOCKは、この修正版再確認で解消した。

## 合成確認の方法と範囲

`antlion-gallery/antlion01.png`〜`antlion08.png`を8枚とも単独表示し、各シート内の10カードを順に目視した。カード番号、日本語状態ラベル、対応する顔、色付きマーク、キャラクターとの位置関係、カード境界の切れ、顔・羽・触角への重なりを確認。これはゲーム画像・色・マーク座標を使った静止合成のレビューであり、実機の背景・動き・画面幅や病気の汗アニメーションそのものの確認ではない。

## 日本語ラベルとマーク

8シートで下記の番号・日本語状態ラベル・マークの組み合わせが揃い、欠落や入れ替わりは見当たらない。

| 番号 | ラベル | マーク | 判定 |
|---:|---|---|---|
| 1 | うれしい | 黄色のきらめき2個 | 8/8 PASS |
| 2 | いやだ・つらい | 灰色の折れ線 | 8/8 PASS |
| 3 | おなかがすいた | 黄色の魚と小円 | 8/8 PASS |
| 4 | びょうき | 緑の横線と左右の汗 | 8/8 PASS |
| 5 | つかれた | 紫の大小円 | 8/8 PASS |
| 6 | すねる | 青の不満雲 | 8/8 PASS |
| 7 | いのちが少ない | 小さめのピンク下矢印2本 | 8/8 PASS |
| 8 | いのちが危険 | 大きめの赤い下矢印2本 | 8/8 PASS |
| 9 | かまって | オレンジ色の注意線3本 | 8/8 PASS |
| 10 | ねむる | 青いZ | 8/8 PASS |

タイトルも8段階で正常に表示：ちびアリジゴク、巣作りアリジゴク、大きなアリジゴク、砂のまゆ、まゆの中のさなぎ、出たてのウスバカゲロウ、飛び回るウスバカゲロウ、羽休めのウスバカゲロウ。文字欠けや文字化けなし。

## 全80カードの個別判定表

各セルは当該段階・状態のカードを実際に目視した結果。

| シート | 1うれしい | 2つらい | 3空腹 | 4病気 | 5疲れ | 6すねる | 7少ない | 8危険 | 9かまって | 10眠る |
|---|---|---|---|---|---|---|---|---|---|---|
| antlion01.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| antlion02.png | PASS | PASS | PASS | PASS※ | PASS | PASS | PASS | PASS | PASS | PASS |
| antlion03.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| antlion04.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| antlion05.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| antlion06.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| antlion07.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| antlion08.png | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

※02病気は承認済みの横上限除外を前提に判定。小さな顔が砂穴の底にあるため、汗が砂穴外側の左右に置かれ、頭上の緑線は右上寄りになっている。顔を塞がずカード内に収まり、他状態との識別も可能。この承認済み配置を新しい不具合として扱っていない。

## 位置と形の所見

- 01〜03は顔と大顎をマークが隠さず、砂・岩・砂穴の形を保持。02は顔が小さいが状態マークが区別を補っている。
- 04は閉じた砂のまゆの埋め込み顔、05はまゆ内のさなぎ顔が見える。マークは外側に置かれ、別の顔を作るような見え方なし。
- 06は左頭・触角と右の畳まれた羽を保持。病気の汗が触角外側に離れる配置は許容条件に適合。
- 07は修正版の「かまって」を含め無傷の羽面が見える。金色の軌跡は元からの意匠で、新しい状態記号としては数えない。病気の汗は羽の外側に離れているが承認済み範囲。
- 08は傷んだ羽と枝を維持。マークは右上寄りだが、右カード境界に切れず顔も隠していない。病気の左右汗が離れる点も許容条件に適合。
- 小さい顔同士で弱い・危険・疲れ・眠りの印象が近い場合も、色・大きさ・形の異なるマークで状態を区別できる。制作優先の承認基準で非blocking。

このレビューでは画像・コードを変更していない。80合成の静止画像上の目視判定であり、実機動作テストの代替ではない。
