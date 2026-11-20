// VERSION 8 (2026-11-06): CPU standard deck setup P3 — decided by the owner (RECP3 is not adopted).
// P3 = each official CPU deck with 7 slots replaced: IX・X・XI・XII 各1 + はやじまい・ながいきのひけつ・おもいでのしゃしん 各1.
// The slots are chosen by the rule fixed in VERSION 4 (lib/decks-life.mjs slotsK: the non-main card name with the most copies
// left, last copy first), the same decks measured in VERSION 5–7 (REPORT §16–§18). Candidate IDs (integration/candidate-cards.mjs).
// NOT the official cpu-decks.mjs: the official 7 decks are unchanged. On adoption each deck gets a new version and its current
// list moves to CPU_DECK_HISTORY (the existing mechanism), so old CPU saves keep replaying (integration/CANDIDATE-V7.md §5).
import {CPU_DECKS} from '../../cpu-decks.mjs';
import {deckForConfig} from '../lib/decks-life.mjs';
import {mapId} from './candidate-cards.mjs';
export const P3_VERSION='2026-11-06-p3-candidate';
export const CPU_DECKS_P3=Object.freeze(CPU_DECKS.map(d=>{const r=deckForConfig(d.id,'P3');
 return Object.freeze({id:d.id,name:d.name,version:P3_VERSION,summary:d.summary,cards:Object.freeze(r.cards.map(mapId)),
  replaced:Object.freeze(r.replaced.map(x=>Object.freeze({index:x.index,from:x.from,to:mapId(x.to)})))});}));
// Measured on hotseat-8 (VERSION 7, 560 games, CPU heuristic-4-candidate): first-seat score 0.491 vs 0.514 without the new cards
// (−2.3pt [−4.8, −0.1]); close games 47.9% vs 40.9%; behind at R8 0.211 vs 0.112. Keep watching the first-seat score after
// adoption with integration/first-seat-check.py (owner's request, VERSION 8).
export const P3_BASELINE=Object.freeze({firstSeatScore:0.491,firstSeatScoreWithoutNewCards:0.514,close:0.479,behindR8:0.211,source:'results/summary-v7.json conditions P3 / A0'});
