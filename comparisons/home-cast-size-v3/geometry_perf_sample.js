// Optional short live observation after all opening pose and hit-test captures.
async () => {
  const game = window.HomeCastTrial;
  const native = window.qaNative;
  game.apply({extra:20,paused:false});
  for (const animation of window.qaPreviouslyPlaying || []) animation.play();
  const stage=document.getElementById('castStage');
  const population=stage.querySelectorAll('[data-diorama-actor]').length;
  const thaw=performance.now();
  await new Promise(resolve => requestAnimationFrame(resolve));
  const thawMs=performance.now()-thaw;
  const before=native.metrics();
  const originalStep=native.step;
  let steps=0, modelMs=0;
  native.step=function(...args) {
    const start=performance.now();
    try {
      return originalStep.apply(this,args);
    } finally {
      modelMs+=performance.now()-start;
      steps++;
    }
  };
  const start=performance.now(), gaps=[];
  let previous=start;
  try {
    await new Promise(resolve => {
      function frame() {
        const now=performance.now();
        gaps.push(now-previous);
        previous=now;
        if(now-start>=1200) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  } finally {
    native.step=originalStep;
  }
  const after=native.metrics(), elapsed=previous-start;
  gaps.sort((a,b)=>a-b);
  return {population,version:2,thawMs,extra:game.settings.extra,seconds:elapsed/1000,callbacks:gaps.length,
          rafHz:gaps.length*1000/elapsed,p95:gaps[Math.ceil(.95*gaps.length)-1],max:gaps.at(-1),
          nativeSteps:steps,modelMs,clock:after.clock-before.clock,distance:after.distance-before.distance,
          moves:after.moves-before.moves,paused:game.settings.paused};
}
