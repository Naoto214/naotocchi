// Browser test observer. No changes to destinations, clocks, PRNG or presentation.
(() => {
  const scale = NaotocchiHomeViewport.residentPresentation();
  const records = new Map();
  for (const [key] of touchQA.opening()) {
    records.set(key, {trips: [], stalls: [], openFailure: null, active: null});
  }
  const watch = {
    remember(key, goal) {
      records.get(key).assistedGoal = [goal.x, goal.y];
    },
    plan(report, accepted, actor, clock, assisted) {
      if (report.type !== 'ambient' || !report.planned) return;
      const r = records.get(actor.key);
      if (!accepted) {
        r.openFailure ??= clock;
        return;
      }
      const trip = {start: clock, from: [actor.x, actor.y], escape: !!actor.ambientEscape,
        intentRoute: !!actor.intentRoute, assisted: !!assisted,
        goal: assisted && r.assistedGoal ? r.assistedGoal : [report.goal.x, report.goal.y],
        distance: 0, cssDistance: 0, end: null, displacement: null};
      r.trips.push(trip);
      r.active = trip;
    },
    hop(actor, point, clock) {
      if (actor.source !== 'ambient') return;
      const distance = Math.hypot(point.x - actor.x, point.y - actor.y);
      if (distance <= 1e-8) return;
      const r = records.get(actor.key);
      if (r.openFailure !== null) {
        r.stalls.push([r.openFailure, clock]);
        r.openFailure = null;
      }
      if (r.active) {
        r.active.distance += distance;
        r.active.cssDistance += Math.hypot((point.x-actor.x)*scale.scaleX, (point.y-actor.y)*scale.scaleY);
      }
    },
    arrive(actor, clock) {
      if (actor.source !== 'ambient') return;
      const r = records.get(actor.key);
      if (!r.active) throw Error('ambient arrival without recorded route');
      r.active.end = clock;
      r.active.to = [actor.x, actor.y];
      r.active.displacement = Math.hypot(actor.x-r.active.from[0], actor.y-r.active.from[1]);
      r.active = null;
    },
    read() {
      return Object.fromEntries([...records].map(([key, {trips, stalls, openFailure}]) =>
        [key, {trips, stalls, openFailure}]));
    }
  };
  touchQA.matrixTracks = watch;
})();
