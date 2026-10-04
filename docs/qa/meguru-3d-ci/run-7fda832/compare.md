# Farmhouse veranda: browser comparison

Source`7fda832`; baseline`1e2caad`. The baseline farmhouse matches the pre-veranda version. Home differences also include the earlier atomic-garden repair. Recipes/camera/positions are identical on both sides; screenshots retain normal actors and speech UI.20gallery pairs are isolated static fixtures, not in-world performance tests.

## Farmhouse entrance

| Before | After |
|---|---|
| ![before](captures/gallery-before/family-farmhouse.jpg) | ![after](captures/gallery-after/family-farmhouse.jpg) |

The shallow canopy now joins two end supports and frames the veranda as one sheltered entrance. Static checks protect actual slope contact and below-head collider containment. The normal countryside view retains the open road and existing low settlement composition. This is a bounded improvement, not completion of regional composition.

## Same-camera counts

| Scene | Triangles before → after | Calls before → after |
|---|---:|---:|
| home-vq | 35,082 → 35,272 | 42 → 42 |
| countryside-vq | 119,480 → 119,248 | 54 → 54 |
| forest-vq | 147,752 → 147,752 | 60 → 60 |
| jungle-vq | 172,794 → 172,794 | 62 → 62 |
| city-vq | 130,188 → 130,188 | 50 → 50 |

Countryside -232triangles (~0.194%),calls54unchanged. No broader performance claim. Headless drawMsAvg/p95 are retained as observations, not iPhone results. RAF pauses for screenshot capture are not benchmark intervals. Nonzero `ghosts` in shot logs counts existing fade meshes, not measured afterimage defects.

## World and entrances

| View | Before | After |
|---|---|---|
| home-vq | ![before](captures/before/home-vq.jpg) | ![after](captures/after/home-vq.jpg) |
| home-house-vq | ![before](captures/before/home-house-vq.jpg) | ![after](captures/after/home-house-vq.jpg) |
| forest-vq | ![before](captures/before/forest-vq.jpg) | ![after](captures/after/forest-vq.jpg) |
| jungle-vq | ![before](captures/before/jungle-vq.jpg) | ![after](captures/after/jungle-vq.jpg) |
| city-vq | ![before](captures/before/city-vq.jpg) | ![after](captures/after/city-vq.jpg) |
| city-arcade-vq | ![before](captures/before/city-arcade-vq.jpg) | ![after](captures/after/city-arcade-vq.jpg) |
| city-market-vq | ![before](captures/before/city-market-vq.jpg) | ![after](captures/after/city-market-vq.jpg) |
| countryside-vq | ![before](captures/before/countryside-vq.jpg) | ![after](captures/after/countryside-vq.jpg) |
| mountain-vq | ![before](captures/before/mountain-vq.jpg) | ![after](captures/after/mountain-vq.jpg) |
| snow-vq | ![before](captures/before/snow-vq.jpg) | ![after](captures/after/snow-vq.jpg) |
| sea-vq | ![before](captures/before/sea-vq.jpg) | ![after](captures/after/sea-vq.jpg) |
| deepsea-vq | ![before](captures/before/deepsea-vq.jpg) | ![after](captures/after/deepsea-vq.jpg) |
| river_lake-vq | ![before](captures/before/river_lake-vq.jpg) | ![after](captures/after/river_lake-vq.jpg) |
| river-bridge-vq | ![before](captures/before/river-bridge-vq.jpg) | ![after](captures/after/river-bridge-vq.jpg) |
| desert-vq | ![before](captures/before/desert-vq.jpg) | ![after](captures/after/desert-vq.jpg) |
| oasis-vq | ![before](captures/before/oasis-vq.jpg) | ![after](captures/after/oasis-vq.jpg) |
| star_stop-vq | ![before](captures/before/star_stop-vq.jpg) | ![after](captures/after/star_stop-vq.jpg) |
| memory_lake-vq | ![before](captures/before/memory_lake-vq.jpg) | ![after](captures/after/memory_lake-vq.jpg) |
| forest-creek-vq | ![before](captures/before/forest-creek-vq.jpg) | ![after](captures/after/forest-creek-vq.jpg) |
| forest-bridge-vq | ![before](captures/before/forest-bridge-vq.jpg) | ![after](captures/after/forest-bridge-vq.jpg) |
| river-stonebridge-vq | ![before](captures/before/river-stonebridge-vq.jpg) | ![after](captures/after/river-stonebridge-vq.jpg) |
| countryside-river-vq | ![before](captures/before/countryside-river-vq.jpg) | ![after](captures/after/countryside-river-vq.jpg) |
| mountain-summer-vq | ![before](captures/before/mountain-summer-vq.jpg) | ![after](captures/after/mountain-summer-vq.jpg) |
| mountain-winter-vq | ![before](captures/before/mountain-winter-vq.jpg) | ![after](captures/after/mountain-winter-vq.jpg) |
| river-bridge2-vq | ![before](captures/before/river-bridge2-vq.jpg) | ![after](captures/after/river-bridge2-vq.jpg) |
| mountain-slope-vq | ![before](captures/before/mountain-slope-vq.jpg) | ![after](captures/after/mountain-slope-vq.jpg) |
| desert-slope-vq | ![before](captures/before/desert-slope-vq.jpg) | ![after](captures/after/desert-slope-vq.jpg) |
| forest-autumn-vq | ![before](captures/before/forest-autumn-vq.jpg) | ![after](captures/after/forest-autumn-vq.jpg) |
| countryside-autumn-vq | ![before](captures/before/countryside-autumn-vq.jpg) | ![after](captures/after/countryside-autumn-vq.jpg) |
| forest-winter-vq | ![before](captures/before/forest-winter-vq.jpg) | ![after](captures/after/forest-winter-vq.jpg) |
| home-spring-vq | ![before](captures/before/home-spring-vq.jpg) | ![after](captures/after/home-spring-vq.jpg) |
| entrance-15 | ![before](captures/before/entrance-15.jpg) | ![after](captures/after/entrance-15.jpg) |
| entrance-45 | ![before](captures/before/entrance-45.jpg) | ![after](captures/after/entrance-45.jpg) |
| entrance-64 | ![before](captures/before/entrance-64.jpg) | ![after](captures/after/entrance-64.jpg) |
| entrance-196 | ![before](captures/before/entrance-196.jpg) | ![after](captures/after/entrance-196.jpg) |

