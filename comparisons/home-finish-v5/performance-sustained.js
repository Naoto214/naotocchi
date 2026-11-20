// QA only. One native metrics snapshot per minute while the ordinary game
// schedules its own model, rendering, input and background work.
async ([seconds, seed]) => {
  const opening = finishPerf.reset(seed);
  finishPerf.parts = {};
  finishPerf.slow = [];
  const stage = document.querySelector('#castStage');
  const nodes = [...stage.querySelectorAll('[data-diorama-actor]')];
  const reactions = {};
  const onReaction = ({detail}) => { reactions[detail.type] = (reactions[detail.type] || 0) + 1; };
  stage.addEventListener('naotocchi:home-reaction', onReaction);
  const before = finishPerf.live.metrics();
  const gaps = [], minutes = [];
  const start = performance.now();
  let last = start, previousTime = start, previousFrame = 0, previousMetrics = before;
  let pausedMs = 0, previousPausedMs = 0, pauseStart = 0, lastCheck = 0, previousReason = '';
  const pauses = [], wallStart = Date.now();
  let nextBoundary = Math.min(seconds, 60) * 1000;
  const quantile = (sorted, fraction) => sorted[Math.ceil(sorted.length * fraction) - 1];
  const describe = (values, elapsedMs) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {elapsedMs, frames: values.length, hz: 1000 * values.length / elapsedMs,
      p50: quantile(sorted, .5), p95: quantile(sorted, .95), max: sorted.at(-1),
      over250: values.filter(t => t > 250).length, over500: values.filter(t => t > 500).length,
      over1000: values.filter(t => t > 1000).length};
  };
  HomeCastTrial.apply({paused: false});
  await new Promise(resolve => {
    function frame() {
      const now = performance.now();
      gaps.push(now - last);
      if (stage.dataset.dioramaPaused === "true") {
        pausedMs += now - last;
        if (!pauseStart) pauseStart = last;
        if (now - pauseStart >= 1000 && now - lastCheck >= 2000) {
          const reason = finishPerf.blockingState();
          const signature = JSON.stringify({...reason, lowerNoticeMs: reason.lowerNoticeMs > 0});
          if (signature !== previousReason) {
            const atMs = now - start;
            pauses.push({atMs, reason});
            console.info('sustained pause ' + JSON.stringify({atMs, reason}));
            previousReason = signature;
            if (reason.individuality && reason.buttons.some(([id, label]) => id === 'individualityLater' && label === 'あとで'))
              finishPerf.dismissRequested = {atMs, id: 'individualityLater', label: 'あとで'};
          }
          lastCheck = now;
        }
      } else {
        if (previousReason) pauses.push({atMs: now - start, resumed: true});
        pauseStart = 0; previousReason = '';
      }
      last = now;
      if (now - start >= nextBoundary) {
        const metrics = finishPerf.live.metrics();
        minutes.push({...describe(gaps.slice(previousFrame), now - previousTime),
          throughMs: now - start, pausedMs: pausedMs - previousPausedMs, clock: metrics.clock - previousMetrics.clock,
          moves: metrics.moves - previousMetrics.moves, distance: metrics.distance - previousMetrics.distance});
        previousPausedMs = pausedMs;
        previousFrame = gaps.length;
        previousTime = now;
        previousMetrics = metrics;
        nextBoundary = Math.min(seconds * 1000, nextBoundary + 60000);
      }
      if (now - start >= seconds * 1000) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  stage.removeEventListener('naotocchi:home-reaction', onReaction);
  const after = finishPerf.live.metrics();
  return {...describe(gaps, last - start), opening, minutes, intervals: gaps, reactions, pausedMs, pauses, wallElapsedMs: Date.now() - wallStart,
    phases: finishPerf.parts, slow: finishPerf.slow.map(([phase, a, b]) => [phase, a - start, b - start]),
    clock: after.clock - before.clock, moves: after.moves - before.moves,
    distance: after.distance - before.distance, activities: after.activities,
    sameNodes: nodes.every(node => node.isConnected), rows: nodes.length};
}
