# Cat expression pilot design

User approved the four-expression cat concept and a one-form pilot in this conversation. This document records that approved scope; implementation continues without another approval round.

## Baseline and scope
Latest main: `3a86fe8e52c449681e02f203fc815d069c6b8a1c`. Phase-one PR #275 HEAD: `dab89b129efc38bb0db70d6b75f795d9c2bf52d5`, already includes that main. Pilot branch starts from that HEAD; neither main nor the phase-one branch is changed by this pilot.
Only adult cat `assets/characters/cat/06.png` gets optional expressions. Normal is the original PNG. Three individually generated, transparent 128×128 PNGs are added at `assets/characters/expressions/cat/06-{happy,strained,sulky}.png`. The approved comparison sheet is a concept only, never sliced for production. The original artwork and all other characters remain unchanged. Keep pose, body proportions, placement, fur and silhouette close to the original; iPhone acceptance remains with the user.

## Meaning and ownership
A small DOM-free `pet-expression.js` consumes the existing emotion profile; it must not contain gameplay thresholds. `resolve(emotion, {sleeping=false,reaction=null}={})` returns one of normal/happy/strained/sulky. Sleeping or non-playable rendering uses normal. Critical weak overrides any happy reaction with strained. Otherwise an explicit temporary expression wins; hungry/tired/sick/weak map to strained, unhappy to sulky, normal/wantsPlay to normal.
`assetFor(baseAsset, expression)` returns an allowlisted variant only for cat/06 and known non-normal expressions; otherwise baseAsset. `reactionFor(event)` maps play_with→happy, play_with_annoyed→sulky, overfeed/medicine_wrong→strained, feed/medicine_cure/sleep/wake→normal, other events→null. Semantics, not dialogue-text guessing, drive reactions.
`script.js` owns one transient expression record/timer. A pet semantic speech beat starts its expression for the existing speech duration; partner/companion speech never changes it. Food and real-cure happiness starts only at the already validated afterglow callback, never on a bite or dose alone. Its duration is the actual afterglow duration, or 1000ms for static reduced-motion feedback. Expiry recomputes from the latest current state and re-renders only the pet visual. Invalidation covers newer care, new life, form changes, sleeping, menus/story/minigames/hidden tab, death/farewell. Critical is reflected immediately even during a temporary happy face. No expression state is saved.
The existing pet/accessory motion layers and base-art layout metrics remain the owners of position. Rendering a face must not move companions, change equipment geometry, or cancel an ongoing Web Animation. Only the home main pet changes; catalogue, transformation thumbnails and social actors continue to use the base portrait. Variant load errors return to the original PNG; a broken original retains the existing emoji fallback.
Reduced-motion still permits immediate static face swaps and must start no new animation. Existing !, care alerts, illness sweat, critical UI and button recommendation behavior remain. Existing care resolver continues to choose appropriate actions; this pilot does not invent new cure rules or buttons.

## Verification and demonstration
Pure resolver tests cover every mapping, unsupported assets, unknown reactions, sleep and critical precedence, and input immutability. Runtime tests cover actual feed/cure/play buttons, spam/wrong medicine, delayed conversations, latest-state return, render stability, interruption/new life/form changes, reduced-motion static happiness, image error fallback, save equality, and no social/layout interference at 26 companions.
A separate preview-only HTML page starts a disposable adult-cat session with in-memory localStorage before loading the unchanged game scripts. It exposes preset links for normal, hunger, sickness, fatigue, sulk and critical; real game care buttons still run actual logic. Its memory storage must not read or write the user's normal preview save. It is produced by a tool from runtime-harness freshState and current index.html and is not loaded by the normal game. This lets the user test the pilot without waiting for the cat to reach adulthood.
Run focused expression/emotion/care/motion/time-pause tests, npm run bump and npm test. Record exact image hashes, alpha/dimensions, automated results and unconfirmed iPhone items in docs/qa. Publish a separate Draft PR and update the existing private confirmation Site only after tests/review. Do not merge to main or mark PR ready.

## Approved continuation — adult dog, 2026-09-16

The user reports all eight cat stages complete and explicitly approves only the adult dog (`assets/characters/dog/06.png`, age 22–39) as the next ten-expression pilot. This supersedes the original cat-only scope for this single form; the existing cat art, anchors, palette, outlines and reactions remain the baseline. Later-stage details are recorded in `docs/qa/emotion-visual-approved-baseline-20260915.md` and stage QA notes. Normal remains the original dog PNG. Add happy, strained, sulky, hungry, sick, tired, weak, critical, wantsPlay and sleeping. Dog hunger uses a yellow food bowl instead of the cat fish, following the established species-appropriate food rule. Static marks follow the adult dog's head. Other dog stages, companions, partners, game values and save schema are out of scope. The existing disposable preview gains an adult-dog option; real care buttons trigger transient happy/strained reactions. Keep PR #278 Draft and never merge main. iPhone visual acceptance belongs to the user.

## Approved continuation — puppy, 2026-09-16

Following the user's approval of adult-dog visuals and request to continue, add only `dog/03.png` (こいぬ, 7–11 years). Keep the original small stepping pose with one raised front paw, ten-expression semantics, outlined palette, yellow food bowl and disposable-preview isolation. Adapt anchors to the smaller puppy head. Preserve the confirmed adult-dog silver anchor (-12,1), all other adult-dog assets/anchors and all cat stages. Further dog stages are not part of this iteration. Keep PR #278 Draft, no merge; user reviews the puppy on iPhone.