## Building and prop gallery

| Object | Before | After |
|---|---|---|
| family-barn | ![before](captures/gallery-before/family-barn.jpg) | ![after](captures/gallery-after/family-barn.jpg) |
| family-cabin | ![before](captures/gallery-before/family-cabin.jpg) | ![after](captures/gallery-after/family-cabin.jpg) |
| family-cottage | ![before](captures/gallery-before/family-cottage.jpg) | ![after](captures/gallery-after/family-cottage.jpg) |
| family-farmhouse | ![before](captures/gallery-before/family-farmhouse.jpg) | ![after](captures/gallery-after/family-farmhouse.jpg) |
| family-hut | ![before](captures/gallery-before/family-hut.jpg) | ![after](captures/gallery-after/family-hut.jpg) |
| family-shed | ![before](captures/gallery-before/family-shed.jpg) | ![after](captures/gallery-after/family-shed.jpg) |
| family-shop | ![before](captures/gallery-before/family-shop.jpg) | ![after](captures/gallery-after/family-shop.jpg) |
| family-single | ![before](captures/gallery-before/family-single.jpg) | ![after](captures/gallery-after/family-single.jpg) |
| family-twostorey | ![before](captures/gallery-before/family-twostorey.jpg) | ![after](captures/gallery-after/family-twostorey.jpg) |
| prop-bike | ![before](captures/gallery-before/prop-bike.jpg) | ![after](captures/gallery-after/prop-bike.jpg) |
| prop-boxprop | ![before](captures/gallery-before/prop-boxprop.jpg) | ![after](captures/gallery-after/prop-boxprop.jpg) |
| prop-car | ![before](captures/gallery-before/prop-car.jpg) | ![after](captures/gallery-after/prop-car.jpg) |
| prop-ferris | ![before](captures/gallery-before/prop-ferris.jpg) | ![after](captures/gallery-after/prop-ferris.jpg) |
| prop-ruin | ![before](captures/gallery-before/prop-ruin.jpg) | ![after](captures/gallery-after/prop-ruin.jpg) |
| prop-signpost | ![before](captures/gallery-before/prop-signpost.jpg) | ![after](captures/gallery-after/prop-signpost.jpg) |
| prop-stall | ![before](captures/gallery-before/prop-stall.jpg) | ![after](captures/gallery-after/prop-stall.jpg) |
| prop-statue | ![before](captures/gallery-before/prop-statue.jpg) | ![after](captures/gallery-after/prop-statue.jpg) |
| prop-telescope | ![before](captures/gallery-before/prop-telescope.jpg) | ![after](captures/gallery-after/prop-telescope.jpg) |
| prop-tractor | ![before](captures/gallery-before/prop-tractor.jpg) | ![after](captures/gallery-after/prop-tractor.jpg) |
| prop-wheel | ![before](captures/gallery-before/prop-wheel.jpg) | ![after](captures/gallery-after/prop-wheel.jpg) |

## Remaining visual work

House silhouettes are still narrow on small canonical lots. Repeating a global height squeeze would reintroduce unsafe eaves; preserve main-roof clearance. Garden paths are partly obscured by normal actor/speech UI. Forest/jungle distinction is visible, but vegetation layering, foreground framing and negative space still need scene-level review. Bridges/banks/props/city and the other regional compositions remain open work. iPhone ghosts/afterimages/disappearance/stutter/p95/p99/>60ms/finalbeauty are HumanQA pending.
