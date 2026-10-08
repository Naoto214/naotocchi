# Waterwheel axle and side supports — candidate

Base: cf500370365b49b8c7f538c92b009e934cf8844b. World PR374 remains Draft/open; Human QA and iPhone performance unapproved.

Replace the single central upright of both waterwheels with a closed, constant-diameter horizontal log axle and two side posts. Existing renderer geometry is reused: log has an eight-sided constant-radius cylinder, while trunk tapers regardless of taper:1. The ring, six spokes, six paddles, placement, canonical collider, season and runtime architecture stay unchanged. Post centers are13 from the wheel plane, radius2.5; axle half-length15.5/radius3. Posts reach its underside and clear the ten-unit paddle half-depth.

TDD: VQ-25 first failed for one support; the first trunk implementation passed the descriptor test but independent review found a real taper gap. The revised contract failed for the tapered axle, then passed with the existing closed log geometry. Review RED and GREEN logs are retained. No global renderer changes.

The first unmodified npm run was deliberately interrupted (exit130) for the review fix; it is not passing evidence. pre-review logs are historical only. The working-directory error was corrected before the valid review RED. Final-source related67PASS/0FAIL/exit0. Full unmodified npm regression and browser CI are pending at candidate save.

Fresh baseline geometry audit is float4/bury21, not the historical18. The pre-review candidate was also4/21. That observation supersedes no historical result and does not claim the older difference is caused by this change. Final protection and geometry records accompany this candidate.

QA uses existing production runners, eight added in-scene views (four per production wheel), and both wheel gallery targets. CI before source is pinned to cf50037 for matching comparisons. Local Chromium is absent; installation failed downloading a valid archive. Browser evidence must come from CI, not the local attempt.

No Ready/main merge/import/Pages/Character3D/Expression/2D/save/collision/season changes. Automated results do not establish Human QA or World completion.

Final source: 13region protected fingerprints unchanged; exact wheel metadata/ring/spokes/paddles unchanged. Rendered changes are two wheels/+2parts each. Fresh geometry before/after float4/bury21. Independent re-review found no remaining Critical/Important issues; eight narrow mesh-raycast cases passed (not full renderer/browser proof).
