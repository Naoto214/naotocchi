# Version 8 — initial investigation

Start GitHub #462: b6c16682e0f7a0c069da8cfa055c0ab4004f3db4.
main read: 97551371496225993e93025a7e9817fb1a25cd63.
#426 read: 8ba4ef1cb2030979664589d2e36423f58c4dedbd.
V7 workflow 40873453343: first-page connector returned 30 queued jobs (not a complete 35-job census). Combined legacy status returned an empty list, not success.

Original 320px/one actor measurement: stage 302×380, body 95.4924×111.4078, safe. Landscape: host 567px, stage 515×150, body 112.2×130.9. Bounds.top=Bounds.bottom=138; projected ground z=.9258906526, beyond plaza near edge .92. nearest() has no valid node, so the old solver retains its clamped invalid fallback. This is a genuine terrain failure, not a header displacement. Node regression fails for day/night with those measured bounds.

V8-only adapter gives small households the existing 300px activity floor. CSS holds that floor during viewport callbacks (which clear inline minHeight and can return early from cached layout). No terrain predicate, tests, game rules or original v22 sources changed. Node regression now passes. Browser diagnostics also exposed stale navigation during a 350ms rotation sample; this remains under investigation and is not yet counted as final passing QA.

Capacity: started with 0 bytes available. Verified 27,793 tracked files in old /workspace/scratch/65e64208f0d1/v2/{docs,prototypes}, exact SHA1 vs HEAD, all blobs present locally, no untracked files/symlinks. Used Git sparse-checkout to remove only those verified tracked working copies; retained Git objects, unique assets and other files. Status clean; resulting free capacity 2.7GB. Restore with git sparse-checkout disable in that old worktree when capacity permits.

V8 design: sea B default; B2 comparison only. star-new and lake-new design defaults. Old backgrounds selectable; ten other region selections exactly equal v6. Dedicated beach polygons keep feet above the waterline. Asset generated with built-in ImageGen, portrait 1024×1536, PNG retained and WebP quality86 for runtime. Existing PNG/WebP untouched.
