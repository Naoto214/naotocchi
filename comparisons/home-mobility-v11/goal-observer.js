// Owner-only readout. Keep only the latest free walk per resident.
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('goalLog') !== '1') return;

  const rows = new Map();
  const point = p => ({x: p.x, y: p.y});
  const same = (a, b) => a && b && Math.abs(a.x-b.x) < 1e-7 && Math.abs(a.y-b.y) < 1e-7;
  function vector(from, to, scale) {
    const dx = (to.x-from.x) * scale.x, dy = (to.y-from.y) * scale.y;
    return {length: Math.hypot(dx,dy), bearing: (Math.atan2(dy,dx)*180/Math.PI+360)%360};
  }
  function updateFoot(row, actor) {
    row.foot = point(actor);
    row.netDistance = vector(row.origin, actor, row.scale).length;
    row.goalError = vector(row.chosen, actor, row.scale).length;
  }
  window.HomeGoalDiagnostics = Object.freeze({
    proposal(actor, raw, chosen, scale, clock) {
      if (!scale || !Number.isFinite(scale.x + scale.y)) return;
      const first = vector(actor, raw, scale), last = vector(actor, chosen, scale);
      rows.set(actor.key, {clock, scale:point(scale), origin:point(actor), raw:point(raw),
        chosen:point(chosen), changed:!same(raw,chosen), rawDistance:first.length,
        chosenDistance:last.length, rawBearing:first.bearing, chosenBearing:last.bearing,
        status:'sampled', endpoint:null, foot:point(actor), actualDistance:0, netDistance:0, goalError:last.length});
    },
    request(key, source, goal) {
      const row=rows.get(key);
      if (row && ['sampled','planned'].includes(row.status) &&
          (source!=='ambient' || !same(goal,row.chosen))) row.status='interrupted';
    },
    result(command, accepted, actor, clock) {
      const row=rows.get(command.key);
      if (!row || !actor || command.type!=='ambient' || !same(command.goal,row.chosen)) return;
      if (!['sampled','planned','declined'].includes(row.status)) return;
      row.status=accepted?'planned':'declined';
      row.statusClock=clock;
      const endpoint=accepted && (actor.route?.at(-1) || actor.target);
      row.endpoint=endpoint ? point(endpoint) : null;
      updateFoot(row,actor);
    },
    hop(actor, next) {
      const row=rows.get(actor.key);
      if (!row || row.status!=='planned' || actor.source!=='ambient') return;
      row.actualDistance += vector(actor,next,row.scale).length;
      updateFoot(row,next);
    },
    state(actor, clock) {
      const row=rows.get(actor.key);
      if (!row || row.status!=='planned' || actor.target && actor.source==='ambient') return;
      row.status='interrupted';
      row.statusClock=clock;
      updateFoot(row,actor);
    },
    arrival(actor, clock) {
      const row=rows.get(actor.key);
      if (!row || actor.source!=='ambient' || row.status!=='planned') return;
      updateFoot(row,actor);
      row.status='arrived';
      row.statusClock=clock;
    },
    read(key) {
      const row=rows.get(key);
      return row ? JSON.parse(JSON.stringify(row)) : null;
    },
  });
})();
