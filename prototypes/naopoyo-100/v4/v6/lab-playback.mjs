// Input/presentation adapter only. The isolated step functions own every rule.
import {GestureHistory} from '../../gesture.mjs';
import {ComparisonPresentation} from '../presentation.mjs';
import {LabSession, restoreLab} from './lab-session.mjs';
import {createFlight, flightStep} from './flight.mjs';
import {createDig, digStep} from './digging.mjs';
import {labDocument} from './lab-render.mjs';

export function createLab(variant) {
  const flight = variant.startsWith('F');
  return new LabSession(flight ? 'flight' : 'dig', variant,
    flight ? createFlight : createDig, flight ? flightStep : digStep);
}
export class LabPlayback {
  constructor(session) {
    this.gestures = new GestureHistory();
    this.presentation = new ComparisonPresentation();
    this.load(session);
  }
  get document() {
    if (this.source !== this.session.state) {
      this.source = this.session.state;
      this.projection = labDocument(this.source);
    }
    return this.projection;
  }
  get state() { return this.document.state; }
  load(session) {
    this.session = session;
    this.source = null;
    this.gestures.reset(session.actions.map((_, i) => i));
    this.presentation.reset(this.state);
  }
  begin() { this.gestures.begin(this.session.actions.length); }
  end() { this.gestures.end(); }
  step(id, dx, dy, reduced = false) {
    const a = this.session.state.actors.find(a => a.id === id);
    const soil = a && this.session.state.cells[(a.y + dy) * 8 + a.x + dx] === 'soil';
    const type = this.session.variant === 'D2' && soil ? 'dig' : 'move';
    return this.act({type, id, dx, dy}, reduced);
  }
  act(action, reduced = false) {
    const before = this.state, length = this.session.actions.length;
    const result = this.session.act(action);
    if (!result.ok) return result;
    this.gestures.record(length);
    const dx = action.type === 'move' ? action.dx : 0;
    const dy = action.type === 'move' ? action.dy : 0;
    this.presentation.queue(before, this.state, {...result, events: result.events || []}, action.id, dx, dy, reduced);
    // Keep the shared easing/hit-testing; long flights expose every path segment.
    const frame = !reduced && this.presentation.motion.at(-1);
    if (frame) frame.duration *= Math.max(1, (result.events || []).filter(e => e.type === 'phase').length);
    return result;
  }
  undo() {
    const start = this.gestures.pop();
    if (start !== undefined) while (this.session.actions.length > start) this.session.undo();
    this.presentation.reset(this.state);
  }
  reset() { this.session.reset(); this.load(this.session); }
  strokeMetadata() {
    return {source: this.session.serialize(), groups: [...this.gestures.groups]};
  }
  restore(text, metadata = null) {
    const kind = JSON.parse(text)?.kind;
    if (!['flight', 'dig'].includes(kind)) throw Error('対応していない実験です');
    const session = restoreLab(text, kind, kind === 'flight' ? createFlight : createDig, kind === 'flight' ? flightStep : digStep);
    this.load(session);
    const g = metadata?.groups;
    const restoredStrokes = metadata?.source === text && Array.isArray(g) && Boolean(g.length) === Boolean(session.actions.length)
      && g.every((n, i) => Number.isInteger(n) && n >= 0 && n < session.actions.length && (i ? n > g[i - 1] : n === 0));
    if (restoredStrokes) this.gestures.reset(g);
    return restoredStrokes;
  }
}
