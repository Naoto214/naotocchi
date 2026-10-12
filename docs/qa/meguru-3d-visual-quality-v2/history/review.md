# Read-only correction review, 2026-10-03

Range 17c1bdb → b5f302e: no critical issue, two important findings.

1. Vertical house compression put oversized eaves below the 125-unit head envelope,
   despite canonical collision hashes matching. city:542 roof base94.291, radius85.273,
   collider radius38.803, player body radius22. Removed vertical compression; widen
   cottage/single/cabin walls within unchanged lots. VQ-4 observed RED then GREEN.
2. Brown nut/trunk base colors multiplied explicit prop colors. Add neutral instance
   aliases reusing existing geometry and wbox material for colored nuts and only the
   new bicycle/Ferris tubes. Uncolored nuts, flower centers and trees unchanged.

Correction re-review (now dea2f17): both blockers resolved, no additional findings.
Main roof elevation restored; widened wall corners remain within reachable collision
bounds; neutral aliases also work through fade geometry/material lookups.
No merge authorization. The reviewer did not assess iPhone behavior, subjective visual
acceptance, p95/p99 or every prop placement. The executor retains those as open items.

Close-up inspection after corrections: statue head/body share gray, Ferris gray supports
and pale spokes render correctly. Building main roofs remain above head clearance.
