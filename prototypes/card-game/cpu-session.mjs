import {HotseatSession} from './ui-session.mjs';
import {chooseCpuAction,DIFFICULTIES,POLICY_VERSION} from './cpu-policy.mjs';
import {CPU_DECK_IDS,CPU_DECK_MODES,cpuDeck,cpuDeckVersion} from './cpu-decks.mjs';
const VERSION='cpu-match-1';
// Optional CPU strategy-deck label (older saves have none). The label must match the CPU seat's actual 40 cards,
// either the deck's current list or one of its earlier lists (a match started before a list change).
function deckLabel(d,game,cpuSeat){if(d==null)return null;
 if(typeof d!=='object'||!Object.hasOwn(CPU_DECK_MODES,d.mode)||d.mode==='mydeck'||!CPU_DECK_IDS.includes(d.id)||!(d.seed===null||Number.isSafeInteger(d.seed)))throw Error('CPUデッキ情報が不正です');
 if(game&&cpuDeckVersion(d.id,game.decks?.[cpuSeat]??[])===null)throw Error('CPUデッキ情報が対戦と一致しません');
 return {mode:d.mode,id:d.id,name:cpuDeck(d.id).name,seed:d.seed};}
function config({humanSeat,difficulty,policySeed}){if(!['A','B'].includes(humanSeat)||!DIFFICULTIES.includes(difficulty)||!Number.isSafeInteger(policySeed)||policySeed<0||policySeed>0xffffffff)throw Error('CPU対戦設定が不正です');}
export class CpuSession {
 #inner=new HotseatSession({autoAdvance:true});#policy;#step=0;#guard={turn:null,count:0,seen:{}};#diagnostic=null;
 mode='cpu';
 cpuDeck=null;
 constructor({humanSeat='A',difficulty='intermediate',policySeed=1,policy=chooseCpuAction,cpuDeck=null}={}){config({humanSeat,difficulty,policySeed});this.humanSeat=humanSeat;this.cpuSeat=humanSeat==='A'?'B':'A';this.difficulty=difficulty;this.policySeed=policySeed;this.#policy=policy;this.cpuDeck=deckLabel(cpuDeck,null,this.cpuSeat);}
 get active(){return this.#inner.active;}
 get actor(){return this.#inner.actor;}
 get viewer(){return this.#inner.viewer;}
 get finished(){return this.#inner.finished;}
 get automationStop(){return this.#diagnostic??this.#inner.automationStop;}
 get engineSave(){return this.#inner.save();}
 // The CPU deck name is shown only after the match: おまかせ must not reveal the strategy during play.
 get projection(){const v=this.#inner.projection;if(v){v.mode='cpu';v.humanSeat=this.humanSeat;v.cpuSeat=this.cpuSeat;v.cpuThinking=this.cpuPending;v.cpuDeckName=this.finished&&this.cpuDeck?this.cpuDeck.name:null;}return v;}
 get cpuPending(){return this.active&&!this.finished&&!this.automationStop&&this.viewer===this.humanSeat&&this.actor===this.cpuSeat;}
 start(state){deckLabel(this.cpuDeck,state,this.cpuSeat);this.#inner.start(state);this.#step=0;this.#guard={turn:null,count:0,seen:{}};this.#diagnostic=null;this.reveal();}
 hide(){this.#inner.hide();}
 reveal(){if(!this.automationStop)this.#inner.viewer=this.humanSeat;}
 prepare(id){if(this.actor!==this.humanSeat)throw Error('CPUが操作中です');return this.#inner.prepare(id);}
 decisionInput(){if(this.viewer!==this.humanSeat||this.actor!==this.humanSeat)throw Error('人間の操作待ちではありません');return this.#inner.decisionInput(this.humanSeat);}
 commit(id,revision,who){if(who!==this.humanSeat||this.viewer!==who||this.actor!==who||this.automationStop)throw Error('今は操作できません');this.#inner.commit(id,revision,who);this.reveal();return false;}
 stepCpu(revision){
  if(!this.cpuPending||revision!==this.#inner.projection.revision)return false;
  let o;
  try{
   o=this.#inner.decisionInput(this.cpuSeat);
   const turn=`${o.round}:${o.turn}`;if(turn!==this.#guard.turn)this.#guard={turn,count:0,seen:{}};
   // Canonical safe observation excludes revision-dependent tickets. Never logs private CPU cards.
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...a})=>a)});
   if(this.#guard.count>=512||(this.#guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   const decision=this.#policy(o,{difficulty:this.difficulty,seed:this.policySeed,step:this.#step});
   if(!decision||!o.actions.some(a=>a.id===decision.id)||!Number.isFinite(decision.score))throw Error('Invalid CPU decision');
   const noticeBatch=this.#inner.resultSince;
   this.#inner.viewer=this.cpuSeat;
   this.#inner.commit(decision.id,o.revision,this.cpuSeat);
   this.#inner.resultSince=noticeBatch;
   this.#step++;this.#guard.count++;this.#guard.seen[key]=(this.#guard.seen[key]??0)+1;
   return true;
  }catch(error){this.#diagnostic={code:'cpu-stopped',revision:o?.revision??revision,round:o?.round??null,phase:o?.phase??null,step:this.#step,reason:['CPU repetition limit','Invalid CPU decision','Unsupported CPU difficulty','CPU has no legal candidates','Non-finite CPU evaluation'].includes(error.message)?error.message:'CPU operation failed'};return false;}
  finally{this.#inner.viewer=this.humanSeat;}
 }
 save(){return JSON.stringify({version:VERSION,policy:POLICY_VERSION,humanSeat:this.humanSeat,difficulty:this.difficulty,policySeed:this.policySeed,...(this.cpuDeck?{cpuDeck:this.cpuDeck}:{}),step:this.#step,guard:this.#guard,diagnostic:this.#diagnostic,game:JSON.parse(this.#inner.save())});}
 restore(raw){
  const d=JSON.parse(raw);if(d.version!==VERSION||d.policy!==POLICY_VERSION)throw Error('CPU保存形式が異なります');config(d);
  if(!Number.isInteger(d.step)||d.step<0||d.step>(d.game?.commands?.length??0)||!d.guard||!Number.isInteger(d.guard.count)||d.guard.count<0||d.guard.count>512||!d.guard.seen||typeof d.guard.seen!=='object'||Array.isArray(d.guard.seen)||Object.keys(d.guard.seen).length>512||Object.values(d.guard.seen).some(n=>!Number.isInteger(n)||n<1||n>3)||JSON.stringify(d.guard).length>1500000||d.diagnostic!==null&&(!d.diagnostic||d.diagnostic.code!=='cpu-stopped'))throw Error('CPU継続情報が不正です');
  const label=deckLabel(d.cpuDeck,d.game,d.humanSeat==='A'?'B':'A');
  const inner=new HotseatSession({autoAdvance:true});inner.restore(JSON.stringify(d.game));
  this.humanSeat=d.humanSeat;this.cpuSeat=d.humanSeat==='A'?'B':'A';this.difficulty=d.difficulty;this.policySeed=d.policySeed;this.cpuDeck=label;this.#inner=inner;this.#step=d.step;this.#guard=d.guard;this.#diagnostic=d.diagnostic;
 }
 clear(){this.#inner.clear();this.#diagnostic=null;this.#step=0;this.#guard={turn:null,count:0,seen:{}};}
}
export function restoreMatch(raw){const d=JSON.parse(raw);const session=d.version===VERSION?new CpuSession():new HotseatSession({autoAdvance:true});session.restore(raw);return session;}