## Approved continuation — playful young dog, 2026-09-16

User approved puppy dog/03 and asked to continue. Add only dog/04 (わんぱくいぬ, 12–15 years), ten expressions. Preserve the original forward-leaning stepping pose and golden tan palette. Keep all confirmed cat/adult dog/puppy portraits and anchors. Reuse state/reaction logic and outlined colors, yellow dog food bowl, and isolated preview. Adapt marks to this head position. Keep Draft PR #278, no main merge. User reviews iPhone appearance.

## Approved continuation — young dog, 2026-09-16

User approved dog/04 and asked for the next stage. Add only dog/05 (若いいぬ, 16–21 years), ten expressions with the original slim upright standing pose. Preserve all confirmed cat/dog assets and anchors; inherit palette, outlined marks, yellow food bowl and care reactions. Initial dog05 anchors: strained (-12,3), wantsPlay (-29,7), general (-20,1). Extend isolated preview with youngDog. No gameplay/schema changes; keep PR #278 Draft without merging main. User performs iPhone visual acceptance.

## Approved continuation — calm dog, 2026-09-16

User approved young dog05 including final orange anchor(-33,7), then requested continuation. Add dog07 落ちついたいぬ (ages40–69) only, ten expressions. Preserve rounded seated posture, one upright and one floppy ear, low curling tail. Shared palette, outlined marks, dog food bowl and care reactions remain. Initial anchors strained(-7,5), wantsPlay(-28,10), general(-17,4). Existing cat/dog portraits and anchors unchanged. Extend isolated preview calmDog age40. Keep Draft PR #278, no main merge; user reviews iPhone appearance.

## Approved batch — remaining dog stages, 2026-09-16

User approved calm dog07 and explicitly accepted batching the remaining three dog stages to reduce repeated review. Add dog01 あかちゃんいぬ (0–2), dog02 よちよちこいぬ (3–6), dog08 おとしよりのいぬ (70+) with ten expressions each. Preserve original newborn prone pose, toddler seated proportions, elderly hunched pose/cream age markings respectively. Inherit state colors/outlined marks/dog food bowl/care reactions. Preserve all confirmed prior dog/cat art and anchors. Initial anchors strained/wantsPlay/general:01(2,46)/(-30,50)/(-16,45);02(-2,23)/(-27,28)/(-13,23);08(-10,14)/(-31,18)/(-20,12). Isolated preview adds babyDog/toddlerDog/elderDog. One combined user review after all three, no intermediate approval gates. No other species expansion or gameplay/save changes. Keep PR278 Draft and do not merge main.

## Approved visual review — all cat and dog stages, 2026-09-16

After approving the last dog01/02/08 spacing, the user requested ten-expression images with every mark and authorized agent-side positioning before user review. The latest request explicitly reopens all eight cat and eight dog stages for this review. Inspect all160 state portraits with production marks; retain approved silver/orange positions as the baseline and adjust other marks individually when their larger shapes crowd the face/head. Preserve PNGs, palette, outlines, reactions, game values and saves. Present static comparison images, clearly labeled as production-data composites rather than device screenshots; sweat is an approximation, background and animation are omitted. Keep Draft PR278 and do not merge main. Human man/woman batches remain authorized but deferred until this requested cat/dog review is complete.

## Approved batch — human man/woman lines, 2026-09-16

After approving the cat/dog contact-sheet review, the user requested continuation for both human lines, all8 stages each. Add10 facial variants per stage using the original hair/clothes/pose/accessories, and a yellow rice-bowl hunger symbol. Keep all existing cat/dog assets and numeric anchors unchanged, share state colors/outlines/reactions. Review and tune all160 human composites before presenting four-stage overviews and individual-stage sheets. No stage-by-stage approval; real-device visual acceptance remains with user. Draft PR278, no main merge.

## Approved face-relative marker policy — 2026-09-16

The user explicitly reopened marker placement for all eight stages of cat, dog, man and woman (320 expressions). This policy supersedes every earlier frozen silver/orange/general numeric anchor; facial PNGs remain approved and unchanged. Marks must avoid the entire character silhouette while staying as close as practical, with directions measured from the face.

| State | Mark | Position |
| --- | --- | --- |
| happy | gold sparkles | upper right |
| strained | silver bent line | upper left |
| hungry | yellow food and thought bubbles | upper right |
| sick | yellow-green lines and sweat | lines upper right; sweat brackets head left/right |
| tired | purple circles | upper right |
| sulky | cyan cloud | upper right |
| weak | pink down arrows | upper right |
| critical | red down arrows | upper right |
| wantsPlay | orange rays | directly above face center |
| sleeping | blue Zzz | upper right |

Use observed per-stage face anchors, outlined mark silhouettes and the union of normal/expression character silhouettes. Allow angular adjustment within the designated quadrant to avoid ears, hair, bodies and tails. Maintain a two-logical-pixel clearance in the placement generator. Include sweat rotation and falling motion in collision checks. Preserve colors, outlines, reactions, PNG expressions, gameplay and saves. Review all composites autonomously and provide combined sheets; no stage-by-stage approval gate. Actual device appearance remains a separate user check. Keep PR #278 Draft; never merge main.

## User-selected marker revision — 2026-09-16

