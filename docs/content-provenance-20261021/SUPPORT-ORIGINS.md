# Support-card origins audit — 2026-10-21

Scope: canonical 452 catalog at main `a037b3a`; every E/I/W card, plus explicit achievement/goal provenance. This is a source-lineage audit, not gameplay equivalence or an illustration audit. Paths and lines refer to this checkout.

## Counts and evidence standard

| Scope | Cards | Origin records | Confirmed | Inferred | Unknown |
|---|---:|---:|---:|---:|---:|
| Events E | 21 | 21 | 21 | 0 | 0 |
| Items I | 26 | 30 | 30 | 0 | 0 |
| Worlds W | 13 | 13 | 13 | 0 | 0 |
| Total | 60 | 64 | 64 | 0 | 0 |

All 60 have an explicit canonical card-text/source-snapshot mapping. A confirmed historical origin does **not** mean the current source retains the card's name, story, or mechanics. Of 64 origin records, 59 are present and 5 have changed names/themes. No card was matched on name alone. `support-origins.json` is a direct card-ID → origins-array object.

For events without their own named master record, `id` preserves the documented source function/constant or age key. The corresponding `name` is the card's descriptive source label, not a claim that the runtime declares an event with that display name. Event `E-naoto` is a non-playable author origin, not a playable species or achievement.

## Current-source changes and historical exclusions

| Card | Historical/card name | Current LEGEND_ENCOUNTERS name | Current evidence |
|---|---|---|---|
| E-gate | そらにうかぶとりい | むこうのまど | script.js:9593 |
| E-stairs | どこにもつながらないかいだん | たまごのないところ | script.js:9598 |
| E-boss | あやまりにきただいおういか | むかしのぼく | script.js:9603 |
| E-lamp | よなかのあかり | 100のむこう | script.js:9608 |
| E-mirror | としをとったじぶん | みているひと | script.js:9613 |

These retain their explicit source IDs, but both name and story/theme changed. Any current card art depicting the former torii/stairs/squid/lamp/mirror motifs is therefore a semantic-mismatch review candidate; no visual asset audit was performed here. They are confirmed historical lineage, not current-content matches. In particular the present `boss` event is not a giant squid apology.

- I-bowtie, I-ribbon, I-scarf retain source IDs once used for ちょうネクタイ, リボン, マフラー. The current cards correctly follow おべんとうばこ, おもちゃばこ, きゅうきゅうばこ. Old names are retained in `data/item-source-20260917.json` `legacy_names`; current definitions are `item-system.js` CATALOG and explicit doc 77 source declarations.
- E-naoto uses the deliberate card display spelling なおと, while `character-world-master.v1.js:87` declares non-playable author `naoto`, label ナオト. This is not an accidental main-species mapping.
- E-special-trip-memory was expressly remapped from removed `specialRewardTrip` to special-region visit experience (doc 91:13; snapshot `retired_anchors`). Current `travelToRegion` keeps first-visit/special-region records, but `script.js:17805` sets `travelMemory = null`. It does not prove a current reward item exists.
- The 24 `retired_source_ids` in item snapshot are historical candidates, none in the current 26 I-card IDs. Migration aliases and inventory conversion are not proof that a new card derives from the removed card. Doc 76:79–110 keeps these distinctions explicit.
- The 12 item IDs called “未登録source” in September doc 77 are now actual entries in the canonical 452 catalog. Do not drop them because of that dated registration flag.
- Event snapshot includes 13 HOLD entries absent from the current E21 catalog: eight ENV_MOMENTS families, sickness recovery, last stand, companion parting, sodachi milestone, grand goal. They are not additional cards. `E-grand-goal` is specifically HOLD (doc 30:55, doc 91 HOLD table).
- Worlds are the 13 explicitly registered places: base1 + normal10 + special2. Time/weather/season axes and “current” follow modes are not extra W cards (doc 33:85–135).

## Achievement provenance boundaries

Four item cards have a **second confirmed origin** through explicit ending-goal reward links. `kind: achievement` uses `GOAL_TIER.*` IDs; these are grand-goal/ending tiers, **not** `ACHIEVEMENTS` badge IDs.

