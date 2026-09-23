# God original-art independent review — 2026-09-23

Reviewer: phoenix_review (continuing independent reviewer). Scope: eight new god original images only. Existing 1920 expression images were not visually re-audited. No generation, production PNG edits or code changes were performed.

## Evidence actually inspected

Read current three-class rules in docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md:153–164. Read god stage definitions in character-world-master.v1.js and script.js, plus all eight god growth texts in script.js. Opened each assets/characters/god/01.png through 08.png individually with view_image at native resolution, then each corresponding god-inspect/0N-6x.png individually. No contact-sheet-only acceptance.

## Independent classification result

All eight stages contain a single living/game character with one face. A/B/C multi-component categories are not applicable; no new ambiguous case requires user clarification. The stage08 transformation is directly supported by the established growth description: 顔がもう太陽になっている。とくに説明はない。 Staff globes, halos, light rays, stars and sparks are nonliving accessories/light. Do not add expressions or faces to them.

| Stage | Name | Classification and evidence |
| --- | --- | --- |
| 01 | 光の粒 | Single — One round luminous body and one two-eye face. Gold droplets/sparks above it are light decoration, without facial anatomy. |
| 02 | 光の子 | Single — One floating child-spirit with one face, small attached wings/arms and a tapering body. Separate halo is a light ring; growth text explicitly describes wings emerging. |
| 03 | 小さな精霊 | Single — One white-haired child with one face (one eye winking), two attached wings, arms and legs. Halo and white-gold clothing are nonliving accessories. |
| 04 | 見習いかみさま | Single — One standing white-haired child with one two-eye face, attached wings and held staff. Golden staff globe, halo and garment ornaments have no faces. |
| 05 | かみさま | Single — One long-haired robed adult-like individual with a single face, large connected wings, arms and feet. Blue staff orb is a reflective gem, not a separate creature; halo/garment details are objects/light. |
| 06 | 大いなるかみさま | Single — One floating white-haired individual with two smiling eyes in one face. Wings attach to the same body. Blue staff orb, multiple halo arcs and surrounding four-point stars are accessories/light, not living members. |
| 07 | 神々しい光 | Single — One central face and upper body with attached wings; flowing lower robes/ribbons or luminous extensions remain the same figure. Surrounding stars/blue-gold sparks and halo do not have faces. No companion individual. |
| 08 | 光そのもの | Single — One central round sun-like face/body. Ring, rays, wing-shaped radiance and peripheral stars have no separate faces. Script explicitly says the face has become the sun, confirming this is the same grown character rather than a held object or a second individual. |

## Recommended face anchors

Source coordinates on the 128×128 PNG: [faceX, faceY, xmin, xmax]. The first two values center the facial expression region; the horizontal limits bracket head/hair or central round body and exclude separate staff/halos. These are suggestions for later collision-aware mark placement; composite overlays have not yet been reviewed.

| Stage | Anchor | Source SHA-256 |
| --- | --- | --- |
| 01 | [66, 68, 43, 85] | `3e9ba7ff83036637beab953d84d321b13f13ae6e2e0cef4fab8a4d2adcb46ca5` |
| 02 | [72, 66, 48, 85] | `47f4bd18d29ab15c8977776f05d2a7fdf22183c6b3a69020c8953fe80c38cf68` |
| 03 | [72, 62, 41, 91] | `68184e0b5f36156281403e1100569088b620f570991319b5daa12216596e39a7` |
| 04 | [68, 58, 36, 91] | `493e5f6866f33750bb2319107df728f3fbf0589b4ab250bc82c0801b1486fdf9` |
| 05 | [65, 42, 46, 80] | `4fb80b48f2c3009044b31f930507aa484d2969efba2b19c0408e960895314c98` |
| 06 | [67, 55, 40, 88] | `10afbe41502067c5fd4244035c8f5845cc695f94ac64eaa2f8b9a25273d1c16a` |
| 07 | [67, 45, 41, 89] | `4f6352b11fe931d3d6b586b45d42e3b3fee1230f4136a8e0a7269b424a651772` |
| 08 | [65, 76, 41, 90] | `1a3ad9b9fc3adf621f67c421b4af1c541c9d9286db207b06f7230c6f2fa17f89` |

## Production / final-review points

Preserve stage-specific bodies and age, wing count and attachment, hands/feet, clothing, staff shape and blue/gold orb, halos, star/ray arrangements and original palette. Stage03 wink is one of two existing eye positions; opening it does not add an eye. Stage05 face is small relative to broad wings/staff; expression intensity can be subtle. Stages06–08 have surrounding stars and halo arcs that the final-alpha collision check must include. Stage08 changes the existing central sun face only; ring/rays remain connected/decorative structure and the detached stars remain light. Never bake state marks/sweat into PNGs. Fine outline variation must be recorded honestly; final PNG visual review and mark-composite acceptance remain separate steps.