The user identified 81 specific placements in image version 959afaea. The exact selection is stored in tools/expression-placement-review.json. Reopen these positions: side marks must look diagonally above the face rather than merely pass a positive horizontal/vertical offset check. Keep other marks and all facial PNGs unchanged. Center selected orange rays against the perceived head center; allow selected sick lines a steeper upper-right angle to stay near the head rather than the raised tail. Maintain collision clearance. Refresh the touch-selectable review page with the new image version and distinguish the prior requested set from new selections. Draft PR278 remains unmerged.

## Approved production-first continuation — 2026-09-16

The user asked to stop endless placement tuning and make as much of the remaining expression set as practical. Continue in complete multi-stage batches without per-stage approval. The next delivery batch covers penguin and turtle, eight stages and ten expressions each (160 independent original-referenced PNG edits). Preserve existing four lines and the latest 81 placement adjustments. Keep the common color/outline/reaction semantics, non-overlapping face-relative marks, original normal sprites, gameplay and saves. Agent performs composite review and updates the touch-selectable gallery; do not hold production for tiny placement differences. No main merge; PR278 stays Draft.

## Approved production-first continuation — frog and clownfish, 2026-09-16

The user explicitly requests continuing remaining lines in complete batches, preserving all six completed lines and81 selected marker revisions. Next batch: frog and clownfish, each eight stages and ten original-referenced expressions. Preserve tadpole tails/developing legs, adult frog poses, clownfish fins/stripes/age, and the small companion fish in clownfish05. Only the main figure receives facial expression edits. Extend existing face-relative outlined mark policy and isolated preview/gallery; no gameplay, romance or save schema changes. Agent reviews obvious overlaps and malformed art without stage-by-stage approval. Existing cat03/dog04/turtle sweat constraints remain separately documented. Keep PR278 Draft and do not merge main.

## Approved production-first continuation — salmon, 2026-09-16

The user explicitly authorized autonomous selection and production of the next complete remaining line. Add salmon, eight stages and ten original-referenced facial expressions per stage. Preserve the newborn yolk sac, juvenile parr stripes, silver adult coloration, red/brown mature coloration and hooked jaw. Reuse shared outlined accents and yellow fish hunger artwork. Observe face centers from an original-coordinate grid and generate only salmon placements. Preserve prior640 expression assets/references/SVGs, all64 placement entries and the81 prior selected corrections. No gameplay, romance or save changes. Extend the same disposable preview and tap-selectable review gallery. Keep PR278 Draft and do not merge main; real-device review stays with the user.


### 承認済み一括展開: ヤドカリ（2026-09-16）
制作優先の継続依頼に基づき、hermit_crab全8段階・80表情を追加する。元画像の目の柄・はさみ・脚・貝殻の形と模様、03の空の貝殻を保持。原画の座標から顔を観測し、新規系統だけマーク配置を生成する。既存720表情・72段階配置と過去81件の修正は不変。通常画像・数値・恋愛条件・セーブ形式も維持し、PR278はDraft・main未マージを守る。


### Approved continuation: jellyfish batch (2026-09-17)
Under the existing production-first authorization, extend all8 jellyfish stages to10 expressions each. Preserve polyp rocks, stacked juvenile disks, star-shaped juvenile, translucent bells, tentacles, bubbles and age differences. Retain completed800 expressions/80 placements and81 user corrections. Same Draft PR and owner-private preview; normal art/gameplay/save unchanged.


### Approved production-first continuation: starfish (2026-09-17)
Following the user's continuation request, add all8 starfish stages×10 original-referenced expressions. Preserve original rounded juvenile, star shapes, colors/textures/bubbles and existing880 expressions/88 placements. Same marks, reaction semantics, Draft PR and owner-private Site. No main merge or gameplay/save changes.


### Approved production-first continuation: coral (2026-09-17)
Under the continuation authorization, add coral8 stages×10 expressions while preserving960 existing expressions/96 placements. Preserve branches, polyps, rocks, colony colors and secondary faces. Change only each stage's dominant face; in06 the central yellow coral,07 upper orange coral,08 large yellow polyp. Same face-relative marks, reactions, Draft PR and owner-private Site. No main merge or gameplay/save changes.


### Approved production-first continuation: butterfly (2026-09-17)
Under the user's continuing batch authorization, add butterfly8 stages×10 original-referenced expressions. Preserve prior1040 expression assets/routes/SVGs and104 placements including81 selected corrections. Preserve green caterpillar segments, twig/leaf, chrysalis and blue wing patterns. Stage06 changes only the emerged butterfly face on the left; retain right-side chrysalis artwork. Observe original-coordinate face anchors. Shared face-relative marks and state semantics; same Draft PR278 and owner-private Site. Normal art248, gameplay, romance and save unchanged. No main merge.


### Approved production-first continuation: beetle (2026-09-17)
Continue authorized batch production with beetle8 stages x10 independently original-referenced expressions. Preserve1120 existing portraits/routes/SVGs,112 placements and81 user corrections. Observe face anchors from originals and coordinate grid; preserve larval segmentation, golden pupa, forked horns, elytra colors, six legs and aged textures. Generate only beetle placements. Normal sprites248, gameplay, romance, saves unchanged. Same owner-private Site and Draft PR278; never merge main.


