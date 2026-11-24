// Injected by verify_hitches.py into its own localhost browser context.
(() => {
  const totals = Object.create(null);
  const spans = [], gaps = [], tasks = [], loaf = [], visibility = [], intervals = [];
  const observed = PerformanceObserver.supportedEntryTypes;
  let active = false, first = 0, lastWall, lastStamp;
  let frames = 0, stampTotal = 0, peak = 0, dropped = 0;

  function state() {
    const stage = document.querySelector('#castStage');
    function shown(id) {
      const el = document.getElementById(id);
      return !!el && !el.classList.contains('hidden');
    }
    return {
      visible: document.visibilityState,
      paused: stage?.dataset.dioramaPaused,
      choices: shown('speechChoices'),
      speech: shown('speechBubble'),
      lifeCard: shown('lifeCardOverlay'),
      actors: stage?.querySelectorAll('[data-diorama-actor]').length,
    };
  }

  // All calls contribute to totals. Keep a bounded journal of expensive calls
  // for exact interval intersections after the 10-minute capture.
  function span(label, start, end) {
    if (!active) return;
    const duration = end - start;
    const row = totals[label] ??= {calls: 0, totalMs: 0, maxMs: 0};
    row.calls++;
    row.totalMs += duration;
    row.maxMs = Math.max(row.maxMs, duration);
    if (duration >= .4) {
      if (spans.length < 360000) spans.push([label, start, end]);
      else dropped++;
    }
  }

  function frame(stamp) {
    if (active) {
      const wall = performance.now();
      if (lastWall !== undefined) {
        const delta = stamp - lastStamp;
        frames++;
        stampTotal += delta;
        intervals.push(delta);
        peak = Math.max(peak, delta);
        if (delta >= 249.9 || wall - lastWall >= 249.9) {
          gaps.push({
            from: lastWall,
            to: wall,
            stampFrom: lastStamp,
            stampTo: stamp,
            state: state(),
          });
        }
      }
      lastWall = wall;
      lastStamp = stamp;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function watch(type, callback) {
    if (!observed.includes(type)) return;
    new PerformanceObserver(list => {
      if (!active) return;
      for (const entry of list.getEntries()) {
        if (entry.startTime >= first) callback(entry);
      }
    }).observe({type});
  }

  watch('longtask', e => tasks.push([e.startTime, e.startTime + e.duration]));
  watch('long-animation-frame', e => {
    loaf.push({
      from: e.startTime,
      to: e.startTime + e.duration,
      renderAt: e.renderStart,
      layoutAt: e.styleAndLayoutStart,
      scripts: e.scripts.map(s => ({
        from: s.startTime,
        to: s.startTime + s.duration,
        file: s.sourceURL?.split('/').pop(),
        fn: s.sourceFunctionName,
        invoker: s.invoker,
        forcedLayoutMs: s.forcedStyleAndLayoutDuration,
      })),
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (active) visibility.push([performance.now(), document.visibilityState]);
  });

  window.hitchProbe = {
    span, state,
    start() {
      first = performance.now();
      active = true;
      return first;
    },
    checkpoint() {
      return {
        at: performance.now(), frames, peak, state: state(),
        gapCount: gaps.length, heap: performance.memory?.usedJSHeapSize,
      };
    },
    stop() {
      active = false;
      return {
        first, end: performance.now(), state: state(), frames, stampTotal, peak,
        gaps, tasks, loaf, spans, total: totals, visibility, observed, dropped,
        p95: intervals.sort((a, b) => a - b)[Math.floor(intervals.length * .95)],
      };
    },
  };
})();
