// Player lifecycle is independent of the deterministic, shared rule engine.
import {
  applyAction,
  spawnPose,
  movePose,
  fits,
  stateData,
  replay,
  stateHash,
  poseCells,
} from "./session.mjs";
import { pathToPose } from "../growth-chain/live-tools.mjs";
export { toolTransaction } from "./live-tools.mjs";
import { toolTransaction } from "./live-tools.mjs";
import { cloneBoard } from "../growth-chain/engine.mjs";
import { groups } from "./engine.mjs";
export const fallInterval = (drops) =>
  Math.max(800, 1500 - (700 * Math.min(200, drops)) / 200);
export function directPreview(s, a) {
  const b = cloneBoard(s.board);
  let placed = null;
  if (a.type === "egg") {
    let y = b.length - 1;
    while (y >= 2 && b[y][a.x]) y--;
    if (y < 2) throw Error("この列には置けません");
    placed = { x: a.x, y };
    b[y][a.x] = { id: s.nextId, k: a.k, s: a.rank + 1 };
  } else if (a.type === "transform") b[a.y][a.x].k = a.to;
  else if (a.type === "bulk")
    for (const row of b) for (const c of row) if (c?.k === a.from) c.k = a.to;
  return {
    board: b,
    cells: groups(b, s.rules)
      .flat()
      .map(({ x, y }) => ({ x, y })),
    placed,
  };
}
export class Player {
  constructor(
    state,
    {
      mode = "clear",
      practice = false,
      id = globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random()}`,
    } = {},
  ) {
    replay({ initial: state, actions: [] });
    this.initial = stateData(structuredClone(state));
    this.actions = [];
    this.state = structuredClone(state);
    this.mode = mode;
    this.practice = practice;
    this.id = id;
    this.category = mode === "clear" ? "clear" : "endless";
    this.phase = "paused";
    this.resumePhase = "playing";
    this.pose = spawnPose(state.rules);
    this.path = [];
    this.fallMs = 0;
    this.lockMs = 0;
    this.resets = 0;
    this.elapsed = 0;
    this.revision = 0;
    this.records = [];
    this.maxChain = 0;
    this.deaths = 0;
    this.cleared = false;
  }
  get active() {
    return this.phase === "playing" && !this.state.over;
  }
  get grounded() {
    return !movePose(this.state.board, this.pose, "down");
  }
  pause() {
    if (["playing", "animating"].includes(this.phase)) {
      this.resumePhase = this.phase;
      this.phase = "paused";
    }
  }
  resume() {
    if (this.phase === "paused") this.phase = this.resumePhase;
  }
  rebase() {
    const path = pathToPose(this.state.board, this.state.rules, this.pose);
    if (path === null) throw Error("落下位置が無効です");
    this.path = path;
  }
  motion(op) {
    if (!this.active) return false;
    const grounded = this.grounded;
    let q = null;
    if (op === "ccw") {
      for (const kick of [0, 1, -1]) {
        const n = {
          ...this.pose,
          x: this.pose.x + kick,
          rot: (this.pose.rot + 3) % 4,
        };
        if (
          fits(this.state.board, n) &&
          pathToPose(this.state.board, this.state.rules, n) !== null
        ) {
          q = n;
          break;
        }
      }
    } else q = movePose(this.state.board, this.pose, op);
    if (!q) return false;
    this.pose = q;
    this.rebase();
    this.revision++;
    if (grounded && op !== "down" && this.resets < 10) {
      this.lockMs = 0;
      this.resets++;
    }
    return true;
  }
  advance(ms) {
    if (!this.active || !Number.isFinite(ms) || ms <= 0) return;
    // Consume exact event intervals; no independent timer can lock or fall twice.
    while (ms > 0 && this.active) {
      const grounded = this.grounded,
        wait = grounded
          ? 600 - this.lockMs
          : fallInterval(this.state.drops) - this.fallMs;
      const dt = Math.min(ms, Math.max(0, wait));
      this.elapsed += dt;
      ms -= dt;
      if (grounded) this.lockMs += dt;
      else this.fallMs += dt;
      if (dt < wait) break;
      if (grounded) {
        try {
          this.drop();
        } catch (error) {
          this.lockMs = 0;
          throw error;
        }
        break;
      } else {
        this.fallMs = 0;
        this.motion("down");
      }
    }
  }
  preview(action) {
    if (!this.active) throw Error("今は道具を使えません");
    const expectedId =
      action.type === "transform"
        ? this.state.board[action.y]?.[action.x]?.id
        : undefined;
    toolTransaction(this.state, this.pose, action, expectedId);
    return {
      action: structuredClone(action),
      expectedId,
      revision: this.revision,
      direct: directPreview(this.state, action),
    };
  }
  use(token) {
    if (!this.active) throw Error("今は道具を使えません");
    if (token.revision !== this.revision)
      throw Error("盤面が変わりました。選び直してください");
    const tx = toolTransaction(
      this.state,
      this.pose,
      token.action,
      token.expectedId,
    );
    this.actions.push(structuredClone(token.action));
    this.accept(tx.state, tx.pose, tx.path);
  }
  drop() {
    if (!this.active) return false;
    const s = applyAction(this.state, {
      type: "drop",
      path: [...this.path, "hard"],
    });
    this.actions.push({ type: "drop", path: [...this.path, "hard"] });
    this.accept(s, spawnPose(s.rules), []);
    this.fallMs = 0;
    this.lockMs = 0;
    this.resets = 0;
    return true;
  }
  accept(state, pose, path) {
    this.state = state;
    this.pose = pose;
    this.path = path;
    this.revision++;
    this.maxChain = Math.max(this.maxChain, state.last.waves.length);
    this.deaths += state.last.deaths;
    this.phase = state.last.waves.length ? "animating" : "playing";
    if (this.phase === "playing") this.settle();
  }
  record(outcome) {
    if (this.practice) return;
    const key = `${this.id}:${this.category}`;
    if (this.records.some((r) => r.id === key)) return;
    this.records.push({
      id: key,
      runId: this.id,
      category: this.category,
      outcome,
      gaugeUnit: this.state.rules.gaugeUnit,
      seed: this.state.seed,
      score: this.state.score,
      drops: this.state.drops,
      elapsed: this.elapsed,
      maxChain: this.maxChain,
      deaths: this.deaths,
      date: new Date().toISOString(),
    });
  }
  settle() {
    if (this.phase === "paused") return;
    this.phase = "playing";
    if (this.mode === "clear" && !this.cleared && this.deaths > 0) {
      this.cleared = true;
      this.record("clear");
      this.phase = "won";
    } else if (this.state.over) {
      this.record("over");
      this.phase = "over";
    }
  }
  continueEndless() {
    if (this.phase !== "won") return false;
    this.mode = "endless";
    this.category = "post-clear";
    this.phase = "playing";
    this.settle();
    return true;
  }
  snapshot() {
    if (
      this.phase === "animating" ||
      (this.phase === "paused" && this.resumePhase === "animating")
    )
      return null;
    return {
      version: 1,
      initial: structuredClone(this.initial),
      actions: structuredClone(this.actions),
      state: stateData(this.state),
      mode: this.mode,
      practice: this.practice,
      id: this.id,
      category: this.category,
      pose: { ...this.pose },
      path: [...this.path],
      fallMs: this.fallMs,
      lockMs: this.lockMs,
      resets: this.resets,
      elapsed: this.elapsed,
      revision: this.revision,
      records: structuredClone(this.records),
      maxChain: this.maxChain,
      deaths: this.deaths,
      cleared: this.cleared,
      terminal: ["won", "over"].includes(this.phase) ? this.phase : null,
    };
  }
  static restore(data) {
    if (data?.version !== 1) throw Error("保存形式が対応していません");
    const verified = replay({
      initial: data.initial,
      actions: data.actions,
      hash: stateHash(data.state),
    });
    const p = new Player(verified, data);
    for (const k of [
      "fallMs",
      "lockMs",
      "resets",
      "elapsed",
      "revision",
      "maxChain",
      "deaths",
    ])
      if (!Number.isFinite(data[k]) || data[k] < 0)
        throw Error("保存データが不正です");
    if (
      data.fallMs > 1500 ||
      data.lockMs > 600 ||
      data.resets > 10 ||
      !["clear", "endless"].includes(data.mode) ||
      !["clear", "endless", "post-clear"].includes(data.category) ||
      !Array.isArray(data.records)
    )
      throw Error("保存データが不正です");
    Object.assign(p, structuredClone(data));
    delete p.version;
    delete p.terminal;
    if (!data.state.over) {
      if (!fits(p.state.board, p.pose)) throw Error("保存位置が不正です");
      p.rebase();
    }
    p.phase = data.terminal || "paused";
    p.resumePhase = "playing";
    return p;
  }
}