### Approved production-first continuation: stagbeetle (2026-09-17)
Continue the authorized batch with8 stages x10 original-referenced edits. Preserve1200 completed portraits,120 placements and81 selected corrections, all normal art and gameplay/romance/save behavior. Preserve cream larvae, golden pupa, pale/red/blue-black adult colors, mandibles, legs and age scratches. Anchors observed on original coordinate grid. Generate only stagbeetle placements. Same owner-private Site and Draft PR278; no main merge.

### Approved continuation: cicada (2026-09-18)
Add8x10 original-referenced cicada expressions, preserving1280 existing portraits/128placements/81 corrections. Preserve nymphs, dirt, transparent wings and the empty shell in05; only main living face changes. Same marks/reactions/privateSite/DraftPR278, no main merge or gameplay/save changes.

### Approved production-first continuation: antlion (2026-09-18)
Continue authorized eight-stage batch with80 original-referenced expressions. Preserve1360 completed expressions/136placements/81corrections and normal art/gameplay/romance/save. Keep sandy pits, jaws, closed cocoon04 with existing face, pupa05 and adult wings/trails. Face anchors observed on originals and coordinate grid. Only new8 placements, same marks/reactions/owner-private Site and DraftPR278; no main merge.

### Approved production-first continuation: dandelion (2026-09-18)
Continue authorized8x10 original-referenced edits, preserving1440 completed portraits/144placements/81corrections andall normal art/gameplay/romance/save. Keep seedlings, rosette leaves, closed bud05, goldenflower06 andwhitehead07. In08 editonlydominant central-left seed face at52,65 andpreservefiveotherfaces. New8placements only; sameprivateSite andDraftPR278, no mainmerge.

### Approved production-first continuation: sakura (2026-09-18)
Continue the user-authorized eight-stage batch with80 independent original-referenced expressions. Preserve1520 completed portraits/152placements/81corrections, normal art, gameplay/romance/save. Preserve seed/sprout, tree branches and blossom canopy, closed buds05, open flowers06, fruits07 and aged tree08. In05 edit only central upright bud; in06 only left large flower; in07 only central-lower cherry, preserving all secondary faces. Face anchors observed in originals,6x views and original-coordinate grids with independent review. Generate onlynew8 placements. Same owner-private Site and DraftPR278; no main merge.

### Approved production-first continuation: venus_flytrap (2026-09-22)
Continue the user-authorized eight-stage batch with80 independent original-referenced expressions. Preserve1600 completed portraits/160placements/81corrections and all normal art/gameplay/romance/save. Use seed and basal seedling faces01–03, upper-left trap04, upper-central trap05/07, purple central face within giant trap06, and largest upper-central flower yellow center08. Preserve all secondary faces, white petals, trap rims/spikes, stems, leaves and roots. Anchors observed in native originals,6x views and coordinate grids with independent review. Reuse frog’s yellow insect hunger mark. Generate onlynew8 placements; same owner-private Site and DraftPR278, no main incorporation or merge. Completion of this line does not imply all character lines are complete.

### 複数顔の共有状態ルール（ユーザー承認・2026-09-22）

身体状態は全顔で共有し、感情表現は同じ意味の範囲内で自然な微差を許容する。1個体の中に複数の顔がある場合、hungry/sick/tired/weak/critical/sleeping は全ての既存の顔に当該状態を反映する。happy/strained/sulky/wantsPlay も全体で同じ感情を示す。目や口を完全なコピーにする必要はない。中央だけ不調で周囲が心配する等、複数人物的な通常状態表現は採用しない。ストーリーやイベントでの特殊演出は別途検討する。

この原則は該当する複数顔段階に限り、以前の「主顔のみ変更・周囲顔保持」の指示に優先する。単一顔の段階、通常画像、別個体の仲間・抱えた動物・ぬいぐるみ、空の抜け殻には波及させない。顔のない花・枝・葉には新しい顔を付けない。

完成21系統168段階の監査で対象は coral06–08（4/3/5顔）、sakura05–07（5/3/3顔）、venus_flytrap04/05/07/08（3/4/5/3顔）。サンゴの群体はゲームの一体の姿として共有対象。dandelion08は共通茎を持たない6つの独立した種体であり、一個体内の複数顔とは扱わず今回の修正から除外する。clownfish05の仲間魚、woman02のぬいぐるみ・08の抱え猫、butterfly06/cicada05の空殻も除外する。

既存10状態とresolver・リアクションの意味は変更しない。PNGの顔を修正し、別レイヤーのマーク／エフェクトの色・数・位置は維持する。全顔分のマークや汗を増設しない。通常画像・ゲーム数値・恋愛条件・セーブ形式を保持。既に全顔の意味が整合する表情は再生成せず保持し、要修正PNGだけを既存画像と通常元画像の参照で個別編集する。最終差分・provenance・単独画像／合成の独立レビュー・既存接続／回帰／全体テスト・同じowner-private Siteでの10表情確認を記録する。PR278はDraftを維持しmainを取り込まずマージしない。この区切りを安全に保存してから新系統制作へ進む。

### 複数顔・複数個体の表情ルール（追加承認・2026-09-22）

今後の全キャラクター制作は、顔の数だけで状態共有を決めず、元画像・段階資料・既存の個体定義から先に分類する。

