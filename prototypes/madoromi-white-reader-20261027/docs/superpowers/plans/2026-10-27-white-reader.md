# 白い装丁・挿絵なし読書版 Implementation Plan

User's full handoff is the approved spec; intermediate approvals explicitly waived.
Goal: immutable revised manuscript, white typographic cover, horizontal B reader.
Architecture: retain canonical records and all archived assets; replace only entry HTML and use isolated final CSS/JS. Existing comparison pages retain their dependencies.

- [ ] Verify PDF + exactly two approved edits against canonical JSON; freeze all existing images and source bytes.
- [ ] Remove illustrations and edition label from index; preserve all 393 chapter records (395 minus cover's two metadata records), original IDs and source linefeeds.
- [ ] Add final CSS (#F7F5F0, title #414C50, Mincho, B 16.5px/1.8, no indent/pretty); typography-only cover, chapter navigation, unobtrusive toolbar.
- [ ] Preserve size preferences and paragraph-relative position across resizing, reload, hash navigation and browser back.
- [ ] Validate 320/375/390/430 at 16/16.5/19/21px, rotation, menu and source equality in Chromium; capture cover and prose.
- [ ] Preserve archive bytes, save independent GitHub branch, deploy existing owner-only Site; no GitHub main/Pages changes.

Review focus: reloading with chapter hash; back from another page; font change near chapter boundary; small landscape height; storage unavailable.
