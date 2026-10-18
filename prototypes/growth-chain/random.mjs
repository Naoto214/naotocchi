// mulberry32-v1; serializable unsigned state. No global RNG.
export function random(rng) {
  let t = (rng.state = (rng.state + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function createBag(seed, r) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw Error("seed must be uint32");
  return {
    state: seed >>> 0,
    kinds: r.kinds,
    mode: r.bag,
    index: 0,
    items: [],
    cycle: 0,
  };
}
export function draw(b) {
  if (b.index >= b.items.length) {
    b.items = [];
    const n = b.selected ? 20 : b.mode === "fixed20" ? 20 : b.kinds * 4;
    for (let i = 0; i < n; i++)
      b.items.push(
        b.selected
          ? b.selected[i % 5]
          : (i + b.cycle * (n % b.kinds)) % b.kinds,
      );
    for (let i = b.items.length - 1; i > 0; i--) {
      let j = Math.floor(random(b) * (i + 1));
      [b.items[i], b.items[j]] = [b.items[j], b.items[i]];
    }
    b.index = 0;
    b.cycle++;
  }
  return b.items[b.index++];
}