1. **同一個体内の複数顔**：身体状態は全顔で共有する。hungry/sick/tired/weak/critical/sleeping は同じ状態、happy/strained/sulky/wantsPlay は全体で同じ感情を表す。同じ意味の範囲で自然な微差を許容し、コピー顔を強制しない。前節の共有状態ルールと受理済み修正を維持する。
2. **主個体と別個体が同じ画像内にいる**：ゲーム上の現在状態は主個体で表現する。別個体には主個体の病気・空腹・疲労・生命低下・危険を機械的に同期させない。別個体は主個体への心配・不安・気遣い、喜びを共にする、様子を見る等の自然な反応を表現してよい。睡眠も強制同期せず、見守る／自然に一緒に眠る等を許容する。既存10表情の意味と画風を基準にし、必要な場合だけ別個体部分を最小限調整する。別個体専用の11番目以降の共通カテゴリは追加しない。平常の穏やかな表情を必ず心配顔に作り直すという意味ではない。
3. **曖昧な分類**：画像と分類理由を提示してユーザー確認を求める。推測で大量修正しない。物品・衣服の図柄・ぬいぐるみ・空の抜け殻を生きた別個体と混同しない。

今回の全21系統168元画像の監査では、別個体対象は woman08（抱え猫1匹）、clownfish05（小魚2匹）、dandelion08（主種以外の独立した種5個）。計30表情に不適切な身体状態同期はなく保持する。タンポポの不調時に周囲の明るい顔が残る点はQAに明記し、心配顔が必須とは解釈しない。サンゴ群体のゲーム上一体という既存定義、サクラとハエトリグサの同一身体対象は変更しない。

PNGの顔と別レイヤーのマーク／エフェクトを区別し、別個体ごとに主役の状態マークや汗を増設しない。主役の承認済み表情、既存マークの色・位置、状態resolver、ゲーム数値、成長・恋愛条件、セーブ互換、通常元画像、対象外の完成表情を保持する。問題がなければPNGは変更せず、必要なケースだけを画像・部分単位で修正する。対象の目視比較・接続検査・回帰／全体テスト・同じowner-private Site・GitHub保存を記録する。PR278はDraftのまま、mainを取り込まずマージしない。この追加監査の保存区切りの前に次系統の80表情制作を始めない。

### 複数顔・複数身体・複数個体の表情ルール（3分類・ユーザー確定、2026-09-22）

本節は従来の同一身体／別個体の分類を拡張する現行規則であり、矛盾する過去の分類記述に優先する。顔の数だけで決めず、通常元画像、8段階の成長、ゲーム上のキャラクター単位、設定、構成要素の接続を合わせて判断する。新規制作と完成済み21系統1680表情の両方に適用する。

- **A 同一身体**：身体状態（hungry/sick/tired/weak/critical/sleeping）は全顔・構成部分で共有する。happy/strained/sulky/wantsPlayも全体で同じ感情方向を示す。目・口・強さなど同じ意味の範囲内の自然な微差を許容し、コピー顔を要求しない。一部だけ不調で残りがその顔を心配する演出は通常状態に使わず、必要なら将来の専用イベントとして別途検討する。
- **B 一群キャラクター**：複数の構成員をまとめて一つのゲームキャラクターとして扱い、一群全体が主役になる。中央・最大の一員だけを固定的な主役にしない。状態・感情の意味を群れ全体として共有しつつ、反応の強さ・寝方・目口などに自然な差を認める。全員の完全同期は不要だが、病気・疲労・生命低下・危険時に一部だけ元気いっぱいで全体の意味を打ち消す表現は避ける。構成員数・身体構造は変えない。
- **C 別個体**：ゲーム上の主個体の身体状態を別個体へ機械的に同期しない。心配・不安・気遣い・様子を見る・一緒に喜ぶ等を許容する。睡眠も強制同期せず、見守る／自然に一緒に眠る等でよい。主役の承認済み表情を不要に変更せず、明確な問題がある別個体部分だけ最小限調整する。平常の穏やかな顔を必ず心配顔へ描き直す意味ではない。専用の11番目以降の共通表情カテゴリは追加しない。
- **分類未確定**：第四分類を設けない。画像、候補分類、理由、推奨案、修正の影響を提示してユーザー確認を求める。推測で大量修正しない。物品・図柄・ぬいぐるみ・空の抜け殻は生体と混同しない。

**確定裁定**：mushroom01の6粒はBであり、6粒全体が主役。mushroom08の大小2本は、同一菌糸体から生じた子実体として一つの成長個体を構成するAであり、両方に身体状態を反映する。woman08の抱え猫、clownfish05の小魚2匹、dandelion08の主種以外の種5個はCを維持する。タンポポの既存の明るい周囲顔は心配顔必須ではなく、明確な矛盾がない限り保持する。

PNG表情と別レイヤーのマーク／エフェクトを区別する。構成員・顔ごとのマークや汗は増設しない。既存10表情の名称・意味・優先順位・色・形状・位置・汗・喜びと睡眠の表現、resolver、お世話リアクション、通常元画像・シルエット・小物、ゲーム数値・成長・恋愛条件・セーブ互換を保持する。

**実施順**：全168元画像を実査し、複数構成要素を漏れなく抽出する。各段階の構成・A/B/Cまたは対象外・理由・現在の10表情の適合・修正要否／状態／枚数をQAに記録する。明確な矛盾があるPNGだけを最小修正し、問題のない完成表情を再生成しない。独立レビュー、非対象保持・接続・配置・回帰・全体テスト・差分検査、同じowner-private確認Site更新とGitHub保存で先に区切る。その保存済み地点からのみキノコ8段階×10表情を制作し、80枚全ての独立レビュー・分類／配置監査・保持／全体検証・同じSite更新・GitHub保存を実施する。PR278は最後までDraft/open/未マージ、mainを取り込まず、別作業を混ぜない。キノコ完了後も他の未制作系統が残る。


