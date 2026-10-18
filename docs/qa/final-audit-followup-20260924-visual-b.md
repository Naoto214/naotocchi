# Secondary visual review B — cases 117–232

Reviewed 116 existing sweat/mark candidates, using actual displayed offline reconstructions. No production changes and no expansion to the full 2,480-case set.

- **Candidate: 0**
- **Acceptable: 115**
- **Borderline: 1** (#139 cicada/03 strained)
- Reduced-motion still: all 116 acceptable; no additional candidates.

The criterion was perceptual readability and a natural composite. Geometry contact by itself was explicitly not treated as a bug. Recognizable partial overlaps remained acceptable. None of these 116 cases showed a clear unreadable effect, a clearly wrong symbol, excessive face/effects crowding, or an obviously unnatural overall composite.

## Borderline, not an automatic fix

#139 `cicada/03` `strained`, 64/80/104px, chiefly 0/390ms: green left sweat covers much of the grey zigzag center, leaving a rightward stroke that can resemble a leaf stem. The grey bend is clearer at 1300/1690ms; the face is unobscured. The unrotated reduced-motion still leaves the lower bend readable. Keep this separate from confirmed defects.

## Viewed ledger

Each of these animation sheets was opened with `view_image` and visually inspected, all four cases per sheet, all 64/80/104px views and 0/390/1300/1690ms phases:

`sheets/30.png`, `sheets/31.png`, `sheets/32.png`, `sheets/33.png`, `sheets/34.png`, `sheets/35.png`, `sheets/36.png`, `sheets/37.png`, `sheets/38.png`, `sheets/39.png`, `sheets/40.png`, `sheets/41.png`, `sheets/42.png`, `sheets/43.png`, `sheets/44.png`, `sheets/45.png`, `sheets/46.png`, `sheets/47.png`, `sheets/48.png`, `sheets/49.png`, `sheets/50.png`, `sheets/51.png`, `sheets/52.png`, `sheets/53.png`, `sheets/54.png`, `sheets/55.png`, `sheets/56.png`, `sheets/57.png`, `sheets/58.png`.

Individually reopened: `cases/139.png`.

Reduced-motion sheets opened and inspected at 64/80/104px: `still/10.png`, `still/11.png`, `still/12.png`, `still/13.png`, `still/14.png`, `still/15.png`, `still/16.png`, `still/17.png`, `still/18.png`, `still/19.png`, `still/20.png`.

Still-page boundary scope: page 10 evaluated only #117–120; pages 11–19 all owned cases; page 20 evaluated only #229–232. Neighbor cases were not classified.

## Rendering limitations

These are offline reconstructions from the current PNG/SVG and reconstructed CSS sweat geometry, color, border, opacity, shadow, radii, time offset and PNG < mark < sweat layer order, not browser screenshots. Reduced-motion uses the supplied unrotated dy=0, opacity=.85 animation:none reconstruction. The still sheet can clip part of a far-right 104px effect (for example #117 cloud); this sheet boundary is not a production issue, and complete outlines were available in the animation sheet. Actual browser rasterization and continuous motion were not verified.

Per-case decisions, reasons, affected sizes, elements, representative phases and source-sheet references are in `visual-b.json`.
