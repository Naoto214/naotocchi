import {enteredCells} from '../naopoyo-v2/input.mjs';
export class BoardInput {
 constructor(state,step){this.getState=state;this.step=step;this.selected=null;this.cancel();}
 select(id){this.cancel();this.selected=id;}
 cancel(){this.epoch=(this.epoch||0)+1;this.down=false;this.previous=null;}
 start(point,options={}){
  this.cancel();const epoch=this.epoch,s=this.getState(),x=Math.floor(point.x),y=Math.floor(point.y);if(x<0||y<0||x>=s.w||y>=s.h)return;
  const hit='hit' in options?options.hit:s.actors.find(a=>a.x===x&&a.y===y),a=s.actors.find(a=>a.id===this.selected);
  // Shipped app.mjs pointerdown selects the hit actor before any travel.
  if(hit)this.selected=hit.id;
  else if(a&&Math.max(Math.abs(x-a.x),Math.abs(y-a.y))===1){if(!this.step(a.id,x-a.x,y-a.y).ok)return;}
  else return;
  if(this.epoch!==epoch)return;
  this.previous=point;this.cursor={x,y};this.gestureActor=(hit||a).id;this.down=true;
 }
 drag(point){
  if(!this.down||!this.previous)return;
  const cells=enteredCells(this.previous,point);this.previous=point;
  for(const [x,y]of cells){if(!this.down)break;const a=this.getState().actors.find(a=>a.id===this.gestureActor);if(!a){this.cancel();break;}// WorldSession.travel: finger cursor, not the post-gravity actor position.
   const dx=x-this.cursor.x,dy=y-this.cursor.y;if(dx===0&&dy===0)continue;
   // Formal ForestSession.travel preserves the stroke on a blocked move.
   if(Math.max(Math.abs(dx),Math.abs(dy))!==1||!this.step(a.id,dx,dy).ok)continue;
   this.cursor={x,y};
  }
 }
 end(){this.cancel();}
}
