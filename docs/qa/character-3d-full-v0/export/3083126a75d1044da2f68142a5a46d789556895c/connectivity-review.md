# Ten-mammal actual four-view and connectivity review

Render source: `3083126a75d1044da2f68142a5a46d789556895c`.
Evidence directory: `docs/qa/character-3d-full-v0/export/3083126a75d1044da2f68142a5a46d789556895c/ten-mammals/`.
The controller reports all 601 raw-image hashes verified. This reviewer inspected all ten actual `companion-<id>-views.jpg` boards and the eight individual `companion-<id>-0-34.jpg` images listed below; no rerender or 32-state/distance sweep was performed. Root owns those remaining state/distance checks.

## Verdicts

- **Spec review: FAIL for the batch's physical connected-limb/held-prop requirement.** Closed meshes and bone ownership do not establish a physical attachment. Six roles have clear detached components in actual archived views, confirmed by independent continuous-volume checks. Hamster additionally has a very small geometric hand/cheek gap.
- **Quality review: FAIL pending localized candidate corrections and fresh image gates.** Earlier code-only review PASS did not close the image gate and is superseded on connectivity by these actual image/geometry findings.
- **Critical:** None.
- **Important:** Findings 1–7 below. Six are clear image-gate rejects; hamster is a much smaller physical-quality failure, distinguished from the obvious rendered gaps.
- **Minor:** No additional finding requiring a change was identified in this scoped review.

Panda, sheep and seal have no confirmed defect from this four-view/connectivity review. This is not a full image PASS: their 32-state/two-distance review belongs to the controller. No approved earlier family was edited or reviewed for replacement.

## Exact findings

All image filenames below are relative to the evidence directory.

1. **Rabbit — REJECT: both raised forearms are detached.** `companion-rabbit_friend-views.jpg` and `companion-rabbit_friend-0-34.jpg` show a clear background gap at the raised screen-left forepaw. Both forearm volumes are disjoint from torso, skull and muzzle; their nearest core Qmin values are 1.44565463 (armL/skull) and 1.24343519 (armR/skull), with torso Qmin 1.58778645 and 1.50775185. No shoulder/leg connector exists. Source-raised forepaws must remain physically joined.

2. **Tanuki — REJECT: both forearms and the held leaf float.** `companion-tanuki-views.jpg` and `companion-tanuki-0-34.jpg` show separated hands and a suspended green leaf. Each arm's torso Qmin is 1.33957257 and skull Qmin 1.36121558. The leaf's two volume lobes have closest arm Qmin 1.13263761 and 1.67850383; both are also outside the torso (Qmin 1.72727185 and 1.75948849). The actual produced stem has body-local x interval [-0.06599193, 0.08598708], while left/right arms span [-0.32075987, -0.10924013] / [0.10924013, 0.32075987], so the stem provides no hidden connection. Bone-parent ownership alone does not make this a held leaf.

3. **Squirrel — REJECT: both forearms are detached, although the acorn attaches to the left forearm.** `companion-squirrel-views.jpg` and `companion-squirrel-0-34.jpg` show the hand/acorn assembly separated from the torso/head. Closest core Qmin: 1.32579078 (armL/skull), 1.49961593 (armR/body). Both arms are also outside the muzzle. The acorn intersects the left arm (Qmin 0.18512317 for nut, 0.00294795 for cap), clearing the narrower concern that the nut itself floats; the hand-and-nut assembly still has no shoulder attachment.

4. **Otter — REJECT: forearms are slightly detached and the chest stone is not actually held.** `companion-otter-views.jpg` and `companion-otter-0-34.jpg` place the stone between spatially separated forepaws. Both arms are outside the torso (Qmin 1.04378615). The stone is outside both arms (Qmin 1.99760693 each) and torso (Qmin 1.49706521). It is an owned but floating prop. Preserve the source's diagonal reclining pose and exposed stone while making actual forepaw/prop contact.

5. **Monkey — REJECT: the outward right arm and both feet float.** `companion-monkey-views.jpg` clearly exposes the right arm gap in front/back; `companion-monkey-0-34.jpg` also shows the separate feet. Outward arm Qmin is 1.83113042 against torso, 1.34488785 against skull, and 2.04845091 against the nearest ear. Both foot volumes are outside the torso (Qmin 1.12262873 each), with no intervening legs. The raised left arm intersects skull/ear; that is not the detached outward-arm finding.

6. **Hedgehog — REJECT: front paws and both feet are disconnected.** `companion-hedgehog-views.jpg` and `companion-hedgehog-0-34.jpg` show a background gap at screen-left front paw and below the belly. Forepaw/torso Qmin is 1.10720359; foot/torso Qmin is 1.07016653. Spines cannot act as a hidden attachment: actual body-spine maximum z is 0.14891240, behind forepaw minimum z 0.179999999; body-spine minimum y is -0.17595601, above foot maximum y -0.229999999. Head spines are well above these paws. Preserve the cream face, radial pale-tipped spine identity and small paws while connecting them.

7. **Hamster — Important physical-quality gap; visual gap is much smaller.** `companion-hamster-views.jpg` and `companion-hamster-0-34.jpg` do not show a large obvious detached hand. However, each small forepaw is just outside its nearest cheek (Qmin 1.00306897), and farther outside torso/skull (1.41184645 / 1.63891890). There is no connector. This is a real but very small continuous-volume separation; it should be corrected locally under the hard connected-limb requirement rather than treated as one of the obvious large-gap image failures. Controller retains the remaining image-gate decision.

## Suspicions cleared