### キノコ8段階の3分類適用（2026-09-22）

既存21系統の追加監査を保存したHEAD `1edf3d9` を基準にキノコ80表情を制作・個別受理。01はB（6粒全体が主役）、08はA（同一菌糸体から生じた大小2本の子実体で一つの成長個体）。07はC：元画像で主キノコから離れた顔付き胞子3個と、胞子が新しい場所へ向かう既存成長説明を確認し、メインの身体状態を強制同期しない。02〜06は既存単一顔のみ。粒・胞子・子実体の数を変えず、物品や小装飾を生体へ変更しない。分類・全80目視・合成・保持・テスト・保存結果の正本は `docs/qa/mushroom-expressions-20260922.md` とそのmanifest／review群。マーク色・resolver・状態体系等の既存仕様は保持する。

### りゅう8段階の承認済み一括制作（2026-09-22）

ユーザー承認済みキノコ保存HEAD `761f049a4942bf0777b81189e1f5757e4e20d192` を基準に、資料・元画像から未制作のrare系統dragonを選定。全8段階を原寸・6倍・座標グリッドで確認し、いずれも単一身体・単一顔で、複数構成要素のA/B/C分類対象や未確定ケースはない。06の火炎は元画像に含まれる成長段階の特徴として保持し、別生物や状態マークと混同しない。各段階の角・翼・尾・姿勢・年齢・配色・身体構造を保ち、既存顔の目・眉・口で10状態を表す。

完成済み22系統1760表情・通常297PNG・既存176段階配置を保持し、新8段階だけ配置生成する。80枚の元画像参照個別生成、全数独立レビュー、3分類意味監査、配置・マーク監査、保持・接続・回帰・全体テスト、同じowner-private確認Site更新、同じDraft/open/未マージPR278へのGitHub保存を一括で実施する。新しい分類上の曖昧さが生じた場合のみ制作前に確認し、通常の段階ごとの再承認は求めない。制作・検証結果は `docs/qa/dragon-expressions-20260922.md` とmanifest／review群へ記録し、全キャラクター完成とは扱わない。


### フェニックス8段階の承認済み一括制作（2026-09-23）

りゅう保存GitHub HEAD `6ccc3d04d9a5295122d9a03c8b8bdae8332e197f`、tree `6da4b6a4a0b3b5a8e0024ef7f89e73f05208168e` を基準に、資料・元画像から次の未制作rare系統phoenixを選定。ユーザーが3分類の継続と次系統への進行を明示承認。全8元画像を原寸・6倍で主担当・独立担当が確認し、全て単一身体・単一顔。複数構成要素のA/B/C対象・新たな分類の曖昧さはない。08の灰・炭・火の粉は生体ではなく元画像の再生段階表現として保持する。01〜06の炎の羽、06の金色、07の年齢を示す灰色の羽、08の灰からの再生を維持し、既存の目・眉・くちばしで10表情を表す。

既存23系統1840表情・通常画像・184段階配置を保持し、新8段階だけ追加する。全80個別生成・独立レビュー・3分類／配置監査・既存保持確認・接続／全体テスト・同じowner-private確認Site更新・GitHub保存までを一区切りとする。新たな分類の曖昧さ以外では段階ごとの再承認を求めない。現行3分類の確定裁定、別レイヤーの状態マーク、resolver、ゲーム数値、セーブ互換を保持。完成済みの再監査・再生成はしない。PR278はDraft/open/未マージを維持し、mainを取り込まず、別作業を混ぜない。今回の80枚完了後も全キャラクター制作完了とは扱わない。


### かみさま8段階の承認済み一括制作（2026-09-23）

フェニックス保存GitHub HEAD `1d9a070b729b0154f65833d322149bb30d89de4d`、tree `ecd66489c0b0f1cfe62c68d3c13bfb6c4204f4db` を基準に、ユーザーの継続指示により次の未制作rare系統godを資料・元画像から選定する。成長資料は光の粒→光の子→小さな精霊→見習いかみさま→かみさま→大いなるかみさま→神々しい光→光そのもの。原画像を原寸・6倍で確認し、既存の顔・身体・年齢・髪・衣服・翼・杖・光環・光の意匠と構成を保持し、目・眉・口で10状態を表す。杖先の玉や周囲の星・光環を別の生体と混同しない。08は既存成長文の「顔がもう太陽になっている」に従い、既存太陽顔の表情だけを変え、新たな人型身体を追加しない。

完成済み24系統1920表情・通常画像・192段階配置を保持。元画像参照の80個別生成、全数独立レビュー、現行3分類適用、配置・マーク監査、既存保持・接続・全体テスト、同じowner-private確認Site更新、同じPR278へGitHub保存までを一区切りとする。新しい分類の曖昧さが見つかった場合のみ制作前にユーザー確認する。既存完成画像を再監査・再生成せず、顔や構成員ごとのマーク/汗追加、11番目のカテゴリ追加、色・resolver・ゲーム数値・成長/恋愛条件・セーブ互換変更は禁止。PR278はDraft/open/未マージを維持し、mainを取り込まない。完成後も全キャラクター制作完了とは扱わない。


