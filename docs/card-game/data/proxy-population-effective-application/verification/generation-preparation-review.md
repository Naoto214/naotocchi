# Generation preparation independent review

Critical0 / Important1 found and resolved / Minor0. Reviewer: review474_bundle. No edits, tests or actual OS sampling by reviewer.

Initial entry lacked fsync of the parent directory after creating the output directory, so a crash could lose the entire journal directory before entropy was read. During review the parent fsync/close before any sampling was added and the reviewer confirmed the correction. A dedicated regression subsequently demonstrates failure against the pre-fix variant and success after restoration; it intercepts the first OS-read function call and raises before returning any bytes. It creates only temporary synthetic metadata, no material/manifest/completion.

Request fsync -> read -> return fsync -> Cursor consumption, exclusive creation, no automatic resume/redraw, fixed200 Cursor and existing builder, and before/after edition verification are retained. Approval-reference text is not authority. Provenance/publication/input-lock/execution remain unverified. Journal tests use historical115 bytes/zero roots with one synthetic group; builder's separate in-memory200 fixture is not an independent sample. Real OS sampling and actual400 generation/execution:0.
