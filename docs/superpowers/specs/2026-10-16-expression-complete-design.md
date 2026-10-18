# Character expression completion

Purpose: express care, daily life and relationships through the existing 293 models. User authorizes design through implementation, verification and Draft PR; no main merge. iPhone acceptance remains pending.

Reuse Home Pet/Relationship resolvers unchanged. Extend Resident Expression vocabulary to 12 states. A presentation-only controller owns social reactions, clock, sequence and actor-identity cleanup; no save fields, AI, movement, relationship values or Motion v2 changes. The bridge supplies freshly resolved player and relationship input. Both renderers prepare the same actor expression before rendering, including distant/build-wait/failure fallback.

Priority: player delegates to Home (blocked > sleeping > critical > transient including normal > current condition). Other actors: sleeping/critical > explicit life dislike > transient social positive or relationship positive > sick/weak/strained/tired/hungry > relationship lonely > ordinary life. Separation alone never creates lonely. End reactions by re-evaluating current inputs, not storing a return face.

Social v1 contract matches PR382: version,type,actorKey,at,context,regionId?,reason?. Accept reunion,greeting,visit,affection_interaction,accompany_start,accompany_end,return_to_free_life. No dependency on relationship-life.js. Subscribe helper returns cleanup. Validate actor/current region; deduplicate event delivery; same emotion with a different event gets a new cue token. Cooldown limits movement, not emotion. Return-to-life clears the temporary layer without a second motion; a paired same-at accompany_end keeps its single goodbye. accompany_start preserves the current emotion. Home keeps 2500ms; world uses active seconds. Departure/exit cancels reactions. Missing/hidden actors do not replay old events. Actual visibility suspension is explicit; slow frames are not treated as hidden.

Four faces use shared atlas and existing eyes/mouths. Hungry mild, weak subdued, critical clearly distinct, lonely gentle. Existing archetype posture is reused with small shared modifiers for fish/plant/fungus. No new model meshes. Full-face atlas modes use the same 12 parameters. Reduced motion suppresses cues.

Fallback: stage maps hungry/weak/critical exactly and lonely to sulky (limited substitute documented); relationships map lonely/positive exactly, unsupported life states use normal; author uses base. All 2480+88 references remain byte-identical.

Validation: boundaries, expiry, protected-state conflicts, repeated events, disposal/region/identity, all293x12 build/apply/finite transforms, real renderer failures, representative images, full regression. Software browser measurements are not iPhone performance.
