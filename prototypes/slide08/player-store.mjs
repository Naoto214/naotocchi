export const SLIDE_KEY = "naopoyo-slide-player-v1";
const total = () => ({ plays: 0, deaths: 0, fastest: null, fewest: null });
const object = (x) => x && typeof x === "object" && !Array.isArray(x);
const nonnegative = (n) => Number.isSafeInteger(n) && n >= 0;
const validTotal = (t) =>
  object(t) &&
  nonnegative(t.plays) &&
  nonnegative(t.deaths) &&
  (t.fastest === null || (Number.isFinite(t.fastest) && t.fastest >= 0)) &&
  (t.fewest === null || nonnegative(t.fewest));
export class SlideStore {
  constructor(storage) {
    this.storage = storage;
    this.revision = null;
  }
  read() {
    const raw = this.storage.getItem(SLIDE_KEY);
    if (!raw)
      return {
        version: 1,
        revision: 0,
        snapshot: null,
        history: [],
        seen: {},
        normal: total(),
        practice: total(),
      };
    const d = JSON.parse(raw);
    if (
      d?.version !== 1 ||
      !Number.isSafeInteger(d.revision) ||
      !Array.isArray(d.history) ||
      !object(d.seen) ||
      Object.values(d.seen).some((v) => v !== true) ||
      !validTotal(d.normal) ||
      !validTotal(d.practice)
    )
      throw Error("保存を読めません。上書きせず停止しました");
    return d;
  }
  load() {
    const d = this.read();
    this.revision = d.revision;
    return d;
  }
  save(snapshot, r = null) {
    const d = this.read();
    if (d.revision !== this.revision)
      throw Error("別のタブで更新されました。再読み込みしてください");
    if (r && !d.seen[r.id]) {
      d.seen[r.id] = true;
      d.history.unshift(structuredClone(r));
      const t = r.practice ? d.practice : d.normal;
      t.plays++;
      t.deaths += r.deaths;
      if (r.won) {
        t.fastest =
          t.fastest === null ? r.elapsedMs : Math.min(t.fastest, r.elapsedMs);
        t.fewest = t.fewest === null ? r.moves : Math.min(t.fewest, r.moves);
      }
    }
    d.history = d.history.slice(0, 100);
    d.snapshot = structuredClone(snapshot);
    d.revision++;
    this.storage.setItem(SLIDE_KEY, JSON.stringify(d));
    this.revision = d.revision;
    return d;
  }
}
