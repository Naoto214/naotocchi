# Unified item art

All item drawings are transparent 128px PNG masters with a 104–112px visible
long-side extent. `tools/build-item-art.cjs` is the reproducible source of the
normalized files and `manifest.json` is the runtime identity inventory.

## Provenance and revisions

- Retained/reframed art (16): `poop1`, `sleepboost1`, `travel1`, `partner1`, `bond1`,
  `star`, all four `naoto_*` goal items, `c_coin2`, `c_life`, `c_dex`,
  `c_friend`, `c_egg_normal`, and `sticker_pack`. Atlas drawings are isolated
  from existing UI/care atlases; the normal egg retains the existing face-free
  character art. All are trimmed and optically normalized without changing the motifs.
- Marker variants (3): `c_life_charm` adds a restrained heart to the retained
  eye amulet; `c_rare_friend` adds gold/rose sparkles to the retained paw badge;
  `c_egg_rare` adds one gold sparkle to the retained face-free egg.
- Supplied redraws (8): `bowtie`, `ribbon`, `scarf`, `gamepass1`,
  `c_time_back`, `c_time_forward`, `c_transform`, and `c_match` are normalized
  from the corresponding files in `sources/`. Directional clocks and ticket
  motifs remain visibly distinct.

The source atlases and character files remain untouched because other UI and
character renderers still use them.

## Rebuild

Sharp is pinned as the `sharp@0.35.4` development dependency. From the project
root, install the locked dependencies and regenerate the masters and static
comparison panels with:

```sh
npm ci
node tools/build-item-art.cjs
node tools/item-art-comparison.cjs
```
