// Installed by the measurement harness, while the native home is still frozen.
(() => {
  const stage = document.getElementById('castStage');
  const reactions = {};
  stage.addEventListener('naotocchi:home-reaction', ({detail}) => {
    reactions[detail.type] = (reactions[detail.type] || 0) + 1;
  });
  const point = element => {
    const [x,y] = element.style.transformOrigin.split(/\s+/).map(parseFloat);
    return [parseFloat(element.style.left)+x, parseFloat(element.style.top)+y];
  };
  touchQA.presentationFrame = () => {
    const hero = stage.querySelector('[data-diorama-actor^="pet:"]');
    const gear = document.getElementById('petAccessory');
    const visibleRibbon = !!gear && !gear.classList.contains('hidden') && gear.getBoundingClientRect().width>0;
    const shadows = Array.from(stage.querySelectorAll('.diorama-shadow'));
    const items = HomeCastTrial.inspect();
    let missingShadow = 0;
    for (const item of items) {
      const i = shadows.findIndex(s => Math.abs(parseFloat(s.style.left)-item.x)<.02 &&
                                        Math.abs(parseFloat(s.style.top)-item.y)<.02);
      if(i<0) missingShadow++; else shadows.splice(i,1);
    }
    const anchor = hero && visibleRibbon ? Math.hypot(...point(hero).map((v,i) => v-point(gear)[i])) : null;
    return {visibleRibbon, ribbonAnchorError:anchor, sameRibbonTranslation:visibleRibbon && gear.style.translate===hero.style.translate,
      sameRibbonScale:visibleRibbon && gear.style.scale===hero.style.scale, missingShadow, extraShadows:shadows.length,
      events:{...reactions}};
  };
})();
