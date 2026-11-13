# VERSION 11 Implementation Plan

Goal: preserve V10 C as A; compare optimized +15/20/25/30% B–E with the user's supplied specification as authority.
Architecture: additive v11 renderer wraps v10 C and replaces only main number groups. Raster art, effects, ticks, subdials and hands are immutable. Existing files remain byte-identical. Site root redirect alone changes in the separate hosting repository.
Tech stack: existing SVG/ES modules; sharp evidence rasterization; Python/SciPy pixel clearance audit; existing browser preview.

1. Test the A identity and B–E sizes 46/48/50/52 against V9 B=40; strip main groups and assert all remaining SVG identical through existing states.
2. Inspect glyph metrics, preserve Georgia/serif regular silver, request lining numerals, center visible ink and optimize radius with actual contours. Record any font limitations, corrections, and unresolved margins. No destructive artwork edits.
3. Add five-way synchronized page, 10–12 crops, 1/2/3/6/8/10 comparison, clearance overlay and data, before/after, phone widths, unchanged controls.
4. Run V6–V11 checks; byte-compare V6–V10; inspect raster sheets and live UI. Browser iframe viewport QA at 320/375/390/430 portrait/landscape. Report Safari as unverified.
5. Review, commit and push only existing PR branch; sync verified files to existing private Site; deploy and report exact refs/status.

Review focus: A equality, two-digit tick collision, fallback font differences, iframe overflow, synchronized controls and zero/100 endpoints.
