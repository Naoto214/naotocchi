# Character 3D Quality Pass — A1–A7 (2026-10-02)

Current status: **Quality pass and automated verification complete; Human QA pending.**

This document preserves chronological checkpoint notes. Earlier PENDING/NOT_STARTED statements describe those checkpoints. Final evidence: `../qa/character-3d-quality-2026-10-02.md`.
Human verdict on Claude pilot: architecture promising, visual quality requires revision.
Do not merge main, mark Ready, expand the pilot, or merge another lane.

## Initial source snapshot and scope (A1)

Fresh remote, not an old local copy:

- main: `ebffaad921da29bf2b8b42e1bdccc97c922db280`, tree `492ea3b8e88e6eea3318fcf13b336fa892469eac`.
- Character: `e12f7208427c2f1035849ab4319c78fc31305c65`, tree `1182f2cdcdcebb954d3e6c4efdc6c02987191d87`.
- PR #372: open, Draft, base main, mergeable true at initial read.
- Preserve this commit as the immutable **Claude before** implementation. Existing saved QA images belong to the earlier pilot run; they are evidence, not newly rendered results.
- Architecture: `architecture.md`; earlier QA: `../qa/character-3d-pilot-2026-10-01.md`.
- Design authority: `assets/characters/{species}/{01,04,08}.png`, butterfly 05, dandelion 06, companions/shiba.png and companions/cat_friend.png. All 26 pilot stage originals visually inspected. Stage and four-view sheets for all eight pilots inspected. No external character designs.
- All-stage rerender was pending at A1. A7 now saves all 26 stage comparisons and both reuse templates.
- There are **26 player templates plus 2 reuse templates = 28**, not 26 total.

Preserve spec → shared archetype → parameters/attachments/markings → Group rig → locomotion + emotion posture + temporary reaction → presentation. Keep all eight canonical emotions and actor/save/fallback ownership.

## Visual requirements extracted from the originals

A = required identity; B = may simplify at gameplay scale; C = unseen surface to infer consistently. All C entries are proposals, not claims that the original depicts a back view.

