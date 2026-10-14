# Scoped expansion review

Independent reviewer identified: private search logs revealed all inspected cards; chain target labels leaked traps; reversi expired at challenge rather than turn; companion-effect history was absent; facedown setup satisfied faceup-play requirements.

All five were fixed in shared contracts. RED tests observed privacy/faceup failures before correction. Follow-up review confirmed these fixes and found two narrower regressions: explicitly public searches needed revealInspected, and spectator views needed both seats redacted. Both corrected and regression tests added. No broad audit or strategy proof performed.

196 explicit execution registrations are not a claim of exhaustive individual or combination validation. Remaining IDs are blocked from deck construction. Legacy15 is retained via versioned restore.

Scoped activation-cost review found automatic reservation execution incorrectly counted as a new companion effect. A RED reproduction was captured and corrected by marking scheduled execution separately. Costs remain paid before response, and private hand-bottom payments are not logged by name.
