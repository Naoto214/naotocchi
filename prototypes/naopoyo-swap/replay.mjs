import {createGame} from './state.mjs';import {applySwap} from './engine.mjs';
export function replay(seed,config,actions){let s=createGame(seed,config);for(const a of actions){const r=applySwap(s,a);if(!r.accepted)throw Error('Replay contains illegal action');s=r.state;}return s;}
