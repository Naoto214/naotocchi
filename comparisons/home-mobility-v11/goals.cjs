'use strict';

const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// The strings are compiled into the owner comparison's native model. Keeping
// this function next to idle() lets it use the game's foot, bounds and collision
// predicates without making a second implementation of navigation.
const chooseGoal = `    function chooseWanderGoal(a,raw) {
      const nav = scene.navigation;
      const failures = crowdMisses.get(a.key);
      if (actors.length <= 15 || !nav?.intentAware || !nav.intentScale) return raw;
      if (nav.valid(raw) && free(a, raw)) return raw;

      // Whole cast width and room width are in the same native projection.
      // Larger rooms keep their original walk draw until the owner has made
      // two unsuccessful ordinary choices. On a tightly packed floor, try
      // a legal bearing while space is still open, before the first refusal.
      const stillSeeking = failures && failures.choices >= 2 && clock - failures.since >= 20;
      const castWidth = actors.reduce((sum, resident) => sum + resident.w, 0);
      if (!stillSeeking && castWidth <= scene.width * 2.55) return raw;

      const scale = nav.intentScale;
      const dx = (raw.x - a.x) * scale.x, dy = (raw.y - a.y) * scale.y;
      const length = Math.hypot(dx, dy);
      if (length < 16) return raw;

      // Try to retain the length of the original walk. A short local shuffle
      // cannot substitute for a free walk. A less direct change of bearing
      // must still reduce the distance to the original point.
      const heading = Math.atan2(dy, dx);
      const quarter = Math.max(length * .25, 16);
      const ranges = new Set([length, length * .75, length * .5, quarter, Math.min(32, quarter)]);
      const box = bounds(a, scene);
      const empty = new Map();
      let chosen = raw;
      search: for (const range of ranges) {
        if (range < 16) continue;
        for (const turn of [0, 1, -1, 2, -2, 3, -3]) {
          const angle = heading + turn * Math.PI / 8;
          const q = {x: a.x + range * Math.cos(angle) / scale.x,
                     y: a.y + range * Math.sin(angle) / scale.y};
          if (q.x < box.left || q.x > box.right || q.y < box.top || q.y > box.bottom) continue;
          if (Math.hypot((q.x - raw.x) * scale.x, (q.y - raw.y) * scale.y) >= length - .75) continue;
          // Full native terrain, foreground, continuous contact and strict
          // endpoint separation. The native planner and stepper check again.
          if (nav.valid(q) && free(a, q) && yieldLeg(a, a, q, empty)) {
            chosen = q;
            break search;
          }
        }
      }

      return chosen;
    }
`;

function patchGoals(source, policy = 'final') {
  if (policy === 'v10' || policy === 'foot' || policy === 'baseline') return source;
  if (policy !== 'final') throw new Error('Unknown V11 wander policy: '+policy);
  const mark = '    function idle(a){';
  const finish = 'if(Math.abs(p.x-a.x)<35)p.x=a.x<scene.width/2?b.right:b.left;}';
  const output = replaceExact(source, mark, chooseGoal + mark);
  return replaceExact(output, finish, finish.slice(0,-1) + 'const raw=p;p=chooseWanderGoal(a,p);globalThis.HomeGoalDiagnostics?.proposal(a,raw,p,scene.navigation?.intentScale,clock);}');
}

// Read-only diagnostics are installed exclusively in the private comparison.
function patchGoalTelemetry(source) {
  let instrumented=replaceExact(source, '    request(key,source,goal,retry,clock){',
    '    request(key,source,goal,retry,clock){\n      globalThis.HomeGoalDiagnostics?.request(key,source,goal,clock);');
  instrumented=replaceExact(instrumented, '    result(q,accepted,a,actors,clock,classify){',
    '    result(q,accepted,a,actors,clock,classify){\n      globalThis.HomeGoalDiagnostics?.result(q,accepted,a,clock);');
  instrumented=replaceExact(instrumented, '    hop(a,p,clock){',
    '    hop(a,p,clock){\n      globalThis.HomeGoalDiagnostics?.hop(a,p);');
  instrumented=replaceExact(instrumented, '      for(const a of actors){\n        const r=row(a.key);r.activeSeconds+=dt;',
    '      for(const a of actors){\n        globalThis.HomeGoalDiagnostics?.state(a,clock);\n        const r=row(a.key);r.activeSeconds+=dt;');
  return replaceExact(instrumented, '    arrival(a,clock){',
    '    arrival(a,clock){\n      globalThis.HomeGoalDiagnostics?.arrival(a,clock);');
}
module.exports = {patchGoals, patchGoalTelemetry};
