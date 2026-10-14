# Naopoyo integration QA — 2026-10-14

Product HEAD: 369c8cd1cc431da445fbe601a27890776762b502
Product tree: 97d9a836daf44fbcf023aab1bbf9c843aa55892a

Local dedicated130, DOM6, targeted mutation50/50, root3144 + relationship80, Quick15: all PASS, failure/skip0.
Four portrait sizes and actual main-menu navigation verified. Independent review found restored roster mapping mismatch after main dex expansion; fixed with browser RED→GREEN. Original rule engine and comparison evidence unchanged.

Archive: evidence.tar.gz (643208 bytes)
SHA-256: c2a39502b48e6b5dda1757d755e0cf3ce91ca264b6d8300d70bca1af36b63462
35 logs/screenshots. Expected RED logs are retained as regression-test provenance. Latest green evidence is in dedicated-final.log, root-regression.log, integration-browser.log and player-*-final.log.

At this checkpoint Naopoyo CI38535350736 succeeded; Runtime38535350789 and Home38535350691 are running. PR380 remains unmerged pending both. Hardware Safari, audio production and final balance approval remain pending. Final merge/deployment status will be added here after verification.
