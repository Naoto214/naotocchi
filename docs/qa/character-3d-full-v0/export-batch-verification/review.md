# Export tree batching review

Scope: pending `complete_export` batching change and its new focused test.

Spec verdict: PASS. Quality verdict: PASS.

Critical: 0. Important: 0. Minor: 0.

Tree creation now sends at most 100 existing verified entries per request, starting from the recorded base tree and chaining each returned tree as the next base. It preserves entry order/content and provenance, avoids artifact download/blob recreation, and publishes neither a commit nor a ref. The final expected-head guard runs after the last batch, before any prepared result is written. A failed batch still leaves the previously reviewed non-approved verified-blob checkpoint; partial intermediate trees do not imply success or approval.

The new 205-entry test checks 100/100/5 batch sizes, exact chained bases, final lease-check order, final tree/status and preserved entries. Inspected its old-helper RED (one failure: single 205-entry request) and recorded 22/22 GREEN, including the earlier 21 validation/retry/lease/checkpoint tests. No tests, downloads or remote requests were repeated.