| Card | Goal ID | Meaning | Binding |
|---|---|---|---|
| I-naoto_charm | GOAL_TIER.life | てんじゅをまっとう | unlockTier 0 |
| I-naoto_lantern | GOAL_TIER.lifeClear | いっしょうクリア | unlockTier 1 |
| I-naoto_ring | GOAL_TIER.best | さいこうのいっしょう | unlockTier 2 |
| I-naoto_crown | GOAL_TIER.dex | ずかんクリア | unlockTier 3 |

The explicit chain is doc 37:139 → NAOTO_ITEMS (`script.js:2646–2649`) → stable GOAL_TIER_IDS (`2452`) → achievedGoalTiers (`2709–2712`) → syncNaotoRewardItems (`2722`). The 5th goal PERFECT CLEAR has no fifth item in NAOTO_ITEMS. Older item ownership is grandfathered (`2704–2705`), so ownership does not prove a fresh goal completion.

No explicit canonical card source map to an individual `ACHIEVEMENTS` badge ID was found in the checked card-game documents. This is a bounded negative result, not proof no thematic influence ever occurred. In particular:

- `naoto-1` (`script.js:2304`) is unlocked by obtaining a Naoto item; it is an outcome of ownership, not documented card origin.
- `lifeclear-1`, `bestlife-1`, `dex-complete` overlap goal conditions, but no explicit card-to-badge mapping makes them additional confirmed origins. They are not included by similarity.
- I-naoto_crown supports selection toward unmet achievements (`script.js:2682–2701`; doc 77:309). This is its functional theme, not evidence that it represents every affected achievement.
- “実績” in partner/companion card prose often means public action history (e.g. doc 74:222), not the main-game achievement catalog.

## Per-card mapping index

The JSON includes individual evidence paths, line numbers and reasons; this index exposes all 60 covered card IDs. See JSON for additional goal origin records.

| Card | Origin kind | Explicit source ID/anchor | Current status |
|---|---|---|---|
| E-big-illness | event | SICKNESS_TYPES | present |
| E-boss | event | LEGEND_ENCOUNTERS/boss | name_changed |
| E-fateful-transform | event | offerTransformIfReady / rerollIdentityAndBreakupIfNeeded | present |
| E-final-time | event | enterFarewell / GOAL_AGE | present |
| E-first-date | event | datesThisLife === 1 / rememberSpecialDate | present |
| E-gate | event | LEGEND_ENCOUNTERS/gate | name_changed |
| E-lamp | event | LEGEND_ENCOUNTERS/lamp | name_changed |
| E-midlife-50th | event | MIDLIFE_EVENTS/age:50 | present |
| E-midlife-album | event | MIDLIFE_EVENTS/age:56 | present |
| E-midlife-flower | event | MIDLIFE_EVENTS/age:62 | present |
| E-midlife-hobby | event | MIDLIFE_EVENTS/age:44 | present |
| E-midlife-travel-plan | event | MIDLIFE_EVENTS/age:66 | present |
| E-mirror | event | LEGEND_ENCOUNTERS/mirror | name_changed |
| E-misunderstanding | event | recheckRelationship / MISMATCH_REPAIR_NEEDED | present |
| E-naoto | author | playerSpecies.author/naoto | present |
| E-new-encounter | event | PARTNER_FIRST_ENCOUNTERS / playFirstPartnerEncounter | present |
| E-reconciliation | event | courtBtn / MISMATCH_REPAIR_NEEDED | present |
| E-special-trip-memory | event | travelToRegion / firstVisit / specialRegionsVisited | present |
| E-stairs | event | LEGEND_ENCOUNTERS/stairs | name_changed |
| E-sudden-trip | event | travelToRegion / state.regionId / firstVisit | present |
| E-wedding-anniversary | event | MARRIAGE_MILESTONES / checkMarriageMilestones | present |
| I-bond1 | item | bond1 | present |
| I-bowtie | item | bowtie | present |
| I-c_coin2 | item | c_coin2 | present |
| I-c_dex | item | c_dex | present |
| I-c_egg_normal | item | c_egg_normal | present |
| I-c_egg_rare | item | c_egg_rare | present |
| I-c_friend | item | c_friend | present |
| I-c_life | item | c_life | present |
| I-c_life_charm | item | c_life_charm | present |
| I-c_match | item | c_match | present |
| I-c_rare_friend | item | c_rare_friend | present |
| I-c_time_back | item | c_time_back | present |
| I-c_time_forward | item | c_time_forward | present |
| I-c_transform | item | c_transform | present |
| I-gamepass1 | item | gamepass1 | present |
| I-naoto_charm | item | naoto_charm | present |
| I-naoto_crown | item | naoto_crown | present |
| I-naoto_lantern | item | naoto_lantern | present |
| I-naoto_ring | item | naoto_ring | present |
| I-partner1 | item | partner1 | present |
| I-poop1 | item | poop1 | present |
| I-ribbon | item | ribbon | present |
| I-scarf | item | scarf | present |
| I-sleepboost1 | item | sleepboost1 | present |
| I-star | item | star | present |
| I-travel1 | item | travel1 | present |
| W-city | world | city | present |
| W-countryside | world | countryside | present |
| W-deepsea | world | deepsea | present |
| W-desert | world | desert | present |
| W-forest | world | forest | present |
| W-home | world | home | present |
| W-jungle | world | jungle | present |
| W-memory_lake | world | memory_lake | present |
| W-mountain | world | mountain | present |
| W-river_lake | world | river_lake | present |
| W-sea | world | sea | present |
| W-snow | world | snow | present |
| W-star_stop | world | star_stop | present |

