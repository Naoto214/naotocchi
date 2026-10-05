> 2026-10-05: CIは全5job成功。生データと最新報告は [run-c03dc72](../meguru-3d-ci/run-c03dc72/README.md)。以下はproduct保存時の歴史的status。

# World ground planting clearance — in progress

Baseline f7ffdff2951722a272122748750da4c3170a46e6, tree59517d85496bd8ae7e7fb77d6bc88929679eb1fa. Fresh remote/PR confirmed: Draft/open, mergeable/clean, base69a8857b and main0b0a6b30 unchanged.

Build-time shared World descriptor pass moves existing house flower groups and individual shrubs away from low structural boxes. Maximum translation60; tests actual rotated geometry, canonical finite roads, colliders, spots, entrance approach, garden beds and stones before accepting a whole group. Unsafe groups stay unchanged. Raised window flowers remain unchanged. No new objects/parts/materials or per-frame code. No renderer, terrain/grounding, collision, season, save/schema, Character or Expression edits.

All13 canonical2D/3D/collision fingerprints and object/part counts preserved.425plant parts translated in7regions. Ground planting vs ground solid-box footprint observations345→77; these are conservative 2D footprint observations (radius+2), not a screen-quality or terrain-penetration measurement. Residual77 retained, not hidden. Static geometry float4/bury18 and18valid crossings preserved.

Targeted Foundation/ArtDirection/Terrain/Geometry/VQ/cache:84PASS/0FAIL/exit0. VQ13 watched RED then GREEN. VQ14 covers rotated groups, blocked fallback, raised flowers, rigid translation and stable second pass. Full unmodified npm test currently running; no fullGREEN claim. New browser CI/captures pending product push.

Independent review: no Critical/Important. Deferred minor: crown extent can overlap another flower beyond a garden box (home:15 part29, centre23.57 vs combined radii25); inspect image. Synthetic path/spot/garden exclusion edge cases are covered by movement audits but not individual fixtures. Neither minor is called fixed.

User authorization: continue bounded World visual work and meaningful branch commits without intermediate approval. PR374 staysDraft; no main merge/import, Ready or productionPages. AutomatedGREEN is not HumanQA approval. World visual work remains unfinished; iPhone ghost/disappearance/stutter and final depth/composition/beauty remain unapproved.