| Original | A — preserve in 3D | B — simplify | C — natural completion | Claude gap / intended reusable mechanism |
|---|---|---|---|---|
| man 01 | Oversized brown tousled head, curled tuft, asymmetric fringe, blue crawling outfit, visible small hands/knees | Tiny clothing folds, individual hair pixels | Continuous side/back hair; blue garment back and seams | Bowl-cap hair and upright-looking silhouette; scalp cap with continuous hairline + swept locks; actual crawl proportions |
| man 04 | Brown spiky fringe, navy open jacket, white collared shirt/buttons, backpack/strap, gray-white shoes; shorter limbs than generic adult | Fine stitching, tiny shoe details | Jacket back/hem, backpack thickness, crown/nape | White colour wedge is not a shirt opening; use garment shell/opening, collar/lapel, placket/buttons, cuffs, sole; bent strap-holding arm |
| man 08 | Silver side-parted hair with visible forehead, brown cardigan over white collar, dark trousers/brown shoes, right-hand cane; older posture | Fine wrinkles, knit texture | Connected gray side/back volume, cardigan back | Uniform tube sleeves/body, cane not held; shared garment variants + cane socket + age stance |
| dog 01 | Golden curled sleeping puppy, dark broad droopy ears, head low on paws, short legs, closed normal eyes | Fur grain, toe lines | Compact back/hip, short tail | Existing normal eyes open and ears/snout too generic; stage normal-face setting and compact lie pose |
| dog 04 | Play bow: chest down/front paws forward, rear high; long upright ears, dark tips/paws, rising curved tail, compact cheerful muzzle | Exact wink can be a normal-face variant; individual hairs | Narrower active back, continuous tail | Generic standing stick legs; reusable playBow pose blended into quadWalk; uncurled raised tail distinct from shiba |
| dog 08 | Broad seated chest, bent haunches, dark droopy ears, cream muzzle/brows, smiling closed eyes, low thick tail | Small fur strokes | Seated hip mass and tail root | Current legs remain straight and cream region oversized; parameterized haunch/cheek/brow markings, seated pose |
| shiba companion | Compact play-bowing orange dog, triangular ears, broad cream cheeks/chest, short muzzle, thick curled tail over back, short paws (A1 seated interpretation corrected after PNG reinspection) | Fine coat edge | Dense hips, curled tail depth/cream underside | Same standing geometry proportions as dog04; reuse quadruped with genuinely different silhouette, markings and pose |
| penguin 01 | Gray fluffy teardrop chick, pale two-lobe face/belly, closed eyes, stubby wings and broad orange feet | Individual down hairs | Gray back continuous with crown | Snowman-like head/body seam; integrated head/body profile, mask colour fields, localized tufts |
| penguin 04 | Irregular retained gray down on crown/side/wing, dark juvenile body, white face/belly, one flipper raised | Number of feathers | Irregular but coherent rear down | Sinusoidal patches look like checkerboard; bounded organic colour regions + sparse contour tufts; stage flipper pose |
| penguin 08 | Broad dark pear body, two white face lobes, cream belly, closed eyes, cane held under flipper | Feather glints | Dark rounded back, flipper thickness | Generic white horizontal face band and open eyes; mask profile and normal-face choice; cane/flipper contact |
| clownfish 01 | Pale peach round-headed translucent fry, closed eyes, short small fins and fan tail | Sparkle pixels | Symmetric opposite side | Needle-like thin silhouette; fuller head profile and fry normal face |
| clownfish 04 | Orange deep body, broad white bands with narrow black edges, fan tail, broad ribbed chest/dorsal fins | Fine fin-ray count | Symmetric bands/fin reverse | 3D is spindle-like with tiny fins; profile and fin outline/vein modifiers |
| clownfish 08 | Larger/deeper body and expanded round fins/tail; cheerful face, same band rhythm | Pixel-scale highlights | Backside repeats band pattern | Age mostly size/height, fins read narrow; stronger silhouette and black-edge controls |
| butterfly 01 | Large pale-cheeked green head, tapering connected green segments, cream underside, tiny feet, closed eyes | All individual highlights | Dorsal spot continuation | Small head-to-body volume in saved view; larva head/segment ratio and stripe fields |
| butterfly 04 | J-shaped hanging body, branch-to-tail suspension, curled head forward/left, cream belly plates, dark spots and small forefeet | Fine branch bark | Side/back continuous segmented body | Branch crosses near body rather than a clear tail attachment; parameterized suspension point, J curve and belly/spot layer |
| butterfly 05 | Narrow top attachment, broad folded shoulder, pointed tapered bottom, asymmetric leaflike folds, horizontal segmentation and central diagonal seam, closed eyes | Fine veins | Fold structure wraps around rear with lower contrast | Plain faceted pod; profile rings + sparse crease sweeps/vertex colour; pivot at hanging point |
| butterfly 08 | Four readable blue lobes: larger forewings above, smaller hindwings below; dark outline/veins, pale blue cells and cream rim spots; upright dark abdomen under pale face, clubbed antennae | Exact spot count and tiny legs | Wing reverse repeats broad pattern with subdued contrast | Abdomen runs backward in z while wings occupy xy; resting/flapping roots must share anatomical frame, cell/vein marking generator |
| dandelion 01 | Brown pear seed and long angled beak, radiating fine white pappus, cheerful large face | Pappus count | Radial fibres extend in depth | Upright round seed too generic; seed taper and angled socket, fine pappus |
| dandelion 04 | Low cream centre framed by broad serrated green leaves; leaves emerge behind/below face in layered rosette; tiny root contacts | Individual fine serrations | Offset leaf roots form short crown at back/base | All leaves share origin and cut through bulb; leaf-origin/radial-offset/layer parameters and broad blade profile |
| dandelion 06 | Rounded yellow petals in overlapping ring, orange centre, distinct green stem and broad base leaves | Pixel vein/highlights | Calyx and petal backs | Thin pointed sunflower spikes in current 3D; rounded volumetric petal attachment and same rosette mechanism |
| dandelion 08 | **Six** face-bearing airy seed puffs plus tiny loose seeds, varied tilt/spacing, brown tapered seed suspended below each, fine halo | Number of filament strands and tiny loose specks | Sparse radial fibres in depth, no opaque snowball back | Current spec count 5 and opaque spheres; six-unit layout and bounded fibre/alpha-card halo budget, cached/shared material |
| mushroom 01 | Six separate cream/pink spores; unequal sizes, soft irregular outlines, different facial placement/expression, warm underside, highlights/sparkles, asymmetric composition | Exact sparkle count | Soft rounded backs, mild per-unit variation | Same sphere/face scaled six times; parameterized unit shape/face/layout + merged highlights |
| mushroom 04 | Tall teardrop cream cap carrying face, narrow waist into bulbous stem, small mound ringed with rounded stones/leaves | Tiny soil grains | Rounded cap rear and subtle underside | Low dome cap and straight cone stem; lathe profile variant and compact organic base |
| mushroom 08 | Large orange tilted cap showing gills, broad cream tapered/frilled stem with face, smaller right mushroom with **its own face**, many warm rounded stones | Fine gill count/soil specks | Radial gills continue underside, cap back orange | Child face absent in faceSpec; reuse multi-face support already used by cluster; cap tilt/underside and stem/base profiles |
| starfish 01 | Tall pointed upper lobe, side protrusions near face, narrow transitions to separated lower lobes, luminous blue rim and clear soft interior | Sparkle pixels | Shallow gelatinous thickness preserving front contour | Generic oval blob with tiny bulges; reusable smooth contour-loft shape, no new species-only builder |
| starfish 04 | Five asymmetric pink arms, upper-left curl, long tapering top/right arms, warm centre, rounded lower tips | Pixel-edge highlight | Slightly darker smooth back | Too symmetric/stubby; per-arm length/angle/taper modifier and central colour field |
| starfish 08 | Five slender orange/red arms, compact yellow centre, pale dot rows following arms, surrounding **five positioned bubbles** | Exact dot count | Darker unobtrusive back, modest thickness | Arms/centre too bulky, dots loose; parametric arm profile and aligned markings. Bubble coordinates currently ignored (code finding below) |

