# Mythic representative source analysis

## Dragon03/07
Original PNGs inspected directly.03 is an upright young red reptile with two ivory backward horns, protruding muzzle, layered cream belly, short forearms, large clawed hindfeet, red dorsal points and a long tail curling around the left/back.07 has a wider mature trunk and two red/pale membranes carried on visible finger supports, while retaining the paired horns, belly plates and wrapped tail. It is not a recolored quadruped or a scaled juvenile. Side/back interpretation keeps the tail curved in depth, supported curved wing membranes, full muzzle/horns and a raised plated chest.

`winged_reptile` uses explicit torso/neck profiles, volume muzzle/horns, articulated fore/hindlimbs, one tail and optional paired membranes. Existing quadWalk clock controls limbs/tail, with an opt-in membrane sway for this topology only. One canonical face sits above the muzzle; ray tests reject muzzle/horn coverage. No new emotion vocabulary, actor or gameplay state. Representatives03/07 only; full stage expansion must wait for immutable four-view/32state/normal-distance gate.

Tests RED for absent candidates and absent QA overlay, then185 dedicatedPASS.8/8 mythic mechanism mutations RED/restored;28Pilot hashes match. Initial curled-tail mutation survived because the test included detached dorsal points in the tail bounds; test now isolates the actual tube by removing decorative points in the measured fixture. Same side-span threshold detects straightened physical tail. All8 rerunRED. No image acceptance claimed.

## Phoenix03/07 representatives
Originals inspected directly.03 has bright orange/red/yellow young plumage, upright neck and beak, a pointed flame-like crest, layered asymmetric wings, two narrow clawed legs and several long curling tail feathers.07 is muted ochre/brown, with a swept drooping crest, hanging layered wings and long trailing pale-edged plumes. Explicit crest/wing/tail paths and older palette replace uniform scaling. No emissive fire or additional face is invented.

`plumed_bird` builds closed curved feather volumes, a full torso/neck/beak, layered wing bones and tail under one body, and three front toes plus a rear toe on each foot. Reuses the avian waddle clock; optional feather-tail motion leaves Pilot defaults unchanged. Tests RED before candidate implementation, then188 dedicatedPASS/0FAIL,6/6 plumed-bird mechanism mutations RED/restored and28Pilot hashes match.03/07 candidate capture only, no runtime or other-stage expansion before representative gate.

## Dragon membrane rejection and topology correction
Normal-distance f9e artifact11431680941 showed07back membrane stippling; four normal views preserved in fr5-mythic/f9e3831. Root cause: the concave scalloped contour was radial-fanned from its mean point, producing42 reversed front triangles and extra intersections at51/733 diagnostic rays. New independent surface-pair ray test failed4versus2 before correction. Ear-clipped triangulation with uniformly subdivided closed front/back and matching perimeter walls retains the explicit outline and bow without radial overlap.190dedicatedPASS,9/9mythicmutationRED/restored,28Pilot hashes match. No image acceptance until corrected capture.

## God03/07 representatives
Original PNGs viewed enlarged.03 is a floating white-haired young angel with one gold halo, one small feather-wing pair, short white/gold tunic, bare limbs.07 has a double gold halo, longer white hair, three feather-wing tiers and long curling white/gold robe tails; legs are hidden by the flowing robe. Tiny sparkle motifs are simplified away at ordinary game distance, without adding emitters or a new glow effect.

The celestial_humanoid composition uses the existing human body/face/locomotion with owned closed feather volumes, physically open torus halos, a full robe and raised gold trim.03/07 have explicit separate proportions, wing paths and hem topology. No extra actor/state/clock; wing sway is opt-in on the existing humanWalk.192dedicatedPASS/0FAIL,8/8celestialmutationRED/restored and28Pilot baseline hashes match. Representative images required before any remaining-stage expansion or runtime promotion.

## Ghost03/07 representatives
Originals inspected:03 has a white/blue soft closed body, long curved left tail and two drooping hands.07 is narrower, calm-faced with clasped hands, a floating gold halo and four blue flame volumes. Explicit taper/curvature/arm paths preserve stage differences. Spectral builder owns all geometry under one existing blobFloat clock and one canonical face; no new state/extra actors. Opaque softly shaded white body follows the original instead of invisible transparency.196dedicatedPASS/0FAIL,7/7spectralmutationRED/restored,28Pilot hashes match. Images required before remaining stages or runtime promotion.

