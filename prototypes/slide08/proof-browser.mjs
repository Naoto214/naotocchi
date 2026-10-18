import { create, step, validate } from "./engine.mjs";
const digest = async (x) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(x)),
      ),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
export async function verifyProof(p) {
  validate(p.initial);
  if (
    !Array.isArray(p.actions) ||
    p.hashes?.length !== p.actions.length + 1 ||
    (await digest(create(p.initial.seed, p.initial.config))) !== p.hashes[0]
  )
    throw Error("初期盤面の検証に失敗しました");
  let s = p.initial;
  if ((await digest(s)) !== p.hashes[0]) throw Error("初期状態不一致");
  for (let i = 0; i < p.actions.length; i++) {
    const r = step(s, p.actions[i]);
    if (!r.valid || (await digest(r.state)) !== p.hashes[i + 1])
      throw Error("解法の検証に失敗しました");
    s = r.state;
  }
  if (!s.won || (await digest(s)) !== (await digest(p.final)))
    throw Error("解法が一致しません");
  return p;
}
