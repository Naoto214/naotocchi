# Private preview QA fixtures

`index.html` is installed as `dist/household-qa.html` in the existing owner-private Site, alongside the private `game.html`, runtime files and `pilot-seed.json`. It is not a production entrypoint. `legacy253/` is placed beside it; both historical JS files are exact GitHub #253 head files (271b2330…). The historical page reconstructs layout only, not the complete historical UI.

The v9 comparison uses unchanged f7f192ea script/home-diorama/model/CSS with only the preview save key substituted and HTML URLs prefixed `v9-`. Wait for the official first visit; do not invent event eligibility in the renderer.

Fixtures deliberately overwrite only the trial save after unloading the previous iframe (so its pagehide save cannot overwrite the new fixture). Actual game rendering never generates members.
