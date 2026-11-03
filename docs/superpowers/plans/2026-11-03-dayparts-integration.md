# Dayparts integration V1
Goal: connect approved PR507 images to V18 without changing terrain, resident geometry or production.
Architecture: shared clock boundary; lazy two-image background controller; retain previous successful image on failure; four-second fade. Reuse world-scene particles in a clipped decorative layer. QA overrides presentation only on a separate owner-private origin.
Constraints: independent Draft PR only; local 05/10/16/19 boundaries; all original art retained; no save schema changes; no gameplay weather/climate modifications.
Tasks:
- [ ] Test clock boundaries, image mapping, stale loads and failure fallback.
- [ ] Wire lazy image controller into production canvas, leaving navigation unchanged; prevent environment-only drag cancellation.
- [ ] Reuse particles with region masks and restrained lighting; protect special regions.
- [ ] Add isolated QA controls; package allowlist; focused regression; private deployment and Draft PR.
Review focus: stale image callbacks, mid-fade resize, dragging at time boundary, failed first load, special-region precipitation.

## Implementation and validation
- Shared clock changed only 10:00–10:59 from morning to day. Existing morning sleep 1.2 / hunger 1.1 and sports draw 1.2 become existing daytime defaults/action 1.1. No other balance tables, save formats or sleep algorithms changed.
- 52 WebP files: SHA256 matches adopted manifest, all decoded at 1024x1536; 21,259,686 bytes. Only selected target + retained/fading image loaded.
- 4-second fade queues subsequent completed targets and ignores stale callbacks. Failed image retains prior image; initial fallback uses original approved region artwork.
- Same navigation/projection functions retained. Environment-only updates no longer cancel a drag. Background-only egg adapter retains eggPose and sprite input/lifecycle.
- Reused sceneMarkup particles. Home outdoor mask inspected against approved artwork; sea clips to upper surface area; special regions use light particles instead of terrestrial rain/snow. Clouds use a pale graduated veil and softer resident shadows; baked artwork's sunbeams are not physically relit.
- QA opt-in: ?daypartsQA=1, four selectors, reset. Overrides only presentation; no localStorage writes in QA module. Separate private Site origin isolates testing from production.
- 62 focused automated tests passed. Existing growth/offline/time-pause/save/birth/V17/V18 tests included. Web preview confirmed initial boot and egg presentation region/time/weather changes.
- Not yet verified: physical iPhone portrait/landscape, visual all 832 combinations, 28-resident live stress test and sustained low-end performance. Exact sky/water clipping and weather aesthetic remain owner visual review items.
- Review findings addressed: home precipitation bounds corrected; rapid-change transitions queued. No main or Pages publication.
