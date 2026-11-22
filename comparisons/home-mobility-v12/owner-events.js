'use strict';
// Only the owner comparison loads this observer. Counts remain in this frame.
(() => {
  let listening = new URLSearchParams(location.search).get('diagnostics') === '1';
  const residents = new Map();
  function record(key) {
    if (!residents.has(key)) residents.set(key, {searches:0, plans:0, starts:0, helps:0, accepted:0});
    return residents.get(key);
  }
  globalThis.HomeV12OwnerEvents = Object.freeze({
    enable() { listening = true; },
    read(key) { const row = residents.get(key); return row ? {...row} : null; },
  });
  globalThis.HomeV12CurveEvent = (type, event) => {
    if (!listening || !event.owner) return;
    const row = record(event.owner);
    if (type === 'search') row.searches++;
    if (type === 'plan' && event.found) row.plans++;
    if (type === 'start') {
      row.starts++;
      if (event.helper) record(event.helper).helps++;
    }
    if (type === 'owner' && event.accepted) row.accepted++;
  };
})();
