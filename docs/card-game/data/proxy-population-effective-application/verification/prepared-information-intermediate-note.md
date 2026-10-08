# Intermediate attempts retained

- prepared-information-final-related.log ended during test3, shell/session exit1, no final unittest summary.
- prepared-information-verified-related.log ended during test5; external wrapper recorded exit1/7.915s. No final unittest summary in that log. These are not PASS; the output truncation cause remains unconfirmed.
- Direct terminal retry with Python -X faulthandler completed: Ran18 tests in8.011s, FAILED(errors=1), exit1. The error was StopIteration in BindingTests.test_native_priority_choice_and_all_seed_coordinates at its normal-step lookup (line44 before correction). This note records the observed tool result, not a reconstructed full stdout log.
- Read-only reconstruction diagnostic: runtime had only2 steps and stop.detail "ordinary entry binding differs: ['normal choice state reference differs']".
- Root cause: existing116 safe-free choice uses literal safe_free_placement_context, not a view hash. That original format is preserved; actual inventory/problem projection binding remains required. Added existing-unit4step assertion to prevent vacuous loops after an early runtime stop.
- Corrected related result is separately saved with explicit exit JSON. No earlier attempt is relabeled successful.
