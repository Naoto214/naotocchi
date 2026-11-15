// Public numbers may move; internal IDs keep saves and reviews attached to a puzzle.
export const stageByNumber=(stages,value)=>stages.find(s=>s.number===Number(value))||stages[0];
