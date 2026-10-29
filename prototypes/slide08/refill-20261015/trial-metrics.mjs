import {step} from './engine.mjs';
export function summary(p){
 let state=structuredClone(p.initial),previous=null;
 const m={actions:0,inputs:p.qa.taps+p.qa.swipes+p.qa.keys,taps:p.qa.taps,swipes:p.qa.swipes,undos:0,eggs:0,single:0,bulk:0,slideEvolutions:0,slideChains:0,population:[state.board.filter(Boolean).length],won:p.state.won};
 for(const e of p.qa.events){
  if(e.type==='undo'){if(previous)state=previous;previous=null;m.undos++;}
  else {const r=step(state,e.action);if(!r.valid)continue;previous=state;state=r.state;m.actions++;if(e.action.type==='slide'){m.slideEvolutions+=r.waves.flatMap(w=>w.events).filter(e=>!e.death).length;if(r.waves.length>=2)m.slideChains++;}else if(e.action.type==='egg')m.eggs++;else if(e.action.type==='single')m.single++;else if(e.action.type==='bulk')m.bulk++;}
  m.population.push(state.board.filter(Boolean).length);
 }
 return m;
}
