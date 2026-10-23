# iPhone QA update — 2026-10-23
Scope: PR430 only, keep PR428 dependency, existing 8×8/control geometry and v2 calculation. User authorizes design/implementation/publication without further gates.

Findings: wave logical move is onset-only while 800ms identical area glow persists; water includes row6 while wave only covers3..5; no per-actor movement feedback or blocked reason. Held sprite center changes from y+.56 to y-.45 (1.01cells), much larger than useful lift. E guide/host labels lack causal action.

Choices: A small lift + anchored enlarged body selected. B duplicate upper preview increases clutter; C keeps misleading one-cell shift. Keep numeric head label and floor ring. Wave compare: static arrows insufficient; whole-row flash plus moving foam and per-actor transition selected. Foam is decoration after simultaneous logical onset, not a second collision. Explicit onset indicator and receipt remove ambiguity.

B: one wave-only numeric gate, explicitly labeled 波3. Identical manual/forced rules cannot enforce wave necessity; this Pilot-only gate is a visible additional condition, not a global movement change. Assemble3, position upstream, ride wave through gate, split to1 and rescue. Exhaust all no-wave reachable states using production move/policy; report cap if reached. E remains comparison; owl moves to intro only; official partner octopus is a cooperative host, not canon villain, linked to wave and beam telegraph.

Steps: reproduction + red tests; minimal runtime/stage/render changes; production engine witnesses and no-wave BFS; UI browser inspection at375 and edge cases; regression + independent review; update PR430 and same private Site, verify source/archive/access. No formal assets changed. Future visual plan recorded separately. User instruction section7 is truncated; preserve8×8 as stated elsewhere.