### Shared face/readability decision

A requires the face to occupy the original's relative area, not merely exist. Closed normal eyes in dog01/08, penguin01/08, clownfish01, man08 and butterfly05/08 are stage art choices; they must not invent a new canonical emotion. Normal face variants may preserve these traits; positive/dislike/tired/sick remain canonical adapters. Use existing multiFace machinery for spores, puffs and both mushrooms. 2D asset files stay byte-identical.

### Negative space and four-view acceptance

- Man: gaps between jacket and shirt, legs, arm and torso, backpack and shoulder; hair must stay closed around crown/nape from side/back.
- Dog/shiba: foreleg reach and bow gap, breed-specific body/cheek proportions and tail curl; tail curl must remain open and legible from back, not a recoloured thin dog tail.
- Penguin: flipper/body separation and cane contact; mask must not turn into a stripe at 3/4.
- Fish: fin silhouettes and tail notch readable from side/3/4; front will be narrower naturally but should retain cheeks/eyes.
- Butterfly: fore/hindwing separation, symmetric thorax roots, wing/body clearance through full cycle; profile thickness intentionally thin.
- Plant: leaf gaps around central face, visible origin below/behind body; sparse puffs remain separated from all angles.
- Fungus: cap-to-stem overhang, visible underside, separate adult/child silhouettes and faces; base must not be a large flat brown plate.
- Starfish: gaps between arms/lobes and tapered tips; front markings stay attached in 3/4, back uses consistent simple shading.

## Code findings (confirmed vs visual hypotheses)

Confirmed:

