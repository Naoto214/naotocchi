# Facade opening rhythm — implementation checkpoint (Human QA pending)

Baseline65da1f9ae58abd695610c98cfc9c46538af6a625/tree663e6c2fda1945a771eaa324242d07edc4483d36. Shared facade interval derives from the unchanged door x/z anchor and body width. Existing frame/glass/sill/windowbox parts fit inside that interval; narrow walls use one readable window instead of two overlapping sills. Residential glass14→24(max wall-top bound), door height52→58(max h*.55). Barn/shed height grammar preserved. Roof/body footprint, porch/collision/terrain/world/runtime/season unchanged.

VQ15 RED at home:10 (sill intersects door reservation), then GREEN across13regions; positive dimensions, outer wall bounds, eaves bounds, same-row sill gaps. Initial related85PASS/0FAIL/exit0 before bay correction. Final related86PASS/0FAIL/exit0. Staticfloat4/bury18 unchanged. All13canonical2D/3D/collision and objectcounts preserved.93parts removed:home26/city15/countryside22/sea30;7regions rendered descriptors change, six otherregions unchanged. No new shape/material/object/per-frame work.

This improves facade hierarchy, not the underlying narrow house footprint. Actual browser visual comparison and full regression pending; automated tests do not establish beauty, iPhone frame pacing or HumanQA approval. No main merge, Ready, Pages, save/schema, Character3D or ResidentExpression changes.

Independent review found a main window behind the single-family bay cap (home:15). VQ16 reproduced the defect before correction. The shared interval now reserves the bay cap plus4 clearance; when no additional opening fits, the existing bay is the front opening. No bay/roof/body geometry is changed. Bay RED and intermediate failing attempt remain in the raw logs; corrected VQ15/16:2PASS/0FAIL. Re-review: no Critical/Important, minor synthetic extreme-facade fixtures remain absent. Current generated-world positive dimensions are covered.

Full unmodified npm is running on frozen source; its log will be committed only after exit. CI/browser images are pending until this product checkpoint is pushed. No all-regression GREEN or final visual approval yet.
