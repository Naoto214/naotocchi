// Inject only into the paused V7 comparator's model closure. Never changes a native actor.
globalThis.scanV7Crowd = function scanV7Crowd(fixture) {
  const nav = scene.navigation;
  const scale = nav.intentScale;
  if (Math.abs(scale.x - fixture.scale[0]) + Math.abs(scale.y - fixture.scale[1]) > 1e-8) {
    throw Error('V7 projected scale differs from the archive');
  }
  if (actors.map(a => a.key).join() !== fixture.agedFeet.map(row => row[0]).join()) {
    throw Error('V7 roster differs from the archive');
  }

  const cast = fixture.agedFeet.map(([key, x, y, w, h]) => {
    const a = {...actors.find(b => b.key === key), x, y, w, h};
    a.box = bounds(a, scene);
    a.canSee = scene.planVisibility?.(a) || (point => visible(a, point));
    return a;
  });
  const owner = cast.find(a => a.key === fixture.key);
  const target = fixture.goal;
  const distance = (a, b) => Math.hypot((a.x - b.x) * scale.x, (a.y - b.y) * scale.y);
  const ray = (a, length, degrees) => ({
    x: a.x + length * Math.cos(degrees * Math.PI / 180) / scale.x,
    y: a.y + length * Math.sin(degrees * Math.PI / 180) / scale.y
  });
  const inside = (a, p) => p.x >= a.box.left && p.x <= a.box.right &&
    p.y >= a.box.top && p.y <= a.box.bottom;
  const safe = (a, p, b, foot = b) => contactSegmentSafe(a, p, foot,
    (a.w + b.w) * .5 + 10, (a.h + b.h) * .38 + 10);
  const obstacles = (a, p) => cast.filter(b => b !== a && !safe(a, p, b));
  const initial = cast.filter(b => b !== owner && clearance(owner, owner, b) < 1);
  const goalGround = inside(owner, target) && nav.segmentSafe(owner, target, owner.canSee);

  // Under contactSegmentSafe, a step from an existing overlap must have a
  // nonnegative derivative of squared ellipse clearance at the original foot.
  // Enumerate the exact angular breakpoints (in screen space) of these half planes.
  const normals = initial.map(b => {
    const rx = (b.w + owner.w) * .5 + 10;
    const ry = (b.h + owner.h) * .38 + 10;
    return {x: (owner.x - b.x) / (rx * rx * scale.x),
      y: (owner.y - b.y) / (ry * ry * scale.y)};
  });
  const angles = new Set([0, 360]);
  for (const {x, y} of normals) {
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    for (const end of [-90, 90]) angles.add((angle + end + 360) % 360);
  }
  const cuts = [...angles].sort((a, b) => a - b), coneDegrees = [];
  for (let i = 1; i < cuts.length; i++) {
    const mid = (cuts[i - 1] + cuts[i]) * Math.PI / 360;
    if (normals.every(n => n.x * Math.cos(mid) + n.y * Math.sin(mid) >= 0)) {
      coneDegrees.push([cuts[i - 1], cuts[i]]);
    }
  }

  const nearOrigin = {};
  for (const radius of [.1, .25, .5, 1, 2, 3, 4, 6]) {
    const reasons = {};
    for (let angle = 0; angle < 360; angle += .25) {
      const p = ray(owner, radius, angle);
      if (initial.some(b => !safe(owner, p, b))) continue;
      const blocked = obstacles(owner, p).map(b => b.key);
      if (!inside(owner, p)) blocked.unshift('bounds');
      else if (!nav.segmentSafe(owner, p, owner.canSee)) blocked.unshift('terrain/visibility');
      const reason = blocked.join('+') || 'free';
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
    nearOrigin[radius] = reasons;
  }

  // Generously allow even busy neighbors to help. Reject geometry only. Every
  // possible first helper must already have a safe straight foot path; then
  // check the second helper and owner against those future stationary feet.
  const options = new Map(), freeMoves = new Map();
  const radii = [2,3,4,5,6,7,8,10,12,14,16,18,20,22,24];
  for (const a of cast) {
    const candidates = [];
    for (const radius of radii) {
      for (let degrees = 0; degrees < 360; degrees += 3) {
        const p = ray(a, radius, degrees);
        if (!inside(a, p)) continue;
        const blocked = obstacles(a, p);
        if (blocked.length <= 2 && nav.segmentSafe(a, p, a.canSee)) {
          candidates.push({p, radius, blocked});
        }
      }
    }
    options.set(a, candidates);
    freeMoves.set(a, candidates.filter(c => !c.blocked.length));
  }
  const viable = options.get(owner).filter(c => c.radius >= 3 &&
    distance(c.p, target) < distance(owner, target) - .75);
  const counts = [0, 0, 0];
  for (const route of viable) {
    if (!route.blocked.length) {
      counts[0]++;
      continue;
    }
    for (const second of route.blocked) {
      for (const step of options.get(second)) {
        if (step.blocked.length > 1 || !safe(owner, route.p, second, step.p)) continue;
        if (route.blocked.length === 1 && !step.blocked.length) {
          counts[1]++;
          continue;
        }
        const first = route.blocked.find(b => b !== second) || step.blocked[0];
        if (!first || first === owner || first === second || step.blocked.some(b => b !== first)) continue;
        if (freeMoves.get(first).some(start => safe(owner, route.p, first, start.p) &&
          safe(second, step.p, first, start.p))) counts[2]++;
      }
    }
  }
  return {start: [owner.x, owner.y], target, topMarginCss: (owner.y - owner.box.top) * scale.y,
    goalGround, contactsAtStart: initial.map(b => ({key: b.key, clearance: clearance(owner, owner, b)})),
    coneDegrees, nearOrigin, directSoloHeadings: freeMoves.get(owner).length,
    boundedNearFingerCandidates: viable.length, viablePlansByHelpers: counts};
};
