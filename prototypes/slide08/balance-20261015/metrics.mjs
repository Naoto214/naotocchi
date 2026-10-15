import { step, DIRS } from '../engine.mjs';
import { metrics } from '../metrics.mjs';
import { hash } from '../replay.mjs';
const occupied = (s) => s.board.filter(Boolean).length;
export function slideOptions(s) {
  return DIRS.map((dir) => step(s, { type: 'slide', dir }));
}
export function analyzePath(initial, path) {
  let s = initial,
    streak = 0,
    maxItemStreak = 0,
    itemsInLongStreaks = 0,
    slideChainActions = 0,
    largeClears = 0,
    largeSlideClears = 0,
    totalReduction = 0,
    slideReduction = 0,
    noImmediateSlideEvolution = 0,
    itemsAtNoImmediateSlideEvolution = 0,
    itemsEnablingSlides = 0;
  const steps = [];
  const endStreak = () => {
    maxItemStreak = Math.max(maxItemStreak, streak);
    if (streak >= 3) itemsInLongStreaks += streak;
    streak = 0;
  };
  for (const a of path) {
    const choices = slideOptions(s),
      canEvolve = choices.some((r) => r.waves.length),
      r = step(s, a);
    if (!r.valid) throw Error('Illegal measurement path');
    const item = a.type !== 'slide',
      before = occupied(s),
      after = occupied(r.state),
      reduction = before - after;
    if (!canEvolve) {
      noImmediateSlideEvolution++;
      if (item) itemsAtNoImmediateSlideEvolution++;
    }
    if (item) {
      streak++;
      if (
        !canEvolve &&
        !r.state.won &&
        slideOptions(r.state).some((q) => q.waves.length)
      )
        itemsEnablingSlides++;
    } else {
      endStreak();
      slideReduction += reduction;
      if (r.waves.length >= 2) slideChainActions++;
    }
    if (reduction >= 4) {
      largeClears++;
      if (!item) largeSlideClears++;
    }
    totalReduction += reduction;
    steps.push({
      action: a,
      beforeHash: hash(s),
      afterHash: hash(r.state),
      before,
      after,
      reduction,
      chain: r.waves.length,
      noImmediateSlideEvolution: !canEvolve,
      validSlideDirections: choices.filter((q) => q.valid).length,
      winning: r.state.won,
    });
    s = r.state;
  }
  endStreak();
  const base = metrics(initial, path),
    itemCount = path.filter((a) => a.type !== 'slide').length;
  const setupSlidesFollowedByEvolution = steps.filter(
    (x, i) =>
      x.action.type === 'slide' && x.chain === 0 && steps[i + 1]?.chain > 0,
  ).length;
  return {
    ...base,
    itemCount,
    itemRatio: path.length ? itemCount / path.length : null,
    meanReduction: path.length ? totalReduction / path.length : null,
    totalReduction,
    slideReduction,
    slideChainActions,
    largeClears,
    largeSlideClears,
    maxItemStreak,
    itemsInLongStreaks,
    noImmediateSlideEvolution,
    itemsAtNoImmediateSlideEvolution,
    itemsEnablingSlides,
    setupSlidesFollowedByEvolution,
    steps,
  };
}
