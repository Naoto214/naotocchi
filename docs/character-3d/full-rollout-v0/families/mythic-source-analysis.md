# Mythic representative source analysis

## Dragon03/07
Original PNGs inspected directly.03 is an upright young red reptile with two ivory backward horns, protruding muzzle, layered cream belly, short forearms, large clawed hindfeet, red dorsal points and a long tail curling around the left/back.07 has a wider mature trunk and two red/pale membranes carried on visible finger supports, while retaining the paired horns, belly plates and wrapped tail. It is not a recolored quadruped or a scaled juvenile. Side/back interpretation keeps the tail curved in depth, supported curved wing membranes, full muzzle/horns and a raised plated chest.

`winged_reptile` uses explicit torso/neck profiles, volume muzzle/horns, articulated fore/hindlimbs, one tail and optional paired membranes. Existing quadWalk clock controls limbs/tail, with an opt-in membrane sway for this topology only. One canonical face sits above the muzzle; ray tests reject muzzle/horn coverage. No new emotion vocabulary, actor or gameplay state. Representatives03/07 only; full stage expansion must wait for immutable four-view/32state/normal-distance gate.

Tests RED for absent candidates and absent QA overlay, then185 dedicatedPASS.8/8 mythic mechanism mutations RED/restored;28Pilot hashes match. Initial curled-tail mutation survived because the test included detached dorsal points in the tail bounds; test now isolates the actual tube by removing decorative points in the measured fixture. Same side-span threshold detects straightened physical tail. All8 rerunRED. No image acceptance claimed.

## Phoenix03/07 representatives
Originals inspected directly.03 has bright orange/red/yellow young plumage, upright neck and beak, a pointed flame-like crest, layered asymmetric wings, two narrow clawed legs and several long curling tail feathers.07 is muted ochre/brown, with a swept drooping crest, hanging layered wings and long trailing pale-edged plumes. Explicit crest/wing/tail paths and older palette replace uniform scaling. No emissive fire or additional face is invented.

`plumed_bird` builds closed curved feather volumes, a full torso/neck/beak, layered wing bones and tail under one body, and three front toes plus a rear toe on each foot. Reuses the avian waddle clock; optional feather-tail motion leaves Pilot defaults unchanged. Tests RED before candidate implementation, then188 dedicatedPASS/0FAIL,6/6 plumed-bird mechanism mutations RED/restored and28Pilot hashes match.03/07 candidate capture only, no runtime or other-stage expansion before representative gate.
