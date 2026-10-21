import { INITIAL_SPECIES } from "../growth-chain/roster.mjs";
export const SETTINGS_KEY = "naopoyo-series-settings-v1";
export class Settings {
  constructor(storage, allowed) {
    this.storage = storage;
    this.allowed = new Set(allowed);
  }
  validate(d) {
    const valid = (a, n) =>
      Array.isArray(a) &&
      a.length === n &&
      new Set(a).size === n &&
      a.every((x) => this.allowed.has(x));
    if (
      d?.version !== 1 ||
      !Array.isArray(d.sets) ||
      d.sets.length !== 3 ||
      !d.sets.every((a) => valid(a, 5)) ||
      ![0, 1, 2].includes(d.active) ||
      !valid(d.slide, 3) ||
      !d.slide.every((x) => d.sets[d.active].includes(x))
    )
      throw Error("お気に入りの選択を確認してください");
    return d;
  }
  load() {
    const raw = this.storage.getItem(SETTINGS_KEY);
    return raw
      ? this.validate(JSON.parse(raw))
      : {
          version: 1,
          sets: Array.from({ length: 3 }, () => [...INITIAL_SPECIES]),
          active: 0,
          slide: INITIAL_SPECIES.slice(0, 3),
        };
  }
  save(d) {
    this.validate(d);
    this.storage.setItem(SETTINGS_KEY, JSON.stringify(d));
    return d;
  }
}