## Verification

Read the complete E21/I26/W13 canonical source sections, all three source snapshots, relevant inventory/role/migration source maps, and current source anchors in root script.js, item-system.js and character-world-master.v1.js. Searched card-game Markdown for ACHIEVEMENTS / achievement / 実績 source connections, including the main/companion/partner foundation and role/text documents. Programmatic coverage equality checked against full-catalog.mjs; every evidence path exists and every line lies within its file. No existing application code, checkout, index or commits were changed.

## Related badges that are not proven card origins

These are contextual relationships only and deliberately excluded from `support-origins.json`. A source feature being capable of changing achievement progress is not an explicit design-provenance link.

| Event card | Related current ACHIEVEMENTS badge(s) | Evidence and boundary |
|---|---|---|
| E-fateful-transform | transform-1 / transform-10 / transform-25 | script.js:2218,2237,2288 count lifetime transforms. The card maps to transformation functions in doc91, not these badges. Note ID suffixes are not current thresholds: transform-10 requires5; transform-25 requires15. |
| E-big-illness | sick-cured-1 / sick-cured-10 / sick-cured-30 | script.js:2223,2238,2290 count cures (1/5/15); E-big-illness maps to SICKNESS_TYPES, not cure achievement. Current recordSicknessCure increments lifetime sicknessCured at10575. A disease occurrence is not a cure. The E-sickness-recovery candidate is HOLD and not E21. |
| E-new-encounter | partner-1 / partner-all | script.js:2248,2319 count recorded romantic partners; doc91 maps to first-encounter content/function. Merely encountering a candidate does not prove entering a relationship or earning a badge. |
| E-first-date | No dedicated first-date badge found | script.js:9558 increments datesThisLife and9568 branches for first date; no date-count condition occurs in current ACHIEVEMENTS declarations (2205–2325). Do not substitute partner-1 or married-1 for a date. |
| E-wedding-anniversary | married-1 / married-3 | script.js:2273,2303 count spouses (1/3); MARRIAGE_MILESTONES at9474 and checkMarriageMilestones at9524 refer to elapsed anniversary years. A wedding count is not an anniversary milestone. |
| E-reconciliation / E-misunderstanding | No dedicated reconciliation badge found | Explicit card source is relationship mismatch/repair, not ACHIEVEMENTS. No repair/reconciliation condition found in current declarations. |
| E-sudden-trip | region-3 / region-all | script.js:2229,2293 use normal region visit counts. Card source travelToRegion updates visit records, but card-to-badge provenance is not declared. |
| E-special-trip-memory | Not region-all | script.js:17767–17776 explicitly separates specialRegionsVisited from normal regionsVisited. This special trip must not be equated with the normal-world completion badge. |
| E-final-time | clear-1 / clear-5 / clear-10 / clear-25; lifeclear-1; bestlife-1 | script.js:2299,2307,2317,2322;2279;2281 count completed lives and additional sodachi conditions. Card source enterFarewell/GOAL_AGE does not explicitly select any particular badge. |

No direct badge origin was promoted from the above relationships. Goal reward origins are stronger: those have both a design-source statement and a runtime item→unlockTier binding.
