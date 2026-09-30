# Human expressions — approved batch

Spec: existing docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md, continuation approved in chat and appended below. User authorized both human lines (man/woman), all8 stages, ten expressions each, with autonomous mark adjustment and combined contact sheets. PR278 Draft; never merge main. Preserve all cat/dog art, anchors, colors, outlines, reactions, game values and saves. Original normal PNGs stay unchanged. Human hunger uses a yellow rice bowl. Static comparisons are labeled as composites rather than device screenshots.

## Task 1: Human expression assets

Produce160 separate original-referenced transparent PNG edits: man/woman01..08, happy,strained,sulky,hungry,sick,tired,weak,critical,wantsPlay,sleeping. Each variant is a separate built-in image_gen call. Preserve the original's hair/skin/clothes/pose/proportions/accessories; edit facial eyes/brows/mouth only. Elder-woman pet cat/toy props keep their original neutral faces. No symbols baked into PNGs; no text/shadows/new props. All output128x128 RGBA, transparent, normalized to original alpha bounds. Use ImageMagick nearest-neighbor normalization after image_gen (routine pipeline, no manual face repainting). Never slice sheets. Save assets/characters/expressions/{man,woman}/{01..08}-{expression}.png. Do not edit code/tests/docs other than assigned report. Do not commit/push/deploy. No subagents.

Expression directions: happy narrowed smiling eyes/open joyful grin; strained raised worried inner brows/tiny downturned mouth; sulky narrowed annoyed eyes/pout; hungry wide pleading eyes/small round mouth; sick squeezed tense eyes/tense mouth without painted sweat; tired drooping lids/yawn; weak fragile worried eyes/weak closed mouth; critical almost-closed exhausted eyes/weary mouth; wantsPlay bright eager eyes/small friendly closed smile; sleeping fully closed relaxed eyes/faint closed-mouth smile. Keep contrasts visible at128px.

man01-happy already generated: /workspace/scratch/cfccd9f29804/generated_images/exec-777d47e5-4bb1-4848-a008-a13d84182ee5.png — normalize/reuse; do not regenerate.
Read imagegen skill, inspect every original before editing. Built-in tool output_hint provides generated file path; copy/normalize outputs to project. All originals under /workspace/scratch/orange-code/assets/characters/{man,woman}. Preserve full-body silhouettes including tiny train (man02), stuffed rabbit (woman02), bags/cane/cat. Generation requests may run in bounded parallel batches within one exec, all promises awaited. Persist a JSON manifest per asset including original, generated path, output, prompt; report completed count every batch. Never print base64.

Production ownership: four independent groups, man01–04 / man05–08 / woman01–04 / woman05–08. Each worker owns only its40 PNGs and a separate scratch manifest/temp directory; no shared code edits or commits. After the first male group completed40, the not-yet-started man07–08 tired/weak/critical/wantsPlay/sleeping assets were explicitly transferred to that worker (10 disjoint files). The late male worker retains the other30 files. Root reviews the complete160 and handles publication.

## Task 2: Runtime, marks, review and publication (root)

Failing tests for all16 human stages then minimal allowlist, per-head marks and human food symbol; extend disposable preview to all16 human forms with achievement and save isolation. Retain cat/dog behavior byte-for-byte. After assets arrive, review160 final static composites, adjust mark positions as needed, test full suite and assets, review diff, record QA, save same Draft PR, update private preview, save/deliver comparison images. No intermediate approval gates; final device-specific acceptance remains user-owned.

## Verification result

Assets complete160/160; all final composites visually reviewed and corrected. Code review has no actionable findings; asset suite34/34 and full npm suite792/792 pass. Deliverables:16 stage sheets,4 overviews and ZIP. Keep Draft PR278 and owner-private preview; never merge main.
