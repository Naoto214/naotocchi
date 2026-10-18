# なおぽよ：進化卵報酬と08レース検証

Authority: user specification 2026-10-14. Baseline HEAD 5ffa4999bd5b0d0d184aa2b31c0fabdaf9897594 / tree7d3891a8d224bc81c98dc9965307444c1b46ef1c; main095fe36f1d752635ab20c0e330cef7a932a13d28. Draft380 open/unmerged, full isolated task clone, clean. Baseline85/85 PASS.

## Approved change and boundaries
Standard rules award one egg per actual evolution event ending04/05/06/07, rank0/1/2/3; egg birth stages remain01/02/03/04. Skipped stages give only the final reward. Each wave/event independently awards. No new death reward; old death mode retained explicitly for comparisons and missing-field historical logs. No save/schema or outside-prototype changes. Existing images/roster/touch/endless game-over preserved. Standard UI stays endless; no race UI or online facilities.

## Experimental race contract (not a formal game ruling)
Reuse complete legal traces of two independent same-seed sessions. Validate identical initial board, resources, rules and bag/selected species. Primary comparison clock: committed actions (each pair placement/tool confirmation is one action). Optional alternative clock: pair slots (a drop and subsequent tools share a slot); report sensitivity separately. Wave order within an action matters; no elapsed human time is inferred. First death wins; simultaneous death at the same clock/wave is experimental draw, not processing-order priority. If no death, scores decide only when both sides have actually ended. Limits produce unresolved/censored, never a score win. If one board ends first, the other can continue; this is an explicit candidate, not online elimination. No change to endless session.over.

## Implementation plan (inline execution, user authorized through save)
- [x] TDD engine: add optional eggReward=evolution/death; omit field for legacy configuration to preserve archived hash and complete-rules contract; standard default evolution. Test final-stage mapping, simultaneous groups, repeated waves, all four sources, non-reward08/death, overflow, invalid/preview/stale use. Keep death tests explicit.
- [x] TDD UI: apply all event egg deltas at displayed evolution phase, separate death text, expose reward rule only in existing lab controls, nameなおぽよ and concise04–07 hint; rebuild standalone.
- [x] TDD separate race/replay reducer: legal logs and identical starting conditions; action/wave and slot/wave comparisons, same-clock draw, fallback score only both ended, censored unresolved. No runtime integration.
- [x] Fixed comparison edition: seeds104..135 (32), old/new × drop-only/active-eggs/reserve-eggs (6 conditions,192 trials), gauge8/24, empty board/resources, max500 drops/5000 actions, max8 consecutive tools (measurement cap, count hits); same deterministic public-information strategic policy,2-action beam for high stages. Keep full actions and initial rules. Record supply/spend/time series, true egg ancestry,08/death/first occurrence, survival/censoring/chains/gauge/stock/potential. No wall-time-to-human conversion. Policy choice frozen before population run; any adaptive extension gets separate edition.
- [x] Verify replay and metrics, targeted mutations, dedicated+DOM+root suite+available Chromium QA; independent review; safe commits/nonforce saves, fresh PR/head/tree/clean.

## Review focus
Historical absent reward field must remain death semantics without changing hashes. Replay must not award twice. UI animated inventory must follow all reward events. Race must not label capped runs as losses or infer human speed. Growing egg supply must not incentivize tool loops; track weighted potential and cap/censoring.

Ruling: user explicitly authorized implementation/measurement/save; do not ask for duplicate plan permission. Match detailed rules provisionally only in independent comparison. Cost if clock choice wrong: re-adjudicate stored legal traces, no game-rule migration.
