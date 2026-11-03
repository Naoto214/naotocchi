# Home art 2.5D — independent comparison

User authorizes the full experiment, code, tests, separate Draft PR and owner-only publication. No adoption or main merge is authorized.
Baseline: PR426 `8ba4ef1cb2030979664589d2e36423f58c4dedbd`; main `85a59bb3de1cfb473485757bfa7a8b6cb9088034`; protected Site `appgprj_6ad9985c831c8191917df5cec1594a69`, version 30.

## Intent
A beautiful small world that pets inhabit naturally. Six independently generated compositions (two per forest/river_lake/city), no previous scenery/reference screenshots supplied to generation. Preserve official 2D PNGs and every game rule. Candidates are experiments, not approved replacements.

## Approaches
1. Retain old perspective camera and impose illustrations upon old ground: cheap but constrains art and mismatches visible surfaces; rejected.
2. A separate image-space navigation adapter implementing the existing navigation interface, reusing the v22 model, renderer controller, actor/attachment pipeline and game: selected by implementer within authorized experiment. Explicit normalized polygons, source-image coordinates, bounded depth scale, and foreground masks. Existing route solver and protagonist escape reservation are reused.
3. Rewrite free life in a new engine: unnecessary regression risk; rejected.

## Art directions
Forest A: ancient moss sanctuary / cinematic painterly realism. Forest B: tree-canopy garden / luminous gouache. Water A: transparent limestone lake / luminous landscape. Water B: waterfall water garden / rich twilight ink-painting. City A: rooftop garden / architectural sunset. City B: intimate wet pedestrian quarter / painted jewel-tone evening.
Candidate choice is provisional and based on readable characters and connected floor, not aesthetics alone. Record narrow routes, high detail and uneven terraces as limitations.

## Isolation and architecture
Add experiment-only modules and a reproducible private build tool. Keep tracked v22 runtime files byte-identical; build transforms only the world-module URL and save-key family. Synthetic comparison fixtures use separate storage, frozen game clock and the same official seed for A/B. Real play retains unmodified game loop and rules. No save imports, wipes or production key reads. Original 3D is kept inside new comparison site for identical-condition A/B.

Source-image polygons define ground and exclusions. Uniform image scale, same transform for painted art, navigation and masks; no independent screen-space guess. Scale .82–1.0 pinned to official foot, existing shadows and z-sort. Foreground occlusion only low peripheral silhouettes; face visibility guard remains. Environment motion uses small bounded accents and stops for reduced motion/hidden pages. Time/season/weather data retained; representative art only, no claim that baked lighting changes into every season.

## Verification
Meaningful geometry and real-model 28-resident escape tests, source protection checks, existing full suite without weakening, browser interaction matrix at 320/375/390/430, 1/6/28, three regions. Same seed/width/time on both renderers. CI Chromium and WebKit; managed browser screenshots. Real iPhone heat/battery/OS suspension are explicitly pending.
