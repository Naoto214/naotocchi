// Browser-test checkpoint at 300 s, before the original physical pointerdown.
// Serialize native actors and committed legs. Suspended JS generators have no
// transferable program counter. Clear all pending background searches and
// version-specific scheduling caches equally in every controlled replay.
qa.matrixState = () => ({
  actors: structuredClone(actors), selected, clock, idleAt, paused,
  stats: structuredClone(stats), cooldown: structuredClone([...cooldown]),
  manualGoals: structuredClone([...manualGoals]), seed: qa.readSeed(),
  background: {waiting: [...waiting.keys()], memo: [...helpedAt.keys()],
    owner: relief?.owner ?? null, searching: !!relief?.search, helper: relief?.yieldPeer ?? null}
});
qa.matrixLoad = state => {
  if (state.actors.map(a=>a.key).join('|') !== actors.map(a=>a.key).join('|'))
    throw Error('different native household');
  actors = structuredClone(state.actors);
  selected = state.selected;
  clock = state.clock;
  idleAt = state.idleAt;
  const gate = qa.gates();
  paused = gate.blocked || gate.trialPaused;
  Object.assign(stats, structuredClone(state.stats));
  for (const [target, data] of [[cooldown,state.cooldown],[manualGoals,state.manualGoals]]) {
    target.clear();
    for (const [k,v] of structuredClone(data)) target.set(k,v);
  }
  waiting.clear();
  helpedAt.clear();
  relief = null;
  retryingKey = null;
  earlyKey = null;
  nextRecovery = clock;
  qa.writeSeed(state.seed);
};
