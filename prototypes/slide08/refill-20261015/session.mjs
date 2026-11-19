import * as old from '../player-model.mjs';
import {step,validate,candidates,create} from './engine.mjs';
import {stage,kind} from '../engine.mjs';
const clone=x=>structuredClone(x);
export function newRun(initial,species,proof,id){
 validate(initial);return {...old.newRun(initial,species,proof,id),qa:{taps:0,swipes:0,keys:0,invalid:0,pauses:0,resumes:0,mistakes:0,first08:null,deathAt:null,events:[]}};
}
export function advance(p,a){
 if(p.ended)return {valid:false,state:p.state,waves:[],spawns:[]};
 const r=step(p.state,a);if(!r.valid){p.qa.invalid++;return r;}
 p.previous={state:clone(p.state),deaths:clone(p.deaths),action:clone(a)};
 p.state=r.state;p.deaths.push(...r.waves.flatMap(w=>w.events.filter(e=>e.death).map(e=>e.kind)));
 const events=r.waves.flatMap(w=>w.events),counts=[0,0,0];r.state.board.filter(Boolean).forEach(v=>counts[kind(v)]++);
 if(p.qa.first08===null&&(r.state.board.some(v=>stage(v)===8)||events.some(e=>e.to===8||e.death)))p.qa.first08=p.elapsedMs;
 if(p.qa.deathAt===null&&r.state.won)p.qa.deathAt=p.elapsedMs;
 p.qa.events.push({type:'action',action:clone(a),at:p.elapsedMs,taps:p.qa.taps,chain:r.waves.length,population:counts.reduce((n,v)=>n+v,0),counts,spawns:r.spawns});
 return r;
}
export function undo(p,confirmed){const done=old.undo(p,confirmed);if(done)p.qa.events.push({type:'undo',at:p.elapsedMs,taps:p.qa.taps});return done;}
export function hasMoves(s){for(const a of candidates(s))if(step(s,a).valid)return true;return false;}
export function restore(raw,allowed){
 const p=clone(raw);validate(p.state);validate(p.initial);
 if(p.version!==1||typeof p.id!=='string'||typeof p.proof!=='string'||!Array.isArray(p.species)||p.species.length!==3||new Set(p.species).size!==3||!p.species.every(x=>allowed.includes(x))||typeof p.ended!=='boolean'||!Number.isFinite(p.elapsedMs)||p.elapsedMs<0||!p.qa||!Array.isArray(p.qa.events)||p.qa.events.length>20000)throw Error('Invalid saved session');
 for(const key of ['taps','swipes','keys','invalid','pauses','resumes','mistakes'])if(!Number.isSafeInteger(p.qa[key])||p.qa[key]<0)throw Error('Invalid telemetry');
 const initial=create(p.initial.seed,p.initial.lab.profile,p.initial.lab.gauge);
 if(JSON.stringify(initial)!==JSON.stringify(p.initial))throw Error('Initial mismatch');
 const replay=newRun(initial,p.species,p.proof,p.id);let at=0;
 for(const e of p.qa.events){if(!Number.isFinite(e.at)||e.at<at||e.at>p.elapsedMs)throw Error('Invalid event time');at=e.at;replay.elapsedMs=e.at;
  if(e.type==='undo'){if(!undo(replay,true))throw Error('Invalid undo');}
  else if(e.type==='action'){if(!advance(replay,e.action).valid)throw Error('Illegal action');}
  else throw Error('Unknown event');
 }
 for(const key of ['state','previous','practice','undoCount','deaths'])if(JSON.stringify(replay[key])!==JSON.stringify(p[key]))throw Error('Replay mismatch: '+key);
 return p;
}
export function record(p){return {...old.record(p),profile:p.state.lab.profile,gauge:p.state.lab.gauge,qa:clone(p.qa)};}
export class SlideStore {
 constructor(storage){this.storage=storage;this.revision=null;this.key='naopoyo-slide-refill-qa-v1';}
 read(){const raw=this.storage.getItem(this.key);if(!raw)return {version:1,revision:0,snapshot:null,history:[]};const d=JSON.parse(raw);if(d.version!==1||!Number.isSafeInteger(d.revision)||!Array.isArray(d.history))throw Error('比較用保存を確認してください');return d;}
 load(){const d=this.read();this.revision=d.revision;return d;}
 save(p,r){const d=this.read();if(d.revision!==this.revision)throw Error('別タブが保存を変更しました');d.snapshot=clone(p);const updated=r||(p?.ended?record(p):null);if(updated)d.history=[updated,...d.history.filter(x=>x.id!==updated.id)].slice(0,100);d.revision++;this.storage.setItem(this.key,JSON.stringify(d));this.revision=d.revision;return d;}
}