- **Panda ears are connected.** `companion-panda-views.jpg` and `companion-panda-0-34.jpg` were inspected. Both source ear volumes intersect the skull, Qmin **0.70962498**. Panda arms and feet also intersect its torso. The projection can suggest a rim gap, but geometry does not support a detached-ear finding.
- **Sheep hooves are connected through wool.** Checking only the core ellipsoid falsely suggests gaps. Both rear/arm hoof volumes intersect actual lower wool lobes (Qmin **0.63468681**); both front foot volumes intersect wool (Qmin **0.96105954**). `companion-sheep-views.jpg` supports the layered source wool and four hooves.
- **Seal flippers are connected.** Both flippers intersect torso, Qmin **0.61598300**. `companion-seal-views.jpg` shows the low spotted body, whiskered head and elevated forked tail. No physical-gap reject was identified here.

## Geometry method and limits

Independent read-only checks first confirmed that all ten current mammal records exactly match the archived render-source records at `3083126a...`, so the numerical findings apply to these images. Checks used actual source ellipsoid sizes, positions and rotations, accounting for body/head transforms, muzzle/cheek/ear unions and sheep wool. For each candidate pair, a convex constrained minimization finds the minimum target-ellipsoid quadratic value over the other solid ellipsoid. Qmin > 1 proves disjoint continuous volumes; Qmin <= 1 establishes overlap. The produced ellipsoid meshes are inscribed faceted approximations, so a positive continuous-volume gap cannot be closed by their faces. Common body pose transforms preserve intersection status. Additional produced-geometry bounds excluded tanuki's stem and hedgehog's spines as alternate connections.

No candidate data, factory, registration, approved prior-family source, or image evidence was changed. No tests, full mutation runs, state/distance sweep, remote operations, or subagents were used. The report is the only written artifact. Corrections should preserve source identity and use localized candidate dimensions/placements or established opt-in geometry, followed by fresh full image review; this review does not request a factory redesign.

## Controller completion and repair handoff

After this review, the controller reports completing all ten four-view reviews and nine full motion boards plus 18 distance images, excluding the already rejected monkey. No additional expression or distance blocker was observed. Combining that controller evidence with the checks above:

| Role | Image/physical decision | Narrow repair interface |
|---|---|---|
| rabbit_friend | REJECT, significant detached forearms | Both arm volumes to torso/shoulder |
| tanuki | REJECT, detached forearms and unheld leaf | Both arm volumes to body; leaf volumes/stem to a forepaw |
| squirrel | REJECT, detached forearms | Both arm volumes to body; preserve existing acorn-to-left-arm overlap |
| hamster | Small geometric contact defect; repair in the same connection batch | Both forepaws to cheek/body with a genuine overlap margin |
| panda | PASS combined controller image gate; no connectivity finding | Preserve unchanged |
| otter | REJECT, unheld stone and arm gaps | Both forepaws to torso and to exposed stone; preserve diagonal recline |
| monkey | REJECT, floating outward arm and feet | Right arm to torso, both feet to body/actual leg volumes; preserve raised palm/curling tail |
| sheep | PASS combined controller image gate; wool connects hooves | Preserve unchanged |
| seal | PASS combined controller image gate; flippers connect torso | Preserve unchanged |
| hedgehog | REJECT, detached forepaws and feet | Both forepaws/feet to body; preserve existing face/spine identity |

Hamster's 0.3% quadratic clearance is not being classified as a significant visible image defect or as a reason to redesign its source appearance. It can be corrected with a small contact adjustment alongside the demonstrated large gaps. No unrelated fidelity changes are requested.

### Produced-mesh proof and reproducibility

`soft-toy.mjs` builds each arm with exactly one `volume(a.size,[0,0,0],...)`, adds that mesh at `[side*a.at[0],a.at[1],a.at[2]]`, and rotates z by `side*a.roll`. These are actual opaque arm meshes; `Rig.add` does not create a joint or skin between parent and child bones. Tail/props and core unions were included/excluded explicitly above. Feet contain a foot ellipsoid plus its separate sole-pad ellipsoid: those pads do not repair the rejected feet. Monkey pad/torso Qmin is **2.12466902**; hedgehog pad/torso Qmin is **1.74278103**. Thus every constituent of those produced foot meshes is outside the body. Monkey tail lies behind the foot z interval and supplies no connector; hedgehog spine bounds exclude hidden connections as described above.

To reproduce any reported pair from the frozen rows, let target ellipsoid be `(rA,cA,RA)` and candidate solid be `(rB,cB,RB)`. Use the same z rotations as the factory. Set `D=diag(1/rA)`, `b=D*RA^T*(cB-cA)`, `A=D*RA^T*RB*diag(rB)`, and minimize `||b+A*u||^2` subject to `||u||<=1`. For an exterior minimum, solve `u=-(A^T*A+lambda*I)^-1*A^T*b`; find positive lambda by bisection until `||u||=1`, then evaluate the objective. For head-owned targets, transform center by `head.at+R(head.roll)*localCenter` and rotation by `R(head.roll)*localRotation`. Sheep must include the actual `bodyWool` ellipsoids; hamster must include the two `cheeks` ellipsoids. Values >1 prove even the continuous enclosing volumes disjoint, which is stronger than testing sparse mesh vertices and therefore also excludes intersection of the actual inscribed produced meshes.

For a repair, establish actual overlap at all changed interfaces with a margin in produced geometry, retain source silhouettes and prop visibility, and rerun the existing state/owner/triangle/default checks plus a fresh image gate. The earlier suites' closure, ground-minimum and owner assertions missed these attachment interfaces; do not treat those assertions alone as proof of a connected character.
