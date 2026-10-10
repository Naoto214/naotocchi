# House / garden / entrance — comparison pending

Product source: `704faac1e62690d9c4dff5e862a0d8d424cefff9`. Before: `dc91d3e9f99c42cc337db9177c0812e91878facb` (product equivalent to `dea2f17`).

**No new VQ3 comparison images were obtained in this recovery session.** Chromium exited before loading the game: `process_singleton_posix.cc(292): socket() failed: Operation not permitted (1)`. A minimal Python socket check independently found AF_UNIX denied with errno 1; AF_INET socket creation succeeded. See [launch log](world-after.log), [job metadata](browser-jobs.json), and [socket diagnostic](socket-diagnostic.json). No browser flags, security controls or game code were changed to evade this restriction. Subsequent browser jobs did not execute.

The prepared reproducible capture scope is:

| Recipe | Scope | Conditions |
|---|---|---|
| [world-recipe.json](world-recipe.json) | 6 home/countryside summer/spring/autumn scenes | unchanged World shot runner; 390 × 844, DPR 2; fixed position/yaw/distance/environment |
| [entrance-recipe.json](entrance-recipe.json) | 3 entrances (home:196, home:45, home:19) in before and after | same recipe both commits; day/sunny/summer |
| [gallery-recipe.json](gallery-recipe.json) | cottage and unchanged farmhouse control | isolated stage 600 × 600; same gallery distances both commits |

The saved [31-scene Claude → lighting → VQ2 comparison](../meguru-3d-visual-quality-v2/compare.md) remains available on GitHub, covering all 13 regions, 9 building families and 11 props. Those historical images have not been relabelled as VQ3. The old VQ3 session's images are missing and are not reconstructed from reported numbers.

Source inspection confirms actual-door anchored routes and cottage porch/roof changes. Image-level improvement, new same-camera draw/triangle counts, smoke, corridor and visibility validation remain pending for `704faac`. Static descriptor equality outside home does not substitute for new browser execution.

See [verification](verification.json), [raw full regression](full.log), [geometry audit](geometry-audit.json) and [continuation](continuation.md). iPhone timing and final beauty remain unapproved.
