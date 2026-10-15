// UI session boundary. Game legality, revisions, replay and saving stay in engine.mjs.
import {actor,act,view,save,restore} from './engine.mjs';
export class HotseatSession {
 #state=null;
 viewer=null;
 start(state){this.#state=state;this.viewer=null;}
 get active(){return Boolean(this.#state);}
 get actor(){return this.#state?actor(this.#state):null;}
 get finished(){return this.#state?.phase==='finished';}
 get projection(){return this.#state?view(this.#state,this.viewer):null;}
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
