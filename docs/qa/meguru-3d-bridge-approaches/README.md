# Bridge approach views for the next composition decision

Product source d1c3dba. Four prepared same-camera recipes sample the actual path segments on both sides of the forest and river_lake stone bridges. They face each crossing, use a300-unit camera distance and existing sunny/summer scene setup. When scheduling the next bridge QA, append these four recipes to the shared shot list and use them for both before and after. They have not been rendered yet; the current vehicle CI uses the existing recipe.

Each standing point has at least the canonical22-unit player body radius of path margin, lies at least40units beyond the nearest stream's half-width, and passes the real default-radius collidesAt check. Coordinates and measurements are in recipe-validation.json. This is read-only QA sampling, not a route, collider, camera-runtime or world change.

Initial recipe probes failed: ACTOR_SIZE110 is sprite size, not the22-unit collision radius; a straight extrapolation of the bridge axis also left the bending path on one river side. The final points are sampled from actual finite road segments, not from relaxed collision/water constraints.

Existing overview shots alone are insufficient grounds to prune tree crowns: some put the player in the river, and top-view crown/deck overlap is not a camera-occlusion measurement. Inspect these approach views before deciding whether any canopy or bridge geometry should change. World remains incomplete; Human QA unapproved.