### 世界樹8段階の承認済み一括制作（2026-09-23）

保存済みremote HEAD `d2e9c74427bdfda88f053b504f6edbbe36162e90`、tree `e24b4bb3c0f7e4f911ba926b3f096eb4ad5ba87f` を基準に、ユーザーの継続指示により次の未制作系統をマスター資料・成長文・全8元画像から選定。通常22系統とrareのdragon/phoenix/godが完成しており、マスターrare配列の次のworld_treeを選んだ。テストfallbackのworld_tree指定を選定根拠にしていない。主担当・独立担当が全8原寸/6倍を確認し、全段階単一身体単一顔、新たな分類上の曖昧さなし。成長順は光る芽→ふしぎな苗→小さな木→精霊の木→大樹→巨大な木→雲をこえる木→世界樹。05の青い吊り光4個、06青5個、07橙6個、08の青2輪と星は顔のない元意匠として保持し、別生物や状態マークへ変更しない。枝の声や精霊の木という表現から新しい顔を追加しない。睡眠・不調でも葉・幹・根・土・光を保持し、枯死や落葉で状態を示さず既存の目眉口を編集する。

既存25系統2000表情・旧4PNG・通常297PNGの計2301PNG、200段階配置・アンカー・段階名を保持。新80表情を個別制作し、独立目視受理・SHA照合・合成レビュー、新8配置のみ追加、保持/接続/全体検証、同一owner-private Site更新、同一Draft/open/未マージPR278へGit Data API保存までで区切る。新分類の曖昧さ以外の再承認待ちは不要。main取り込み・競合解消・別作業を混ぜず、resolver/色/形/ゲーム数値/成長・恋愛条件/セーブ互換は不変。完成済みの再監査や再生成は行わない。今回完了後さらに次系統へ自動進行しない。


### おばけ8段階の承認済み一括制作（2026-09-23）

世界樹保存remote HEAD `c2e1b12a690f1c48b08aeb98313ef24becb3f1c2`、tree `0380a003b462a52a9d9dc8099e329f7319cfd01d` を基準に、ユーザーの「続きをお願いします」により次の1系統80表情を制作する。通常22系統とrareのdragon/phoenix/god/world_treeが完成しており、マスターrare配列と8段階の成長文から次のghost（おばけ）を選定。テストfallback指定は選定根拠にしない。主担当・独立担当が全8元画像を原寸・6倍で確認し、全て単一身体・単一顔。新しいA/B/C対象や分類上の曖昧さはない。05の青い火の玉1個、06の3個、07の4個、08の星形8個・光輪・尾先の光は顔のない元意匠として保持し、別生体や状態マークに変更しない。

成長順は小さなたましい→ちびおばけ→いたずらおばけ→おばけ→大きなおばけ→昔からいるおばけ→おだやかなおばけ→旅立ち前のおばけ。01の小さい魂の光、02の腕のない身体、03〜05の腕と尾、06の長い頭頂・ひげ状の裾、07の合わせた両手、08の細身の発光姿を保ち、既存の目・眉・口で10状態を表す。05の鋭い基本造形は保持しつつhappy/sleeping等の状態を読み分ける。06〜08は通常も閉じ目のため、睡眠と疲れ・弱りを口や眉と合わせて確認する。

既存26系統2080表情、旧4PNG、通常297PNGの計2381PNG、既存208段階の配置と26系統のアンカー・段階名を保持。80枚の個別生成・provenance・独立全数目視とSHA一致・独立合成レビュー、新8配置のみ追加、保持/接続/配置/全体検証、同じowner-private Site更新、同じPR278へのGit Data API保存までで区切る。PNGと状態マークは別レイヤーを維持し、顔ごとの汗やマーク、11番目の共通カテゴリを追加しない。既存色/形/resolver/ゲーム数値/成長・恋愛条件/セーブ互換不変。PRはDraft/open/未マージ、main取り込み・競合解消を混ぜない。新分類の曖昧さ以外は再承認待ち不要、既存完成画像の再監査・再生成なし。完了後さらに次系統へ自動進行しない。


### ほし80表情の継続制作（2026-09-23）

おばけ保存remote HEAD `3cebe34792c5cec2b283382821ca62776ca6d307`、tree `b86eefb08859e16e6e9f18531af0587275878b3e` を基準に、ユーザーの継続指示による次の1系統80表情。マスターnormal22とrare5の完成を照合し、rare配列・8段階成長文・全8元画像からstar（ほし）を選定。テストfallbackを根拠にしない。主担当と独立担当が全8元画像を原寸・6倍で確認し、全段階単一身体・単一顔で新たな分類曖昧さなし。02の集まる雲は星を作る物質でB一群ではなく、07/08の顔のない光・星形はC別個体ではない。

成長順は星のもとの雲→集まる星の雲→うまれかけの星→若い星→輝く星→ふくらんだ星→はじける星→星のなごり。01/02の青紫の雲、03の周囲の円盤、04〜06の太陽状身体と放射光、07の爆発状放射、08の中央の小さい顔と周囲の光の輪・星を保持し、既存の目・眉・口で10状態を表す。不調・睡眠でも元の光を削らず、人型身体や新たな顔・生物を追加しない。

