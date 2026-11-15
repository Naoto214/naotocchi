import{createGameState,gameMove,isComplete}from '../../engine.mjs';import{boardSignature,replayActions}from '../../session.mjs';import{GestureHistory}from '../../gesture.mjs';import{ComparisonPresentation}from '../presentation.mjs';
export class PlaySession{
 constructor(d){this.presentation=new ComparisonPresentation();this.gestures=new GestureHistory();this.load(d)}
 load(d){this.draft=d;const valid=d.play?.signature===boardSignature(d.board),r=valid&&replayActions(d.board,d.play.actions,createGameState,gameMove);this.state=r?r.state:createGameState(d.board);this.history=r?r.history:[];this.actions=r?structuredClone(d.play.actions):[];this.gestures.reset(r?d.play.groups:[]);this.presentation.reset(this.state);this.commit()}
 replaceDraft(d){if(boardSignature(d.board)===boardSignature(this.draft.board)){d.play=this.draft.play;this.draft=d}else this.load(d)}
 commit(){this.draft.play={signature:boardSignature(this.draft.board),actions:structuredClone(this.actions),groups:[...this.gestures.groups],cleared:isComplete(this.state)}}
 begin(){this.gestures.begin(this.actions.length)}end(){this.gestures.end();this.commit()}
 step(id,dx,dy,reduced=false){if(isComplete(this.state))return{ok:false};const a=this.state.actors.find(a=>a.id===id);if(!a)return{ok:false};const before=structuredClone(this.state),action={x:a.x,y:a.y,dx,dy},r=gameMove(this.state,id,dx,dy);if(r.ok){this.gestures.record(this.actions.length);this.history.push(before);this.actions.push(action);this.presentation.queue(before,this.state,r,id,dx,dy,reduced);this.commit()}return r}
 undo(){if(!this.history.length)return;const i=this.gestures.pop();this.state=this.history[i];this.history.length=i;this.actions.length=i;this.presentation.reset(this.state);this.commit()}
 reset(){this.state=createGameState(this.draft.board);this.history=[];this.actions=[];this.gestures.reset();this.presentation.reset(this.state);this.commit()}
}