1. `fungus()` creates child geometry but registers only the main `faceSpec`. Runtime already accepts an array and can update/clone all faces. No runtime redesign needed.
2. `bubblesGeo(list)` destructures x/y/z but never translates its ellipsoids. All bubbles overlap at origin. Save a failing world-position assertion before fixing.
3. `dandelion`08 count is 5 while the original has 6 face-bearing puffs. This consumes the existing maximum cluster mesh budget (6 bodies + 6 atlas faces = 12) before any extra halo draws.
4. `plant()` translates all leaves to `[0,0.03,0]`; it has no crown/root-offset or overlap-layer parameters.
5. Hair is a complete deformed sphere with portions forced inside skull. Sparse boundary triangles can cross the visible scalp; cap boundary/coverage needs an explicit surface, not repeated radius tweaking.
6. `wingedInsect()` uses a rearward z abdomen while wings are xy fans; flap pivots act around y. Roots/rest pose/anatomical frame need coordinated correction.
7. The frozen gallery advances animation by 0.0001 each frame. `walk=1&t=...` starts with `move=0`, so it does not provide a reproducible settled locomotion pose. Fix fixed-time sampling before relying on motion sheets.
8. `window.__c3d.items` captures the initial array; `clear()` later reassigns `items`. QA consumers after rebuild may see stale items. Use an accessor if extending automation.
9. remove-it parses only TAP `ok`/`not ok`, but Node 24 default reporter in this runtime is spec; original run reported pass=0/fail=0 for all mutations and still exited 0. Tooling correction pins TAP, checks 34 results/exit status, and restores originals on failure/interruption.

Visual hypotheses to validate by real rendering: scalp holes, wing rest/flap readability, bowed paw contact, leaf intersections and translucent surface sorting. Node geometry tests cannot establish their visual quality.

## Implementation and checkpoint order

A1 (this): baseline refs/hashes, source analysis, issue inventory, QA prerequisites; runner reliability correction only. Product geometry unchanged.

A2: shared garment/collar/placket/cuff/sole/backpack parts; continuous hair-cap/lock mechanism; species/stage quadruped silhouette/markings and bow/sit pose.
A3: coherent insect frame, parameterized wing-cell/vein markings; folded pod and anchored suspension; rosette root/layer parameters; six airy seed puffs with bounded cost.
A4: cluster unit shape/face variation; existing multi-face registration for child; cap/gill/base profiles; contour/arm modifiers and positioned bubbles.
A5: canonical stage normal-face choices, eye/mouth/cheek scale, deterministic gallery idle/walk samples, reduced-motion and reaction checks.
A6: same-input baseline/revised 1/5/27 actor measurements, Meguru and protected regressions, fresh read-only lane audit.
A7: synchronized original/Claude/revised gallery, immutable before, per-stage four views + original/Claude/Meguru, issue closeups and performance table. Stop for Human QA; do not self-approve adoption.

Use shared mechanisms only where shapes actually repeat. No per-species model functions, new gameplay state, new emotion vocabulary or unrelated World changes.

## QA and measurement requirements

Render original/Claude/revised at equal art-box size, camera/elevation, light, background, normal expression and sampled time. Preserve the pre-pass source SHA and record the revised SHA. Baseline images must not silently change when rebuilding revised output.

Minimum: all 26 stages (01/04/08 plus 05 chrysalis and 06 flower), four directions; canonical five emotions and idle/walk; companion shiba/cat reuse; all 8 pilots inside Meguru. Human QA defects each get individual before/after crop. Dandelion puff/fungus child checks cover every face in all five emotions.

Measure 1/5/27 with the same seed, actor list, route, viewport, DPR, duration, renderer and browser version. Record draw calls/tris/materials/textures/geometry bytes, cold build sum/max and first-present hitch separately from warmed presenter CPU/JS avg/p95, memory source and frame outliers. A Node triangle count is not a draw-call or iPhone FPS result. Headless SwiftShader is not iPhone GPU performance.

## Environment and validation status

