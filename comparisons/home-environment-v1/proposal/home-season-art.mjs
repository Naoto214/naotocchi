// Dedicated seasonal paintings, when they exist. Up to 13 regions × 4 hours × 4 seasons = 208.
// Only the one painting on screen is ever loaded. Where an entry is missing, the home falls
// back to the hour's painting recoloured for the season (living/seasons.mjs), so paintings can
// be added one at a time.
//
// File naming keeps the `<region>-<hour>.webp` ending the painters recognise, e.g.
//   comparisons/seasons-v1/autumn/forest-day.webp
// Requirements for a new painting are listed in ASTRA-HANDOVER.md.
export const SEASON_ART = Object.freeze({
  // forest:{day:{spring:'comparisons/seasons-v1/spring/forest-day.webp', autumn:'…', winter:'…'}}
});
export const seasonArt = (region, time, season, table = SEASON_ART) => table[region]?.[time]?.[season] || null;
const loading = new Map();
// Returns the painting once it has loaded, and null until then (the recoloured one shows meanwhile).
export function loadSeasonArt(src, doc) {
  let entry = loading.get(src);
  if (!entry) {
    const Picture = doc?.defaultView?.Image || globalThis.Image;
    if (!Picture) return null;
    entry = {image:new Picture(), ready:false};
    entry.image.decoding = 'async';
    entry.image.onload = () => { entry.ready = true; };
    entry.image.src = src;
    loading.set(src, entry);
  }
  return entry.ready ? entry.image : null;
}
