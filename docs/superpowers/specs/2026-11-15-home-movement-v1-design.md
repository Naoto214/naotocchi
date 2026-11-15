# Home movement V1 — approved scope

The user approved on 2026-11-15 computing safe movement limits from each character and attachment's painted extent, and waived further design approval. Reference: five iPhone screenshots (city/night, hermit crab with toilet-paper accessory, panda/seal companions, gorilla partner). Static screenshots do not establish CSS viewport dimensions or exact animation phase.

Preserve sprite/image dimensions, depth behavior, UI, permanent 76px speech lane, 52 backgrounds, saves, attendance (maximum 28), selection, drag and autonomous movement. Never merge main or deploy the production game. Deliver an independent Draft PR and a new owner-only A/B Site.

Current constraints compose: alpha-based body foot coordinates; attachment rectangles +6; model margins +12/+18; terrain polygon/exclusions; presentation fitting shared across residents. Camera transforms and body scaling are separate. Expanding model coordinates without stabilizing presentation can negate the gain.

Approach: retain the existing camera fit as the size/position reference, then calculate individual safe foot ranges in that fixed presentation from painted envelopes. Use both directional body motion and attachment extents, with asymmetric left/right clearance when justified. Retain terrain and foreground visibility checks; do not blindly remove authored obstacles. Both drag and autonomous movement must use the shared model bounds. Conservative fallback on invalid/missing geometry. Do not use instantaneous animation bounds to change movement limits every frame.

Alternatives rejected: reducing global margins alone cannot address the composite limits; shrinking sprites violates the user's explicit constraint; claiming all apparent blank speech space is available ignores long speech.

Verification: baseline versus candidate at widths 320/375/390/430 and short/tall heights, item on/off, speech/notice on/off, crab stages seen in screenshots, seal, multiple residents, actual model routes and browser pointers where available. Report physical iPhone limitations separately from browser emulation. Debug overlays must not intercept input or be in production entries.
