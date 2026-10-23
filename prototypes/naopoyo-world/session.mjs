import {
  clone,
  createState,
  move,
  externalMove,
  externalSplit,
  validState,
  complete,
} from "../naopoyo-v2/engine.mjs";
import { enteredCells } from "../naopoyo-v2/input.mjs";
export const KEY = "naopoyo.world.pilot.20261023.v1";
export const phase = (event, time) => {
  const t =
    (((time - (event.offset || 0)) % event.period) + event.period) %
    event.period;
  return t < event.warn ? "warn" : t < event.warn + event.on ? "on" : "off";
};
export class WorldSession {
  constructor(stage, saved = null) {
    this.stage = clone(stage);
    this.paused = false;
    this.active = null;
    this.history = [];
    this.lastResults = [];
    this.reset();
    if (saved) this.restore(saved);
  }
  reset() {
    this.state = createState(this.stage);
    this.time = 0;
    this.fired = {};
    this.hits = {};
    this.lastResults = [];
  }
  policy() {
    return {
      canEnter: (s, a, x, y) =>
        !s.guests?.some((g) => g.x === x && g.y === y) &&
        (!(s.water || []).some((p) => p[0] === x && p[1] === y) ||
          (this.stage.aquatic || ["fish"]).includes(a.species)),
    };
  }
  snapshot() {
    return clone({
      state: this.state,
      time: this.time,
      fired: this.fired,
      hits: this.hits,
    });
  }
  apply(s) {
    this.state = clone(s.state);
    this.time = s.time;
    this.fired = clone(s.fired);
    this.hits = clone(s.hits);
  }
  serialize() {
    return JSON.stringify({
      version: 1,
      stageId: this.stage.id,
      current: this.snapshot(),
      history: this.snapshots(),
    });
  }
  restore(raw) {
    try {
      const s = typeof raw === "string" ? JSON.parse(raw) : raw;
      const valid = (v) =>
        v &&
        validState(this.stage, v.state) &&
        Number.isSafeInteger(v.time) &&
        v.time >= 0 &&
        v.fired &&
        typeof v.fired === "object" &&
        v.hits &&
        typeof v.hits === "object" &&
        JSON.stringify(v.state.aquatic) ===
          JSON.stringify(this.stage.aquatic) &&
        v.state.actors.every((a) =>
          this.policy().canEnter(v.state, a, a.x, a.y),
        ) &&
        JSON.stringify(v.state.water) === JSON.stringify(this.stage.water) &&
        JSON.stringify(v.state.guests) === JSON.stringify(this.stage.guests) &&
        JSON.stringify(v.state.events) === JSON.stringify(this.stage.events) &&
        Object.values(v.fired).every(Number.isSafeInteger) &&
        Object.values(v.hits).every(
          (a) => Array.isArray(a) && a.every((id) => typeof id === "string"),
        );
      if (
        s.version !== 1 ||
        s.stageId !== this.stage.id ||
        !valid(s.current) ||
        !Array.isArray(s.history) ||
        s.history.length > 80 ||
        !s.history.every(valid)
      )
        return false;
      this.apply(s.current);
      this.history = clone(s.history);
      return true;
    } catch {
      return false;
    }
  }
  snapshots() {
    return [
      ...this.history,
      ...(this.active &&
      JSON.stringify(this.active.before) !== JSON.stringify(this.snapshot())
        ? [this.active.before]
        : []),
    ].slice(-80);
  }
  begin(id, p) {
    if (
      this.paused ||
      this.active ||
      !this.state.actors.some((a) => a.id === id) ||
      ![p?.x, p?.y].every(Number.isFinite)
    )
      return false;
    this.active = {
      id,
      before: this.snapshot(),
      last: { ...p },
      cursor: { x: Math.floor(p.x), y: Math.floor(p.y) },
    };
    return true;
  }
  rebase() {
    const a = this.state.actors.find((a) => a.id === this.active?.id);
    if (a) this.active.logical = { x: a.x, y: a.y };
  }
  travel(p) {
    this.lastResults = [];
    if (!this.active || this.paused || ![p?.x, p?.y].every(Number.isFinite))
      return [];
    const d = this.active;
    for (const [x, y] of enteredCells(d.last, p)) {
      const px = d.cursor.x,
        py = d.cursor.y;
      if (x === px && y === py) continue;
      const dx = x - px,
        dy = y - py;
      const r = move(this.state, d.id, dx, dy, this.policy());
      this.lastResults.push(r);
      if (r.ok) {
        d.cursor = { x, y };
        this.rebase();
        this.beams();
      }
    }
    d.last = { ...p };
    return this.lastResults;
  }
  end() {
    if (!this.active) return;
    this.history = this.snapshots();
    this.active = null;
  }
  undo() {
    this.end();
    const s = this.history.pop();
    if (!s) return false;
    this.apply(s);
    this.paused = true;
    return true;
  }
  retry() {
    this.active = null;
    this.history = [];
    this.reset();
  }
  checkpoint(before) {
    if (
      !this.active &&
      JSON.stringify(before.state) !== JSON.stringify(this.state)
    )
      this.history = [...this.history, before].slice(-80);
  }
  beams() {
    for (const e of [...(this.stage.events || [])].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      if (e.kind !== "beam" || phase(e, this.time) !== "on") continue;
      const cycle = Math.floor((this.time - (e.offset || 0)) / e.period);
      const key = e.id + ":" + cycle;
      this.hits[key] ??= [];
      for (const a0 of [...this.state.actors].sort((a, b) =>
        a.id.localeCompare(b.id),
      )) {
        const a = this.state.actors.find((v) => v.id === a0.id);
        if (
          !a ||
          this.hits[key].includes(a.id) ||
          !e.cells.some(([x, y]) => a.x === x && a.y === y)
        )
          continue;
        this.hits[key].push(a.id);
        const r = externalSplit(
          this.state,
          a.id,
          e.power,
          1,
          0,
          this.policy(),
          this.active?.id || a.id,
        );
        this.hits[key].push(...r.children.map((c) => c.id));
        this.lastResults.push(r);
        this.rebase();
      }
    }
  }
  advance(ms) {
    if (this.paused || complete(this.state)) return;
    if (!Number.isSafeInteger(ms) || ms < 0 || ms > 60000)
      throw Error("advance expects 0..60000 integer ms");
    const end = this.time + ms;
    while (this.time < end) {
      const before = this.snapshot();
      this.time++;
      for (const e of [...(this.stage.events || [])].sort(
        (a, b) =>
          (a.kind === "wave" ? 0 : 1) - (b.kind === "wave" ? 0 : 1) ||
          a.id.localeCompare(b.id),
      )) {
        const local = this.time - (e.offset || 0),
          cycle = Math.floor(local / e.period);
        if (
          e.kind !== "wave" ||
          local < 0 ||
          local % e.period !== e.warn ||
          this.fired[e.id] === cycle
        )
          continue;
        this.fired[e.id] = cycle;
        const list = [...this.state.actors]
          .filter((a) => !e.rows || e.rows.includes(a.y))
          .sort(
            (a, b) =>
              b.x * e.dx + b.y * e.dy - (a.x * e.dx + a.y * e.dy) ||
              a.id.localeCompare(b.id),
          );
        const consumed = new Set();
        for (const item of list) {
          const a = this.state.actors.find((v) => v.id === item.id);
          if (!a || consumed.has(a.id)) continue;
          const target = this.state.actors.find(
            (v) => v.x === a.x + e.dx && v.y === a.y + e.dy,
          );
          const r = externalMove(
            this.state,
            a.id,
            e.dx,
            e.dy,
            this.policy(),
            this.active?.id || a.id,
          );
          consumed.add(a.id);
          if (r.ok && target) consumed.add(target.id);
          this.lastResults.push(r);
          this.rebase();
        }
      }
      this.beams();
      this.checkpoint(before);
      if (complete(this.state)) break;
      // Keep only current/previous irradiation identifiers; snapshots retain their own sets.
      if (this.time % 1000 === 0)
        for (const key of Object.keys(this.hits)) {
          const split = key.lastIndexOf(":"),
            e = this.stage.events.find((e) => e.id === key.slice(0, split));
          if (
            e &&
            Number(key.slice(split + 1)) <
              Math.floor((this.time - (e.offset || 0)) / e.period) - 1
          )
            delete this.hits[key];
        }
    }
  }
}
