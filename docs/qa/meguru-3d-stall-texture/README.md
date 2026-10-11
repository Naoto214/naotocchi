# City stall texture — approved A (2026-10-11)

Baseline:26778f69a791983da7618ae0bf73ae6719b44b56.
Six city stalls:336,340,348,524,556,557. Preserve counter/posts/basic form/dimensions/placement/collision. Cream canopy with restrained muted-green fabric edges; shallow counter plank joints. One common design, no merchandise or extra decoration. Existing static primitives only. Front/oblique/normal-play-distance comparisons and related/existing regression required. Implementation and QA pending. Waterwheel/tree interference, Human QA and physical iPhone performance remain OPEN; World incomplete.

Candidate: original canopy volume partitioned into cream21-unit center and two muted-green2-unit edges; no overlapping surface overlays. Counter2-unit top partitioned into1.8-unit support plus three0.2-unit planks with two0.18-unit joints. Base/posts unchanged; no other objects/descriptors changed. Existing geometry/materials only; +5parts/+60triangles per stall, theoretical +360triangles across six (actual visible cost pending).

VQ-29 RED: expected missing three-panel cloth treatment; then related71PASS/0FAIL/exit0. Existing Node module-type warning retained. All13region world2d/canonical3d/collision/object-count hashes match. Descriptor diff is exactly six IDs; base/posts and remaining object metadata identical. Independent read-only review: no Critical/Important issues; transforms/grounding/abutting geometry checked. Rendered appearance remains pending.

CI recipe: baseline26778f6, six front + six oblique gallery comparisons, six normal-play views with lateral player offset95 to reduce party occlusion. Gallery actor-free/static, not gameplay performance evidence. Actual normal camera distance comes from logs. Human QA/iPhone remain unapproved.
