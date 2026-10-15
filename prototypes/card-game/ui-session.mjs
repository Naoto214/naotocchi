// UI session boundary. Game legality, revisions, replay and saving stay in engine.mjs.
import {actor,act,view,save,restore,legalActions} from './engine.mjs';
import {needsConfirmation} from './ui-presentation.mjs';
export class HotseatSession {
 #state=null;
 viewer=null;
 start(state){this.#state=state;this.viewer=null;}
 get active(){return Boolean(this.#state);}
 get actor(){return this.#state?actor(this.#state):null;}
 get finished(){return this.#state?.phase==='finished';}
 get projection(){
  if(!this.#state)return null;
  const v=view(this.#state,this.viewer),draft=this.#state.activationDraft;
  // Existing draft selections only. Resolve names through the safe view, never raw card identities.
  if(draft&&draft.actor===this.viewer){
   const visible=Object.values(v.players).flatMap(p=>[...(p.hand??[]),...p.discard,p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared]).filter(c=>c&&!c.hidden);
   const names=new Map(visible.map(c=>[c.id,c.name]));
   v.selectionSummary=(draft.rule.select??[]).flatMap(spec=>(draft.selection[spec.key]??[]).map(id=>`${spec.cost?'支払い':'対象'}：${names.get(id)??'非公開のカード'}`));
  }
  return v;
 }
 prepare(actionId){
  const v=this.projection,index=v?.actions.findIndex(a=>a.id===actionId)??-1;
  if(index<0||!this.viewer)throw Error('現在選択できない行動です');
  const action=v.actions[index],raw=legalActions(this.#state)[index];
  const draft=this.#state.activationDraft;
  // A read-only engine transition tells us whether a pick auto-commits. No duplicated selection rules.
  const preview=act(this.#state,v.actor,v.revision,actionId);
  const selecting=v.choice?.kind==='activation_selection',cancel=raw.value==='cancel';
  const startsSelection=!selecting&&Boolean(preview.activationDraft);
  const completes=selecting&&!cancel&&!preview.activationDraft;
  const quoted=raw.cost??raw.quote?.cost??Number(action.label.match(/時(\d+)/)?.[1]??0);
  const paidTime=selecting?(draft?.action.cost??draft?.rule.cost??0):quoted;
  const details=selecting?[...(v.selectionSummary??[]),...(!['done','cancel'].includes(raw.value)?[action.label]:[])]:[];
  return {action,revision:v.revision,who:v.actor,paidTime,details,
   required:startsSelection?false:selecting?completes:paidTime>0||Boolean(raw.costCard)||needsConfirmation(action)};
 }
 hide(){this.viewer=null;}
 reveal(){if(this.#state)this.viewer=actor(this.#state);}
 commit(actionId,revision,who){
  if(!this.#state||who!==this.viewer)throw Error('端末を受け取ってから操作してください');
  this.#state=act(this.#state,who,revision,actionId);
  const handoff=actor(this.#state)!==this.viewer||this.finished;
  if(handoff)this.hide();
  return handoff;
 }
 save(){return save(this.#state);}
 restore(raw){this.start(restore(raw));}
 clear(){this.#state=null;this.viewer=null;}
}