## Plush03/07 representatives
Originals inspected:03 is a round seated brown teddy with cream muzzle/footpads holding a red heart between both hands.07 is worn and asymmetrical, one remaining left ear, tilted head, cream patch on the upper-right head and smaller stitched body/arm patches, no held heart. Soft-toy composition uses closed rounded volumes, bevelled solid heart, surface-conforming fabric patches and physical thread. One face and existing waddle owner.199dedicatedPASS/0FAIL,6/6plushmutationsRED/restored,28Pilot hashes match. Initial ear-height assertion assumed both ears rose above the head despite07side ear; replaced with physical lateral projection consistent with both originals. No image gate or promotion yet.

## Phoenix07 cream feather accents correction
6a representative evidence79JPEG/raw retained in fr5-mythic/6a07513.8views/64states/4distance reviewed.03 simplified plumage readable;07 rejected for uniform brown and missing pale original breast/feather borders. Added explicit cream edge color to07wing/tail/crest feathers and seven overlapping warm/cream breast plumes. Edge weight follows the original closed feather loft before curve deformation; absent edge leaves existing default colors unchanged. New visible-cream-vs-warm-center color test RED first, then200dedicatedPASS/0FAIL,7/7plumed-birdmutationsRED/restored,28Pilot hashes match. Corrected image gate required, no remaining stages or runtime promotion.

## Star03/07 representatives
Original03 is a tilted golden spiral galaxy with purple outer strands and a central warm face.07 is an irregular bright solar burst, curved orange/yellow flares with purple boundaries. Cosmic builder creates closed orbital tubes on a tilted plane or explicit curved tapered flare paths, a volumetric face core and small owned octahedral sparks. Same blobFloat owner/canonical face, no texture billboard or additional actor.

TestsRED before candidates, then202dedicatedPASS/0FAIL,5/5cosmicmutationsRED and28Pilot hashes match. An initial mutation moving the galaxy core to the orbital center did not occlude the tested face and was therefore a benign variant; replaced with an actual opaque occluder, preserving the same ray thresholds. After the first yielded mutation run, the local file unexpectedly retained the no-flares variant; restored the exact authored loop and reran all5mutations plus baseline tests in one uninterrupted command. Full202PASS verifies restored behavior. No image gate or remaining stages yet.

## Dragon canonical mouth projection correction
Corrected-wing cfdf evidence revealed the mouth projected onto head-only surface behind the protruding muzzle. Face target now merges head, muzzle and chin (excluding horns/nostrils); original canonical layout/state is unchanged. Independent rays at three mouth positions fail before the fix.203dedicatedPASS,10/10mythicmutationsRED/restored,28Pilot hashes match. Corrected image gate remains required.

## God03 short robe visibility correction
Cac7representative fullgate rejected03 because the long lower hem concealed the original bare legs and walking feet intersected it. Front/left34/right34 independent rays against lower legs failbeforefix; shortened03profile exposeslegs,07unchanged.9/9celestialmutationsRED/restored.79JPEG/raw retained, correctedcapture required.

## Unknown03/07 representatives
Original03is a blue/purple rounded soft organism with cyanrim, white eyes, pinkmouth, twoarmstubs andtwofeet.07is a blue orb withoutlimbs withthreegoldrays overhead. Explicitclosedopaque volumes andvertexgradient/highlight preserve these silhouettes; no transparent billboard or guessed organ identity. White eyeProfileink reusescanonical eye shapes/blink andis cache-separated fromdefaultdarkeyes. ExistingblobFloat owner andoneface; no newcanonical state.207dedicatedPASS,7/7mysterymutationsRED/restored,28Pilot hashesmatch. Representativeimagesrequired before expansion/promotion.

## Ghost outline rejection and correction
4819fullrepresentativegate rejected the long narrow pointed-leaf outline: original has a roundedbody andtail curling upwardleft. Earliercentroidtest proved lateraloffsetbut notthetipturn. Newterminalpole-vs-lowestbelly andbreadth tests failbeforefix. Continuousclosedblob nowhas fuller midsection andupturnedterminalpole, with07strongerleftreach; face/arm/haloownershipunchanged.209dedicatedPASS,8spectralmutationsRED/restored,28Pilot hashesmatch.79JPEG/raw retained; correctedimagesrequired.
