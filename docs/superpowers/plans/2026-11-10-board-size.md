# Stable full-width board implementation plan

Goal: Restore the approved touch board's usable size on iPhone; keep size stable when messages appear.
Architecture: Preserve formal Canvas painter and bounding-rectangle input mapping. In portrait, use available width and normal vertical document flow. In short landscape, allocate a stable viewport-height-limited board beside scrollable content. No physics, assets or level edits.

- [x] Reproduce the height-dependent shrink in real DOM at 320/375/390/430 widths; save the original build for before screenshots.
- [x] Replace the prototype height-feedback sizing and fixed-height layout; keep min 44px controls and safe-area margins.
- [x] Check all 8 book pages and 100 stages at four widths, clear/hint/demo size stability, short landscape and pointer scaling. Save screenshots and measurements.
- [x] Run existing 204 game tests and 21 Pages guards, inspect diff, save to PR535 and update the existing owner-only Site. No main merge or Pages publication.

Validation: 208 Node tests, 21 Pages guards, 432 browser layout cases passed; 4-width before/after screenshots saved. Browser QA caught and fixed min-content width retention and scrollbar-induced width changes. Read-only implementation review found no additional actionable issue. Publication tracked by PR and private Site version.
