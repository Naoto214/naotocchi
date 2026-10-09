# Telescope declared-material correction

Baseline86daaa0. Saved source69e2684/captures-original.zip gallery-after/prop-telescope.jpg shows the telescope rendered brown despite existing gray barrel and pale-gray tripod colors. The renderer multiplies instance color by its material: raw trunk uses brown, while existing neutralColor selects wtrunk/white wbox. Both telescope taper values (.8/.75) already selected the same trunk mesh (.72 top radius); this fix changes material selection only. No renderer or geometry changes.

21 production telescopes (city1, mountain1, star_stop19),84parts now opt into the existing neutral material. Explicit colors, geometry, transforms, count and placement are unchanged. The meguru.js cache token alone is refreshed. All13region2D/canonical3D/collision/object and part counts match. Removing only the added telescope flags reproduces the exact baseline rendered-descriptor hashes in all13regions; details in protection.json.

VQ-26 RED exit1 for missing neutralColor, then GREEN in the related-suite run. Initial related run:67PASS/1FAIL/exit1 of68. AD-17 failed because sparse checkout excluded the existing docs/qa/meguru-3d-art-direction-v1/compare.html. Restored that exact HEAD file, without modifying it; AD-17 and AD-18 (which also reads it) recheck2PASS/0FAIL/exit0. The original failing log is retained; no claim of a single68PASS run. Existing Node MODULE_TYPELESS_PACKAGE_JSON warnings retained, not addressed by changing package architecture.

Independent read-only review: no Critical/Important/Minor findings. Reviewer confirmed mesh alias identity, white material path and no seasonal recoloring of wtrunk. This is descriptor/source verification; browser comparison and draw calls remain pending until the source CI completes. No fresh unmodified npm test. Existing workflows may run full CI once for this product checkpoint; no repeated same-source full run is requested.

World incomplete; WQ-WHEEL-TREE remains OPEN. No Character3D/Expression/2D/save/collision/season/runtime architecture changes. PR374 Draft/open/unmerged, no Ready/main/Pages changes. Human QA and iPhone performance unapproved.