- Initial dedicated baseline: 34/34 PASS on Node v24.19.0 (fresh run).
- Corrected remove-it, isolated worktree, sequential baseline + mutations: 34/34 baseline PASS, all 13 mutations RED, exit 0; product files restored byte-for-byte. See `../qa/character-3d-quality-2026-10-02/remove-it-a1.txt`.
- Geometry-only inventory freshly built all 28 C-mode templates; not a rendered performance measurement.
- Existing image sheets were visually inspected; their old run dates/provenance remain intact.
- Local browser rendering: NOT_RUN. Playwright Chromium executable absent. Official install returned 195-byte text/html instead of the Chrome archive (repeated downloader attempts failed). OS package setup also unavailable. Cloud browser opening the existing jsDelivr gallery returned ERR_BLOCKED_BY_CLIENT. No iPhone or new screenshot pass claimed.
- Investigate the repository's existing Actions browser environment as a separate authorized QA execution path; do not bypass network controls.
- One full-suite attempt overlapped the original mutation runner; that attempt is invalid as a clean baseline regardless of final totals. Only a later clean, sequential run may be reported.

## Cross-lane read-only audit at A1

Exact refs and merge-tree outputs: `../qa/character-3d-quality-2026-10-02/conflicts-a1.json`.

| Lane | Mechanical conflicts vs Character source | Semantic integration obligations (not merged) |
|---|---|---|
| #368 `d239e20` | roadmap doc, index.html, meguru-3d.mjs, package.json | New PNG decode/bitmap/fallback path must coexist with 3D selection. Preserve `a.expr.emotion` and actor-only fallback; Character's older texture path must not overwrite this work. |
| #367 `32e3320` | index.html | All-region support is absent from Character; no runtime integration claim. |
| #369 `cbafd67` | index.html, meguru-3d.mjs, package.json | `billboardVisible(pm)` is not a valid visibility test when Character intentionally hides player billboard; test actual 3D holder. |
| #371 `69a8857` | index.html, meguru-3d.mjs, package.json | Inherits Foundation visibility issue; lighting changes require a separate visual comparison at future integration. |
| Geometry/Terrain `7610696` | index.html, meguru-3d.mjs, package.json | Inherits billboard visibility issue; future terrain/ground placement and occlusion must use world contract rather than a Character-owned terrain copy. Not tested in combination. |

This is an initial audit, not the required final post-revision audit. Fresh-read again at A6/A7. No branch was merged into Character.


## A2 candidate checkpoint (not visual approval)

The Actions route installed Chromium and successfully rendered the unchanged Claude sheets. Its Meguru run is pending at this checkpoint. Local browser remains unavailable.

Initial candidates: continuous open scalp cap/overlapping hair locks; jacket/cardigan shirt, collar/lapel, placket/buttons, cuff/hem and sole geometry merged into existing bones; dog04 bow-to-walk blend and raised tail; compact seated shiba with broad cheeks and thicker curl. Three already-proven A3/A4 structural defects were fixed alongside test preparation: six puffs, child face registration through existing multiFace, and bubble translation.

QA additions: immutable Claude modules under the QA document directory, with original/relocated hashes; gallery `revision=claude` loads them only for QA; `compare.html` provides original/before/revised controls. The game imports no baseline code. Fixed-time gallery sampling now resets time/phase/moving state every frame and exposes a live items accessor.

Validation at candidate checkpoint: 34 existing + 5 new Node tests PASS (39/39). New mechanisms first failed in the source baseline (5/5 RED); removal probes now detect all 5/5 and restore exact bytes. Source production 2D/Expression/Motion assets remain unchanged. Visual comparison of these candidates is PENDING; A2 is not complete, A3–A7 remain incomplete.

## A3/A4 geometry candidate checkpoint (not visual approval)

A1 Actions run 36962551871 succeeded including Chromium rendering and Meguru 1/5/27 actor measurement. A2 comparison rendering has succeeded; its final artifact is pending. These are software-GPU measurements, not iPhone measurements.

