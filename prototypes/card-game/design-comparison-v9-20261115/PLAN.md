# VERSION 9 — implementation plan

Base: PR #551 at 7fdd900fc59847fc982fefac01b8a039bcbfa51e. Independent prototype only.

1. Reuse V8 normal renderer, source data, official assets and unchanged battle runtime. Keep V1–8 byte-for-byte.
2. Add a readable, unbounded cream detail card containing exact effects. Compare normal/detail, marks, egg, back and cropping. Preserve action controls in the battle lab.
3. Separate rarity UI from explicit ID-based deck-limit metadata. Keep current limits; test independence from rarity flags.
4. Present all 19 naming differences. Offer four conservative shared-name candidates in display-only mode; retain 15 card-specific candidates for individual decisions. Default to current formal names. Do not change IDs, source records or search compatibility.
5. Verify 459 cards + egg, 14 colors, additional seven, 320/375/390/430 widths, collection/hand/board/detail and selection/flip/actions. Document actual browser limits.
6. Review, save only V9 files to the existing Draft PR and publish the existing owner-private Site under /v9/.
