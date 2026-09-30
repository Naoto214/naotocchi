# Relationship Home iPhone QA — usage and boundaries

## Human steps
1. Open the dedicated QA Site URL recorded in the result document using the owner's iPhone browser. It is separate from the normal game and owner-private (sign in to the same account if requested).
2. Select a case, wait for 「Homeの準備ができました」, then press 「Homeを見る」.
3. For transition cases press 「遷移を見る」; Home scrolls into view first, then the actual 2.5-second transition starts. Play cases also accept the real Home 「じゃれる」 button once. 「やり直す」 reloads a fresh disposable fixture.
4. Use the parent-page 「QAへ戻る」 button at the upper right to return. This small QA overlay does not enter the iframe's layout calculation; its overlap with the header is not a production layout defect. Home itself retains its normal pan lock.
5. Check expression changes, placement, information density and ordinary controls. Report the case name with a screenshot if anything is technically wrong. Do not reassess image aesthetics or require fine suckers/eye highlights at tiny scale.

## Thirteen cases
| Case | Initial conditions / stimulus | Expected |
|---|---|---|
| クマ：ふつう | affection 50 | normal |
| クマ：うれしい | affection 50, existing Reaction held as a fixed snapshot | held positive, explicitly labelled fixed QA display |
| クマ：さみしい | affection 20 | lonely |
| タコ：ふつう | affection 50 | normal |
| タコ：うれしい | affection 50, same fixed snapshot | positive |
| タコ：さみしい | affection 20 | lonely |
| なかま：たくさん | all 26; nine bond 20, seventeen bond 60 | lonely/normal coexist without new marks |
| じゃれる：通常 | all 26 bond 50, real play action | exactly one representative positive, then normal |
| じゃれる：ひとり救済 | otter 20, clock 60, cat_friend 60 | otter 50 positive then normal; other two 90 remain normal |
| じゃれる：複数救済 | otter 20, clock 25, cat_friend 60 | 50/55/90; otter and clock positive then normal; cat_friend not rescued |
| うれしい後：さみしいへ | bear affection 20; QA injects only an existing temporary Reaction | positive, then lonely at 2500ms |
| 通常Home | bear 50 and all 26 companions 50 | main/partner/companions, conversations, controls, existing animation and layout |

For play transitions, QA supplies a fixed draw only to the production companionPositiveIds resolver; unrelated event randomness is unchanged. The production rule is still one representative PLUS every threshold rescue. Choosing a rescued first companion makes the selective-rescue observation deterministic; it does not introduce a rule prohibiting other healthy representatives in normal play.

For three-state coexistence, use 「なかま：たくさん」 and the existing Home 「きゅうあい」 control: partner positive can coexist with normal/lonely companions. This is an ordinary fixture-local UI action, not a new event.

The return-lonely case is a labelled QA stimulus for expiry re-resolution, not a new player event or proof of a particular court/marriage path. Formation/repair/marriage retain saved Node coverage; this minimal page does not add those UI routes.

## Fixed comparison and heart density
Transition cases offer real live playback plus fixed before / immediately-after / after-expiry phases. Fixed phases reuse the real action but are not lifecycle evidence. Bear/octopus positive remain fixed snapshots.

A/B heart comparison uses the production renderer: A = each positive target when a safe anchor fits; B = one primary positive target. Expression and motion targets never change. 「じゃれる：26体救済比較」 derives all 26 companions at bond20 from the saved dense fixture; live play makes all 26 positive. Compare information density without replaying the whole game.

On normal play, identify one positive companion, its brief inward pulse and the heart above it. A displaced heart has a fine temporary stem pointing to the target. Faces, other characters and conversation must stay readable. Check actual iPhone responsiveness; the outside timing line is diagnostic, not a browser performance certification.

## Reused implementation
- Exact production index.html body/CSS and production scripts/assets.
- Production renderHomeCast, cast-layout.js, relationship-expression.js.
- Base saves come from tests/visual-qa.cjs via the same extraction method as tests/relationship-expression-browser.cjs.
- Generated qa-runtime.js is production script.js plus only a narrow closure export. The builder verifies its insertion anchor. The builder does not edit production script.js; the separate Relationship Reaction changes are part of that production source.
- All original game script tags are inert until localStorage AND sessionStorage are replaced with fresh in-memory stores. Failure stops loading. Parent controls never read/write storage. No fixture uses real user data.
- Autonomous three-second aging interval is frozen only in the QA document. Existing animations and real 2500ms reactions are retained. Fixed snapshots are separately labelled; expiry is paused only there, and actual animations are paused at 450ms. Live mode retains the real clock.
- Cases recreate the iframe so old timers/state cannot leak to another case. Initial savedAt is 0 to avoid boot offline progression while images preload.
- Required relation images preload before game activation; readiness also waits for current cast image decoding. A missing image is an explicit QA error, not a successful load.

## Viewport
Frame uses current device window.innerWidth / innerHeight; controls do not subtract from its height. Width is 100%, no fixed desktop width or scaled screenshot. Resizing updates height and the displayed CSS-pixel dimensions. Reference sizes remain 390x844 and 320x568. Actual Safari layout/touch/pixels are NOT certified by Node tests; this is the purpose of the human check.

## Build / serve elsewhere
From the current branch checkout, with Node/npm dependencies installed:

```sh
npm ci
node --test tests/relationship-home-qa-test.cjs
node tools/relationship-home-qa/build.cjs /tmp/naotocchi-relationship-qa
python3 -m http.server 8080 --bind 0.0.0.0 --directory /tmp/naotocchi-relationship-qa
```

The output directory must be empty. It contains index.html (QA controls), game.html (isolated real Home), qa-runtime.js, qa-bootstrap.js, qa-hook.js, qa-controls.js, unchanged production dependencies/assets and qa-source-manifest.json. Do not publish the repository's unmodified normal game index as the QA root. The local URL pattern is http://<serving-machine-LAN-address>:8080/; this is a pattern, not a claimed deployed URL. iPhone must be able to reach that machine. The dedicated Site avoids these setup steps for the human.

## Publication
Existing repo workflows run main/PR tests and upload artifacts; no branch-preview deploy is configured. Existing cat-expression-preview.cjs demonstrates a separate static Site + in-memory iframe pattern but its approved Site is not overwritten. This task has a new, owner-private dedicated Site. Its manifest/project ID and actual confirmed URL are recorded in the result document. Rebuild from the named code commit, upload through the normal Sites workflow, and preserve its audience.

## Boundaries
No image generation/edit/recompression/rename. Normal 31-series/Naoto assets and resolvers, progression, save schema/migration, bond decay and marriage/date rules are protected. The current authorized change is limited to Relationship positive Home cues, described in relationship-positive-home-reaction-20260930.md. Existing runners/fixtures remain unchanged. No main merge, PR creation or Ready change. Creating this page does not mark Home or Relationship System GREEN.
