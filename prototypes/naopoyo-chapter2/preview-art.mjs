import {drawSprite} from '../naopoyo-rescue/sprites.mjs';
import {actorSpriteBox} from './actor-art.mjs';
export function drawSplitPreview(c,preview,cell){
 if(!preview)return;
 c.save();
 // Birth rings are deliberately small; the stronger silhouette is the final
 // position after the complete gravity/merge transaction, not a path hint.
 c.strokeStyle='#367f92';c.lineWidth=1.2;c.setLineDash([2,3]);c.globalAlpha=.55;
 const births=new Set();
 for(const b of preview.births){const key=b.x+','+b.y;if(births.has(key))continue;births.add(key);c.beginPath();c.arc((b.x+.5)*cell,(b.y+.5)*cell,cell*.09,0,Math.PI*2);c.stroke();}
 for(const a of preview.actors){
  c.globalAlpha=.35;drawSprite(c,a.species,a.level,actorSpriteBox(a,cell));
  c.globalAlpha=.8;c.strokeStyle='#236c81';c.lineWidth=1.5;c.setLineDash([3,3]);
  c.strokeRect((a.x+.06)*cell,(a.y+.06)*cell,cell*.88,cell*.88);
  c.setLineDash([]);c.globalAlpha=1;c.font=`900 ${cell*.31}px system-ui`;c.textAlign='center';c.textBaseline='middle';
  c.lineWidth=3.5;c.strokeStyle='#f3fffa';c.strokeText(a.level,(a.x+.5)*cell,(a.y+.18)*cell);c.fillStyle='#18566b';c.fillText(a.level,(a.x+.5)*cell,(a.y+.18)*cell);
 }
 c.setLineDash([]);c.globalAlpha=.9;c.font=`800 ${cell*.26}px system-ui`;c.textAlign='center';c.textBaseline='middle';
 for(const e of preview.rescues){c.lineWidth=3;c.strokeStyle='#fff';c.strokeText('★'+e.level,(e.x+.5)*cell,(e.y+.5)*cell);c.fillStyle='#236c81';c.fillText('★'+e.level,(e.x+.5)*cell,(e.y+.5)*cell);}
 c.restore();
}
