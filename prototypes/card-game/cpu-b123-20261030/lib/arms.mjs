// Experiment arms, fixed before running (see PLAN.md). Each arm changes ONE switch for the named difficulty;
// everything else (manifest, seeds, decks, seat order, the other difficulty) is identical to "base".
// `pairs` limits an arm to the difficulty pairings where it can change anything.
export const ARMS=Object.freeze({
 base:{},                                                        // all switches off = official CPU
 E1:{intermediate:{b1:true}},                                    // B1 for intermediate only (candidate)
 E1b:{beginner:{b1:true},pairs:['BB','BI','IB']},                // B1 for beginner only (comparison)
 E2:{intermediate:{b2:true}},                                    // B2 for intermediate only
 E2b:{beginner:{b2:true},pairs:['BB','BI','IB']},                // B2 for beginner only
 E3:{intermediate:{b3:true}},                                    // B3 for intermediate only
 // Follow-up (PLAN.md 追補計画, approved 2026-10-30). BB pairs are identical to base for intermediate-only switches.
 E4:{intermediate:{b4:true},pairs:['II','BI','IB']},             // B4 (owner's B-2 = #488 P-1) only
 E14:{intermediate:{b1:true,b4:true},pairs:['II','BI','IB']},    // B1 + B4
 // Re-measurement of existing arms with the stall metrics (must reproduce the stored save sha256 exactly).
 baseM:{pairs:['II','BI','IB']},
 E1M:{intermediate:{b1:true},pairs:['II','BI','IB']},
});
