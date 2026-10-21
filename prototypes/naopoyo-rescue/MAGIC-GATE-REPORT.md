# Magic gates and playable drag A/B — v7

## Baseline / scope
- PR #412, feat/naopoyo-rescue-20261021; starting HEAD eb68d841082299043db57127afdc2a055dadfb65, tree 2078be2a729a42648553dd77254efc86b688fe08.
- Remote main at start: 79d59aece7c91d52387345da737354927df7dc8f. PR Draft/Open. Baseline CI: Pages runtime package and Runtime smoke success; Home layout and World visual quality in progress.
- Changes confined to prototypes/naopoyo-rescue. No merge or production Pages update. Existing owner-only Site and its audience retained.

## Delivered behavior
1. Owl sprites, pedestal, expressions and foreground redraw removed from gameplay. Original owl/playable images and sprite catalog untouched. Unused owl images no longer loaded during gameplay.
2. Centered full-width arched magic gate, two stone jambs, split iron bars, dark central passage. Open passage is visually distinct from gold-star green exits. No new character.
3. Eligible active adjacent actor opens bars immediately with a 220ms subdued flash; after departure bars close over 140ms. Reduced-motion disables flash/closing motion. Animation never controls engine permissions. Existing split child inside a gate may depart; incoming actors are still individually checked.
4. Species icons use alpha crop bounds and up to .50 cell width / .40 cell height, constrained by measured condition glyph width. At 42px, visible icons occupy roughly 16.8–21px maximum extent instead of at most 12.6px. No white background, minimum outline, shared baseline and centered visible bounds. Star arch retains its shape/color/star and reserves the lower band for labels.
5. A/B buttons in actual game. A starts selected on every page load. Both enlarge by 1.4x with bright outline. B moves only sprite and outline up by 10 CSS px (independent of DPR/canvas backing resolution); near the top boundary offset is limited to keep art visible. Foot ring, shadow and level number stay at the real cell. Release immediately removes the offset. Mode is session-only UI state, not part of game saves. Retry gives identical initial placement; switching alone preserves progress.
6. 12 levels and three worlds preserved. Stage text referring to the guardian updated to magic gate; terrain/conditions/actor configuration unchanged.

## Verification
- `node --test prototypes/naopoyo-rescue/tests/*.test.mjs`: **155 pass, 0 fail**.
- New failing-first checks demonstrated missing B offset and small icon bounds; implementation passes actual drawImage geometry checks at 336/390 CSS px and DPR2.
- All 12 saved solutions replay successfully. Additional all-12 A/B replay through movePointer + renderer + release produces identical packed saves in both modes, with valid restore after every drag.
- Existing tests cover 8 directions, species/level/exact/min/max conditions, rejection, nonconsuming passage, split, gravity/support, Undo and restore. Renderer state immutability and no owl draw calls verified.
- 32 playable original PNG hashes match source-manifest. Git diff verifies no original assets, engine/input/store/conditions, solutions, themes or world.css changes.
- Chrome browser, 390px iframe: A and B each clear stage10 in 3 real drags (merge → gate → split → rescue; remaining child exits; fish exits). B Undo restores one actor/2 drags; reload preserves progress and defaults A; retry resets. 42px gate/exit gallery, closed/open condition reactions, all12 worlds including 07/08/10/12 visually inspected.
- Read-only reviewer found no blocking issue; noted intentional top-boundary offset limit.
- Whole-repository `npm test` attempted but could not start: sparse checkout lacks tests/social-expression-integration-test.cjs, tests/relationship-free-life-test.cjs, tests/relationship-free-life-runtime-test.cjs. This is not a full-repository passing result. No unrelated tests or games modified.

## Remaining before formal release
- Owner iPhone Safari: A/B finger occlusion and preference, 07/08/10/12 icon legibility, fast diagonal swipes, top edge, orientation/background/restore, performance. Chrome verification is not physical iPhone QA.
- A remains default pending that comparison. Existing legacy-save terrain and image-error notice limitations unchanged.
- No main merge / production publication authorized.
