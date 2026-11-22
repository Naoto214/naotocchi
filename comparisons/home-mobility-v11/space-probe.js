// Installed inside a paused native model by space_capture.py. Every probe uses copies of the feet.
globalThis.forestSpaceSurvey = (() => {
  const nav = scene.navigation;
  const scale = nav.intentScale;
  const radii = (a, b) => [((a.w + b.w) / 2 + 10), ((a.h + b.h) * .38 + 10)];
  const inBox = (p, b) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
  function roster(feet) {
    return feet.map(([key, x, y, w, h]) => {
      const resident = actors.find(actor => actor.key === key);
      if (!resident || resident.w !== w || resident.h !== h) throw Error('Resident size or identity changed: ' + key);
      const actor = {...resident, x, y};
      return {...actor, box: bounds(actor, scene), ink: scene.planVisibility(actor)};
    });
  }
  function decide(a, target, others) {
    if (!inBox(target, a.box) || !nav.segmentSafe(a, target, a.ink)) return null;
    const dx = target.x - a.x, dy = target.y - a.y;
    const t = Math.min(1, .35 / Math.hypot(dx, dy));
    const first = {x: a.x + t * dx, y: a.y + t * dy};
    return others.filter(b => {
      const [rx, ry] = radii(a, b);
      const before = clearance(a, a, b);
      return !contactSegmentSafe(a, target, b, rx, ry) ||
        !(before >= 1 || clearance(a, first, b) >= 1 || clearance(a, first, b) > before + 1e-6);
    });
  }
  function rays({feet, sectors, distances}) {
    const residents = roster(feet);
    return residents.map(a => {
      const others = residents.filter(b => b !== a);
      const contacts = others.map(b => [b.key, clearance(a, a, b)]).filter(([,d]) => d < 1);
      const result = distances.map(radius => {
        const safe = [], blockers = {}, counts = [0,0,0,0];
        let legal = 0;
        for (let i = 0; i < sectors; i++) {
          const theta = i * 2 * Math.PI / sectors;
          const to = {x:a.x + radius * Math.cos(theta) / scale.x, y:a.y + radius * Math.sin(theta) / scale.y};
          const hit = decide(a, to, others);
          if (hit === null) continue;
          legal++;
          counts[Math.min(3, hit.length)]++;
          if (!hit.length) safe.push(i);
          for (const peer of hit) blockers[peer.key] = (blockers[peer.key] || 0) + 1;
        }
        return {safe, legal, counts, blockers};
      });
      return {key:a.key, x:a.x, y:a.y, w:a.w, h:a.h, box:a.box, contacts, result};
    });
  }
  function geometry({feet, step}) {
    const residents = roster(feet);
    const cols = Math.floor(scene.width * scale.x / step);
    const rows = Math.floor(scene.height * scale.y / step);
    const size = cols * rows;
    const terrain = new Uint8Array(size);
    const allowed = residents.map(() => new Uint8Array(size));
    for (let j = 0; j < rows; j++) {
      const y = (j + .5) * step / scale.y;
      for (let i = 0; i < cols; i++) {
        const at = j * cols + i;
        const p = {x:(i + .5) * step / scale.x, y};
        if (!nav.valid(p)) continue;
        terrain[at] = 1;
        residents.forEach((a, n) => {
          if (inBox(p, a.box) && a.ink(p)) allowed[n][at] = 1;
        });
      }
    }
    function pack(mask) {
      const octets = new Uint8Array(Math.ceil(mask.length / 8));
      mask.forEach((value, i) => { if (value) octets[i >> 3] |= 1 << (i & 7); });
      return btoa(String.fromCharCode(...octets));
    }
    return {cols,rows,step,scale,model:[scene.width,scene.height],terrain:pack(terrain),allowed:allowed.map(pack),
      keys:residents.map(a=>a.key)};
  }
  function passing({feet, step, laneLength}) {
    const residents = roster(feet);
    // Two median-sized companions, kept identical for both seat layouts at a given width.
    const ranked = residents.filter(a => a.kind==='companion').sort((a,b)=>a.w*a.h-b.w*b.h||a.key.localeCompare(b.key));
    const a = ranked[12], b = ranked[13], others = residents.filter(p => p!==a && p!==b);
    const [rx,ry] = radii(a,b), angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4];
    let terrainSites=0, occupiedSites=0;
    const examples = [];
    const routeSafe = (actor, p, q) => inBox(p,actor.box) && inBox(q,actor.box) && nav.segmentSafe(p,q,actor.ink);
    const clear = (actor, p, q) => others.every(peer => {
      const [x,y] = radii(actor,peer);
      return Math.hypot((p.x-peer.x)/x,(p.y-peer.y)/y)>=1 && contactSegmentSafe(p,q,peer,x,y);
    });
    for(let y=step/2;y<scene.height*scale.y;y+=step) for(let x=step/2;x<scene.width*scale.x;x+=step){
      let staticPass=false, occupiedPass=false;
      for(const th of angles) {
        const ux=Math.cos(th),uy=Math.sin(th),nx=-uy,ny=ux;
        // Tangent parallel lines separated by a 2 CSS px margin in the ellipse's support direction.
        const separation=Math.hypot(rx*scale.x*nx,ry*scale.y*ny)+2;
        const point=(lane,t)=>({x:(x+lane*nx*separation/2+t*ux*laneLength/2)/scale.x,
                                   y:(y+lane*ny*separation/2+t*uy*laneLength/2)/scale.y});
        for(const sign of [-1,1]){
          const p=point(sign,-1),q=point(sign,1),r=point(-sign,1),s=point(-sign,-1);
          if (!routeSafe(a,p,q)||!routeSafe(b,r,s)) continue;
          staticPass=true;
          if(clear(a,p,q)&&clear(b,r,s)){
            occupiedPass=true;
            if(examples.length<5) examples.push({centerCSS:[x,y],angle:th*180/Math.PI,laneGapCSS:separation});
            break;
          }
        }
        if(occupiedPass)break;
      }
      terrainSites+=Number(staticPass);occupiedSites+=Number(occupiedPass);
    }
    return {pair:[a.key,b.key],step,laneLength,terrainSites,occupiedSites,examples};
  }
  return {geometry,rays,passing};
})();
