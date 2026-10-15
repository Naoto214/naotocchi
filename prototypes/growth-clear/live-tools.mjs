import {
  applyAction,
  fits,
  movePose,
  spawnPose,
  poseCells,
} from "./session.mjs";
// Rebase only the replay path: the active pair never teleports or changes species.
import { pathToPose } from "../growth-chain/live-tools.mjs";
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