既存27系統2160表情・旧4PNG・通常297PNGの計2461PNGと216段階配置・27系統のアンカー/段階名を保持。80個別生成とprovenance/SHA、全数独立目視受理と最終SHA照合、独立合成確認、新8配置のみ追加、保持/全件接続/配置/全体検証、同じowner-private Site更新、同じPR278へGit Data API保存までで区切る。PNGと状態マークは別レイヤー、既存10状態・マーク色/形/数・resolver・ゲーム数値・成長/恋愛条件・セーブ互換を保持。PR278はDraft/open/未マージを維持し、main取り込み・競合解消を混ぜない。新分類の曖昧さ以外の再承認不要。完成済み再生成/再監査なし、今回保存後に次系統へ自動進行しない。


### ぬいぐるみ80表情の継続制作（2026-09-23）

ほし保存remote HEAD `d299c2bb03d471745dddd0928c03541d99863907`、tree `ab8e2427406a5ae1c0cb9525adcd93b212f1a451` を基準に、次の1系統plush80表情を追加する。マスター完成normal22/rare6と未制作一覧、8段階成長文、全8元画像から選定し、テストfallbackを選定根拠にしない。主担当と独立担当が全8元画像を原寸/6倍で確認し、全段階単一身体・単一顔、新分類曖昧さなし。ハート、綿、補修布、縫い目、光は別生物ではない。

新品のぬいぐるみ→遊び相手→お気に入り→よごれたぬいぐるみ→ほつれたぬいぐるみ→つぎはぎ→くたくた→大切な宝物の構造・座位・傾き・色・摩耗を保持し、既存の目/眉/口で10状態を表す。03の抱えたハートと上方ハート、04/05の縫い目、05の左右綿束、06の青補修布、07の白い耳補修とくたくたの姿、08のハート/大リボン/元の光と頬色は不調/睡眠でも保持する。元からの装飾を新状態マークと混同せず、新たな汗/涙/マークをPNGへ足さない。

既存28系統2240表情・旧4・通常297の計2541PNG、224段階配置、28系統anchors/namesを保持基準とする。80個別生成と全provenance/SHA、全80独立目視と最終SHA、独立合成レビュー、新8配置のみ追加、保持/全接続/全配置/全体テスト、同じowner-private Site更新、Git Data API保存までで区切る。PNGと状態マークを別レイヤーで保持し、resolver・マーク色/形/配置制約・ゲーム数値・成長/恋愛条件・セーブ互換・既存3分類を変更しない。PR278はDraft/open/未マージ、main取り込み・競合解消なし。新しい分類曖昧さ以外の再承認待ち不要。完成済み再生成/再監査なし。今回保存後に次系統へ自動進行しない。


### ？？？（unknown）80表情と04の器官の扱い（ユーザー確定、2026-09-23）

ぬいぐるみ保存HEAD `4f5784735c6cbc97ed9391da8a3d97ef68f358db` / tree `fb00ea2bd27357ab0d23ef5d4c959baff4577fa4` を基準に、マスター資料・8段階の成長文・全8通常画像から未制作のrare系統unknownを選定した。テスト用fallbackを選定根拠にしていない。全8元画像を主担当・独立担当が原寸/6倍で確認した後、04の頭上2球の解釈について制作前に停止し、全8元画像を加工せずユーザーへ一覧提示した。

**ユーザー確定判断**：unknown 04の頭上2球は、目・触角・感覚器官のいずれとも確定しない。意図的に正体不明の器官として扱う。表情差分では形状・内部模様を保持し、通常の表情同期対象にしない。睡眠時の閉眼や不調時の瞳/瞼の変化など、解釈を確定する描き換えは行わない。身体につながった構成部分であり、別個体・一群へ分類しない。これは器官の意味を確定しない制作上の保持規則で、A/B/Cに第四分類を追加するものではない。04は既存の胴体の顔で状態を表す。

点→ぷる→足？→目？→羽？→でっかい？→ちっちゃい？→点……？の大小・構造・青紫の光・元の微粒・足・翼・巻いた先端を保持する。07の元から描かれた橙3本も保持し、新しい別レイヤー状態マークと区別する。新たな汗・涙・状態マークは表情PNGへ足さない。01/07/08の小さな顔は元の大きさを保ち、顔の拡大や人型身体の追加で表情差を強めない。

既存29系統2320表情・旧4・通常297の計2621PNG、232段階配置、29系統anchors/namesを保持基準とする。承認済み80個別制作、全provenance/SHA、全数独立目視と最終SHA、独立合成レビュー、新8配置のみ追加、全件保持/接続/配置/全体テスト、同じowner-private確認Site更新、Git Data API保存までを一区切りとする。既存3分類・色・マーク形・配置制約・例外・resolver・ゲーム数値・成長/恋愛条件・セーブ互換を保持する。PR278はDraft/open/未マージ、main取り込み・既存競合解消なし。新たな分類曖昧さ以外に段階ごとの再承認は求めない。今回の80保存後は次系統へ自動進行しない。

unknown80の制作・全数独立受理・保持/接続/配置/全体1788PASS・同一owner-private Site70公開を完了。詳細は `docs/qa/unknown-expressions-20260923.md` とmanifest/review群を正とする。04の確定裁定を全10へ適用した。既存2320表情を保持し合計30系統2400表情、全キャラクター制作完了ではない。GitHub保存後のHEAD/tree/PR/CIはPR278追記で確認する。
