# 人生の時計 V18

User instruction: preserve V17 A, remove exterior white square, make only hands 3/4/5 silver, add horizontal swipe front/back rotation and silver back with NAOTOCCHI / LIFE CLOCK / small sprout. Save to Draft #501 and publish owner-only. Do not merge or change Pages/rules/save format/CPU pause lifecycle.

Implementation choice: retain all adopted renderer and raster bytes. Apply geometry clipping to plate image layers behind the existing bezel, and render a separate transparent SVG contact shadow. Avoid color-keying or regenerating the artwork. V18 wrapper changes only small-hand materials. Back is SVG with restrained brushed silver and engraved lettering.

Interaction choice: CSS preserve-3d front/back, horizontal one-pointer swipe in whole view, explicit flip button for keyboard and zoomed view. Zoomed swipes pan; vertical gestures scroll; multi-touch/cancel aborts flipping. Reduced motion switches immediately. View state never enters game state or persistence.

Alternatives: editing raster alpha risks silver pixels and provenance; regenerating artwork risks accepted design drift. Geometry compositing preserves original source and provides exact boundaries behind the bezel.

Verification: compare adopted assets and protected SVG groups/central hands, all six angles over 324 states, swipe cancellation/direction/zoom/lifecycle, CPU save bytes and resume, full CARD GAME tests, responsive browser QA where available. iPhone Safari actual-device checks remain user evaluation.
