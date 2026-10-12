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

## Browser and independent review update
Combined browser24/24 PASS, zero page errors; source SHA256 verified against bfdce764. Raw report began while local HEAD still named de0b38d; source-binding.json pins all six executed source/runner files to the saved bfdce764 tree. Thirteen regional screenshots, individual failure fallback and all-2D screenshots inspected; active actors visibly present at sampled views. Terrain8samples include4bridge crossings and slope; checks both actual3Dholder and textured billboard alignment. Corridor uses production views at5positions; natural input traversal is a separate World CI job.

Independent reviewer found one Important QA gap: media preference alone did not prove application reduced motion. Fixed before bfdce764: require actual cameraMotion=false and Character animLevel=0, with negative controls. Final browser verifies both. No production issue found in 2D restoration. Font fallback boxes observed in headless software screenshot speech only; do not infer an iPhone rendering defect. Pixel coverage is limited to inspected views, not exhaustive occlusion proof. World visibility CI remains separate.

Parent PR367/369/371/374 exact heads are ancestors of bfdce764 (GitHub compare: behind_by0 and merge_base==parent head), so no duplicate merge is needed. Their status will be reconciled only after PR377 successfully merges. Runtime38225349296, Home38225349309, World38225342697 are pending at evidence-save time. No completion/merge claim.

## Full-suite follow-up
The local unmodified npm pipeline completed its first Node batch3126tests:3122PASS/4FAIL; later relationship batch was not reached. Four default2D scenery count fixtures still expected the World3D water level distribution. Restored their main-compatible distribution (L0=184,L1=0,L2=216,L3=71). The explicit3D foundation suite still requires L0=184,L1=17,L2=199,L3=71. Related five suites63/63PASS after correction. This is a test-only follow-up: production and all browser-executed source hashes remain bfdce764-identical. Fresh full Runtime/World regression is required; historical failed runs are not PASS.
