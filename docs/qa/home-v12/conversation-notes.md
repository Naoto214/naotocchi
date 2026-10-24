# Home v12 conversation input audit

## Reproduction and scope

The two existing choice surfaces are different:

- Conversation v2 uses `#speechChoices` inside `#speechSlot`. Its existing click handler calls `conv2Answer`; the selected `choice.reply` is delivered by `conv2Play` after the existing 350 ms delay. `setSpeechBubble` attaches the existing Motion v2 speaker reaction. Normal selection worked in the runtime harness before the change; a missing-reply bug in this path was **not reproduced**.
- `#individualityDialog` is the large dark full-screen panel (`.individual-dialog` in `ui.css`). The supplied `IMG_6896.png` was identified by the integration owner as this exact exchange: `なかまと、ひととき` / `しばいぬが涼しい風に鼻を向けた。` / `いっしょに風を感じる`. This is `shiba-breeze` from existing individuality data, not Conversation v2.

The screenshot's apparent missing outcome has a presentation cause: the exchange handler already applies the existing experience and passes `e.reaction` to `setMessage`, but never shows a result near the choice/cast. Home CSS also hides `#message` while another story/result/birthday notice is visible. The original narrative is `言葉がなくても、気持ちよさが伝わった。`; it is narration, not a new spoken line.

The exchange and age-choice component now adds `home-choice-popup` only when opened on Home and sets `aria-modal=false`. Closing clears the temporary class, restores modal semantics, and returns keyboard focus to the previous connected control. The existing model effects and pause/selection rules remain. UI callbacks carry a presentation serial, so a double click or old button retained after `あとで` cannot apply an abandoned selection. Pointer events and the actual selection click stop before the closing action removes the popup class.

After a successful Home selection, the same original narrative is also placed in an ephemeral `#homeChoiceResult` beside the existing speech bubble for the original 4200 ms message duration. It is not attributed to a character. No reaction animation was defined in the original exchange handler; none is invented. The existing `setMessage`, save and life-log calls remain. Scene changes clear the ephemeral result. The terrain visibility callback allows the Home popup while existing actor/input and gameplay pause guards remain intact.

Confirmed input gaps reproduced before implementation: the v2 container let pointer/click events bubble beyond its UI, and its delegated listener accepted a detached old button when a later question was awaiting a valid index. Its original `awaiting` guard already prevented ordinary repeated answers. The adapter now isolates pointerdown/up/click within Home and verifies that the button is a current visible child before calling the existing answer function. Native click activation remains available to keyboard/assistive input; non-Home event propagation is unchanged.

No question, choice, reply, selection probability, priority, cooldown, timeout, postgame content, save schema, or engine file was changed.

## Presentation contract

- Reuse `#speechChoices` and `.speech-slot.is-asking`, with Home-scoped absolute positioning. Keep all layout dimensions fixed while choices appear/disappear. The existing `role=group` and button elements remain.
- Home CSS must bound the popup, keep its controls above other Home surfaces, and retain at least 44 px touch targets. The preexisting generic `.speech-choice` minimum is 48 px.
- The reply uses the existing `#speechBubble` / `#speechText` and Motion v2. No duplicate result bubble or invented dialogue is needed.
- The screenshot's individuality exchange uses `#individualityDialog.home-choice-popup`, styled by the integration owner as a compact absolute/fixed Home panel, with at least 44 px buttons. Its outcome is the static `#homeChoiceResult.home-choice-result.hidden` element inside `#speechSlot`, `role=status`, `aria-live=polite`; script supplies the original narrative and toggles `hidden`. This is separate from v2 speech and cannot interrupt a conversation engine.
- `#sleepBtn[data-sleeping="true"]` exposes the current sleep state. Text and tooltip now both become `おきる` while asleep and `ねる` while awake. The care atlas only defines the existing sleep icon; CSS owns its presentation. No new wake art was introduced.
- The selected pet label now reads `currentVisualStage().label`, then existing species/stage fallback. This preserves the current visual form and personalized clownfish stage names. The ordinary dog fixture resolves to `大人のいぬ`, replacing the hardcoded `なおとっち`.

## Verification

The first new test run failed all four initial assertions for the intended missing behaviors: input isolation, detached-button rejection, formal pet name, and sleep tooltip/state. After the adapter change, the fixture was corrected to set its Home class after render (the harness's synthetic life-card visibility otherwise clears it). The screenshot-specific tests then failed for missing compact Home presentation and a stale callback applying after `あとで`. A further RED test reproduced the closing click losing ancestor isolation because its action cleared the popup class; the callback now stops propagation before closing.

Final focused command:

```sh
node --test tests/home-v12-conversation-test.cjs tests/individuality-runtime-test.cjs tests/conversation-v2-integration-test.cjs tests/conversation-full-rollout-test.cjs tests/conversation-postgame-test.cjs tests/conversation-quick-test.cjs
```

Result: **69 tests passed, 0 failed**. Includes actual production listener dispatch, exact existing reply beats once, existing Motion v2 speaker reaction, duplicate/stale/expired/scene-hidden inputs, non-Home propagation, all 44 dedicated characters, frequencies, held/cancelled events, normal postgame and quick conversations. Eight new Home tests include the screenshot's exact exchange, existing narrative, expiry, focus return, stale `あとで` callback, age choices and unchanged non-Home modality. The shared harness lacks ancestor bubbling and selector matching; the new test supplies only these DOM mechanics and does not replace production conversation functions.

Full `npm test` was started and interrupted (exit 130) at the integration owner's request while sparse assets were being restored. It is not a full-suite result. The integration owner runs final browser/layout checks and the restored full suite.
