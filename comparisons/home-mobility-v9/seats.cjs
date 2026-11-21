// Optional owner-only opening. Build injects the function into the native model
// so navigation, painted ink, contact ellipses and initial lead corridor stay native.
function compareSeats(actors, navigation, boxFor, inkFor, contactSafe, keepsLane) {
  const scale = navigation.intentScale;
  const sectors = 24;
  const directions = Array.from({length: sectors}, (_, i) => {
    const angle = i * 2 * Math.PI / sectors;
    return {x: Math.cos(angle) / scale.x, y: Math.sin(angle) / scale.y};
  });
  const initial = actors.map(a => ({x: a.x, y: a.y}));
  const boxes = actors.map(boxFor), visible = actors.map(inkFor);
  const changed = new Set();
  const within = (p,b) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
  const point = (from,dir,d) => ({x: from.x + dir.x * d, y: from.y + dir.y * d});
  const peers = actors.map((a, i) => actors.flatMap((b, j) => i === j ? [] : [{j, rx: (a.w+b.w)*.5+10, ry: (a.h+b.h)*.38+10}]));
  const safe = (from,to,peer,at) => contactSafe(from,to,at,peer.rx,peer.ry);

  // Cache static terrain rays at each proposed seat. Each resident uses its own
  // ink bounds. A short straight walk must be possible along the whole segment.
  const terrainRays = actors.map(() => new Map());
  function rays(i, from) {
    const key = from.x + ',' + from.y, cache = terrainRays[i];
    if (cache.has(key)) return cache.get(key);
    const ends = directions.map(dir => point(from,dir,8)).filter(end =>
      within(end,boxes[i]) && navigation.segmentSafe(from,end,visible[i]));
    cache.set(key,ends);
    return ends;
  }
  function possible(i, from) {
    return rays(i,from).map(end => {
      const blockers = peers[i].filter(peer => !safe(from,end,peer,actors[peer.j]));
      return {end, blockers};
    });
  }
  function contactAllowed(i, from, to) {
    return peers[i].every(peer => {
      const b = actors[peer.j];
      const gap = p => ((p.x-b.x)/peer.rx)**2 + ((p.y-b.y)/peer.ry)**2;
      return gap(to) + 1e-10 >= Math.min(1,gap(from));
    });
  }
  // A pass may open an exit for the resident whose seat is scored or for a
  // blocked neighbor. Only one resident changes per pass, at most once each.
  for (let pass=0; pass<4; pass++) {
    const reference = actors.map((a,i) => possible(i,a));
    const counts = reference.map(lines => lines.filter(l => !l.blockers.length).length);
    const candidates = new Set();
    for (let i=0; i<actors.length; i++) if (!counts[i]) {
      candidates.add(i);
      for (const line of reference[i]) if (line.blockers.length===1) candidates.add(line.blockers[0].j);
    }
    let best = null;
    for (const i of candidates) {
      if (changed.has(i)) continue;
      const from = initial[i];
      const neighbors = peers[i].filter(({j,rx,ry}) =>
        Math.abs(from.x-actors[j].x) <= rx+24/scale.x && Math.abs(from.y-actors[j].y) <= ry+24/scale.y);
      for (const distance of [4,8,12,16]) for (const dir of directions) {
        const to = point(from,dir,distance);
        if (!within(to,boxes[i]) || !contactAllowed(i,from,to) || !navigation.segmentSafe(from,to,visible[i]) || !keepsLane(i,to)) continue;
        const own = rays(i,to).filter(end => peers[i].every(peer => safe(to,end,peer,actors[peer.j]))).length;
        if (own < Math.min(counts[i],2)) continue;
        let opened = !counts[i] && own>0 ? 1 : 0;
        let preserved = true;
        for (const peer of neighbors) {
          const j=peer.j, a=actors[j];
          const next = reference[j].filter(({end,blockers}) =>
            (blockers.length===0 || blockers.length===1 && blockers[0].j===i) && safe(a,end,peer,to)).length;
          if (next < Math.min(counts[j],2)) { preserved=false; break; }
          if (!counts[j] && next) opened++;
        }
        if (preserved && opened && (!best || opened>best.opened || opened===best.opened && distance<best.distance)) best={i,to,opened,distance};
      }
    }
    if (!best) break;
    Object.assign(actors[best.i],best.to);
    changed.add(best.i);
  }
}

function patchSeats(source) {
  const anchor = '        seated.push(a);\n      }';
  if (source.split(anchor).length !== 2) throw new Error('Expected native sync seating loop');
  const state = '    function sync(list,next){';
  if (source.split(state).length !== 2) throw new Error('Expected one native model sync');
  source = source.replace(state, '    let consideredFreshSeats=false;\n' + state);
  return source.replace(anchor, anchor + `
      if (!consideredFreshSeats && next.compareFreshSeats === true && actors.length === 28 && !previousActors.length && !clock && !selected &&
          scene.navigation?.intentScale && scene.navigation?.segmentSafe) {
        consideredFreshSeats=true;
        const keepsLane=(i,to)=>{
          const a=actors[i];
          if(!exit.length)return true;
          if(a!==lead)return exit.every(q=>separated(lead,q,{...a,...to}));
          const end=exit.at(-1);
          return scene.navigation.segmentSafe(to,end,scene.planVisibility?.(a)||(p=>visible(a,p))) &&
            actors.every(b=>b===a||contactSegmentSafe(to,end,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10));
        };
        (${compareSeats.toString()})(actors,scene.navigation,a=>bounds(a,scene),
          a=>scene.planVisibility?.(a)||(p=>visible(a,p)),contactSegmentSafe,keepsLane);
      }`);
}
module.exports = {patchSeats};
if (require.main===module) process.stdout.write(patchSeats(require('node:fs').readFileSync(0,'utf8')));
