# Built-in image_gen provenance

Mode: built-in image_gen, precise-object-edit, transparent_background=true. One call per target, two total; no regeneration. Generated whole sprites were not accepted as candidates because they changed protected areas. Final assembly and exact pixel masks are recorded in tools/antlion08-limited-candidates.cjs and pixel-audit.json.

## strained

Inputs in order: current strained candidate, normal08. Output archived at sources/strained-generated.png. Only the mouth insert is used; generated eyes/body/particles are rejected.

```text
Use case: precise-object-edit. Image 1 is the EDIT TARGET, an existing 128x128 pixel art adult antlion sprite. Image 2 is reference normal same individual. Create ONE subtly revised strained expression: natural 'I don't want this / uncomfortable effort', not a faint smile. Change only tiny existing eyes, eyelids/brow and mouth inside its existing face. Slight pinched tension in eyelids, small clearly downturned or compressed mouth, no upward smile corners. Not anger, not crying, not sleepy or sick or dying, not sulky glaring. Preserve face size and head silhouette. Keep the same pixel art style and original palette. Everything outside the facial features must remain unchanged: entire wings, veins, legs, body, antennae, abdomen, every gold particle and trail position shape count and color. Do not enlarge the head or facial features. Same composition, transparent background, no marks no text no new effects. Do not generate a sheet or multiple alternatives. Output just the single edited sprite.
```

## critical

Inputs in order: current critical, normal08, approved tired. Output archived at sources/critical-generated-reference.png. No generated pixels are used. Original detached fragments were visually selected for alpha-only deletion to enforce exact preservation.

```text
Use case: precise-object-edit. Image 1 is EDIT TARGET existing 128px pixel-art adult antlion critical sprite, images 2 and 3 are particle-distribution references normal and tired. Produce ONE restrained particle-cleanup proposal. ONLY remove a modest selection of the supernumerary tiniest isolated golden speckles in the rear/below-left particle cloud. Retain irregular natural scattering, main large gold flecks, original thin gold trail, asymmetry. Do not regularize spacing or set a count limit. Preserve every surviving particle's original position shape color. No color adjustment or fatigue darkening/desaturation; normal image is the established common gold color reference. DO NOT change face, head, body, legs, antennae, abdomen, wings, veins, main trail. Same pose composition and transparent background, no text no marks. Face and body must not be redesigned. Just a single edited image, not sheet.
```