Candidates now add a reusable closed outline loft for the larval starfish, vertical butterfly abdomen and attached wing roots, merged wing veins, chrysalis fold/seam geometry, layered rosette origins, rounded flower petals, varied spore outlines/highlights, six thin-filament seed halos, mushroom underside ribs and rounded ground stones. All use existing archetypes/bones and merged geometry. Dense endpoint spheres on fluffy halos exceeded the template budget and were removed before saving.

Validation: original 34 plus 7 quality tests PASS (41/41); two new tests first failed before implementation. All 7 removal probes detect their intended failures and restore source bytes. Image review of these candidates remains pending. No iPhone performance or Human QA approval is claimed.

## A5 resume / image-led refinement candidate

Fresh remote 2026-10-02: Character a1bccfa21167e67174322299013cb535c8380292, tree 3e8e04cb660191d0feee5a87c577f68accee2233. Another session merged Motion L2 main into this branch. This session did not perform that merge and preserves the fresh remote. PR remains open Draft, currently mergeable=false; no conflict resolution or further merge authorized here.

Workspace maintenance removed the previous clone; restored fresh remote. Uncommitted edits were reconstructed from the visible session record, not treated as a new authority. A3 evidence run 36964144924 passed all three CI jobs (quality, Runtime, Home). Its images show remaining gaps: forewing/hindwing need distinct lobes; seed puffs still read as solid balls; front hair locks intersect skull.

Correction: A1/A2 described the shiba reference pose as sitting. The actual companion PNG clearly bows. That earlier interpretation is withdrawn. Shiba now uses the shared play-bow posture, with its own compact body, cheek markings and thick curl. Dog04 retains its narrower body and raised tail. The dedicated test now checks the actual reference distinction instead of the mistaken seated expectation.

Refinements: projected front hair locks and wider face layout; stronger bow and front-paw reach; avian bilobed facial mask, larger head, broader flippers and juvenile raised flipper; fuller fish body/fins; four distinct wing lobes; reduced seed-puff cores with thin spherical filaments. The first 48-filament candidate hit 6500 tris and failed the budget; reduced to 42, preserving the original limit. Existing original 34 plus quality 7 tests now PASS, seven mutation probes all RED and restored.

QA correction: previous Meguru per-species fixtures used the harness fallback age table. Browser stage differed (mushroom was actually a non-pilot 2D fallback). Historical PASS is not all-stage 3D coverage. Fixture now uses existing life-stage-profiles.js and checks exact requested stage + live 3D for every pilot stage. Gameplay/save/schema unchanged by this correction.

Quality workflow now listens only to pushes on this Character branch, so evidence can run despite unrelated main conflicts. Read-only contents permission remains; no deploy or merge step. Local Chromium official download still fails (invalid archive); render evidence continues in Actions. A5 visual approval, A6 final performance and A7 Human QA delivery remain pending.

## A6 review corrections and expanded evidence candidate

Independent read-only review found two Important defects in the quality pass: inward winding of the reusable outline loft (positive face lift went into starfish01), and canine play-bow front feet penetrating ground by about 0.24–0.26 model units. Both were reproduced RED. Outline winding now follows contour orientation; shared bow uses leg length, body dimensions and ellipsoid paw support to solve contact. Cubic pose release preserves the existing reduced-motion gait ratio without changing its original test. Added actual transformed-vertex contact assertions, front/back normal assertions and two removal probes.

Latest local dedicated result: original 34 + quality 8 = 42 PASS, zero failures. Quality removal probes: 9/9 intended RED with exact restoration. Original 13-probe script correctly refuses a dirty worktree; run it against the committed source in Actions. An isolated earlier A5 full npm run remains separate; no uncompleted run is claimed green.

Further image-led refinements: broader flat hair locks, pink lower spore colour/eye variations, child mushroom face on the cream stem, deeper lower-lobe notches. No new canonical emotions; cluster variation uses the existing per-face normalEye adapter and existing atlas cache. Atlas cost will be included in the paired measurement.

