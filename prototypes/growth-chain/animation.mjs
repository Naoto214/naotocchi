// Presentation only: the resolver's snapshots and IDs remain the sole authority.
function positions(board) {
  return new Map(
    board.flatMap((row, y) =>
      row.flatMap((cell, x) => (cell ? [[cell.id, { x, y, cell }]] : [])),
    ),
  );
}
export function animationFrames(waves, tempo = 300, reduced = false) {
  return waves.flatMap((wave) => {
    const duration = Math.max(60, Number(tempo) / (wave.chain > 3 ? 1.2 : 1));
    if (reduced)
      return [
        {
          phase: "result",
          chain: wave.chain,
          board: wave.after,
          events: wave.events,
          moves: [],
          duration,
        },
      ];
    const start = positions(wave.before),
      merged = positions(wave.merged),
      after = positions(wave.after);
    const evolves = wave.events.flatMap((e) =>
      e.consumed
        .map((id) => ({
          from: start.get(id),
          to: { ...e.anchor },
          death: e.death,
        }))
        .filter((m) => m.from),
    );
    const falls = [...merged].flatMap(([id, from]) =>
      after.has(id) ? [{ from, to: after.get(id) }] : [],
    );
    return [
      {
        phase: "connect",
        board: wave.before,
        moves: [],
        duration: duration * 0.25,
      },
      {
        phase: "evolve",
        board: wave.merged,
        moves: evolves,
        duration: duration * 0.4,
      },
      {
        phase: "fall",
        board: wave.after,
        moves: falls,
        duration: duration * 0.35,
      },
    ].map((f) => ({ ...f, chain: wave.chain, events: wave.events }));
  });
}
