import {
  applyAction,
  fits,
  movePose,
  spawnPose,
  poseCells,
} from "./session.mjs";
// Rebase only the replay path: the active pair never teleports or changes species.
export function pathToPose(b, r, target) {
  const start = spawnPose(r),
    key = (p) => `${p.x},${p.y},${p.rot}`;
  if (!fits(b, start) || !fits(b, target)) return null;
  const seen = new Set([key(start)]),
    q = [{ p: start, path: [] }];
  for (let i = 0; i < q.length; i++) {
    const { p, path } = q[i];
    if (key(p) === key(target)) return path;
    for (const op of ["left", "right", "rotate", "down"]) {
      const n = movePose(b, p, op);
      if (n && !seen.has(key(n))) {
        seen.add(key(n));
        q.push({ p: n, path: [...path, op] });
      }
    }
  }
  return null;
}
export function toolTransaction(s, pose, a, expectedId) {
  if (!["egg", "transform", "bulk"].includes(a.type))
    throw Error("Invalid live tool");
  if (
    expectedId !== undefined &&
    a.type === "transform" &&
    s.board[a.y]?.[a.x]?.id !== expectedId
  )
    throw Error("対象が変わりました。選び直してください");
  if (a.type === "egg") {
    let y = s.board.length - 1;
    while (y >= 2 && s.board[y][a.x]) y--;
    if (poseCells(pose).some((c) => c.x === a.x && c.y === y))
      throw Error("落下中の2体と重なります。消費せず取り消しました");
  }
  const state = applyAction(s, a);
  const path = pathToPose(state.board, s.rules, pose);
  if (path === null)
    throw Error("落下中の2体と重なります。消費せず取り消しました");
  return { state, pose: { ...pose }, path };
}
