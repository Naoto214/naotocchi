import { catalog, aliases } from "./catalog.mjs";
export const INITIAL_SPECIES = Object.freeze([
  "dog",
  "penguin",
  "clownfish",
  "mushroom",
  "butterfly",
]);
export function unlockedRoster(save = {}) {
  const keys = new Set(
    (Array.isArray(save?.discoveredStages) ? save.discoveredStages : [])
      .filter((k) => typeof k === "string")
      .map((k) => {
        const at = k.lastIndexOf(":");
        const id = k.slice(0, at);
        return `${aliases[id] || id}${k.slice(at)}`;
      }),
  );
  const initial = INITIAL_SPECIES.map((id) => {
    const c = catalog.find((c) => c.id === id);
    if (!c) throw Error("Missing initial species " + id);
    return c;
  });
  return [
    ...initial,
    ...catalog.filter(
      (c) =>
        !INITIAL_SPECIES.includes(c.id) &&
        c.stages.every((_, i) => keys.has(`${c.id}:${i}`)),
    ),
  ];
}
export function readRoster(storage) {
  try {
    return unlockedRoster(
      JSON.parse(storage.getItem("naotocchi-save-v1")) || {},
    );
  } catch {
    return unlockedRoster();
  }
}
export function selectFive(roster, ids) {
  if (!Array.isArray(ids) || ids.length !== 5 || new Set(ids).size !== 5)
    throw Error("5系統を選んでください");
  const indices = ids.map((id) => roster.findIndex((c) => c.id === id));
  if (indices.includes(-1)) throw Error("未解放の系統");
  return indices;
}
export function imagePath(c, stage) {
  if (!c || !Number.isInteger(stage) || stage < 1 || stage > 8) return null;
  return `../../assets/characters/${c.id}/${String(stage).padStart(2, "0")}.png`;
}
