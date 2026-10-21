# Automatic output binding review

Read-only independent review, /root/review474_bundle. Critical0 / Important1 / Minor0.

I1: native new_envelopes absent/empty paths only checked exported hash consistency, permitting runtime.ability_uses modification followed by rehashing while native snapshots stayed unchanged. Dedicated test reproduced RED. Reconstruct all envelopes from source/native snapshots using existing state.advance, then compare exact output. Reviewer confirmed static fix; no open finding. Dedicated/ordinary9PASS and frozen-copy full20turn related27PASS.

An earlier26-test related invocation failed one source-fingerprint guard because the test/source files were being updated during reconstruction. It is not a pass. The complete log is retained as automatic-binding-related.txt; final unchanged checkout validation is automatic-binding-final.txt (27PASS).

Scope is structural native-output/export binding, not dispatch predicates, legality/effect semantics, rule completeness or balance admission.
