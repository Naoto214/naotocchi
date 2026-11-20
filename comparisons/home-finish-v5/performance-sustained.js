// QA only. One native metrics snapshot per minute while the ordinary game
// schedules its own model, rendering, input and background work.
async ([seconds, seed]) => {
  const opening = finishPerf.reset(seed);
  const stage = document.querySelector('#castStage');
  const nodes = [...stage.querySelectorAll('[data-diorama-actor]')];
  const reactions = {};
  const onReaction = ({detail}) => { reactions[detail.type] = (reactions[detail.type] || 0) + 1; };
  stage.addEventListener('naotocchi:home-reaction', onReaction);
  const before = finishPerf.live.metrics();
  const gaps = [], minutes = [];
  const start = performance.now();
  let last = start, previousTime = start, previousFrame = 0, previousMetrics = before;
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
      last = now;
      if (now - start >= nextBoundary) {
        const metrics = finishPerf.live.metrics();
        minutes.push({...describe(gaps.slice(previousFrame), now - previousTime),
          throughMs: now - start, clock: metrics.clock - previousMetrics.clock,
          moves: metrics.moves - previousMetrics.moves, distance: metrics.distance - previousMetrics.distance});
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
  return {...describe(gaps, last - start), opening, minutes, intervals: gaps, reactions,
    clock: after.clock - before.clock, moves: after.moves - before.moves,
    distance: after.distance - before.distance, activities: after.activities,
    sameNodes: nodes.every(node => node.isConnected), rows: nodes.length};
}
