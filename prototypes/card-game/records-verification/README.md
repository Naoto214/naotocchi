# Match records verification — 2026-10-21

Base main: 765c1e827d36ab19ec7be8ea97690f7826b9bbdf (PR #410 merged).

- Dedicated records/model/save tests: 16/16 passed.
- CARD GAME Node suite: 410 tests, 408 passed, 2 existing failures (adopted-color CSS substring assertion; FUN_ITEMS regeneration audit). No new failing tests.
- Records DOM: passed, including completion through actual engine, restore twice without double count, tutorial exclusion, 452 card scope.
- CPU integration DOM: passed; 14 starts, seven strategies/two levels, random/fixed/mydeck, restore and privacy.
- Learning DOM: passed; 15 chapters, nine lessons and save isolation.
- Pages packaging: passed; 4,115 files, 213,876,622 bytes; 1,699 static and 3,007 dynamic references.
- Browser at 390px: dialog has no horizontal overflow (353px client/scroll), five tabs, card artwork/search, B-seat scope and card detail navigation verified. This is not physical iPhone Safari testing.
- Independent review found pending record loss on capacity/corrupt-store failure and duplicate conflicts caused only by different completion clocks. Reproduction tests added and both fixed. Pending-only JSON export added. Actual differing evidence still rejects conflicting IDs.
- UI review fixed nested article styling affecting card artwork.

No large CPU simulation rerun. Engine, policies, card effects/IDs/art, achievement catalog/rewards and main game are unchanged.

Storage is separate localStorage JSON with backup and explicit recovery. Latest 200 rows are shown; all accepted rows are retained for cumulative counters, up to 5,000 matches / 8 MB. At capacity no old data is deleted; new results can be exported separately. Old saves have unknown date/deck ID rather than invented metadata. Imported My Deck libraries may receive new IDs in the pre-existing deck importer; historical deck identities remain separate to avoid false attribution.

Physical iPhone QA: complete beginner/intermediate games, inspect win/draw counts, reload ended save, rename/edit a deck, compare card copies/plays, export to Files and reimport twice, migrate JSON between trial/production origins, test portrait scroll and card details.
