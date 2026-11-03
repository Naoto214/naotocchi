# Living Home — approved additional brief, 2026-10-23

The home is a place to care; Meguru is a place to explore. Both inhabit one world. Replace the existing photograph plus translucent SVG island in forest, river_lake and city with the actual Meguru WebGL environment renderer. Keep official DOM character art, Motion v2, equipment, care and Conversation v2. No main merge or Pages release. Update existing Draft #426 and owner-private Site only.

## Boundaries
- `home-world.mjs`: small, data-directed Home compositions built from copies of actual `worldObjects3d` geometry, REGION3D materials, terrainGrid and water renderer. No changes to exploration world generation or saved state. Renderer extension is opt-in and receives a Home camera / ambient hook; default Meguru behavior stays unchanged.
- `world-life.mjs`: bounded visual population, independent random stream and monotonic active time. Roads and water have explicit routes; clouds, wind and rare visits have varying timing. No gameplay events or save mutations.
- `home-diorama-model.js`: presentation-only actions, per-actor deadlines and recent-action memory; curiosity/boldness/sociability/persistence copied from official temperament, neutral defaults for visitors without formal values. Walk, turn, look, observe, sit, rest, solitude, approach and side-by-side. Selection/drag takes priority; care and conversation interrupt once, then autonomy resumes. Rendering/sync must never reset deadlines.
- `home-diorama.js`: Pointer Events, existing art anchors, contact shadows, selected destination, input cancellation, lifecycle, bounded metrics. No automatic care/courtship, relation changes, or new speech system.

## Acceptance
Three distinct regions, no old photo/island in supported Home; environmental life and autonomous activity visible for >=60 real seconds per region; ground tap and actor drag work; current visitors only; poop in foreground; hidden pause/resume; no saved-state mutation; integration with current main Conversation v2; preserve non-Pilot behavior. Browser evidence and human iPhone evidence explicitly separate. WebGL fallback must be explicit and cannot be claimed as 3D verification.

## Assumptions
The supplied section 6 is truncated and sections 7–12 absent. Use the complete priorities, sections 13–18 and existing approved protection constraints as acceptance. No additional unprovided features inferred.

## 接地・復帰境界の補足

HomeはDOM足元の画面座標をrendererへ渡し、Home専用camera view offsetだけを補正する。探索カメラには適用しない。描画障害はHome境界で解放し、1/3/10秒の最大3回で再作成する。非表示・停止・破棄時は再試行せず、同地域の生活時計を保持する。実WebGL復帰は本人QA待ち。詳細は [追加報告](followup/REPORT.md)。
