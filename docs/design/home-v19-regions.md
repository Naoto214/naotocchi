# Home v19: formal thirteen-region rollout

Authorized scope: three pilot regions now, remaining ten after owner iPhone QA.
Baseline PR426 HEAD 61aeee693e4ba94998ff39497de31e4eab63db2e; main 9e3929da9e53fc94edfce85c2a3fc5ff8d596fe7. No merge or production Pages release.

The formal IDs and all 13 Meguru worlds already exist. Home terrain presentation currently supports forest, river_lake and city only. Other destinations retain their existing home presentation; planned data does not enable them or alter unlock conditions.

|Region|Existing official source|Home composition / rollout|
|---|---|---|
|forest|giant/broadleaf/conifer trees, roots, leaves, mushrooms, logs, flowers; hill/root terrain|Pilot: enclosing asymmetric trees, curved sampled trail, layered distant canopy; birds/butterflies/wind; canopy observation and shade rest|
|river_lake|river bed and water meshes, bridge, wheel, reeds, stones, hut; aquatic renderer|Pilot: broad river, bridge perpendicular to bank, wheel/hut on far bank, curving near-bank path; fish/ripples/wheel; fish observation and bridge-bank rest|
|city|shopfront house parts, towers, lamps/signals, car, pavement segments|Pilot: connected T street receding into varied-height buildings, crosswalk and sidewalks; car/pedestrians, night glass lighting; traffic/shop observation and tree rest|
|countryside|fields/crops, farm buildings, windmill and river|Wave 1: long farm lane, quilted fields, distant hills; windmill; field observation|
|sea|coast sampler, wave water, islands/rocks/lighthouse|Wave 1: diagonal beach with open horizon, tide-safe activity strip; waves/seabirds|
|snow|conifers, snowy seasonal crowns, lodge/ice|Wave 1: snow lane between roof and conifers; snow particles and quiet observation|
|mountain|height relief, cliffs/peaks, rocky path|Wave 2: stepped trail, distant peaks, safe plateau with explicit cliff exclusion|
|jungle|dense tropical foliage/vines/waterfall|Wave 2: layered large leaves with protected central visibility; waterfall and wildlife|
|desert|dunes, rock formations, palms/oasis|Wave 2: sweeping dune silhouette, shaded near-ground route; sand density by quality|
|deepsea|seafloor, coral, luminous organisms/particles|Wave 3: trench background, protected seabed foreground; underwater light and slow particles|
|star_stop|formal stops, islands, stars and connected paths|Wave 3: floating stop framing using existing island traversal rules; no new unlock or void walking|
|memory_lake|formal lake, mist/light and shoreline|Wave 3: quiet shore and layered mist; preserve discovery conditions|
|home|house, eaves, garden/vegetables, paths|Final homecoming: warm garden facing the house, recognizable separate return destination|

## Shared contract
`HOME_SCENERY` holds status, concept, layers, camera, placements, trail, visual observation points. `composeHomeWorld` clones canonical object parts from that region's catalogue; no source mutation. Renderer and navigation consume the same camera. Official terrain sampler and collision grid remain authoritative. No scenery-specific movement shortcuts, teleporting, or passage through water/road.

Observation points separate safe approach coordinates from gaze targets. Existing idle choice and personality weights remain, occasional existing observe choices approach a point (35–55 second cooldown), then observe/rest facing the landmark. No new conversation events, lines, draw conditions, care effect, save field, or global RNG calls.

Shared season/weather/time data and animation level remain authoritative. Reuse instancing, wind, water, fauna, active-time clock, pause/reduced-motion, DPR adaptation and GPU recovery. New wheel motion uses existing spokes/paddles; night tint selects existing glass parts only. No new textures or illustration assets.

## Acceptance and limits
Same 390×844 / summer / sunny day / 6 actors comparison, plus four phone widths and 1/28 actors. Maintain 42px notice and 76px speech. Validate actual safe ground, route continuity, point projection, actor art and controls. Run existing regressions unchanged. Cloud Chromium/software renderer measurements are not iPhone GPU performance claims. CI WebKit is not an actual iPhone.

v18 known issue: WebKit rotation changes header/cast upper position by 6px on several widths; existing strict check stays. v18 owner device QA and all formal adoption remain pending. New scenery must not worsen this baseline.
