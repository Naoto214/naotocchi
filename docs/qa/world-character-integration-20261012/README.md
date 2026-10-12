# PR377 final integration checkpoint

Baseline: de0b38d06a4fec8d7d4e42497b9757996d8f2f7f / tree230c42688f72aa048a86310ce600e8cd12ae79bd. Main249a954f09f70f124eb5e7243283c0fd4f8a4098. PR377 Draft/open; not yet approved by automated gate.

Original nine failures:
1–2. Actual cache integrity defect: meguru.js and meguru-3d.mjs tokens used noncanonical/stale values. Corrected only those two tokens to canonical date/SHA1 formula.
3. Obsolete cp.present(a,ci) literal; now passes groundY explicitly, preserving fallback assertions.
4,6. Old whole-meguru.js hash incorrectly treated approved World integration as forbidden Character changes. Separate reviewed World source hash; original PNG/Expression/runtime fixture retained unchanged. Audit uncovered real unflagged 2D map/toast changes; restored old 2D behavior before accepting baseline.
5. Player source assertion expected inline actorMesh call; current code stores same mesh in pm for visibility diagnosis. Still requires unconditional player presentation, real presenter300frames/frustum tests preserved.
7. Old forest/no-corridor predicate; approved World covers13regions and permitted corridors. Full predicate assertions plus real hybrid routing execution guard force2d/failure/missing/unknown endpoints.
8. Diagnostics now allow explicit QA opt-in as well as perf; default-off and perf UI restriction preserved and behavior-tested.
9. Module template token format failed from issue1; fixed canonical token, test unchanged.

Focused86/86 PASS. Integration9/9, ground3/3, Character13/13 controls detected and source bytes restored. See adjacent logs. Default2D world data13/13 matches main; discovery/map45/45, new mode-protection4/4. See protection/.

Full npm, browser QA and fresh Runtime/Home/World CI still pending at this checkpoint. No merge claim. World existing5jobs reused on integration branch plus combined browser job. Physical iPhone performance NOT_RUN, deferred to postmerge Human QA by user authorization. Shapes of all293Character models, approved Naoto/deer and2D/Expression assets unchanged.
