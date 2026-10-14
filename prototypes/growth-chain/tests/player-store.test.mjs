import test from "node:test";
import assert from "node:assert/strict";
import { PlayerStore, STORE_KEY } from "../player-store.mjs";
const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) || null, setItem: (k, v) => m.set(k, v) };
};
const rec = (i) => ({
  id: `run${i}:clear`,
  category: "clear",
  score: i,
  deaths: 1,
  maxChain: 3,
});
test("100 history cap does not cap totals or high scores; dedup survives eviction", () => {
  const storage = memory(),
    s = new PlayerStore(storage);
  s.load();
  for (let i = 0; i < 105; i++) s.save(null, [rec(i)]);
  s.save(null, [rec(0), rec(104)]);
  const d = s.load();
  assert.equal(d.history.length, 100);
  assert.equal(d.totals.clear.plays, 105);
  assert.equal(d.totals.clear.best, 104);
  assert.equal(d.totals.clear.deaths, 105);
});
test("stale tab cannot overwrite a newer revision; categories independent", () => {
  const storage = memory(),
    a = new PlayerStore(storage),
    b = new PlayerStore(storage);
  a.load();
  b.load();
  a.save(null, [rec(1)]);
  assert.throws(() => b.save(null, []), /別の画面/);
  a.save(null, [{ ...rec(2), id: "other:endless", category: "endless" }]);
  assert.equal(a.load().totals.endless.plays, 1);
});
test("corrupt save fails closed and never overwrites it", () => {
  const storage = memory();
  storage.setItem(STORE_KEY, "broken");
  const s = new PlayerStore(storage);
  assert.throws(() => s.load());
  assert.equal(storage.getItem(STORE_KEY), "broken");
});
