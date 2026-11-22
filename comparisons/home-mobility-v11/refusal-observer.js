// Read by the private after-refusal game only. Counts each genuine native
// refusal once and measures the proposed endpoint in the current CSS scale.
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('goalLog') !== '1') return;
  const residents = new Map();
  window.HomeRefusedWanderAudit = (actor, requested, route, clock, scale) => {
    if (!scale) return;
    const receipt = residents.get(actor.key) || {checks:0, offers:0, lastDistance:null};
    receipt.checks++;
    const endpoint = route?.at(-1);
    receipt.lastDistance = endpoint
      ? Math.hypot((endpoint.x-actor.x)*scale.x, (endpoint.y-actor.y)*scale.y) : null;
    if (endpoint) receipt.offers++;
    residents.set(actor.key,receipt);
    // The command's requested goal remains unchanged. The existing native
    // telemetry records actual steps/arrival separately from finding a route.
    window.HomeGoalDiagnostics?.proposal(actor, requested, requested, scale, clock);
  };
  window.HomeRefusalDiagnostics = Object.freeze({
    read(key) { return {...(residents.get(key) || {checks:0,offers:0,lastDistance:null})}; },
  });
})();
