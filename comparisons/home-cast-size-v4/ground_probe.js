// Invoked inside the isolated native game by verify_ground.py.
() => {
  const stage = document.querySelector('#castStage');
  const state = HomeCastTrial.settings;
  const residents = HomeCastTrial.inspect();
  const shadows = [...stage.querySelectorAll('.diorama-shadow')];
  const contacts = [...stage.querySelectorAll('.beauty-foot:not([hidden])')];
  const extent = el => {
    const box = el.getBoundingClientRect();
    return [box.x, box.y, box.width, box.height];
  };
  function nearest(nodes, actor) {
    let best = null, distance = Infinity;
    for (const node of nodes) {
      const delta = Math.hypot(parseFloat(node.style.left) - actor.x, parseFloat(node.style.top) - actor.y);
      if (delta < distance) { best = node; distance = delta; }
    }
    if (best && distance < 0.01) {
      nodes.splice(nodes.indexOf(best), 1);
      return best;
    }
  }
  const art = HomeBeauty.paintRect;
  const clip = extent(stage.closest('.screen-frame'));
  const clipped = box => box[0] < Math.max(0,clip[0]) || box[1] < Math.max(0,clip[1]) ||
    box[0]+box[2] > Math.min(innerWidth,clip[0]+clip[2]) ||
    box[1]+box[3] > Math.min(innerHeight,clip[1]+clip[3]);
  const actors = residents.map(a => {
    const owner = stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]');
    const shadow = nearest(shadows, a);
    if (!shadow) throw Error('Missing shadow at '+a.key);
    const box = extent(shadow), looked = getComputedStyle(shadow);
    const sea = HomeBeauty.settings.region === 'sea';
    const water = sea && HomeBeauty.waterSurface((a.foot.x-art.left)/art.width, (a.foot.y-art.top)/art.height);
    const surface = shadow.dataset.surface || null;
    if (surface !== (sea ? water ? 'water' : 'ground' : null)) throw Error('Wrong shore at '+a.key);
    const material = HomeBeauty.settings.region === 'forest' ? 'grass' : water ? 'water' : null;
    const contact = nearest(contacts, a);
    if ((contact?.dataset.material || null) !== material) throw Error('Wrong contact at '+a.key);
    const expected = Math.max(20,a.w*.8*a.depth*HomeCastTrial.scale(a.kind));
    const formulaError = Math.abs(parseFloat(shadow.style.width)-expected);
    const visible = shadow.checkVisibility({opacityProperty:true, visibilityProperty:true}) &&
      box[2] > 0 && box[3] > 0 && looked.backgroundImage !== 'none';
    if (!visible || (contact && !contact.checkVisibility({opacityProperty:true,visibilityProperty:true})))
      throw Error('Hidden ground effect at '+a.key);
    const filter = getComputedStyle(owner).filter;
    if (!owner.hasAttribute('data-beauty-lit')) throw Error('Missing lighting at '+a.key);
    return {key:a.key,kind:a.kind,x:a.x,y:a.y,foot:a.foot,surface,material,filter,
      box,formulaError,shadowClipped:clipped(box),contactWidth:contact?.getBoundingClientRect().width || 0};
  });
  if (shadows.length || contacts.length) throw Error('Unassigned shadow or contact');
  const gear = [...stage.querySelectorAll('#petAccessory,.partner-ring,.partner-heart')].map((node,i)=>{
    const box=extent(node);
    return {key:i,role:node.id==='petAccessory'?'pet':'partner',box,clipped:clipped(box)};
  }).filter(a=>a.box[2]>0 && a.box[3]>0);
  const props=[...stage.querySelectorAll('#poopRow > *')].map(node=>[node.style.visibility,extent(node)]);
  return {gain:state.extra,actors,gear,props,art:[art.left,art.top,art.width,art.height]};
}
