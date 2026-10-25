// Presentation only: consumes committed phase events; never edits a board or save.
export const GATE_PULSE_MS = 240;
export function overlapsGate(actor, gate) {
  return actor.opacity > 0.05 && Math.abs(actor.x - gate.x) < 0.66 && Math.abs(actor.y - gate.y) < 0.66;
}
// Keep the condition away from white actor head numbers on diagonal travel.
// Prefer the familiar left jamb; switch only when their glyph bounds intersect.
export function gateNumberAnchor(gate, actors) {
  const candidates=[{x:.145,y:.58},{x:.855,y:.58},{x:.5,y:.83}];
  const visible=actors.filter(a=>a.opacity>.05);
  const clearance=p=>Math.min(Infinity,...visible.map(a=>Math.max(
    Math.abs(gate.x+p.x-a.x-.5)/.32,Math.abs(gate.y+p.y-a.y-.18)/.35)));
  return candidates.find(p=>clearance(p)>=1)||candidates.reduce((best,p)=>clearance(p)>clearance(best)?p:best);
}
export class GateEffects {
  constructor() { this.state = null; this.pending = new Map(); this.seen = new WeakSet(); this.pulses = new Map(); this.lastTime = 0; }
  sample(q, actors, now = q.time, reduced = false) {
    if (this.state !== q.state || now < this.lastTime) {
      this.state = q.state; this.pending.clear(); this.pulses.clear(); this.seen = new WeakSet();
    }
    this.lastTime = now;
    for (const frame of q.motion) {
      if (this.seen.has(frame)) continue;
      this.seen.add(frame);
      if (!reduced) this.pending.set(frame, new Set(frame.events.filter(e => e.type === 'phase')));
    }
    if (reduced) { this.pending.clear(); this.pulses.clear(); }
    for (const [frame, events] of this.pending) {
      const finished = frame.elapsed >= frame.duration;
      if (!q.motion.includes(frame) && !finished) { this.pending.delete(frame); continue; }
      for (const e of events) {
        const gate = q.state.gates.find(g => g.x === e.x && g.y === e.y && g.exact === e.level);
        if (!gate) { events.delete(e); continue; }
        // Completed frames catch compressed queues; visible overlap delays falling
        // effects until the actor actually reaches the gate, rather than input time.
        if (finished || (frame === q.motion[0] && actors.some(a => a.id === e.id && overlapsGate(a, gate)))) {
          this.pulses.set(`${e.x},${e.y}`, now); events.delete(e);
        }
      }
      if (!events.size || finished) this.pending.delete(frame);
    }
    for (const [key, start] of this.pulses) if (now - start >= GATE_PULSE_MS) this.pulses.delete(key);
    return q.state.gates.map(g => {
      const start = this.pulses.get(`${g.x},${g.y}`);
      return {...g, numberAnchor:gateNumberAnchor(g,actors), occupied: actors.some(a => overlapsGate(a, g)),
        pulse: start === undefined ? 0 : Math.sin(Math.PI * Math.min(1, (now - start) / GATE_PULSE_MS))};
    });
  }
}
