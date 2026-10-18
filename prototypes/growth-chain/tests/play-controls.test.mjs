import test from "node:test";
import assert from "node:assert/strict";
import { bindHold } from "../touch-input.mjs";
import { animationFrames } from "../animation.mjs";
import { chainFixture } from "../fixtures.mjs";
import { applyAction } from "../session.mjs";

class Target extends EventTarget {
  disabled = false;
  setPointerCapture() {}
}
function pointer(t, type, id = 1) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, { pointerId: id, button: 0 });
  t.dispatchEvent(e);
}
function rig() {
  let queue = [],
    count = 0;
  const el = new Target(),
    release = new Target();
  const bind = bindHold(el, () => count++, {
    releaseTarget: release,
    setTimer: (fn) => {
      queue.push(fn);
      return queue.length;
    },
    clearTimer: () => {},
  });
  return {
    el,
    release,
    bind,
    flush: () => {
      const q = queue;
      queue = [];
      q.forEach((f) => f());
    },
    count: () => count,
  };
}
test("hold acts immediately, repeats, and stale timers cannot survive cancel", () => {
  const r = rig();
  pointer(r.el, "pointerdown");
  assert.equal(r.count(), 1);
  r.flush();
  assert.equal(r.count(), 2);
  pointer(r.release, "pointercancel");
  r.flush();
  assert.equal(r.count(), 2);
  r.bind.dispose();
});
test("extra fingers do not repeat or release another finger; pointer click does not double fire", () => {
  const r = rig();
  pointer(r.el, "pointerdown");
  pointer(r.el, "pointerdown", 2);
  assert.equal(r.count(), 1);
  pointer(r.release, "pointerup", 2);
  r.flush();
  assert.equal(r.count(), 2);
  pointer(r.release, "pointerup");
  const e = new Event("click");
  Object.assign(e, { detail: 1 });
  r.el.dispatchEvent(e);
  assert.equal(r.count(), 2);
  r.el.dispatchEvent(new Event("click"));
  assert.equal(r.count(), 3);
  r.bind.dispose();
});
test("blur and disabled controls stop repetition", () => {
  const r = rig();
  pointer(r.el, "pointerdown");
  r.release.dispatchEvent(new Event("blur"));
  r.flush();
  assert.equal(r.count(), 1);
  r.el.disabled = true;
  pointer(r.el, "pointerdown");
  assert.equal(r.count(), 1);
  r.bind.dispose();
});
test("wave playback preserves connect/evolve/fall order and final engine state", () => {
  const f = chainFixture(5),
    end = applyAction(f.state, f.action);
  const frames = animationFrames(end.last.waves, 300);
  assert.equal(frames.length, 15);
  assert.deepEqual(
    frames.slice(0, 3).map((f) => f.phase),
    ["connect", "evolve", "fall"],
  );
  assert.deepEqual(frames.at(-1).board, end.board);
  assert.ok(frames.some((f) => f.moves.some((m) => m.from.y !== m.to.y)));
  assert.deepEqual(
    frames.filter((f) => f.phase === "fall").map((f) => f.chain),
    [1, 2, 3, 4, 5],
  );
  assert.ok(frames.every((f) => f.duration > 0));
});
test("reduced motion preserves every wave result without movement", () => {
  const f = chainFixture(3),
    end = applyAction(f.state, f.action);
  const frames = animationFrames(end.last.waves, 300, true);
  assert.equal(frames.length, 3);
  assert.ok(frames.every((f) => f.moves.length === 0));
  assert.deepEqual(frames.at(-1).board, end.board);
});