QA expansion: all 26 player stages have 5-emotion idle/locomotion sheets in both revisions, in addition to normal four-view sheets. Paired performance uses the exact same current world/fixture/browser and swaps only the immutable Claude modules via the QA server; this does not alter the game's module selection. It records startup frame/long-task maxima in addition to existing calls/tris/materials/atlases/template/presenter/heap metrics. Strict 1/5/27 live counts are asserted. Full regression has a separate branch-only read-only CI job. Browser results and final visual review are still pending for this candidate.

### A6 rendered correction and fresh remote (2026-10-02)

The rendered `0c0e90f` sheet exposed partial occlusion of the small mushroom's eyes by its cap. Registration/expression tests alone did not detect this. A new ray-based front/three-quarter eye+mouth visibility test reproduced the defect (8 pass / 1 fail), then passed after lowering the existing child face on the cream stem. Added a mutation that restores the occluded placement: 10/10 quality mutations are detected; original 34 + quality 9 = 43/43 dedicated tests pass locally. Real rerender is required before visual closure.

Before saving, fresh remote advanced to `5de1b49b1ebbb8cbfab913e31cd5336cba49f580` (tree `d216ce812358624aec2ce7323a58fb59b1e27ea8`), an externally authored merge of main Motion v2 completion. This session did not merge main. Adopted that latest remote without altering its Motion/gameplay changes. It changes the World/Motion test context, so the final paired performance and Meguru evidence must be rerun on its descendant rather than re-labelled from the earlier run.

### A7 concurrent Resident Expression integration

Fresh remote advanced again to `d6f5a51cc86daacf70d5ccb8d99c2db1c7cae21c`, tree `1030760bc6d50cf3fa4354ca05381f3cc3e86ef6`. An external session merged main's now-integrated #368 and adapted the Character input boundary to `runtime.actorInfo`. This session did not merge #368 or main and does not undo the fresh remote.

The immutable Claude presenter predates that export. The QA-only baseline HTTP server now appends a re-export of the exact current host adapter (read verbatim from the current runtime); geometry, template builder, presenter and animation remain immutable Claude. No production file or snapshot file is rewritten for this compatibility step. Dedicated HTTP assertions prove unchanged baseline presenter prefix, exact adapter identity, and absence of the virtual endpoint on the normal server. Test first RED, now original 34 + quality 10 = 44 PASS, and 11/11 intended quality mutations detected. Final browser/performance must use this latest World context.

The 54 saved comparison JPGs were rendered from `754e2fa` (after the child-face occlusion correction); all geometry/rig/animation/gallery sources are byte-identical in the new remote. Final World screenshots and paired measurements will be separately pinned to the new integrated source. Split Meguru and measurement artifacts were added to avoid the 32MiB local download ceiling; these are packaging only.


## A7 final evidence (2026-10-03 JST)

Code source `81a7d981a6cee7f7930ec297e79692c44eb382c2`, tree `2a299ec133fe460c4e08f912035be79d705cc1f4`. Actions run `37018225289`: evidence and full regression SUCCESS. Original 34 + quality 10 = 44 PASS; original remove-it 13/13 RED; quality mutations 11/11 intended RED. npm test completed (TAP groups 2907 + 80 PASS, zero failures). Home layout and Runtime smoke also succeeded.

All 26 requested stage fixtures assert exact stage/spec and live 3D in Meguru. All 1/5/27 actor measurements assert exact live count with zero unintended errors/fallbacks. The final-source rerender of 54 comparison JPGs is byte-identical to the previously saved 754e2fa images (including the corrected child mushroom face). Full results, metric limits, original/Claude/revised four-view images, emotion/motion matrices, 52 in-world shots and representative sheets are in the final QA package.

Final read-only conflict audit: main/#368 have no mechanical conflict (externally integrated); #367 has index.html; #369/#371/Terrain have index.html, meguru-3d.mjs, meguru.js, package.json conflicts. No conflict was resolved or branch merged by this session. Draft/merge/rollout restrictions remain. CDN delivery and physical iPhone performance remain unverified. Human decides visual adoption.
